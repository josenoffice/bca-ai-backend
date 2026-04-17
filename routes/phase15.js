import express from 'express'
import Anthropic from '@anthropic-ai/sdk'
import crypto from 'crypto'

const router = express.Router()
const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

// ─── Constants ───────────────────────────────────────────────────────────────

const BREAKDOWN_KEYS = ['labour', 'licensing', 'infrastructure', 'testing', 'training', 'contingency']
const CEILING_PCT = 0.85

const ACTION_MAP = {
  keep: 'keep_full_scope', full_scope: 'keep_full_scope', keep_full_scope: 'keep_full_scope',
  reduce: 'reduce_scope', reduce_scope: 'reduce_scope', descope: 'reduce_scope',
  defer: 'defer', deferred: 'defer', skip: 'defer', exclude: 'defer'
}

const SYSTEM_PROMPT = `You are a senior IT cost analyst with deep expertise in enterprise software
implementation pricing.

Your job is to provide REALISTIC, MARKET-RATE cost estimates for each solution
based on the tech stack, integrations, industry, and complexity.

PRICING PRINCIPLES:
- Use actual market rates, not round numbers
- Factor in: vendor licensing, implementation labour, infrastructure, testing,
  training, change management
- Consider integration complexity: each API/system integration adds $15K–$80K
  depending on complexity
- Security and compliance work commands premium rates ($150–$250/hour)
- Cloud migrations vary by data volume and existing architecture
- Always provide a range (low/high) plus a recommended midpoint
- If a vendor pricing anchor is provided, use it as your PRIMARY market rate reference
- If current estimate seems unrealistic, flag it with a note

COST BREAKDOWN REQUIREMENT:
For EVERY solution, the costBreakdown object MUST include ALL 6 of these exact keys:
  labour, licensing, infrastructure, testing, training, contingency
Use 0 for any category that does not apply. Never omit a key. Never use different names.

RECURRING COST REQUIREMENT:
For EVERY solution, include recurringAnnualCost (integer, USD).
This is the estimated ANNUAL ONGOING cost AFTER go-live. Must be realistic non-zero
for any cloud, SaaS, or hosted solution.
Includes: SaaS licences, platform fees, cloud hosting, support contracts, maintenance.
One-time costs (implementation labour, testing, training) are NOT recurring.

RECURRING COST EXAMPLES:
- AWS-hosted application: $30K/yr compute + $8K/yr support = 38000
- SaaS compliance platform (e.g. Drata): $40K/yr licence + $5K/yr support = 45000
- On-premise ERP integration: $15K/yr maintenance + $8K/yr support = 23000
- Ecommerce platform (Shopify Plus): $24K/yr licence + $12K/yr platform fees = 36000

Return ONLY valid JSON — no markdown fences, no explanation text.`

// ─── Helpers ─────────────────────────────────────────────────────────────────

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function generateTrackingId() {
  return `req_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`
}

// ─── Step 1: normalizeInputs ─────────────────────────────────────────────────

function normalizeInputs(raw) {
  const errors = []
  const solutions = raw.solutions || []
  const benefits = raw.benefits || []

  if (solutions.length === 0) errors.push('MISSING_SOLUTIONS')
  if (benefits.length === 0) errors.push('MISSING_BENEFITS')
  if (solutions.some(s => !s.id)) errors.push('INVALID_IDS')

  const validatedData = raw.validatedData || {}
  const budget = num(validatedData.budget) || num(raw.suggestedBudget) || 0
  const discountRatePct = num(validatedData.discountRatePct)
  const timeHorizonYears = num(validatedData.timeHorizonYears) || 3
  const deferredSolutionIds = raw.deferredSolutionIds || []
  const activeSolutions = solutions.filter(s => !deferredSolutionIds.includes(s.id))

  return { solutions: activeSolutions, allSolutions: solutions, benefits, validatedData, budget, discountRatePct, timeHorizonYears, deferredSolutionIds, errors }
}

// ─── Step 2: buildSolutionSummaries ──────────────────────────────────────────

