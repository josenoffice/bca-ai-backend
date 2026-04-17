import express from 'express'
import Anthropic from '@anthropic-ai/sdk'
import crypto from 'crypto'

const router = express.Router()
const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

// ─── Constants ───────────────────────────────────────────────────────────────

const COMPLIANCE_EXCLUSIONS = {
  ecommerce_optimization:  [],
  frontend_modernization:  ['PCI-DSS'],
  process_optimization:    ['PCI-DSS'],
  general_modernization:   ['PCI-DSS'],
  backend_infrastructure:  [],
  security_compliance:     [],
  cloud_modernization:     []
}

const SYSTEM_PROMPT = `You are a senior BCA (Business Case Analysis) quality reviewer.
Your job is to critically review a draft BCA and identify real problems,
not minor formatting issues.

FOCUS AREAS:
1. Benefit values: Are they proportionate to company size? Are calculations
   correct and verifiable?
2. Time horizons: Are all benefits on a consistent multi-year basis matching
   the cost horizon?
3. Cost completeness: Are CapEx and OpEx clearly separated? Is total cost of
   ownership presented?
4. Linkage quality: Are orphaned benefits/requirements a real problem?
5. Missing elements: What critical requirements, risks, or governance items
   are absent?
6. Logical consistency: Do the solutions actually deliver the claimed benefits?
7. Vendor compliance: If a vendor compliance check is provided, flag any gaps
   where the selected vendor does not cover a required compliance standard.
   Use area=vendor_compliance for these. Only flag standards listed as required
   for that solution's category. Standards marked "not applicable" must NOT be flagged.
8. Vendor ownership: If an OWNERSHIP FLAG is present, flag it as a warning
   with area=vendor_compliance — incorrect parent company is a procurement risk.
9. Revenue base accuracy: If online revenue is provided, examine EVERY benefit
   whose valueBasis multiplies a revenue figure. Verify each one uses online
   revenue as its base, not total annual revenue. Flag each discrepancy as a
   separate criticalIssue with area=benefits.
10. Zero recurring OpEx: If annual recurring cost for the entire portfolio is
    $0/yr and the portfolio includes any cloud, SaaS, or platform solutions,
    flag as criticalIssue with area=costs and severity=critical.

SEVERITY GUIDE:
- critical: Blocks Phase 2. Calculation errors, invented financials, zero OpEx
  on cloud/SaaS, orphaned benefits with no linked solutions
- high: Should fix before presenting. Implausible values, missing risk register
- medium: Improve before final sign-off. Minor inconsistencies, vague descriptions

SCORE GUIDE:
- 80-100: Strong BCA — minor improvements only
- 60-79: Acceptable — notable weaknesses but not blocking
- 40-59: Needs significant work — multiple issues
- 0-39: Fail — fundamental problems must be fixed

Return ONLY valid JSON — no markdown fences, no explanation.`

// ─── Step 1: normalizeInputs ────────────────────────────────────────────────

function normalizeInputs(raw) {
  const errors = []

  const solutions     = raw.solutions     || []
  const benefits      = raw.benefits      || []
  const requirements  = raw.requirements  || []
  const validatedData = raw.validatedData  || {}
  const budgetAnalysis = raw.budgetAnalysis || {}
  const deferredSolutionIds = raw.deferredSolutionIds || []

  if (solutions.length === 0)  errors.push('MISSING_SOLUTIONS')
  if (benefits.length === 0)   errors.push('MISSING_BENEFITS')

  // ID validation
  for (const s of solutions) {
    if (!s.id) errors.push('ID_VALIDATION_FAILED: solution missing id')
  }
  for (const b of benefits) {
    if (!b.id) errors.push('ID_VALIDATION_FAILED: benefit missing id')
  }
  for (const r of requirements) {
    if (!r.id) errors.push('ID_VALIDATION_FAILED: requirement missing id')
  }

  // Cross-reference validation
  const solIdSet = new Set(solutions.map(s => s.id).filter(Boolean))
  for (const b of benefits) {
    for (const sid of (b.linkedSolutions || b.delivered_by_solutions || [])) {
      if (!solIdSet.has(sid)) {
        errors.push(`ID_VALIDATION_FAILED: Benefit ${b.id} links to non-existent solution ${sid}`)
      }
    }
  }
  for (const r of requirements) {
    for (const sid of (r.linkedSolutions || r.supports_solutions || [])) {
      if (!solIdSet.has(sid)) {
        errors.push(`ID_VALIDATION_FAILED: Requirement ${r.id} links to non-existent solution ${sid}`)
      }
    }
  }

  return { solutions, benefits, requirements, validatedData, budgetAnalysis, deferredSolutionIds, errors }
}

