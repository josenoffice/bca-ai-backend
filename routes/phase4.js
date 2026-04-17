// ═══════════════════════════════════════════════════════════════════
// BCA.AI — Phase 4: Ranking & Recommendation
// Pure JavaScript logic — NO Claude API call
// 10 sequential steps
// ═══════════════════════════════════════════════════════════════════
import { Router } from 'express'

const router = Router()

// ─── Utility ─────────────────────────────────────────────────────
const n = (v, fallback = 0) => {
  const num = Number(v)
  return Number.isFinite(num) ? num : fallback
}

// ─── Industry config ─────────────────────────────────────────────
const INDUSTRY_CONFIG = {
  retail:             { discountRate: 0.12, benefitMultiplier: 1.00, riskPenalty: 0.08 },
  ecommerce:          { discountRate: 0.14, benefitMultiplier: 1.05, riskPenalty: 0.09 },
  technology:         { discountRate: 0.10, benefitMultiplier: 1.10, riskPenalty: 0.07 },
  finance:            { discountRate: 0.09, benefitMultiplier: 0.95, riskPenalty: 0.06 },
  financial_services: { discountRate: 0.09, benefitMultiplier: 0.95, riskPenalty: 0.06 },
  banking:            { discountRate: 0.09, benefitMultiplier: 0.95, riskPenalty: 0.06 },
  healthcare:         { discountRate: 0.11, benefitMultiplier: 0.90, riskPenalty: 0.10 },
  manufacturing:      { discountRate: 0.11, benefitMultiplier: 0.95, riskPenalty: 0.08 },
  logistics:          { discountRate: 0.12, benefitMultiplier: 0.95, riskPenalty: 0.09 },
  government:         { discountRate: 0.07, benefitMultiplier: 0.85, riskPenalty: 0.07 },
  education:          { discountRate: 0.08, benefitMultiplier: 0.88, riskPenalty: 0.07 },
  insurance:          { discountRate: 0.10, benefitMultiplier: 0.92, riskPenalty: 0.08 },
  energy:             { discountRate: 0.10, benefitMultiplier: 0.93, riskPenalty: 0.09 },
  default:            { discountRate: 0.12, benefitMultiplier: 1.00, riskPenalty: 0.08 }
}

// ─── Scoring weights (hardcoded) ─────────────────────────────────
const W = {
  npv:         0.35,
  roi:         0.20,
  confidence:  0.15,
  riskPenalty: 0.15,
  vendorFit:   0.15
}

// ─── PV helper ───────────────────────────────────────────────────
function pvBenefit(annualNet, rate, years) {
  let pv = 0
  for (let y = 1; y <= years; y++) pv += annualNet / Math.pow(1 + rate, y)
  return pv
}

// ═════════════════════════════════════════════════════════════════
// Step 1 — normalizeAndMap
// ═════════════════════════════════════════════════════════════════
function normalizeAndMap(raw) {
  const solutions    = raw.solutions    || []
  const benefits     = raw.benefits     || []
  const requirements = raw.requirements || []

  const errors = []
  if (!solutions.length) errors.push('MISSING_SOLUTIONS')
  if (!benefits.length)  errors.push('MISSING_BENEFITS')

  if (errors.length) {
    return {
      normalizeSuccess: false,
      status: 'error',
      phase: 4,
      errorMessage: errors.join(', '),
      errors
    }
  }

  // Dual field sync
  for (const s of solutions) {
    if (s.linkedBenefits && !s.delivers_benefits?.length)
      s.delivers_benefits = [...new Set(s.linkedBenefits)]
    if (s.delivers_benefits && !s.linkedBenefits?.length)
      s.linkedBenefits = [...new Set(s.delivers_benefits)]
    if (s.linkedRequirements && !s.depends_on_requirements?.length)
      s.depends_on_requirements = [...new Set(s.linkedRequirements)]
    if (s.depends_on_requirements && !s.linkedRequirements?.length)
      s.linkedRequirements = [...new Set(s.depends_on_requirements)]
    if (s.linkedRequirements && !s.supported_by_requirements?.length)
      s.supported_by_requirements = [...new Set(s.linkedRequirements)]
  }

  // Industry config
  const industry = (raw.validatedData?.industry || raw.projectMeta?.industry || 'default').toLowerCase()
  const config = { ...(INDUSTRY_CONFIG[industry] || INDUSTRY_CONFIG.default) }

  // User discountRatePct always overrides industry default
  const userRate = raw.validatedData?.discountRatePct || raw.projectMeta?.discountRatePct
  if (userRate) config.discountRate = userRate / 100

  const timeHorizonYears = raw.validatedData?.timeHorizonYears
    || raw.projectMeta?.timeHorizonYears || 3

  return {
    normalizeSuccess: true,
    raw,
    solutions,
    benefits,
    requirements,
    industry,
    config,
    timeHorizonYears,
    discountRate: config.discountRate,
    benefitMult: config.benefitMultiplier,
    riskPenalty: config.riskPenalty
  }
}