function buildSolutionSummaries(activeSolutions) {
  return activeSolutions.map(s => ({
    id: s.id,
    name: s.name,
    category: s.category,
    description: (s.description || '').slice(0, 300),
    currentEstimate: s.costEstimate?.recommended || s.costEstimate?.mid || s.totalCost || 0,
    implementationTime: s.costEstimate?.implementationMonths || s.implementationTime || 0,
    riskLevel: s.riskLevel || 'Medium',
    selectedVendor: s.selectedVendor ? {
      name: s.selectedVendor.name,
      vendorCostLow: s.selectedVendor.vendorCostLow || null,
      vendorCostHigh: s.selectedVendor.vendorCostHigh || null,
      implementationMonths: s.selectedVendor.implementationMonths || null
    } : null
  }))
}

// ─── Step 3: preparePrompt ───────────────────────────────────────────────────

function preparePrompt(summaries, validatedData, budget) {
  const ctx = validatedData
  const ceiling = budget > 0 ? Math.round(budget * CEILING_PCT) : 0

  const budgetAwarenessBlock = budget > 0 ? `
BUDGET AWARENESS:
- Total project budget: $${budget.toLocaleString()}
- 85% ceiling (max recommended spend): $${ceiling.toLocaleString()}
- Provide REALISTIC market-rate estimates even if they exceed the budget.
  Do NOT compress estimates just to fit within budget.
- If sum of all solution mid estimates EXCEEDS the 85% ceiling:
  You MUST return a descopedPortfolio showing keep/reduce/defer per solution.
- If sum of all solution mid estimates is WITHIN the 85% ceiling:
  Return descopedPortfolio as exactly: []
` : ''

  const solutionList = summaries.map(s => {
    let vendorLine = ''
    if (s.selectedVendor) {
      const v = s.selectedVendor
      vendorLine = `\nVendor pricing anchor: ${v.name} — total cost $${(v.vendorCostLow || 0).toLocaleString()} to $${(v.vendorCostHigh || 0).toLocaleString()}, timeline: ${v.implementationMonths || '?'} months.\nUse as primary market rate reference.`
    }
    return `
--- ${s.id}: ${s.name} ---
Category: ${s.category}
Description: ${s.description}
Current estimate: $${s.currentEstimate.toLocaleString()}
Implementation time: ${s.implementationTime} months
Risk level: ${s.riskLevel}${vendorLine}`
  }).join('\n')

  const userPrompt = `
PROJECT CONTEXT
===============
Industry: ${ctx.industry || 'technology'}
Company Size: ${ctx.companySize || 'SME'}
Headcount: ${ctx.headcount || 'Not specified'}
Annual Revenue: ${num(ctx.annualRevenue) > 0 ? '$' + num(ctx.annualRevenue).toLocaleString() : 'Not provided'}
Technical Stack: ${(ctx.technicalStack || []).join(', ') || 'Not specified'}
System Integrations: ${(ctx.systemIntegrations || []).join(', ') || 'None'}
Compliance Requirements: ${(ctx.complianceRequirements || []).join(', ') || 'None'}
${budgetAwarenessBlock}

SOLUTIONS TO ESTIMATE
=====================
${solutionList}

REQUIRED OUTPUT FORMAT
======================
{
  "costEstimates": [
    {
      "solutionId": "SOL-001",
      "solutionName": "string",
      "costEstimate": {
        "low": number,
        "mid": number,
        "high": number,
        "recommended": number,
        "costBreakdown": {
          "labour": number,
          "licensing": number,
          "infrastructure": number,
          "testing": number,
          "training": number,
          "contingency": number
        },
        "implementationMonths": number,
        "costModel": "fixed_price | time_and_materials | saas_subscription",
        "notes": "string — flag if estimate deviates significantly from anchor"
      },
      "recurringAnnualCost": number,
      "costNote": "string — brief rationale for the estimate"
    }
  ],
  "descopedPortfolio": [
    {
      "solutionId": "SOL-001",
      "action": "keep_full_scope | reduce_scope | defer",
      "adjustedMid": number,
      "scopeNote": "string — what to keep or cut"
    }
  ],
  "portfolioNote": "string — overall cost summary"
}

QUANTITY RULES:
- Provide an estimate for EVERY solution listed above
- descopedPortfolio: only include when total mid exceeds 85% ceiling
- descopedPortfolio: empty array [] when total is within ceiling`

  return userPrompt
}