// ─── Step 2: buildReviewContext ──────────────────────────────────────────────

function buildReviewContext(raw) {
  const solutions     = raw.solutions     || []
  const benefits      = raw.benefits      || []
  const requirements  = raw.requirements  || []
  const validatedData = raw.validatedData  || {}
  const budgetAnalysis = raw.budgetAnalysis || {}
  const deferredSolutionIds = raw.deferredSolutionIds || []
  const horizonYears = validatedData.timeHorizonYears || 3

  const solutionReview = solutions.map(s => ({
    id:                        s.id,
    name:                      s.name,
    riskLevel:                 s.riskLevel || 'Medium',
    category:                  s.category,
    deliveryPhase:             s.deliveryPhase,
    linkedBenefits:            s.linkedBenefits || s.delivers_benefits || [],
    linkedRequirements:        s.linkedRequirements || s.depends_on_requirements || [],
    initialImplementationCost: s.costEstimate?.mid || s.costEstimate?.recommended || s.totalCost || 0,
    recurringAnnualCost:       s.recurringAnnualCost || 0,
    threeYearTCO:              (s.costEstimate?.mid || 0) + ((s.recurringAnnualCost || 0) * horizonYears),
    costEstimate:              s.costEstimate || null,
    vendorName:                s.vendorName || s.selectedVendor?.name || null,
    vendorFitScore:            s.vendorFitScore || s.selectedVendor?.fitScore || null
  }))

  const benefitReview = benefits.map(b => ({
    id:                b.id,
    category:          b.category,
    description:       b.description || '',
    riskAdjustedValue: b.riskAdjustedValue || 0,
    confidence:        b.confidence || 0,
    valueBasis:        b.valueBasis || '',
    linkedSolutions:   b.linkedSolutions || b.delivered_by_solutions || [],
    deferredOnly:      (b.linkedSolutions || b.delivered_by_solutions || []).every(sid => deferredSolutionIds.includes(sid))
  }))

  const requirementReview = requirements.map(r => ({
    id:              r.id,
    description:     r.description || '',
    priority:        r.priority || 'should_have',
    linkedSolutions: r.linkedSolutions || r.supports_solutions || []
  }))

  const onlineRevenue = validatedData.annualRevenue
    ? Math.round(validatedData.annualRevenue * (validatedData.onlineRevenuePct || 0) / 100)
    : null

  const companyContext = {
    industry:            validatedData.industry,
    companySize:         validatedData.companySize,
    annualRevenue:       validatedData.annualRevenue,
    annualOperatingCost: validatedData.annualOperatingCost,
    headcount:           validatedData.headcount,
    onlineRevenuePct:    validatedData.onlineRevenuePct || 0,
    onlineRevenue,
    budget:              validatedData.budget || 0,
    costHorizonYears:    horizonYears,
    totalInitialCost:    solutionReview.filter(x => !deferredSolutionIds.includes(x.id)).reduce((s, x) => s + x.initialImplementationCost, 0),
    totalAnnualCost:     solutionReview.filter(x => !deferredSolutionIds.includes(x.id)).reduce((s, x) => s + x.recurringAnnualCost, 0),
    withinCeiling:       budgetAnalysis.withinCeiling ?? null
  }

  return { solutionReview, benefitReview, requirementReview, companyContext, deferredSolutionIds, horizonYears }
}

// ─── Step 3: vendorComplianceCheck ───────────────────────────────────────────