// ═════════════════════════════════════════════════════════════════
// Step 2 — financialsPVROI
// ═════════════════════════════════════════════════════════════════
function financialsPVROI(ctx) {
  const { solutions, discountRate, timeHorizonYears, benefitMult, riskPenalty } = ctx

  // Portfolio average benefit as fallback
  const totalBenefit = solutions.reduce((s, x) => s + n(x.annualBenefit), 0)
  const portfolioBenefitAvg = solutions.length > 0 ? totalBenefit / solutions.length : 0

  ctx.solutions = solutions.map(s => {
    const cost = n(s.estimatedCostUSD || s.estimatedCost || s.totalCost || s.cost || 0)
    const rawBenefit = s.annualBenefit != null ? n(s.annualBenefit) : portfolioBenefitAvg

    const annualNet = Math.max(0, rawBenefit * benefitMult - cost * riskPenalty)
    const pv        = Math.round(pvBenefit(annualNet, discountRate, timeHorizonYears))
    const roiPct    = cost > 0 ? Math.round(((annualNet * timeHorizonYears - cost) / cost) * 100 * 10) / 10 : 0

    const monthly       = annualNet / 12
    const rawPayback    = monthly > 0 ? Math.ceil(cost / monthly) : null
    const paybackMonths = rawPayback ? Math.min(rawPayback, 120) : null
    const paybackCapped = rawPayback ? rawPayback > 120 : false

    return {
      ...s,
      phase4: {
        pvBenefit3y: pv,
        roiPct,
        paybackMonths,
        paybackCapped,
        pvHorizonYears: timeHorizonYears,
        appliedRiskPenalty: riskPenalty,
        appliedBenefitMult: benefitMult
      }
    }
  })

  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 3 — sensitivity
// ═════════════════════════════════════════════════════════════════
function sensitivity(ctx) {
  const { solutions, discountRate, timeHorizonYears, benefitMult, riskPenalty } = ctx

  // 5-point discount rate sensitivity: base ±2% and ±4%
  const rateDeltas = [-0.04, -0.02, 0, 0.02, 0.04]
  ctx.sensitivity = rateDeltas.map(delta => {
    const rate = Math.max(0.01, discountRate + delta)
    const portfolioPV = solutions.reduce((acc, s) => {
      const annualNet = Math.max(0, n(s.annualBenefit || 0) * benefitMult - n(s.estimatedCostUSD || s.totalCost || 0) * riskPenalty)
      return acc + pvBenefit(annualNet, rate, timeHorizonYears)
    }, 0)
    return {
      discountRate: Math.round(rate * 1000) / 1000,
      portfolioPVBenefit: Math.round(portfolioPV),
      horizonYears: timeHorizonYears
    }
  })

  // 3 benefit scenarios
  ctx.benefitSensitivity = [
    { label: 'Pessimistic', multiplier: 0.70, description: 'Benefits 30% below estimate' },
    { label: 'Base',        multiplier: 1.00, description: 'Benefits as estimated' },
    { label: 'Optimistic',  multiplier: 1.20, description: 'Benefits 20% above estimate' }
  ].map(scenario => {
    const portfolioPV = solutions.reduce((acc, s) => {
      const annualNet = Math.max(0, n(s.annualBenefit || 0) * benefitMult - n(s.estimatedCostUSD || s.totalCost || 0) * riskPenalty)
      return acc + pvBenefit(annualNet * scenario.multiplier, discountRate, timeHorizonYears)
    }, 0)
    const totalCost = solutions.reduce((acc, s) => acc + n(s.estimatedCostUSD || s.totalCost || 0), 0)
    const portfolioROI = totalCost > 0 ? Math.round(((portfolioPV - totalCost) / totalCost) * 100 * 10) / 10 : 0
    return {
      label: scenario.label,
      multiplier: scenario.multiplier,
      portfolioPV: Math.round(portfolioPV),
      portfolioROI,
      solutions: solutions.map(s => {
        const annualNet = Math.max(0, n(s.annualBenefit || 0) * benefitMult - n(s.estimatedCostUSD || s.totalCost || 0) * riskPenalty)
        const solPV  = Math.round(pvBenefit(annualNet * scenario.multiplier, discountRate, timeHorizonYears))
        const solCost = n(s.estimatedCostUSD || s.totalCost || 0)
        const solROI = solCost > 0 ? Math.round(((solPV - solCost) / solCost) * 100) : 0
        return {
          solutionId: s.id,
          adjustedAnnualBenefit: Math.round(annualNet * scenario.multiplier),
          pvBenefit: solPV,
          roiPct: solROI
        }
      })
    }
  })

  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 4 — edgeSynthesis
// ═════════════════════════════════════════════════════════════════
function edgeSynthesis(ctx) {
  const { solutions, raw } = ctx

  // Use existing edges if present
  const existingEdges = raw.dependencyAnalysis?.edges || []
  if (existingEdges.length > 0) {
    ctx.edges = existingEdges
    ctx.criticalPath = raw.dependencyAnalysis?.criticalPath || []
    return ctx
  }

  // Build edges from solution fields
  const edges = []
  for (const s of solutions) {
    for (const b of (s.delivers_benefits || s.linkedBenefits || []))
      edges.push({ type: 'delivers', from: s.id, to: b })
    for (const r of (s.depends_on_requirements || s.linkedRequirements || []))
      edges.push({ type: 'requires', from: r, to: s.id })
  }
  ctx.edges = edges
  ctx.criticalPath = raw.dependencyAnalysis?.criticalPath || []
  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 5 — traceabilityReview
// ═════════════════════════════════════════════════════════════════
function traceabilityReview(ctx) {
  const { solutions, benefits, requirements, edges } = ctx

  // Build sol→ben and sol→req maps from edges
  const solToBen = new Map()
  const solToReq = new Map()

  for (const e of edges) {
    if (e.type === 'delivers') {
      if (!solToBen.has(e.from)) solToBen.set(e.from, new Set())
      solToBen.get(e.from).add(e.to)
    }
    if (e.type === 'requires') {
      if (!solToReq.has(e.to)) solToReq.set(e.to, new Set())
      solToReq.get(e.to).add(e.from)
    }
  }

  let covered = 0
  solutions.forEach(s => {
    const b = (solToBen.get(s.id) || new Set()).size
    const r = (solToReq.get(s.id) || new Set()).size
    covered += Math.min(b, r)
  })
  const theoretical = Math.max(1, Math.min(solutions.length * benefits.length, solutions.length * requirements.length))
  const coveragePct = Math.round(covered / theoretical * 100)

  ctx.traceabilityCoverage = {
    coveredPairs: covered,
    theoreticalPairs: theoretical,
    coveragePct
  }

  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 6 — rankingAndRecommendation
// ═════════════════════════════════════════════════════════════════
function rankingAndRecommendation(ctx) {
  const { solutions, raw } = ctx

  // Normalise each dimension to 0-1 range
  function normalize(values) {
    const min = Math.min(...values), max = Math.max(...values)
    return values.map(v => max === min ? 0.5 : (v - min) / (max - min))
  }

  const N_npv   = normalize(solutions.map(s => n(s.phase4?.pvBenefit3y || s.npv || 0)))
  const N_roi   = normalize(solutions.map(s => n(s.phase4?.roiPct || s.roi || 0)))
  const N_conf  = normalize(solutions.map(s => n(s.confidenceScore || s.confidence || 70)))

  const allVendorFitNull = solutions.every(s => s.vendorFitScore == null)
  const N_vendorFit = allVendorFitNull
    ? solutions.map(() => 0.5)
    : normalize(solutions.map(s => s.vendorFitScore != null ? n(s.vendorFitScore) : 0))

  function riskPenaltyScore(level) {
    return level?.toLowerCase() === 'high' ? 1.0
         : level?.toLowerCase() === 'medium' ? 0.4 : 0.0
  }
  const N_riskPenalty = solutions.map(s => riskPenaltyScore(s.riskLevel))

  const compositeScores = solutions.map((s, i) =>
    W.npv        * N_npv[i] +
    W.roi        * N_roi[i] +
    W.confidence * N_conf[i] +
    W.riskPenalty * (1 - N_riskPenalty[i]) +
    W.vendorFit  * N_vendorFit[i]
  )

  // Rationale generator
  function generateRationale(sol, rank, total) {
    const npv  = n(sol.phase4?.pvBenefit3y || sol.npv || 0)
    const roi  = n(sol.phase4?.roiPct || sol.roi || 0)
    const conf = n(sol.confidenceScore || sol.confidence || 70)
    const risk = (sol.riskLevel || 'Medium').toLowerCase()
    const parts = []

    const allNPVs   = solutions.map(s => n(s.phase4?.pvBenefit3y || s.npv || 0))
    const maxNPV    = Math.max(...allNPVs)
    const hasMaxNPV = npv === maxNPV && npv > 0

    if (rank === 1) {
      if (hasMaxNPV) parts.push(`Highest NPV ($${Math.round(npv / 1000)}K)`)
      if (roi > 100) parts.push(`strong ROI (${Math.round(roi)}%)`)
      if (conf >= 75) parts.push(`high confidence (${conf}%)`)
      if (risk === 'low') parts.push('low risk profile')
      parts.push('Best balance of returns and certainty')
    } else if (rank === 2) {
      parts.push(`Competitive financials (NPV: $${Math.round(npv / 1000)}K, ROI: ${Math.round(roi)}%)`)
      if (risk === 'high') parts.push('HIGH RISK — risk penalty reduced score despite strong returns')
      else parts.push('slightly lower confidence or higher risk than top choice')
    } else {
      if (risk === 'low') parts.push('Lowest risk with acceptable returns')
      else parts.push('Lower composite score — consider as Phase 2 or Phase 3 delivery candidate')
    }
    return parts.join(', ')
  }

  // Sort by composite score descending
  const ranked = solutions
    .map((s, i) => ({ ...s, compositeScore: Math.round(compositeScores[i] * 1000) / 1000 }))
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .map((s, i) => ({
      rank:            i + 1,
      solutionId:      s.id,
      name:            s.name,
      score:           s.compositeScore,
      npv:             n(s.phase4?.pvBenefit3y || s.npv || 0),
      roiPct:          n(s.phase4?.roiPct || s.roi || 0),
      riskLevel:       s.riskLevel,
      confidenceScore: n(s.confidenceScore || s.confidence || 70),
      vendorName:      s.vendorName || s.selectedVendor?.name || null,
      vendorFitScore:  s.vendorFitScore != null ? n(s.vendorFitScore) : null,
      paybackMonths:   s.phase4?.paybackMonths || null,
      rationale:       generateRationale(s, i + 1, solutions.length)
    }))

  const recommended = ranked[0]

  ctx.recommendation = {
    recommendedSolutionId:   recommended.solutionId,
    recommendedSolutionName: recommended.name,
    isOverride:              false,
    ranking:                 ranked,
    scoringWeights:          { ...W },
    userOverride:            null,
    aiRecommendation:        null,
    industryContext: {
      discountRate:      ctx.discountRate,
      riskPenalty:       ctx.riskPenalty,
      benefitMultiplier: ctx.benefitMult
    }
  }

  // User override handling
  if (raw.userOverride?.userSelectedSolutionId) {
    const override = solutions.find(s => s.id === raw.userOverride.userSelectedSolutionId)
    if (override) {
      ctx.recommendation.isOverride = true
      ctx.recommendation.recommendedSolutionId = override.id
      ctx.recommendation.recommendedSolutionName = override.name
      ctx.recommendation.userOverride = raw.userOverride
      ctx.recommendation.aiRecommendation = {
        solutionId: recommended.solutionId,
        name: recommended.name
      }
    }
  }

  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 7 — portfolioAggregator
// ═════════════════════════════════════════════════════════════════
function portfolioAggregator(ctx) {
  const { solutions, raw, discountRate, riskPenalty, benefitMult, timeHorizonYears } = ctx

  const totalCost = solutions.reduce((s, x) => s + n(x.estimatedCostUSD || x.totalCost || 0), 0)
  const totalPV   = solutions.reduce((s, x) => s + n(x.phase4?.pvBenefit3y || 0), 0)

  const roiValues = solutions.map(s => n(s.phase4?.roiPct || 0))
  const avgROI    = roiValues.length > 0
    ? Math.round(roiValues.reduce((a, b) => a + b, 0) / roiValues.length * 10) / 10
    : 0

  const portfolioIRR = raw.portfolioIRR || raw.portfolioMetrics?.portfolio?.portfolioIRR || null

  // withinCeiling passed through from Phase 1.5 — NOT recomputed
  const withinCeiling = raw.budgetAnalysis?.withinCeiling ?? raw.withinCeiling ?? null

  const budget = n(raw.validatedData?.budget || raw.projectMeta?.budget || 0)
  const budgetUtilizationPct = budget > 0 ? Math.round(totalCost / budget * 100) : null
  const withinBudget = budget > 0 ? totalCost <= budget : null

  ctx.financialsP4 = {
    totalCost,
    totalPVBenefit3y: totalPV,
    avgROIPct: avgROI,
    discountRate,
    appliedRiskPenalty: riskPenalty,
    appliedBenefitMult: benefitMult,
    horizonYears: timeHorizonYears
  }

  ctx.budgetAnalysisP4 = {
    totalRecommendedCost: totalCost,
    budget,
    budgetUtilizationPct,
    withinBudget,
    withinCeiling
  }

  ctx.portfolioIRR = portfolioIRR
  ctx.withinCeiling = withinCeiling
  ctx.withinBudget = withinBudget

  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 8 — cbaSummary
// ═════════════════════════════════════════════════════════════════
function cbaSummary(ctx) {
  const { recommendation, financialsP4, budgetAnalysisP4, withinCeiling } = ctx
  const ranked = recommendation.ranking
  const isOverride = recommendation.isOverride
  const recName = recommendation.recommendedSolutionName

  let md = '# Portfolio Comparison (Phase 4)\n\n'
  let html = '<h2>Portfolio Summary</h2>'

  // Ceiling breach warning
  if (withinCeiling === false) {
    md += '> ⚠️ Budget ceiling notice: Total cost exceeds 85% of stated budget.\n\n'
    html += '<div style="color:#d97706;font-weight:600;">⚠️ Budget ceiling notice: Total cost exceeds 85% of stated budget.</div>'
  }

  // Override disclaimer
  if (isOverride) {
    const aiRec = recommendation.aiRecommendation?.name || 'N/A'
    const reason = recommendation.userOverride?.reason || 'No reason provided'
    md += `**Selected (User Override):** ${recName}\n`
    md += `**Override Reason:** ${reason}\n`
    md += `**AI Recommendation was:** ${aiRec}\n\n`
    html += `<p><strong>Selected (User Override):</strong> ${recName}</p>`
    html += `<p><strong>Override Reason:</strong> ${reason}</p>`
    html += `<p><strong>AI Recommendation was:</strong> ${aiRec}</p>`
  } else {
    md += `**Recommended:** ${recName}\n\n`
    html += `<p><strong>Recommended:</strong> ${recName}</p>`
  }

  // Portfolio KPIs
  md += `**Total Investment:** $${financialsP4.totalCost.toLocaleString()}\n`
  md += `**Total PV Benefit (${financialsP4.horizonYears}Y):** $${financialsP4.totalPVBenefit3y.toLocaleString()}\n`
  md += `**Average ROI:** ${financialsP4.avgROIPct}%\n\n`

  html += `<p>Total Investment: $${financialsP4.totalCost.toLocaleString()} | PV Benefit: $${financialsP4.totalPVBenefit3y.toLocaleString()} | Avg ROI: ${financialsP4.avgROIPct}%</p>`

  // Per-solution table
  md += '| Rank | Solution | Score | PV(3Y) | ROI | Risk | Vendor | Fit |\n'
  md += '|------|----------|-------|--------|-----|------|--------|-----|\n'
  html += '<table><thead><tr><th>Rank</th><th>Solution</th><th>Score</th><th>PV(3Y)</th><th>ROI</th><th>Risk</th><th>Vendor</th><th>Fit</th></tr></thead><tbody>'

  ranked.forEach(r => {
    const pv = `$${Math.round(r.npv / 1000)}K`
    const roi = `${Math.round(r.roiPct)}%`
    const fit = r.vendorFitScore != null ? `${r.vendorFitScore}` : '-'
    md += `| ${r.rank} | ${r.name} | ${r.score} | ${pv} | ${roi} | ${r.riskLevel} | ${r.vendorName || '-'} | ${fit} |\n`
    html += `<tr><td>${r.rank}</td><td>${r.name}</td><td>${r.score}</td><td>${pv}</td><td>${roi}</td><td>${r.riskLevel}</td><td>${r.vendorName || '-'}</td><td>${fit}</td></tr>`
  })

  html += '</tbody></table>'
  md += '\n'

  // Rationale
  md += '## Rationale\n\n'
  ranked.forEach(r => {
    md += `**#${r.rank} ${r.name}:** ${r.rationale}\n\n`
  })

  ctx.cbaSummary = { markdown: md, html }
  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 9 — phase5ContractGuard
// ═════════════════════════════════════════════════════════════════
function phase5ContractGuard(ctx) {
  const { recommendation, cbaSummary: cba, financialsP4, withinCeiling } = ctx

  const errors = []
  if (!recommendation.recommendedSolutionId) errors.push('Missing recommendedSolutionId')
  if (!recommendation.ranking?.length)       errors.push('Missing ranking array')
  if (!cba.markdown)                          errors.push('Missing cbaSummary.markdown')
  if (!cba.html)                              errors.push('Missing cbaSummary.html')
  if (financialsP4.totalPVBenefit3y == null)  errors.push('Missing portfolioP4.totalPVBenefit3y')
  if (withinCeiling === false)                errors.push('Budget ceiling breached — review before Phase 5')

  ctx.phase5Contract = {
    ok: errors.length === 0,
    errors,
    isOverride: recommendation.isOverride,
    required: [
      'recommendedSolutionId',
      'ranking[]',
      'cbaSummary.markdown',
      'cbaSummary.html',
      'portfolioP4.totalPVBenefit3y'
    ]
  }

  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 10 — harmonizer
// ═════════════════════════════════════════════════════════════════
function harmonizer(ctx) {
  const {
    raw, solutions, benefits, requirements, recommendation,
    financialsP4, sensitivity: sensList, benefitSensitivity,
    budgetAnalysisP4, withinCeiling, withinBudget,
    traceabilityCoverage, phase5Contract, cbaSummary: cba,
    edges, criticalPath, config
  } = ctx

  // Executive health badge
  const budgetStatus = withinBudget === true  ? 'green'
                     : withinBudget === false ? 'red' : 'amber'

  const traceScore = traceabilityCoverage.coveragePct
  const traceStatus = traceScore >= 60 ? 'green' : traceScore >= 40 ? 'amber' : 'red'

  const overallConf = raw.confidenceAnalysis?.overallConfidence
    || raw.confidenceAnalysis?.average || 70
  const confStatus = overallConf >= 70 ? 'green' : overallConf >= 50 ? 'amber' : 'red'

  const overallStatus = [budgetStatus, traceStatus, confStatus].includes('red')   ? 'red'
                      : [budgetStatus, traceStatus, confStatus].includes('amber') ? 'amber'
                      : 'green'

  // Phase breadcrumb
  const prevPhases = raw.phaseResults || []
  const phaseResults = [
    ...prevPhases.filter(p => p.phase !== 4),
    {
      phase: 4,
      ok: true,
      metrics: {
        solutions: solutions.length,
        coveragePct: traceabilityCoverage.coveragePct,
        totalPV3y: financialsP4.totalPVBenefit3y,
        isOverride: recommendation.isOverride
      }
    }
  ]

  return {
    status: phase5Contract.ok ? 'success' : 'warning',
    phase: 4,
    trackingId: raw.trackingId || `req_${Date.now()}_p4`,
    timestamp: new Date().toISOString(),

    recommendation,
    financialsP4,
    sensitivity: sensList,
    benefitSensitivity,

    budgetAnalysis: budgetAnalysisP4,
    withinCeiling,

    traceabilityCoverage,

    executiveHealth: {
      overallStatus,
      financialSummary: {
        totalInvestment:  financialsP4.totalCost,
        totalPVBenefit3y: financialsP4.totalPVBenefit3y,
        avgROIPct:        financialsP4.avgROIPct,
        withinBudget:     withinBudget,
        withinCeiling:    withinCeiling
      },
      budgetHealth: {
        status:         budgetStatus,
        withinBudget:   withinBudget,
        utilizationPct: budgetAnalysisP4.budgetUtilizationPct
      },
      traceabilityHealth: {
        status:      traceStatus,
        coveragePct: traceScore
      },
      confidenceHealth: {
        status:           confStatus,
        overallConfidence: overallConf
      },
      recommendedSolutionId:   recommendation.recommendedSolutionId,
      recommendedSolutionName: recommendation.recommendedSolutionName
    },

    phase5Contract,
    cbaSummary: cba,

    solutions,
    benefits,
    requirements,
    timeline:     raw.timeline     || {},
    traceability: raw.traceability || {},
    vendorData:   raw.vendorData   || [],

    isOverride:              recommendation.isOverride,
    userSelectedSolutionId:  recommendation.userOverride?.userSelectedSolutionId || null,
    overrideReason:          recommendation.userOverride?.reason || null,
    aiRecommendedSolutionId: recommendation.aiRecommendation?.solutionId || null,

    projectMeta: raw.projectMeta || {
      projectTitle:        raw.validatedData?.projectTitle || raw.projectTitle,
      industry:            raw.validatedData?.industry || 'default',
      timeHorizonYears:    ctx.timeHorizonYears,
      discountRatePct:     Math.round(ctx.discountRate * 100),
      budget:              n(raw.validatedData?.budget || 0),
      annualRevenue:       n(raw.validatedData?.annualRevenue || 0),
      annualOperatingCost: n(raw.validatedData?.annualOperatingCost || 0)
    },

    phaseResults
  }
}

// ═════════════════════════════════════════════════════════════════
// Route
// ═════════════════════════════════════════════════════════════════
router.post('/phase4', async (req, res) => {
  try {
    const raw = req.body

    const step1 = normalizeAndMap(raw)
    if (!step1.normalizeSuccess) return res.status(400).json([step1])

    const step2  = financialsPVROI(step1)
    const step3  = sensitivity(step2)
    const step4  = edgeSynthesis(step3)
    const step5  = traceabilityReview(step4)
    const step6  = rankingAndRecommendation(step5)
    const step7  = portfolioAggregator(step6)
    const step8  = cbaSummary(step7)
    const step9  = phase5ContractGuard(step8)
    const output = harmonizer(step9)

    return res.json([output])
  } catch (err) {
    console.error('Phase 4 error:', err)
    return res.status(500).json([{ status: 'error', phase: 4, errorMessage: err.message }])
  }
})

export default router