// ─── Step 4: callClaude ──────────────────────────────────────────────────────

async function callClaude(prompt) {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  })
  return response.content?.[0]?.text || ''
}

// ─── Step 5: parseCostResponse ───────────────────────────────────────────────

function normaliseBreakdown(breakdown, totalCost) {
  const result = {}
  for (const key of BREAKDOWN_KEYS) {
    result[key] = typeof breakdown?.[key] === 'number' ? breakdown[key] : 0
  }
  const sum = Object.values(result).reduce((a, b) => a + b, 0)
  if (sum === 0 && totalCost > 0) {
    result.labour = Math.round(totalCost * 0.50)
    result.licensing = Math.round(totalCost * 0.12)
    result.infrastructure = Math.round(totalCost * 0.15)
    result.testing = Math.round(totalCost * 0.12)
    result.training = Math.round(totalCost * 0.07)
    result.contingency = Math.round(totalCost * 0.04)
  }
  return result
}

function parseCostResponse(text, summaries) {
  let parsed
  try {
    const clean = text.replace(/```json\s*|\s*```/g, '').trim()
    parsed = JSON.parse(clean)
  } catch {
    return { estimates: [], descopedPortfolio: [], portfolioNote: null, parseError: true }
  }

  const estimates = (parsed.costEstimates || []).map(e => {
    const ce = e.costEstimate || {}
    const mid = num(ce.mid) || num(ce.recommended) || 0
    const low = num(ce.low) || Math.round(mid * 0.8)
    const high = num(ce.high) || Math.round(mid * 1.3)
    const breakdown = normaliseBreakdown(ce.costBreakdown, mid)

    return {
      solutionId: e.solutionId,
      solutionName: e.solutionName || '',
      costEstimate: {
        low,
        mid,
        high,
        recommended: num(ce.recommended) || mid,
        breakdown,
        implementationMonths: num(ce.implementationMonths) || 0,
        costModel: ce.costModel || 'fixed_price',
        source: 'ai_generated',
        notes: ce.notes || null
      },
      recurringAnnualCost: num(e.recurringAnnualCost) || 0,
      costNote: e.costNote || null
    }
  })

  // Normalise descoped portfolio actions
  const descopedPortfolio = (parsed.descopedPortfolio || []).map(d => ({
    solutionId: d.solutionId,
    action: ACTION_MAP[d.action] || 'keep_full_scope',
    adjustedMid: num(d.adjustedMid) || 0,
    scopeNote: d.scopeNote || ''
  }))

  return {
    estimates,
    descopedPortfolio,
    portfolioNote: parsed.portfolioNote || null,
    parseError: false
  }
}

// ─── Step 5b: generate warnings ──────────────────────────────────────────────