function vendorComplianceCheck(solutions, validatedData, deferredSolutionIds) {
  return solutions
    .filter(s => !deferredSolutionIds.includes(s.id))
    .map(s => {
      const vendor         = s.selectedVendor || {}
      const covered        = vendor.complianceCoverage || []
      const required       = validatedData.complianceRequirements || []
      const notApplicable  = COMPLIANCE_EXCLUSIONS[s.category] || []
      const applicable     = required.filter(c => !notApplicable.includes(c))
      const gaps           = applicable.filter(c =>
        !covered.some(vc => vc.toLowerCase().includes(c.toLowerCase()))
      )
      return {
        solutionId:           s.id,
        solutionName:         s.name,
        solutionCategory:     s.category,
        vendorName:           vendor.name || s.vendorName || 'None',
        vendorFitScore:       vendor.fitScore || s.vendorFitScore || null,
        requiredCompliance:   applicable,
        coveredByVendor:      covered,
        notApplicableSkipped: notApplicable,
        hasGaps:              gaps.length > 0,
        gaps
      }
    })
}

// ─── Step 4: preparePrompt ───────────────────────────────────────────────────

function preparePrompt(ctx, vcReview) {
  const { solutionReview, benefitReview, requirementReview, companyContext, deferredSolutionIds, horizonYears } = ctx
  const cc = companyContext

  // Solution lines
  const solutionLines = solutionReview.map(s => {
    const vendor = s.vendorName ? ` | Vendor: ${s.vendorName} (fit: ${s.vendorFitScore})` : ''
    return `- [${s.id}] ${s.name} (${s.category}, Phase ${s.deliveryPhase}, Risk: ${s.riskLevel})
     CapEx: $${s.initialImplementationCost.toLocaleString()} | OpEx: $${s.recurringAnnualCost.toLocaleString()}/yr | ${horizonYears}yr TCO: $${s.threeYearTCO.toLocaleString()}${vendor}
     Benefits: ${s.linkedBenefits.join(', ')} | Requirements: ${s.linkedRequirements.join(', ')}`
  }).join('\n')

  // Benefit lines — separate active vs deferred
  const activeBenefits = benefitReview.filter(b => !b.deferredOnly)
  const deferredBenefits = benefitReview.filter(b => b.deferredOnly)
  const deferredBenefitValue = deferredBenefits.reduce((s, b) => s + b.riskAdjustedValue, 0)

  const benefitLines = activeBenefits.map(b =>
    `- [${b.id}] ${b.category}: $${b.riskAdjustedValue.toLocaleString()}/yr (confidence: ${Math.round(b.confidence * 100)}%)
     ${b.description}
     Basis: ${b.valueBasis}
     Linked to: ${b.linkedSolutions.join(', ')}`
  ).join('\n')

  // Requirement lines
  const requirementLines = requirementReview.map(r =>
    `- [${r.id}] ${r.priority}: ${r.description}
     Linked to: ${r.linkedSolutions.join(', ')}`
  ).join('\n')

  // Portfolio totals
  const totalBenefitValue = activeBenefits.reduce((s, b) => s + b.riskAdjustedValue, 0)
  const totalTCO = cc.totalInitialCost + (cc.totalAnnualCost * horizonYears)

  // Vendor compliance block
  const vendorComplianceBlock = vcReview.length > 0 ? `
VENDOR COMPLIANCE CHECK (${vcReview.length} solutions)
=============================
${vcReview.map(v => `
- [${v.solutionId}] ${v.solutionName} (category: ${v.solutionCategory})
   Selected vendor: ${v.vendorName} (fit score: ${v.vendorFitScore ?? 'n/a'})
   Required compliance: ${v.requiredCompliance.join(', ')}
   ${v.notApplicableSkipped.length > 0 ? `Not applicable to this category (skipped): ${v.notApplicableSkipped.join(', ')}` : ''}
   Covered by vendor: ${v.coveredByVendor.length > 0 ? v.coveredByVendor.join(', ') : 'none'}
   Gaps: ${v.hasGaps ? v.gaps.join(', ') : 'none — fully covered'}
`).join('')}` : ''

  // Cost data warnings
  const costWarnings = []
  if (cc.totalAnnualCost === 0) {
    const hasSaaS = solutionReview.some(s =>
      ['cloud_modernization', 'ecommerce_optimization', 'frontend_modernization'].includes(s.category)
    )
    if (hasSaaS) costWarnings.push('ZERO RECURRING OPEX: Portfolio includes cloud/SaaS solutions but total recurring cost is $0/yr')
  }
  const costDataWarningBlock = costWarnings.length > 0
    ? `\nCOST DATA WARNINGS\n==================\n${costWarnings.map(w => `- ${w}`).join('\n')}`
    : ''

  const userPrompt = `
BCA QUALITY REVIEW REQUEST
===========================
Project: ${cc.industry ? cc.industry.charAt(0).toUpperCase() + cc.industry.slice(1) : 'Unknown'} Industry Project
Industry: ${cc.industry}
Company Size: ${cc.companySize || 'Not specified'}
${cc.annualRevenue ? `Annual Revenue: $${cc.annualRevenue.toLocaleString()}` : 'Annual Revenue: Not provided'}
${cc.onlineRevenuePct > 0 ? `Online Revenue: $${cc.onlineRevenue.toLocaleString()} (${cc.onlineRevenuePct}% of total)` : ''}
${cc.annualOperatingCost > 0 ? `Annual Operating Cost: $${cc.annualOperatingCost.toLocaleString()}` : ''}
${cc.headcount > 0 ? `Headcount: ${cc.headcount}` : ''}
Budget: ${cc.budget > 0 ? '$' + cc.budget.toLocaleString() : 'Not provided'}
${cc.withinCeiling !== null ? `85% Budget Ceiling Status: ${cc.withinCeiling ? 'WITHIN ceiling' : 'CEILING BREACHED'}` : ''}
Time Horizon: ${cc.costHorizonYears} years

SOLUTIONS (${solutionReview.length})
=============
${solutionLines}

BENEFITS (${activeBenefits.length} active)
============
${benefitLines}
${deferredBenefitValue > 0 ? `\nDeferred benefits total: $${deferredBenefitValue.toLocaleString()} (excluded from active portfolio)` : ''}

REQUIREMENTS (${requirementReview.length})
=============
${requirementLines}

PORTFOLIO SUMMARY
=================
Total Initial Cost: $${cc.totalInitialCost.toLocaleString()}
Total Annual Recurring: $${cc.totalAnnualCost.toLocaleString()}/yr
Portfolio recurring OpEx: ${solutionReview.filter(x => !deferredSolutionIds.includes(x.id)).map(x => `${x.id}: $${x.recurringAnnualCost.toLocaleString()}/yr`).join(', ')}
${horizonYears}-Year TCO: $${totalTCO.toLocaleString()}
Total Benefit Value (active): $${totalBenefitValue.toLocaleString()}
${vendorComplianceBlock}
${costDataWarningBlock}

REQUIRED OUTPUT FORMAT
======================
{
  "verdict": "pass|pass_with_warnings|fail",
  "overallScore": 85,
  "summary": "2-3 sentence overall assessment",
  "criticalIssues": [
    {
      "id": "CI-001",
      "severity": "critical|high|medium",
      "area": "benefits|costs|linkages|requirements|solutions|vendor_compliance",
      "affectedIds": ["SOL-001"],
      "issue": "Specific problem description",
      "recommendation": "Specific fix recommendation"
    }
  ],
  "warnings": [
    {
      "id": "W-001",
      "area": "benefits|costs|linkages|requirements|solutions|vendor_compliance",
      "affectedIds": ["SOL-002"],
      "warning": "Non-critical concern",
      "suggestion": "How to improve"
    }
  ],
  "missingElements": ["Any important items not present"],
  "strengths": ["What is done well"],
  "readyForPhase2": true
}`

  return userPrompt
}

