// ═══════════════════════════════════════════════════════════════════
// BCA.AI — Phase 5: Report Generation
// Pure JavaScript template assembly — NO Claude API call
// 6 sequential steps
// ═══════════════════════════════════════════════════════════════════
import { Router } from 'express'

const router = Router()

// ─── Utility ─────────────────────────────────────────────────────
const n = (v, fallback = 0) => {
  const num = Number(v)
  return Number.isFinite(num) ? num : fallback
}

function fmt(v) {
  return Math.round(n(v)).toLocaleString('en-US')
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ═════════════════════════════════════════════════════════════════
// Step 1 — extractAndNormalize
// ═════════════════════════════════════════════════════════════════
function extractAndNormalize(raw) {
  const rawSolutions = raw.solutions || []

  // Explicitly map vendor fields on every solution
  const solutions = rawSolutions.map(s => ({
    ...s,
    selectedVendor:   s.selectedVendor   || null,
    vendorFitScore:   s.vendorFitScore   ?? s.selectedVendor?.fitScore   ?? null,
    vendorName:       s.vendorName       || s.selectedVendor?.name       || null,
    vendorCostLow:    s.vendorCostLow    ?? s.selectedVendor?.vendorCostLow  ?? null,
    vendorCostHigh:   s.vendorCostHigh   ?? s.selectedVendor?.vendorCostHigh ?? null,
    deliveryTimeline: s.deliveryTimeline || s.selectedVendor?.deliveryTimeline || null,
    vendors:          Array.isArray(s.vendors) ? s.vendors : []
  }))

  const benefits        = raw.benefits        || []
  const requirements    = raw.requirements    || []
  const recommendation  = raw.recommendation  || {}
  const financialsP4    = raw.financialsP4    || {}
  const sensitivity     = raw.sensitivity     || []
  const benefitSens     = raw.benefitSensitivity || []
  const budgetAnalysis  = raw.budgetAnalysis  || {}
  const executiveHealth = raw.executiveHealth || null
  const cbaSummary      = raw.cbaSummary      || { markdown: '', html: '' }
  const qualityScore    = raw.qualityScore    || {}
  const vendorData      = raw.vendorData      || []
  const timeline        = raw.timeline        || {}
  const phase5Contract  = raw.phase5Contract  || {}

  const traceability         = raw.traceability         || null
  const traceabilityCoverage = raw.traceabilityCoverage || raw.traceability || {}
  const orgFriction          = raw.orgFriction          || null
  const alreadyTried         = raw.validatedData?.alreadyTried || raw.alreadyTried || null

  const financialsP4Missing = !financialsP4?.totalPVBenefit3y
  const withinCeiling = raw.withinCeiling ?? budgetAnalysis.withinCeiling ?? null

  const portfolioMetrics = raw.portfolioMetrics || null

  // User override fields
  const userOverride = {
    isOverride:              raw.isOverride              || recommendation?.isOverride || false,
    userSelectedSolutionId:  raw.userSelectedSolutionId  || recommendation?.userOverride?.userSelectedSolutionId || null,
    overrideReason:          raw.overrideReason          || recommendation?.userOverride?.overrideReason || null,
    aiRecommendedName:       raw.aiRecommendedSolutionId || recommendation?.aiRecommendation?.solutionId || null
  }

  const projectTitle = raw.project?.title || raw.projectMeta?.projectTitle || raw.validatedData?.projectTitle || 'BCA Report'
  const trackingId   = raw.trackingId || `req_${Date.now()}_p5`

  return {
    raw, solutions, benefits, requirements,
    recommendation, financialsP4, sensitivity, benefitSensitivity: benefitSens,
    budgetAnalysis, executiveHealth, cbaSummary, qualityScore,
    vendorData, timeline, phase5Contract, traceability, traceabilityCoverage,
    orgFriction, alreadyTried,
    financialsP4Missing, withinCeiling, userOverride, portfolioMetrics,
    projectTitle, trackingId
  }
}

// ═════════════════════════════════════════════════════════════════
// Step 2 — validateAndSyncFinancials
// ═════════════════════════════════════════════════════════════════
function validateAndSyncFinancials(ctx) {
  const { recommendation, solutions, financialsP4, financialsP4Missing,
          withinCeiling, traceabilityCoverage, vendorData } = ctx

  const errors   = []
  const warnings = []

  // Hard errors
  if (!recommendation?.recommendedSolutionId)
    errors.push('Phase 4 recommendation missing: recommendedSolutionId')
  if (!recommendation?.ranking?.length)
    errors.push('Phase 4 ranking missing or empty')
  if (!solutions?.length)
    errors.push('Solutions array missing or empty')

  // Soft warnings
  if (financialsP4Missing)
    warnings.push('Missing Phase 4 portfolio financials — KPI cards may show blank')
  if (!financialsP4?.avgROIPct)
    warnings.push('Missing Phase 4 average ROI percentage')
  if (withinCeiling === false)
    warnings.push('Budget ceiling breached: total cost exceeds 85% of stated budget')
  if (traceabilityCoverage?.coveragePct < 60)
    warnings.push(`Low traceability coverage: ${traceabilityCoverage.coveragePct}%`)

  const hasVendorData       = Array.isArray(vendorData) && vendorData.length > 0
  const solutionsWithVendor = solutions.filter(s => s.vendorName).length
  if (!hasVendorData && solutionsWithVendor === 0)
    warnings.push('No vendor data — Phase 1.6 may not have run. Vendor fit defaulted to neutral in ranking.')

  const hasAuthoritative = solutions.some(s => s.financials?.npv != null) ||
    ctx.portfolioMetrics?.portfolio?.totalNPV != null

  ctx.validation = {
    ok: errors.length === 0,
    errors,
    warnings,
    financialsP4Missing,
    vendorDataPresent: hasVendorData || solutionsWithVendor > 0
  }
  ctx.hasAuthoritative = hasAuthoritative

  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Helper — buildSection1Infographic (Executive at a Glance)
// ═════════════════════════════════════════════════════════════════
function buildSection1Infographic(ctx, helpers) {
  const {
    recommendation, financialsP4, traceabilityCoverage, solutions,
    orgFriction, budgetAnalysis, raw
  } = ctx
  const { recRow, recSol, recVendorName, recFitScore, isOverride, aiName,
          benefitsData, requirementsData } = helpers

  // Problem statement (from user intake or Phase 1)
  const problemStatement = raw.validatedData?.problemStatement
    || raw.problemStatement
    || (requirementsData?.length > 0
      ? `Address ${requirementsData.length} business requirement${requirementsData.length !== 1 ? 's' : ''}`
      : 'Business transformation initiative')

  const businessImpact = raw.validatedData?.businessImpact
    || budgetAnalysis?.costOfInaction
    || 'Improve operational efficiency and reduce costs'

  const affectedUsers = orgFriction?.totalHeadcount
    || (orgFriction?.solutions || []).reduce((sum, s) => sum + (s.headcount || 0), 0)
    || 'Multiple business units'

  // Solution details
  const approachType = recRow?.solutionApproach || recSol?.solutionApproach || 'buy'
  const approachLabel = approachType === 'change'
    ? '⚙️ Process Change'
    : approachType === 'hybrid'
      ? '🔀 Hybrid'
      : '🛒 Software'

  // Financial impact
  const pv = n(financialsP4?.totalPVBenefit3y)
  const roi = n(financialsP4?.avgROIPct)
  const paybackMonths = n(financialsP4?.paybackMonths || 12)
  const confidencePct = Math.round(
    (financialsP4?.overallConfidence != null)
      ? (typeof financialsP4.overallConfidence === 'string'
          ? parseInt(financialsP4.overallConfidence)
          : financialsP4.overallConfidence * 100)
      : 85
  )

  // Top 3 risks (from recommendation or derived from quality warnings)
  const topRisks = (() => {
    // Try to use recommendation.topRisks if available
    if (recommendation.topRisks && Array.isArray(recommendation.topRisks) && recommendation.topRisks.length > 0) {
      return recommendation.topRisks.slice(0, 3).map(r => ({
        title: r.title || r.risk || r.description || 'Unknown Risk',
        likelihood: r.likelihood || 'Medium',
        impact: r.impact || 'Medium',
        mitigation: r.mitigation || r.mitigationPlan || 'See detailed risk assessment'
      }))
    }

    // Fallback: derive from org friction and quality warnings
    const derived = []

    // Risk 1: Change management (if process change solutions exist)
    if (orgFriction && (orgFriction.changeCount > 0 || orgFriction.winnerIsHighFriction)) {
      derived.push({
        title: 'Organizational Change Resistance',
        likelihood: orgFriction.winnerIsHighFriction ? 'High' : 'Medium',
        impact: 'High',
        mitigation: 'Executive sponsorship, phased rollout, dedicated change manager'
      })
    }

    // Risk 2: Vendor/implementation issues
    if (recVendorName && approachType === 'buy') {
      derived.push({
        title: 'Vendor Implementation Delays',
        likelihood: 'Medium',
        impact: 'High',
        mitigation: 'Clear SLAs in contract, phased delivery with milestones'
      })
    }

    // Risk 3: Budget or schedule overrun
    if (budgetAnalysis.withinCeiling === false) {
      derived.push({
        title: 'Budget Ceiling Breach',
        likelihood: 'High',
        impact: 'High',
        mitigation: 'Cost-phasing plan, contingency reserve, phased delivery'
      })
    } else {
      derived.push({
        title: 'Benefit Realization Timing',
        likelihood: 'Medium',
        impact: 'Medium',
        mitigation: 'Early wins program, adoption metrics tracked monthly'
      })
    }

    return derived.slice(0, 3)
  })()

  // Implementation readiness (from Phase 4 adoption readiness scoring)
  const adoptionReadiness = recommendation.adoptionReadiness || {}
  const implementationReadiness = (() => {
    const dimensions = {
      'Stakeholder Alignment': n(adoptionReadiness.stakeholderAlignment || 70),
      'Budget Approved': budgetAnalysis.withinBudget ? 90 : 60,
      'Resource Availability': n(adoptionReadiness.resourceAvailability || 65),
      'Process Clarity': n(adoptionReadiness.processClarity || 70),
      'Vendor Readiness': recVendorName && approachType !== 'change' ? 80 : 85,
      'Change Readiness': n(adoptionReadiness.changeReadiness || 60),
      'Risk Mitigation Plans': 75, // Assumed present since we have top 3 risks
      'Success Metrics Defined': requirementsData?.length > 0 ? 85 : 70,
      'Executive Sponsorship': isOverride ? 95 : 85,
      'Timeline Feasibility': n(adoptionReadiness.timelineFeasibility || 70)
    }

    // Calculate overall as average
    const overall = Math.round(
      Object.values(dimensions).reduce((a, b) => a + b, 0) / Object.keys(dimensions).length
    )

    return { overall, dimensions }
  })()

  return {
    problem: {
      statement: problemStatement,
      businessImpact,
      affectedUsers
    },
    solution: {
      name: recRow?.name || 'Recommended Solution',
      approach: approachType,
      approachLabel,
      vendor: recVendorName || null,
      fitScore: recFitScore || null
    },
    impact: {
      portfolioPV3y: pv,
      avgROI: roi,
      paybackMonths,
      confidencePct
    },
    topRisks,
    implementationReadiness,
    isOverride,
    aiRecommendedName: aiName
  }
}

// ═════════════════════════════════════════════════════════════════
// Step 3 — buildExecutiveNarrative
// ═════════════════════════════════════════════════════════════════
function buildExecutiveNarrative(ctx) {
  const {
    recommendation, financialsP4, traceabilityCoverage, solutions,
    benefits, requirements, executiveHealth, withinCeiling,
    hasAuthoritative, userOverride, traceability
  } = ctx

  const ranking = recommendation.ranking || []
  const recId   = recommendation.recommendedSolutionId
  const recRow  = ranking.find(r => r.solutionId === recId) || ranking[0]
  const isOverride    = userOverride.isOverride
  const overrideReason = userOverride.overrideReason || 'No reason provided'
  const aiName         = userOverride.aiRecommendedName || null

  const recSol       = solutions.find(s => s.id === recId) || {}
  const recVendorName = recRow?.vendorName || recSol.vendorName || null
  const recFitScore   = recRow?.vendorFitScore ?? recSol.vendorFitScore ?? null
  const recCostLow    = recSol.vendorCostLow ?? null
  const recCostHigh   = recSol.vendorCostHigh ?? null

  const coverage = n(traceabilityCoverage?.coveragePct)

  // Check for compliance gaps on recommended vendor
  const vcList = traceability?.vendorCompliance || traceability?.vendorCompliancePerSolution || []
  const recVC  = vcList.find(v => v.solutionId === recId)
  const gaps   = recVC?.gaps || []
  const hasComplianceGap = gaps.length > 0

  // Quality warnings
  const qualityWarnings = []
  if (coverage < 60)
    qualityWarnings.push(`⚠️ Low traceability coverage (${coverage}%)`)
  if (!hasAuthoritative)
    qualityWarnings.push('⚠️ Missing authoritative Phase 2 financial metrics')
  if (ranking.length < 3)
    qualityWarnings.push(`⚠️ Limited solution comparison (${ranking.length} solutions)`)
  if (!financialsP4?.totalPVBenefit3y)
    qualityWarnings.push('⚠️ Missing portfolio PV benefit calculation')
  if (isOverride && aiName)
    qualityWarnings.push(`ℹ️ User override active — AI recommended "${aiName}". Reason: ${overrideReason}`)
  if (hasComplianceGap)
    qualityWarnings.push(`⚠️ Recommended solution vendor has compliance gaps: ${gaps.join(', ')}`)
  if (withinCeiling === false)
    qualityWarnings.push('⚠️ Budget ceiling breached: costs exceed 85% of stated budget')

  // Headline and blurb
  let headline, blurb

  if (!recRow) {
    headline = 'Recommendation Unavailable'
    blurb    = 'Phase 4 recommendation data not found. See portfolio comparison.'
  } else if (isOverride) {
    headline = `Selected (User Override): ${recRow.name}`
    const vendorPart = recVendorName
      ? ` Delivery partner: ${recVendorName}${recFitScore != null ? ` (fit score: ${recFitScore}/100)` : ''}.`
      : ''
    blurb = `User selected ${recRow.name} as the preferred option, overriding the AI recommendation${aiName ? ` (AI pick: ${aiName})` : ''}.${vendorPart} See override reason in quality indicators.`
  } else {
    headline = `Recommended: ${recRow.name}`
    const vendorPart = recVendorName
      ? ` Delivery partner: ${recVendorName}${recFitScore != null ? ` (fit score: ${recFitScore}/100)` : ''}.`
      : ''
    blurb = `Based on Phase 4 composite ranking, ${recRow.name} emerges as the preferred option.${vendorPart}`
  }

  ctx.executiveSummary = {
    headline,
    blurb,
    rationale: recommendation?.recommendationRationale || recRow?.rationale || '—',
    isOverride,
    highlights: {
      portfolioPV3y:              financialsP4?.totalPVBenefit3y  ?? null,
      portfolioAvgROI:            financialsP4?.avgROIPct         ?? null,
      traceabilityCoveragePct:    traceabilityCoverage?.coveragePct ?? null,
      solutionCount:              solutions.length,
      benefitCount:               benefits?.length     ?? 0,
      requirementCount:           requirements?.length ?? 0,
      recommendedVendorName:      recVendorName || null,
      recommendedVendorFitScore:  recFitScore   ?? null,
      vendorCostRange:            (recCostLow != null && recCostHigh != null)
                                    ? { low: recCostLow, high: recCostHigh } : null
    },
    qualityWarnings,
    healthBadge: executiveHealth ? {
      status:             (executiveHealth.overallStatus || '').toUpperCase(),
      budgetStatus:       (executiveHealth.budgetHealth?.status || '').toUpperCase(),
      traceabilityStatus: (executiveHealth.traceabilityHealth?.status || '').toUpperCase(),
      confidenceStatus:   (executiveHealth.confidenceHealth?.status || '').toUpperCase()
    } : null,
    notes: [
      'Phase 5 does not override the decision from Phase 4; it explains and packages the result.',
      `Portfolio definition: all ${solutions.length} solution${solutions.length !== 1 ? 's' : ''} are evaluated together as one combined investment — costs, benefits, and risks are assessed at the portfolio level, not per solution in isolation.`,
      recVendorName ? `Delivery vendor: ${recVendorName}${recFitScore != null ? ` (fit score: ${recFitScore}/100)` : ''}` : null
    ].filter(Boolean)
  }

  // ── Build Section 1: One-Page Infographic ──────────────────────
  // Extracts problem, solution, impact, risks, and implementation readiness
  const section1 = buildSection1Infographic(ctx, {
    recRow, recSol, recVendorName, recFitScore, isOverride, aiName,
    benefitsData: benefits, requirementsData: requirements
  })
  ctx.section1 = section1

  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 4 — cbaSummaryRenderer
// ═════════════════════════════════════════════════════════════════
function cbaSummaryRenderer(ctx) {
  const { cbaSummary } = ctx

  // Simple markdown → HTML for pipe tables
  function mdToSimpleHtml(markdown) {
    if (!markdown) return ''
    const lines = markdown.split('\n')
    let html = ''
    let inTable = false

    for (const line of lines) {
      const trimmed = line.trim()

      // Pipe table detection
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        // Separator row — skip
        if (/^\|[-:\s|]+\|$/.test(trimmed)) continue

        const cells = trimmed.split('|').slice(1, -1).map(c => c.trim())

        if (!inTable) {
          html += '<table><thead><tr>'
          cells.forEach(c => { html += `<th>${esc(c)}</th>` })
          html += '</tr></thead><tbody>'
          inTable = true
        } else {
          html += '<tr>'
          cells.forEach(c => { html += `<td>${esc(c)}</td>` })
          html += '</tr>'
        }
        continue
      }

      if (inTable) {
        html += '</tbody></table>'
        inTable = false
      }

      // Headings
      if (trimmed.startsWith('### '))      { html += `<h3>${esc(trimmed.slice(4))}</h3>`; continue }
      if (trimmed.startsWith('## '))       { html += `<h2>${esc(trimmed.slice(3))}</h2>`; continue }
      if (trimmed.startsWith('# '))        { html += `<h1>${esc(trimmed.slice(2))}</h1>`; continue }

      // Blockquote
      if (trimmed.startsWith('> '))        { html += `<blockquote>${trimmed.slice(2)}</blockquote>`; continue }

      // List items
      if (trimmed.startsWith('- '))        { html += `<li>${trimmed.slice(2)}</li>`; continue }

      // Bold + italic inline
      let processed = trimmed
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>')

      if (processed) html += `<p>${processed}</p>`
    }

    if (inTable) html += '</tbody></table>'
    return html
  }

  // Render markdown to HTML (supplement the Phase 4 html with rendered markdown)
  ctx.renderedCbaHtml = mdToSimpleHtml(cbaSummary.markdown)

  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 5 — exportHtml
// ═════════════════════════════════════════════════════════════════
function exportHtml(ctx) {
  const {
    projectTitle, trackingId, solutions, benefits, requirements,
    recommendation, financialsP4, sensitivity, benefitSensitivity,
    budgetAnalysis, executiveSummary, executiveHealth, cbaSummary,
    traceability, traceabilityCoverage, qualityScore, vendorData,
    timeline, withinCeiling, userOverride, orgFriction, alreadyTried
  } = ctx

  const ranking    = recommendation.ranking || []
  const recId      = recommendation.recommendedSolutionId
  const recRow     = ranking.find(r => r.solutionId === recId) || ranking[0]
  const isOverride = userOverride.isOverride
  const aiName     = recommendation.aiRecommendation?.name || userOverride.aiRecommendedName || null
  const overrideReason = userOverride.overrideReason || 'No reason provided'

  const discountRate  = financialsP4.discountRate || 0.12
  const horizonYears  = financialsP4.horizonYears || 3

  // Vendor compliance lookup
  const vcList = traceability?.vendorCompliance || traceability?.vendorCompliancePerSolution || []
  const vcById = {}
  vcList.forEach(vc => { vcById[vc.solutionId] = vc })

  // Sanitise cbaSummary.html
  function sanitiseCbaHtml(html) {
    return String(html || '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '')
      .replace(/javascript:/gi, '')
  }

  // Phase breadcrumb
  const prevPhases = ctx.raw.phaseResults || []
  const breadcrumb = [
    ...prevPhases.filter(p => p.phase !== 5),
    {
      phase: 5, ok: true,
      metrics: {
        solutions: solutions.length,
        traceabilityCoveragePct: n(traceabilityCoverage?.coveragePct),
        exportEnabled: true
      }
    }
  ]
  ctx.breadcrumb = breadcrumb

  const pipelineStr = breadcrumb.map(p => `Phase ${p.phase} ${p.ok ? '✓' : '✗'}`).join(' → ')

  // Ceiling breach banner
  const ceilingBannerHtml = withinCeiling === false
    ? `<div style="background:#fff3cd;border-left:4px solid #ffc107;padding:12px 16px;margin:12px 0">
        ⚠️ <strong>Budget Ceiling Notice:</strong> Total portfolio cost exceeds 85% of the
        stated budget. Review cost estimates before client delivery.
       </div>`
    : ''

  // Override notice
  const overrideBannerHtml = isOverride
    ? `<div style="background:#e3f2fd;border-left:4px solid #1976d2;padding:12px 16px;margin:12px 0">
        👤 <strong>User Override Active:</strong> AI recommended "${esc(aiName)}".
        User selected "${esc(recRow?.name)}". Reason: ${esc(overrideReason)}
       </div>`
    : ''

  // Quality warnings box
  const warningsHtml = executiveSummary.qualityWarnings.length > 0
    ? `<div class="warning-box">
        <strong>Quality Indicators:</strong>
        <ul>${executiveSummary.qualityWarnings.map(w => `<li>${w}</li>`).join('')}</ul>
       </div>`
    : ''

  // KPI cards
  const kpiCards = `
    <div>
      <div class="metric-card">
        <strong>$${fmt(financialsP4.totalPVBenefit3y)}</strong>
        <span>Portfolio PV (${horizonYears}Y)</span>
      </div>
      <div class="metric-card">
        <strong>${financialsP4.avgROIPct ?? '—'}%</strong>
        <span>Average ROI</span>
      </div>
      <div class="metric-card">
        <strong>${traceabilityCoverage?.coveragePct ?? '—'}%</strong>
        <span>Traceability</span>
      </div>
      <div class="metric-card">
        ${recRow?.solutionApproach === 'change'
          ? `<strong>⚙️ Process Change</strong><span>Approach Type</span>`
          : recRow?.solutionApproach === 'hybrid'
          ? `<strong>🔀 Hybrid</strong><span>Approach Type</span>`
          : `<strong>${esc(recRow?.vendorName || '—')}</strong><span>Recommended Vendor</span>`}
      </div>
    </div>`

  // Portfolio overview table
  const portfolioRows = solutions.map(s => {
    const approachLabel = s.solutionApproach === 'change' ? '⚙️ Process' : '🛒 Software'
    const vendorCell = s.solutionApproach === 'change' ? 'Process Change' : esc(s.vendorName || '—')
    const fitCell = s.solutionApproach === 'change' ? '—' : (s.vendorFitScore != null ? s.vendorFitScore + '/100' : '—')
    return `
    <tr>
      <td>${esc(s.name)}</td>
      <td style="font-size:11px;">${approachLabel}</td>
      <td>$${fmt(s.totalCost || s.estimatedCostUSD || 0)}</td>
      <td>${vendorCell}</td>
      <td>${fitCell}</td>
      <td>${esc(s.riskLevel || '—')}</td>
      <td>${s.deliveryPhase || '—'}</td>
    </tr>`
  }).join('')

  // Ranking table
  const rankingRows = ranking.map(r => {
    const highlight = r.solutionId === recId
    const style = highlight ? ' style="background:#e8f5e9;font-weight:600"' : ''
    const badge = highlight ? (isOverride ? ' 👤 USER SELECTED' : ' ⭐ RECOMMENDED') : ''
    const rankVendor = r.solutionApproach === 'change' ? 'Process Change' : esc(r.vendorName || '—')
    const rankFit = r.solutionApproach === 'change' ? '—' : (r.vendorFitScore != null ? r.vendorFitScore + '/100' : '—')
    return `
    <tr${style}>
      <td>${r.rank}</td>
      <td>${esc(r.name)}${badge}</td>
      <td>${r.score}</td>
      <td>$${fmt(r.npv)}</td>
      <td>${Math.round(r.roiPct)}%</td>
      <td>${esc(r.riskLevel)}</td>
      <td>${rankVendor}</td>
      <td>${rankFit}</td>
      <td>${r.paybackMonths != null ? r.paybackMonths + 'mo' : '—'}</td>
    </tr>`
  }).join('')

  // Vendor summary table
  const vendorRows = solutions.map(s => {
    const vc = vcById[s.id]
    const gapsList = vc?.gaps?.length ? vc.gaps.join(', ') : '✓ None'
    const isChange  = s.solutionApproach === 'change'
    const isHybrid  = s.solutionApproach === 'hybrid'
    const costRange = (s.vendorCostLow != null && s.vendorCostHigh != null && !isChange)
      ? `$${fmt(s.vendorCostLow)} – $${fmt(s.vendorCostHigh)}` : (isChange ? 'No procurement cost' : '—')
    const vendorCell = isChange
      ? '<em style="color:#b45309;">Internal / Process delivery — no vendor required</em>'
      : isHybrid
        ? `${esc(s.vendorName || '—')} <span style="font-size:11px;color:#6d28d9;">(+ change management lead)</span>`
        : esc(s.vendorName || '—')
    const fitCell = isChange ? 'N/A' : (s.vendorFitScore != null ? s.vendorFitScore + '/100' : '—')
    return `
    <tr>
      <td>${esc(s.name)}</td>
      <td>${vendorCell}</td>
      <td>${fitCell}</td>
      <td>${costRange}</td>
      <td>${s.selectedVendor?.complianceCoverage?.join(', ') || '—'}</td>
      <td>${gapsList}</td>
    </tr>`
  }).join('')

  // Benefits summary table
  const benefitRows = benefits.map(b => {
    const conf = b.confidence != null
      ? Math.round(b.confidence <= 1 ? b.confidence * 100 : b.confidence)
      : '—'
    return `
    <tr>
      <td>${esc(b.id)}</td>
      <td>${esc(b.category)}</td>
      <td>${esc(b.description)}</td>
      <td>$${fmt(b.annualizedValue || b.riskAdjustedValue || 0)}</td>
      <td>${conf}%</td>
      <td>${esc(b.valueBasis || '—')}</td>
    </tr>`
  }).join('')

  // Budget analysis table
  const ba = budgetAnalysis
  const budgetRows = `
    <tr><td>Total Initial Investment</td><td>$${fmt(ba.totalRecommendedCost || 0)}</td></tr>
    <tr><td>Total Budget</td><td>$${fmt(ba.budget || 0)}</td></tr>
    <tr><td>Budget Utilisation</td><td>${ba.budgetUtilizationPct ?? '—'}%</td></tr>
    <tr><td>Within Budget</td><td>${ba.withinBudget ? '✓ Yes' : '✗ No'}</td></tr>
    <tr><td>Within 85% Ceiling</td><td>${ba.withinCeiling ? '✓ Yes' : '✗ BREACHED'}</td></tr>`

  // Sensitivity table
  const sensRows = sensitivity.map(s => {
    const isBase = Math.abs(s.discountRate - discountRate) < 0.001
    const style = isBase ? ' style="font-weight:600;background:#e3f2fd"' : ''
    return `
    <tr${style}>
      <td>${Math.round(s.discountRate * 100)}%${isBase ? ' (base)' : ''}</td>
      <td>$${fmt(s.portfolioPVBenefit)}</td>
    </tr>`
  }).join('')

  // Benefit scenarios table
  const benefitScenarioRows = benefitSensitivity.map(s => `
    <tr>
      <td>${esc(s.label)}</td>
      <td>$${fmt(s.portfolioPV)}</td>
      <td>${s.portfolioROI}%</td>
    </tr>`).join('')

  // Org Friction section (only rendered when process-change solutions exist)
  let orgFrictionHtml = ''
  if (orgFriction && orgFriction.solutions && orgFriction.solutions.length > 0) {
    const pfBanner = orgFriction.isProcessFirst
      ? `<div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:12px 16px;margin:12px 0">
           ⚙️ <strong>Process-First Portfolio:</strong> ${orgFriction.changeCount} of ${orgFriction.totalSolutions} solutions are Process Change.
           Delivery path: <strong>${orgFriction.deliveryPath.replace('_', ' ')}</strong>.
           Primary workstream is change management, not vendor procurement.
         </div>`
      : ''

    const hfWinner = orgFriction.winnerIsHighFriction
      ? `<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;margin:12px 0">
           🔴 <strong>High-Friction Winner:</strong> The #1 ranked solution is a high-friction process change.
           Ensure executive sponsorship, dedicated change management, and a full adoption plan before committing.
         </div>`
      : ''

    const frictionRows = orgFriction.solutions.map(s => `
      <tr>
        <td>${esc(s.solutionName)}${s.ranksFirst ? ' ⭐' : ''}</td>
        <td style="font-weight:700;color:${s.level === 'High' ? '#dc2626' : s.level === 'Medium' ? '#d97706' : '#16a34a'};">${s.score}/100 — ${s.level}</td>
        <td>${esc(s.riskLevel)}</td>
        <td>${s.headcount > 0 ? s.headcount : '—'}</td>
        <td>${s.interventionTypes.length > 0 ? s.interventionTypes.join(', ') : '—'}</td>
      </tr>`).join('')

    orgFrictionHtml = `
      ${pfBanner}
      ${hfWinner}
      <h2>Org Friction Analysis</h2>
      <p style="color:#666;font-size:13px;">Friction score = Risk Factor × Headcount Factor × Complexity Factor (scaled 0–100).
         Low &lt;30 · Medium 30–60 · High 60+. Higher friction = more change management investment required.</p>
      <table>
        <thead><tr><th>Process Change Solution</th><th>Friction Score</th><th>Risk</th><th>Headcount</th><th>Intervention Types</th></tr></thead>
        <tbody>${frictionRows}</tbody>
      </table>`
  }

  // Timeline section — PLC phase names with phase number, weight % and approx cost
  const timelinePhases = timeline?.phases || []
  const timelineTotalCost = n(timeline?.projectTimeline?.totalCost) ||
    solutions.reduce((sum, s) => sum + n(s.totalCost || s.estimatedCostUSD || 0), 0)
  const timelineHtml = timelinePhases.length > 0
    ? `<h2>Project Timeline</h2>
       <p class="note">Approximate cost per phase is calculated by applying each phase's schedule weight to the total portfolio cost.
          Actual spending will vary based on vendor payment milestones and resource scheduling.</p>
       <table>
         <thead><tr><th>#</th><th>PLC Phase</th><th>Weight</th><th>Approx. Cost</th><th>Start Week</th><th>End Week</th><th>Duration</th></tr></thead>
         <tbody>${timelinePhases.map(p => {
           const approxCost = p.weightPct != null && timelineTotalCost > 0
             ? `$${fmt(timelineTotalCost * p.weightPct / 100)}`
             : '—'
           return `
           <tr>
             <td style="text-align:center;font-weight:700;color:#1976d2;">${p.plcPhase ?? '—'}</td>
             <td><strong>${esc(p.name)}</strong></td>
             <td style="text-align:center;color:#555;">${p.weightPct != null ? p.weightPct + '%' : '—'}</td>
             <td style="font-weight:600;color:#1976d2;">${approxCost}</td>
             <td>Week ${p.startWeek}</td>
             <td>Week ${p.endWeek}</td>
             <td>${p.endWeek - p.startWeek + 1} weeks</td>
           </tr>`}).join('')}
         </tbody>
       </table>
       <p class="note">Total portfolio cost: $${fmt(timelineTotalCost)} |
          Total duration: ${timeline?.projectTimeline?.totalDurationWeeks || '—'} weeks |
          Start: ${timeline?.projectTimeline?.projectStartDate || '—'}</p>`
    : ''

  // Assemble full HTML document
  const htmlDocument = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${esc(projectTitle)}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 24px; line-height: 1.6; color: #333; }
    h1,h2,h3 { margin: 0.6em 0 0.4em; color: #1976d2; }
    h1 { font-size: 28px; border-bottom: 3px solid #1976d2; padding-bottom: 8px; }
    h2 { font-size: 22px; margin-top: 24px; }
    h3 { font-size: 18px; margin-top: 16px; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 14px; }
    th, td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; }
    thead { background: #1976d2; color: white; }
    tbody tr:hover { background: #f5f5f5; }
    .note { color: #666; font-size: 0.9em; font-style: italic; }
    .banner { padding: 16px; background: #1976d2; color: white; border-radius: 8px; margin: 16px 0; }
    .banner strong { font-size: 18px; }
    .metric-card { display: inline-block; margin: 8px 12px 8px 0; padding: 12px 16px;
      background: #f8f9fa; border-left: 4px solid #1976d2; border-radius: 4px; }
    .metric-card strong { display: block; font-size: 24px; color: #1976d2; margin-bottom: 4px; }
    .metric-card span { font-size: 12px; color: #666; text-transform: uppercase; }
    .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px 16px; margin: 8px 0; }
    .info-box { background: #e3f2fd; border-left: 4px solid #1976d2; padding: 12px 16px; margin: 8px 0; }
  </style>
</head>
<body>

  <h1>${esc(projectTitle)}</h1>

  ${ceilingBannerHtml}
  ${overrideBannerHtml}

  <div class="banner">
    <strong>📊 ${isOverride ? 'Selected (User Override)' : 'Recommendation'}: ${esc(recRow?.name || '—')}</strong><br>
    <span>${esc(executiveSummary.rationale)}</span>
  </div>

  ${warningsHtml}

  <h2>Executive Summary</h2>
  <p>${esc(executiveSummary.blurb)}</p>

  ${kpiCards}

  <p class="note">Pipeline: ${pipelineStr}</p>

  <h2>Portfolio Overview</h2>
  <table>
    <thead><tr><th>Solution</th><th>Approach</th><th>Cost</th><th>Vendor</th><th>Fit</th><th>Risk</th><th>Phase</th></tr></thead>
    <tbody>${portfolioRows}</tbody>
  </table>

  ${sanitiseCbaHtml(cbaSummary.html || '')}

  <h2>Solution Ranking</h2>
  <table>
    <thead><tr><th>#</th><th>Solution</th><th>Score</th><th>PV(${horizonYears}Y)</th><th>ROI</th>
      <th>Risk</th><th>Vendor</th><th>Fit</th><th>Payback</th></tr></thead>
    <tbody>${rankingRows}</tbody>
  </table>

  <h2>Vendor Summary</h2>
  <table>
    <thead><tr><th>Solution</th><th>Vendor</th><th>Fit Score</th><th>Cost Range</th>
      <th>Compliance</th><th>Gaps</th></tr></thead>
    <tbody>${vendorRows}</tbody>
  </table>

  <h2>Benefits Summary</h2>
  <table>
    <thead><tr><th>ID</th><th>Category</th><th>Description</th>
      <th>Annual Value</th><th>Confidence</th><th>Source</th></tr></thead>
    <tbody>${benefitRows}</tbody>
  </table>

  <h2>Budget Analysis</h2>
  <table>
    <thead><tr><th>Metric</th><th>Value</th></tr></thead>
    <tbody>${budgetRows}</tbody>
  </table>

  <h2>Sensitivity Analysis — Discount Rate</h2>
  <table>
    <thead><tr><th>Discount Rate</th><th>Portfolio PV (${horizonYears}Y)</th></tr></thead>
    <tbody>${sensRows}</tbody>
  </table>

  <h2>Sensitivity Analysis — Benefit Scenarios</h2>
  <table>
    <thead><tr><th>Scenario</th><th>Portfolio PV</th><th>Portfolio ROI</th></tr></thead>
    <tbody>${benefitScenarioRows}</tbody>
  </table>

  ${timelineHtml}

  ${orgFrictionHtml}

  <h2>Methodology</h2>
  <p class="note">
    Scoring weights: NPV 35% | ROI 20% | Confidence 15% | Risk 15% | Vendor Fit 15%<br>
    Discount rate: ${Math.round(discountRate * 100)}% | Horizon: ${horizonYears} years<br>
    Quality score: ${qualityScore?.overallScore ?? '—'}/100<br>
    Tracking ID: ${trackingId}
  </p>

  ${(() => {
    // ── Alternatives Considered ──────────────────────────────────
    const chips  = alreadyTried?.chips?.length ? alreadyTried.chips : []
    const text   = alreadyTried?.text || ''
    if (!chips.length && !text) return ''
    const chipList = chips.length
      ? `<ul>${chips.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''
    const textPara = text
      ? `<p style="margin:8px 0 0;font-size:14px;color:#444;">${esc(text)}</p>` : ''
    return `
    <h2>Alternatives Considered</h2>
    <div class="info-box">
      <p style="margin:0 0 8px;font-size:14px;"><strong>The following approaches were attempted or evaluated before this business case was commissioned.
      They did not fully resolve the problem:</strong></p>
      ${chipList}${textPara}
    </div>`
  })()}

  ${(() => {
    // ── Training & Adoption Plan ─────────────────────────────────
    const changeSols  = solutions.filter(s => s.solutionApproach === 'change')
    const hybridSols  = solutions.filter(s => s.solutionApproach === 'hybrid')
    if (!changeSols.length && !hybridSols.length) return ''

    const changeRows = changeSols.map(s => `
      <tr>
        <td>${esc(s.name)}</td>
        <td>⚙️ Process Change</td>
        <td>${s.orgFriction?.level || (s.riskLevel === 'High' ? 'High' : s.riskLevel === 'Medium' ? 'Medium' : 'Low')} friction</td>
        <td>${s.orgFriction?.headcount > 0 ? s.orgFriction.headcount + ' staff' : 'TBD'}</td>
        <td>SOP rewrites · Staff training · Change communications · Adoption monitoring</td>
      </tr>`).join('')

    const hybridRows = hybridSols.map(s => `
      <tr>
        <td>${esc(s.name)}</td>
        <td>🔀 Hybrid</td>
        <td>Vendor + Change lead</td>
        <td>TBD</td>
        <td>Vendor onboarding · Process redesign · End-user training · Adoption metrics</td>
      </tr>`).join('')

    return `
    <h2>Training &amp; Adoption Plan</h2>
    <div class="info-box" style="margin-bottom:12px;">
      This portfolio includes <strong>${changeSols.length} process change</strong> and
      <strong>${hybridSols.length} hybrid</strong> solution(s). These require a structured adoption
      programme — software alone will not deliver the benefit. The organisation must invest in
      training, communication, and change management to realise projected value.
    </div>
    <table>
      <thead><tr><th>Solution</th><th>Type</th><th>Complexity</th><th>People Impact</th><th>Key Adoption Activities</th></tr></thead>
      <tbody>${changeRows}${hybridRows}</tbody>
    </table>
    <p class="note">Recommended: assign a dedicated Change Manager before project kick-off. Set adoption KPIs (e.g. process compliance rate, training completion %) alongside technical KPIs.</p>`
  })()}

  ${(() => {
    // ── Recommended Next Steps ───────────────────────────────────
    const recSol     = solutions.find(s => s.id === recommendation.recommendedSolutionId) || solutions[0]
    const recRank    = (recommendation.ranking || [])[0] || {}
    const approach   = recRank.solutionApproach || recSol?.solutionApproach || 'buy'
    const vendor     = recRank.vendorName || recSol?.vendorName || null
    const solName    = recommendation.recommendedSolutionName || recSol?.name || '—'
    const delivPath  = orgFriction?.deliveryPath || 'vendor_led'

    const buySteps = vendor ? [
      `Issue Request for Proposal (RFP) or begin contract negotiations with <strong>${esc(vendor)}</strong>`,
      `Assign a Project Sponsor and Project Manager from the business side`,
      `Schedule project kick-off meeting — align scope, timeline, and success criteria`,
      `Set up governance: steering committee, monthly reporting cadence, and escalation path`,
      `Establish benefit tracking baseline (measure current-state metrics before go-live)`
    ] : [
      `Identify and shortlist vendors for <strong>${esc(solName)}</strong> based on this analysis`,
      `Assign a Project Sponsor and Project Manager`,
      `Define procurement process and timeline`,
      `Set governance and reporting cadence`,
      `Baseline current-state metrics for benefit tracking`
    ]

    const changeSteps = [
      `Appoint a dedicated <strong>Change Manager</strong> — this is critical for a process-first delivery`,
      `Map all impacted staff and business units for <strong>${esc(solName)}</strong>`,
      `Design training programme: SOP updates, role-specific guides, and sign-off checkpoints`,
      `Schedule stakeholder communications and leadership alignment sessions`,
      `Define adoption metrics (compliance rate, error rate, time saved) and set 30/60/90-day targets`
    ]

    const hybridSteps = [
      `Negotiate contract with <strong>${esc(vendor || 'selected vendor')}</strong> and agree implementation timeline`,
      `Appoint both a <strong>Project Manager</strong> (vendor delivery) and <strong>Change Manager</strong> (people adoption)`,
      `Run parallel workstreams: vendor onboarding + internal process redesign`,
      `Build a combined training plan covering both the new tool and the new process`,
      `Define success criteria covering technology KPIs and adoption KPIs`
    ]

    const steps = approach === 'change' ? changeSteps
      : approach === 'hybrid' ? hybridSteps
      : buySteps

    return `
    <h2>Recommended Next Steps</h2>
    <div class="banner" style="margin-bottom:16px;">
      <strong>📋 Approved Recommendation: ${esc(solName)}</strong><br>
      <span style="font-size:14px;opacity:0.9;">${approach === 'change' ? '⚙️ Process Change — internal delivery, no vendor procurement' : approach === 'hybrid' ? `🔀 Hybrid — ${esc(vendor || 'vendor')} + internal change management` : `🛒 Software — ${esc(vendor || 'vendor to be confirmed')} via vendor procurement`}</span>
    </div>
    <p style="font-size:14px;color:#444;margin-bottom:12px;">The following immediate actions are recommended upon approval of this business case:</p>
    <ol style="font-size:14px;color:#333;line-height:1.8;padding-left:20px;">
      ${steps.map(s => `<li>${s}</li>`).join('')}
    </ol>
    <div class="info-box" style="margin-top:14px;">
      <strong>After delivery:</strong> Conduct a post-implementation review at 90 days. Compare actual
      benefits against the projections in this report. Document lessons learned and update the business
      case register.
    </div>`
  })()}

</body>
</html>`

  ctx.htmlDocument = htmlDocument
  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 6 — harmonizer
// ═════════════════════════════════════════════════════════════════
function harmonizer(ctx) {
  const {
    raw, solutions, benefits, requirements, recommendation,
    executiveSummary, executiveHealth, financialsP4,
    budgetAnalysis, qualityScore, sensitivity, benefitSensitivity,
    traceability, traceabilityCoverage, cbaSummary, vendorData,
    timeline, validation, userOverride, htmlDocument,
    projectTitle, trackingId, breadcrumb, portfolioMetrics, orgFriction,
    section1
  } = ctx

  return {
    status:     validation.ok ? 'success' : 'warning',
    phase:      5,
    trackingId,
    timestamp:  new Date().toISOString(),

    project: raw.project || { title: projectTitle, industry: raw.projectMeta?.industry || 'default' },
    projectMeta: raw.projectMeta || null,

    solutions,
    benefits,
    requirements,
    timeline,

    recommendation,
    executiveSummary,
    section1,
    executiveHealth,
    financialsP4,
    financialSummary: raw.financialSummary || null,
    portfolioMetrics: portfolioMetrics || null,
    budgetAnalysis,
    qualityScore,
    sensitivity,
    benefitSensitivity,
    traceability,
    traceabilityCoverage,
    cbaSummary,

    export: {
      enabled: true,
      format:  'html',
      html:    htmlDocument
    },

    orgFriction: orgFriction || null,

    validation,
    userOverride: userOverride.isOverride ? userOverride : null,
    vendorData,
    phaseResults: breadcrumb
  }
}

// ═════════════════════════════════════════════════════════════════
// Route
// ═════════════════════════════════════════════════════════════════
router.post('/phase5', async (req, res) => {
  try {
    const raw = req.body

    const step1 = extractAndNormalize(raw)
    const step2 = validateAndSyncFinancials(step1)

    if (!step2.validation.ok) {
      return res.status(400).json([{
        status: 'error', phase: 5,
        errors: step2.validation.errors
      }])
    }

    const step3  = buildExecutiveNarrative(step2)
    const step4  = cbaSummaryRenderer(step3)
    const step5  = exportHtml(step4)
    const output = harmonizer(step5)

    return res.json([output])
  } catch (err) {
    console.error('Phase 5 error:', err)
    return res.status(500).json([{
      status: 'error', phase: 5, errorMessage: err.message
    }])
  }
})

export default router