function generateWarnings(estimates, summaries, budget) {
  const warnings = []
  const ceiling = budget > 0 ? Math.round(budget * CEILING_PCT) : 0

  for (const est of estimates) {
    const summary = summaries.find(s => s.id === est.solutionId)
    if (!summary) continue

    // Range order check
    if (est.costEstimate.low > est.costEstimate.mid || est.costEstimate.mid > est.costEstimate.high) {
      warnings.push(`range_error: ${est.solutionId} has invalid cost range (low=${est.costEstimate.low}, mid=${est.costEstimate.mid}, high=${est.costEstimate.high})`)
    }

    // Vendor cost mismatch
    if (summary.selectedVendor) {
      const vendorHigh = summary.selectedVendor.vendorCostHigh || 0
      if (vendorHigh > 0 && est.costEstimate.mid > vendorHigh * 1.3) {
        warnings.push(`vendor_cost_mismatch: ${est.solutionId} AI estimate ($${est.costEstimate.mid.toLocaleString()}) exceeds vendor anchor high ($${vendorHigh.toLocaleString()}) by >30%`)
      }

      // Vendor months fallback
      const vendorMonths = summary.selectedVendor.implementationMonths
      if (vendorMonths && est.costEstimate.implementationMonths > 0 &&
        Math.abs(est.costEstimate.implementationMonths - vendorMonths) > 2) {
        warnings.push(`vendor_months_fallback: ${est.solutionId} AI timeline (${est.costEstimate.implementationMonths}mo) differs from vendor (${vendorMonths}mo)`)
      }
    }
  }

  // Portfolio-level checks
  const totalMid = estimates.reduce((s, e) => s + e.costEstimate.mid, 0)
  if (ceiling > 0 && totalMid > ceiling) {
    warnings.push(`ceiling_breach: Total mid ($${totalMid.toLocaleString()}) exceeds 85% ceiling ($${ceiling.toLocaleString()})`)
  }
  if (budget > 0 && totalMid > budget) {
    warnings.push(`budget_flag: Total mid ($${totalMid.toLocaleString()}) exceeds 100% of budget ($${budget.toLocaleString()})`)
  }

  return warnings
}

// ─── Step 6: mergeCosts ──────────────────────────────────────────────────────

function mergeCosts(solutions, estimates) {
  const estimateMap = new Map(estimates.map(e => [e.solutionId, e]))
  const costsMissing = []

  const merged = solutions.map(s => {
    const est = estimateMap.get(s.id)
    if (!est) {
      costsMissing.push(s.id)
      // Normalise existing breakdown so all 6 keys are present
      const mid = s.costEstimate?.mid || s.costEstimate?.recommended || s.totalCost || 0
      const existingBreakdown = normaliseBreakdown(s.costEstimate?.breakdown, mid)
      return {
        ...s,
        costEstimate: {
          ...s.costEstimate,
          low: s.costEstimate?.low || Math.round(mid * 0.8),
          mid,
          high: s.costEstimate?.high || Math.round(mid * 1.3),
          recommended: s.costEstimate?.recommended || mid,
          breakdown: existingBreakdown,
          implementationMonths: s.costEstimate?.implementationMonths || 0,
          costModel: s.costEstimate?.costModel || 'fixed_price',
          source: s.costEstimate?.source || 'original_estimate'
        },
        recurringAnnualCost: s.recurringAnnualCost || 0
      }
    }
    return {
      ...s,
      totalCost: est.costEstimate.mid,
      costEstimate: est.costEstimate,
      recurringAnnualCost: est.recurringAnnualCost
    }
  })

  return { merged, costsMissing }
}

// ─── Step 6b: checkBudgetCeiling ─────────────────────────────────────────────

function checkBudgetCeiling(solutions, budget) {
  const ceiling = budget > 0 ? Math.round(budget * CEILING_PCT) : 0
  const totalMid = solutions.reduce((s, x) => s + (x.costEstimate?.mid || x.totalCost || 0), 0)
  const budgetCeilingBreached = ceiling > 0 && totalMid > ceiling
  return { ceiling, totalMid, budgetCeilingBreached }
}

// ─── Step 7: harmonizeResponse ───────────────────────────────────────────────