// ─── Step 5: callClaude ──────────────────────────────────────────────────────

async function callClaude(anthropicClient, userPrompt) {
  const response = await anthropicClient.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: userPrompt }]
  })
  return response.content?.[0]?.text || ''
}

// ─── Step 6: parseReviewResponse ─────────────────────────────────────────────

function parseReviewResponse(text) {
  try {
    const clean = text.replace(/^```[\w]*\s*/g, '').replace(/```\s*$/g, '').trim()
    const review = JSON.parse(clean)

    // Normalise verdict
    const valid = ['pass', 'pass_with_warnings', 'fail']
    review.verdict = valid.includes(review.verdict?.toLowerCase())
      ? review.verdict.toLowerCase()
      : 'pass_with_warnings'

    // Normalise score
    review.overallScore = Math.min(100, Math.max(0, Number(review.overallScore) || 50))

    // Normalise critical issues
    review.criticalIssues = (review.criticalIssues || []).map((issue, i) => ({
      id:             issue.id || `CI-${String(i + 1).padStart(3, '0')}`,
      severity:       (issue.severity || 'medium').toLowerCase(),
      area:           (issue.area || 'general').toLowerCase().replace(/-/g, '_'),
      affectedIds:    issue.affectedIds || [],
      issue:          issue.issue || '',
      recommendation: issue.recommendation || ''
    }))

    // Normalise warnings
    review.warnings = (review.warnings || []).map((w, i) => ({
      id:          w.id || `W-${String(i + 1).padStart(3, '0')}`,
      area:        (w.area || 'general').toLowerCase().replace(/-/g, '_'),
      affectedIds: w.affectedIds || [],
      warning:     w.warning || '',
      suggestion:  w.suggestion || ''
    }))

    review.missingElements = review.missingElements || []
    review.strengths = review.strengths || []

    // Force readyForPhase2 false if critical issues exist
    const criticalCount = review.criticalIssues.filter(i => i.severity === 'critical').length
    if (criticalCount > 0) {
      review.readyForPhase2 = false
    }

    // Default readyForPhase2
    if (review.readyForPhase2 === undefined) {
      review.readyForPhase2 = review.verdict !== 'fail'
    }

    return review
  } catch {
    return {
      verdict:         'parse_failed',
      overallScore:    0,
      summary:         'Failed to parse AI review response',
      criticalIssues:  [],
      warnings:        [],
      missingElements: [],
      strengths:       [],
      readyForPhase2:  false
    }
  }
}