function harmonizeResponse(solutions, ceilingResult, raw, validatedData, budget,
  discountRatePct, timeHorizonYears, deferredSolutionIds, costsMissing,
  costWarnings, descopedPortfolio, portfolioNote, parseError) {

  const trackingId = raw.trackingId || generateTrackingId()
  const timestamp = new Date().toISOString()

  // NPV TCO calculation
  const rawPct = discountRatePct
  const discountRate = (rawPct && Number(rawPct) > 0) ? Number(rawPct) / 100 : 0.08
  const discountRateSource = rawPct ? 'user_supplied' : 'default_8pct'
  const horizonYears = timeHorizonYears

  const totalImplementationCost = solutions.reduce((s, x) => s + (x.costEstimate?.recommended || x.costEstimate?.mid || x.totalCost || 0), 0)
  const totalAnnualRecurring = solutions.reduce((s, x) => s + (x.recurringAnnualCost || 0), 0)

  let npvRecurring = 0
  for (let t = 1; t <= horizonYears; t++) {
    npvRecurring += totalAnnualRecurring / Math.pow(1 + discountRate, t)
  }
  npvRecurring = Math.round(npvRecurring)

  const npvTCO = totalImplementationCost + npvRecurring
  const simpleTCO = totalImplementationCost + (totalAnnualRecurring * horizonYears)

  const totalRecommendedCost = totalImplementationCost
  const ceiling = ceilingResult.ceiling
  const budgetCeilingBreached = ceilingResult.budgetCeilingBreached

  const withinBudget = budget > 0 ? totalRecommendedCost <= budget : null
  const withinCeiling = ceiling > 0 ? totalRecommendedCost <= ceiling : null
  const budgetUtilizationPct = budget > 0 ? Math.round((totalRecommendedCost / budget) * 100) : 0
  const tcoExceedsBudget = budget > 0 && simpleTCO > budget

  // All warnings
  const allWarnings = [...costWarnings]
  if (tcoExceedsBudget) {
    allWarnings.push(`TCO_EXCEEDS_BUDGET: ${horizonYears}-year TCO ($${simpleTCO.toLocaleString()}) exceeds budget`)
  }

  // Portfolio cost summary
  const totalLow = solutions.reduce((s, x) => s + (x.costEstimate?.low || 0), 0)
  const totalMid = solutions.reduce((s, x) => s + (x.costEstimate?.mid || x.totalCost || 0), 0)
  const totalHigh = solutions.reduce((s, x) => s + (x.costEstimate?.high || 0), 0)

  let budgetFit = 'within_budget'
  if (budget > 0) {
    if (totalMid > budget) budgetFit = 'exceeds_ceiling'
    else if (totalMid > ceiling) budgetFit = 'exceeds_ceiling'
    else if (totalMid <= ceiling) budgetFit = 'within_ceiling'
  }

  // Delivery sequence & phase summary
  const phases = [1, 2, 3]
  const deliverySequence = phases
    .map(p => {
      const phaseSols = solutions.filter(s => s.deliveryPhase === p).map(s => s.id)
      return phaseSols.length > 0 ? `Phase ${p}: ${phaseSols.join(', ')}` : null
    })
    .filter(Boolean)

  const phaseSummary = phases
    .map(p => {
      const phaseSols = solutions.filter(s => s.deliveryPhase === p)
      if (phaseSols.length === 0) return null
      const themes = { 1: 'Foundation & Security', 2: 'Core Build', 3: 'Optimisation & Enhancement' }
      return { phase: p, solutions: phaseSols.map(s => s.id), theme: themes[p] }
    })
    .filter(Boolean)

  // readyForPhase2
  const reflection = raw.reflection || null
  let readyForPhase2 = null
  if (budgetCeilingBreached) {
    readyForPhase2 = false
  } else if (reflection) {
    readyForPhase2 = reflection.readyForPhase2 !== false
  }

  // Rescoping recommendation
  let rescopingRecommendation = null
  if (budgetCeilingBreached && descopedPortfolio.length > 0) {
    const descopedTotal = descopedPortfolio
      .filter(d => d.action !== 'defer')
      .reduce((s, d) => s + d.adjustedMid, 0)

    rescopingRecommendation = {
      reason: `Full portfolio ($${totalMid.toLocaleString()}) exceeds 85% ceiling ($${ceiling.toLocaleString()}).`,
      descopedPortfolioTotal: descopedTotal,
      fitsWithinCeiling: ceiling > 0 ? descopedTotal <= ceiling : null,
      solutionsToKeep: descopedPortfolio.filter(d => d.action !== 'defer'),
      solutionsToDefer: descopedPortfolio.filter(d => d.action === 'defer')
    }
  }

  // Descoped budget analysis
  let descopedBudgetAnalysis = null
  if (rescopingRecommendation && rescopingRecommendation.fitsWithinCeiling) {
    const dt = rescopingRecommendation.descopedPortfolioTotal
    descopedBudgetAnalysis = {
      totalRecommendedCost: dt,
      budget,
      budgetUtilizationPct: budget > 0 ? Math.round((dt / budget) * 100) : 0,
      withinBudget: budget > 0 ? dt <= budget : null,
      withinCeiling: ceiling > 0 ? dt <= ceiling : null
    }
  }

  const status = budgetCeilingBreached ? 'warning' : (parseError ? 'warning' : 'success')

  return {
    status,
    phase: '1.5',
    trackingId,
    timestamp,
    source: 'web_app',

    validatedData,
    benefits: raw.benefits || [],
    requirements: raw.requirements || [],
    discoveryMethod: raw.discoveryMethod || 'ai_generated',
    suggestedBudget: raw.suggestedBudget || null,
    budgetRationale: raw.budgetRationale || null,

    qualityMetrics: raw.qualityMetrics || { overallScore: 85 },
    reflection,
    defaultHorizonYears: 3,

    solutions,

    portfolioCostSummary: {
      totalLow,
      totalMid,
      totalHigh,
      budgetFit
    },

    budgetAnalysis: {
      totalRecommendedCost,
      budget,
      budgetUtilizationPct,
      withinBudget,
      withinCeiling,
      tcoExceedsBudget,
      tco: {
        npvTCO,
        simpleTCO,
        totalImplementationCost,
        totalAnnualRecurring,
        npvRecurring,
        discountRate,
        horizonYears,
        discountRateSource
      }
    },

    descopedBudgetAnalysis,
    readyForPhase2,
    descopedPortfolio: budgetCeilingBreached ? descopedPortfolio : [],
    rescopingRecommendation,

    deferredSolutionIds,

    costEstimationStatus: 'success',
    costEstimationWarnings: allWarnings,
    costEstimationError: null,
    costsMissingForSolutions: costsMissing,

    budgetCeilingBreached,

    warnings: allWarnings,
    phaseSummary,
    deliverySequence
  }
}