// ─── Step 7: autoAddVendorWarnings ───────────────────────────────────────────

function autoAddVendorWarnings(review, vcReview) {
  if (!review || !vcReview) return review

  const alreadyCovered = new Set([
    ...(review.warnings || []).filter(w => w.area === 'vendor_compliance').flatMap(w => w.affectedIds || []),
    ...(review.criticalIssues || []).filter(i => i.area === 'vendor_compliance').flatMap(i => i.affectedIds || [])
  ])

  let autoCounter = 1
  for (const v of vcReview) {
    if (v.hasGaps && !alreadyCovered.has(v.solutionId)) {
      review.warnings.push({
        id:          `W-AUTO-VC-${autoCounter++}`,
        area:        'vendor_compliance',
        affectedIds: [v.solutionId],
        warning:     `${v.vendorName} does not cover required compliance: ${v.gaps.join(', ')} for ${v.solutionName}`,
        suggestion:  'Verify vendor compliance coverage or select an alternative vendor in Phase 1.6'
      })
    }
  }

  return review
}

// ─── Step 8: harmonizeResponse ───────────────────────────────────────────────

function harmonizeResponse(review, raw) {
  const trackingId = raw.trackingId || `req_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`
  const timestamp = new Date().toISOString()

  const ref = review || {}

  // Build qualityWarnings[] — formatted strings
  const qualityWarnings = []
  for (const issue of (ref.criticalIssues || [])) {
    const prefix = issue.severity === 'critical' ? '[CRITICAL]'
                 : issue.severity === 'high'     ? '[HIGH]'
                 : '[MEDIUM]'
    const area   = issue.area ? `[${issue.area.toUpperCase()}]` : ''
    const ids    = (issue.affectedIds || []).join(', ')
    qualityWarnings.push(`${prefix} ${area}${ids ? ` (${ids})` : ''}: ${issue.issue} — ${issue.recommendation}`)
  }
  for (const w of (ref.warnings || [])) {
    const area = w.area ? `[${w.area.toUpperCase()}]` : ''
    const ids  = (w.affectedIds || []).join(', ')
    qualityWarnings.push(`[WARNING] ${area}${ids ? ` (${ids})` : ''}: ${w.warning} — ${w.suggestion}`)
  }

  const readyForPhase2 = ref.readyForPhase2 === true
  const reflectionError = ref.verdict === 'fail'
    ? `Quality review found ${ref.criticalIssues.filter(i => i.severity === 'critical').length} critical issue(s). Review and address before proceeding to Phase 2.`
    : ref.verdict === 'parse_failed'
      ? 'Failed to parse AI review response'
      : null

  const phase1Score = raw.qualityMetrics?.overallScore || raw.qualityMetrics?.phase1Score || null

  return {
    status:     readyForPhase2 ? 'ready' : 'needs_review',
    phase:      'reflection',
    trackingId,
    timestamp,
    source:     'web_app',

    // Forward full pipeline data
    solutions:    raw.solutions    || [],
    benefits:     raw.benefits     || [],
    requirements: raw.requirements || [],
    validatedData: raw.validatedData || {},

    budgetAnalysis:          raw.budgetAnalysis || {},
    portfolioCostSummary:    raw.portfolioCostSummary || null,
    suggestedBudget:         raw.suggestedBudget || null,
    budgetRationale:         raw.budgetRationale || null,
    discoveryMethod:         raw.discoveryMethod || 'ai_generated',
    costEstimationStatus:    raw.costEstimationStatus || 'pending',
    costEstimationWarnings:  raw.costEstimationWarnings || [],
    defaultHorizonYears:     raw.validatedData?.timeHorizonYears || 3,
    portfolioCostReview:     null,

    deferredSolutionIds:     raw.deferredSolutionIds || [],
    descopedBudgetAnalysis:  raw.descopedBudgetAnalysis || null,
    rescopingRecommendation: raw.rescopingRecommendation || null,
    descopedPortfolio:       raw.descopedPortfolio || [],

    // THE KEY OUTPUT
    reflection: {
      verdict:         ref.verdict || 'parse_failed',
      overallScore:    ref.overallScore || 0,
      summary:         ref.summary || '',
      readyForPhase2,
      reflectionError,

      strengths:       ref.strengths || [],
      criticalIssues:  ref.criticalIssues || [],
      warnings:        ref.warnings || [],
      missingElements: ref.missingElements || []
    },

    qualityMetrics: {
      overallScore:        ref.overallScore || 0,
      reflectionScore:     ref.overallScore || 0,
      phase1Score:         phase1Score,
      dualFieldsPresent:   true,
      dualFieldsValidated: true
    },

    qualityWarnings,

    reflectionError,
    reflectionStatus: ref.verdict === 'parse_failed' ? 'parse_failed' : 'success',
    retryRecommended: ref.verdict === 'parse_failed',
    retryCount:       0
  }
}

// ─── Route Handler ───────────────────────────────────────────────────────────

router.post('/phase1-reflection', async (req, res) => {
  try {
    const raw = req.body
    const { solutions, benefits, validatedData, errors, deferredSolutionIds } = normalizeInputs(raw)

    if (errors.length) {
      return res.status(400).json([{
        status: 'error',
        phase: 'reflection',
        errors,
        reflection: { verdict: 'fail', overallScore: 0, readyForPhase2: false, reflectionError: errors.join('; ') }
      }])
    }

    const context  = buildReviewContext(raw)
    const vcReview = vendorComplianceCheck(solutions, validatedData, deferredSolutionIds)
    const prompt   = preparePrompt(context, vcReview)

    let review = null
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const text = await callClaude(client, prompt)
        review = parseReviewResponse(text)
        if (review && review.verdict !== 'parse_failed') {
          console.log(`Reflection AI attempt ${attempt + 1}: verdict=${review.verdict}, score=${review.overallScore}`)
          break
        }
        console.log(`Reflection AI attempt ${attempt + 1}: parse failed, retrying...`)
      } catch (err) {
        console.error(`Reflection AI attempt ${attempt + 1} error:`, err.message)
      }
    }

    if (!review) {
      review = {
        verdict: 'parse_failed', overallScore: 0, summary: 'AI review failed after 2 attempts',
        criticalIssues: [], warnings: [], missingElements: [], strengths: [], readyForPhase2: false
      }
    }

    review = autoAddVendorWarnings(review, vcReview)
    const response = harmonizeResponse(review, raw)
    return res.json([response])

  } catch (err) {
    console.error('Phase 1 Reflection error:', err)
    return res.status(500).json([{
      status: 'error',
      phase: 'reflection',
      errorMessage: err.message,
      reflection: { verdict: 'fail', overallScore: 0, readyForPhase2: false, reflectionError: err.message }
    }])
  }
})

export default router