// ─── Route Handler ───────────────────────────────────────────────────────────

router.post('/phase1-5-cost', async (req, res) => {
  try {
    const raw = req.body
    const { solutions, allSolutions, benefits, validatedData, budget, discountRatePct,
      timeHorizonYears, deferredSolutionIds, errors } = normalizeInputs(raw)

    if (errors.length) {
      return res.status(400).json([{ status: 'error', phase: '1.5', errors }])
    }

    const summaries = buildSolutionSummaries(solutions)
    const prompt = preparePrompt(summaries, validatedData, budget)

    let parsed = { estimates: [], descopedPortfolio: [], portfolioNote: null, parseError: true }
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const text = await callClaude(prompt)
        parsed = parseCostResponse(text, summaries)
        if (parsed.estimates.length > 0) break
        console.log(`Phase 1.5 AI attempt ${attempt + 1}: no estimates returned`)
      } catch (err) {
        console.error(`Phase 1.5 AI attempt ${attempt + 1} error:`, err.message)
      }
    }

    const costWarnings = generateWarnings(parsed.estimates, summaries, budget)
    const { merged, costsMissing } = mergeCosts(solutions, parsed.estimates)
    const ceilingResult = checkBudgetCeiling(merged, budget)

    const response = harmonizeResponse(
      merged, ceilingResult, raw, validatedData, budget,
      discountRatePct, timeHorizonYears, deferredSolutionIds, costsMissing,
      costWarnings, parsed.descopedPortfolio, parsed.portfolioNote, parsed.parseError
    )

    return res.json([response])
  } catch (err) {
    console.error('Phase 1.5 error:', err)
    return res.status(500).json([{ status: 'error', phase: '1.5', errorMessage: err.message }])
  }
})

export default router
