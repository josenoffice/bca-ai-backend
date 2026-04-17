// ═══════════════════════════════════════════════════════════════════
// BCA.AI — Phase 2: Financial Analysis
// Pure JavaScript maths — NO Claude API call
// ═══════════════════════════════════════════════════════════════════
import { Router } from 'express'

const router = Router()

// ─── Utility ─────────────────────────────────────────────────────
const n = (v, fallback = 0) => {
  const num = Number(v)
  return Number.isFinite(num) ? num : fallback
}

// ─── Industry Configs ────────────────────────────────────────────
const INDUSTRY_CONFIGS = {
  retail:        { discountRate: 0.12, benefitMultiplier: 1.00, riskPenalty: 0.08, benchmarkROI: 200, benchmarkPaybackMonths: 15 },
  ecommerce:     { discountRate: 0.14, benefitMultiplier: 1.05, riskPenalty: 0.09, benchmarkROI: 220, benchmarkPaybackMonths: 12 },
  technology:    { discountRate: 0.10, benefitMultiplier: 1.10, riskPenalty: 0.07, benchmarkROI: 250, benchmarkPaybackMonths: 10 },
  finance:       { discountRate: 0.09, benefitMultiplier: 0.95, riskPenalty: 0.06, benchmarkROI: 180, benchmarkPaybackMonths: 18 },
  healthcare:    { discountRate: 0.11, benefitMultiplier: 0.90, riskPenalty: 0.10, benchmarkROI: 150, benchmarkPaybackMonths: 24 },
  manufacturing: { discountRate: 0.11, benefitMultiplier: 0.95, riskPenalty: 0.08, benchmarkROI: 160, benchmarkPaybackMonths: 20 },
  logistics:     { discountRate: 0.12, benefitMultiplier: 0.95, riskPenalty: 0.09, benchmarkROI: 155, benchmarkPaybackMonths: 18 },
  government:    { discountRate: 0.07, benefitMultiplier: 0.85, riskPenalty: 0.07, benchmarkROI: 120, benchmarkPaybackMonths: 30 },
  education:     { discountRate: 0.08, benefitMultiplier: 0.88, riskPenalty: 0.07, benchmarkROI: 130, benchmarkPaybackMonths: 28 },
  insurance:     { discountRate: 0.10, benefitMultiplier: 0.92, riskPenalty: 0.08, benchmarkROI: 170, benchmarkPaybackMonths: 20 },
  energy:        { discountRate: 0.10, benefitMultiplier: 0.93, riskPenalty: 0.09, benchmarkROI: 165, benchmarkPaybackMonths: 22 },
  default:       { discountRate: 0.12, benefitMultiplier: 1.00, riskPenalty: 0.08, benchmarkROI: 150, benchmarkPaybackMonths: 18 }
}

// ─── Requirement cost estimation ─────────────────────────────────
const REQ_BASE = 15000
const CATEGORY_COSTS = {
  integration:       60000,
  compliance:        70000,
  security:          50000,
  performance:       30000,
  mobile:            35000,
  user_experience:   15000,
  change_management: 20000
}
const COMPLEXITY_MULTIPLIER = { 1: 0.5, 2: 0.8, 3: 1.0, 4: 1.5, 5: 2.0 }

// ═════════════════════════════════════════════════════════════════
// Step 1 — inputValidation
// ═════════════════════════════════════════════════════════════════
function inputValidation(raw) {
  const errors = []
  const warnings = []

  const solutions    = raw.solutions    || []
  const benefits     = raw.benefits     || []
  const requirements = raw.requirements || []

  if (!solutions.length)    errors.push('MISSING_SOLUTIONS')
  if (!benefits.length)     errors.push('MISSING_BENEFITS')
  if (!requirements.length) errors.push('MISSING_REQUIREMENTS')

  if (benefits.length > 0 && benefits.length < 2)
    warnings.push(`Only ${benefits.length} benefit(s) provided`)
  if (requirements.length > 0 && requirements.length < 2)
    warnings.push(`Only ${requirements.length} requirement(s) provided`)
  if (solutions.length > 0 && solutions.every(s => !s.selectedVendor))
    warnings.push('No solutions have selectedVendor data')

  const validatedData  = raw.validatedData || {}
  const budget         = n(validatedData.budget)
  const discountRatePct = validatedData.discountRatePct
  const horizonYears   = n(validatedData.timeHorizonYears, 3)
  const annualRevenue  = validatedData.annualRevenue ?? null
  const withinCeiling  = raw.budgetAnalysis?.withinCeiling ?? null

  return {
    raw,
    solutions,
    benefits,
    requirements,
    validatedData,
    budget,
    discountRatePct,
    horizonYears,
    annualRevenue,
    withinCeiling,
    errors,
    warnings
  }
}

// ═════════════════════════════════════════════════════════════════
// Step 2 — industryConfig
// ═════════════════════════════════════════════════════════════════
function industryConfig(ctx) {
  const industry = (ctx.validatedData.industry || 'default').toLowerCase()
  const config = { ...(INDUSTRY_CONFIGS[industry] || INDUSTRY_CONFIGS.default) }
  config.industry = industry

  // User-supplied discount rate overrides industry default
  if (ctx.discountRatePct) {
    config.discountRate = n(ctx.discountRatePct) / 100
  }
  config.horizonYears = ctx.horizonYears

  ctx.config = config
  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 3 — solutionAnalyzer
// ═════════════════════════════════════════════════════════════════
function solutionAnalyzer(ctx) {
  ctx.solutions = ctx.solutions.map(s => {
    const vendor = s.selectedVendor || null
    const vendorMonths = n(vendor?.implementationMonths)
    return {
      ...s,
      totalCost:           n(s.totalCost || s.implementation_cost),
      implementation_cost: n(s.totalCost || s.implementation_cost),
      recurringAnnualCost: n(s.recurringAnnualCost),
      implementationTime:  vendorMonths > 0 ? vendorMonths : n(s.implementationTime, 12),
      riskLevel:           ['Low', 'Medium', 'High'].includes(s.riskLevel) ? s.riskLevel : 'Medium',
      selectedVendor:      vendor,
      vendorCostLow:       n(vendor?.vendorCostLow) || null,
      vendorCostHigh:      n(vendor?.vendorCostHigh) || null,
      vendorFitScore:      vendor?.fitScore ?? null,
      linkedBenefits:      Array.isArray(s.linkedBenefits) ? [...s.linkedBenefits] : [],
      linkedRequirements:  Array.isArray(s.linkedRequirements) ? [...s.linkedRequirements] : [],
      delivers_benefits:        Array.isArray(s.delivers_benefits) ? [...s.delivers_benefits] : [],
      depends_on_requirements:  Array.isArray(s.depends_on_requirements) ? [...s.depends_on_requirements] : [],
      // Clear — recalculated in step 7
      npv: null, roi: null, irr: null
    }
  })
  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 4 — benefitCalculator
// ═════════════════════════════════════════════════════════════════
function benefitCalculator(ctx) {
  const { config } = ctx

  ctx.benefits = ctx.benefits.map(b => {
    const baseValue = n(b.riskAdjustedValue || b.annualizedValue || b.value)

    // Apply industry multiplier (only on first pass)
    const lifetimeValue = b.phase2Adjusted
      ? baseValue
      : Math.round(baseValue * config.benefitMultiplier)

    // riskAdjustedValue from Phase 1 is a LIFETIME total
    // Divide by horizonYears to get annual figure
    const annualizedValue = Math.round(lifetimeValue / config.horizonYears)

    // Normalise confidence: 0–1 range (some inputs are 0–100)
    let confidence = n(b.confidence, 0.75)
    if (confidence > 1 && confidence <= 100) confidence = confidence / 100
    confidence = Math.max(0, Math.min(1, confidence))

    return {
      ...b,
      riskAdjustedValue: lifetimeValue,
      annualizedValue,
      confidence,
      phase2Adjusted: true,
      multiplierApplied: config.benefitMultiplier !== 1.0
    }
  })

  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 5 — requirementEstimator
// ═════════════════════════════════════════════════════════════════
function requirementEstimator(ctx) {
  ctx.requirements = ctx.requirements.map(r => {
    if (!r.estimatedCost) {
      const complexity = Math.max(1, Math.min(5, n(r.complexity, 3)))
      r.estimatedCost = CATEGORY_COSTS[r.category?.toLowerCase()] ||
        Math.round(REQ_BASE * complexity * (COMPLEXITY_MULTIPLIER[complexity] || 1.0))
    }
    return r
  })
  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 6 — linkageValidator
// ═════════════════════════════════════════════════════════════════
function tokenize(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean)
}

function jaccard(tokensA, tokensB) {
  const A = new Set(tokensA), B = new Set(tokensB)
  let intersection = 0
  for (const t of A) if (B.has(t)) intersection++
  const union = A.size + B.size - intersection
  return union ? intersection / union : 0
}

function meetsThreshold(solTokens, itemTokens, score) {
  const shared = solTokens.filter(t => itemTokens.includes(t))
  return score >= 0.3 && shared.length >= 2
}

function linkageValidator(ctx) {
  const { solutions, benefits, requirements } = ctx
  const benefitMap = Object.fromEntries(benefits.map(b => [b.id, b]))
  const reqMap     = Object.fromEntries(requirements.map(r => [r.id, r]))

  for (const s of solutions) {
    const solTokens = tokenize(s.name + ' ' + (s.description || '') + ' ' + (s.category || ''))

    // Auto-fill benefit links if fewer than 2
    if (s.linkedBenefits.length < 2) {
      for (const b of benefits) {
        if (s.linkedBenefits.includes(b.id)) continue
        const bTokens = tokenize(b.description + ' ' + (b.category || ''))
        const score = jaccard(solTokens, bTokens)
        if (meetsThreshold(solTokens, bTokens, score)) {
          s.linkedBenefits.push(b.id)
          if (!s.delivers_benefits.includes(b.id)) s.delivers_benefits.push(b.id)
        }
      }
    }

    // Auto-fill requirement links if fewer than 2
    if (s.linkedRequirements.length < 2) {
      for (const r of requirements) {
        if (s.linkedRequirements.includes(r.id)) continue
        const rTokens = tokenize(r.description + ' ' + (r.category || ''))
        const score = jaccard(solTokens, rTokens)
        if (meetsThreshold(solTokens, rTokens, score)) {
          s.linkedRequirements.push(r.id)
          if (!s.depends_on_requirements.includes(r.id)) s.depends_on_requirements.push(r.id)
        }
      }
    }

    // Compute linking confidence
    const benefitConfidence = s.linkedBenefits.length > 0
      ? s.linkedBenefits.reduce((sum, bid) => {
          const bTokens = tokenize((benefitMap[bid]?.description || '') + ' ' + (benefitMap[bid]?.category || ''))
          return sum + jaccard(solTokens, bTokens)
        }, 0) / s.linkedBenefits.length
      : 0

    const reqConfidence = s.linkedRequirements.length > 0
      ? s.linkedRequirements.reduce((sum, rid) => {
          const rTokens = tokenize((reqMap[rid]?.description || '') + ' ' + (reqMap[rid]?.category || ''))
          return sum + jaccard(solTokens, rTokens)
        }, 0) / s.linkedRequirements.length
      : 0

    s.linking = {
      confidence: {
        benefits: Math.round(benefitConfidence * 100) / 100,
        requirements: Math.round(reqConfidence * 100) / 100
      }
    }

    // Compute annualBenefit: sum of annualizedValue of all linked benefits
    s.annualBenefit = s.linkedBenefits
      .map(bid => benefitMap[bid]?.annualizedValue || 0)
      .reduce((sum, v) => sum + v, 0)
  }

  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 7 — dcfNpvIrr
// ═════════════════════════════════════════════════════════════════
function calculateNPV(cost, annualBenefit, rate, years) {
  let npv = -cost
  for (let y = 1; y <= years; y++) {
    npv += annualBenefit / Math.pow(1 + rate, y)
  }
  return npv
}

function calculateIRR(cost, annualBenefit, years) {
  if (annualBenefit <= 0 || cost <= 0) return { value: null, irrExceedsCapacity: false }

  for (const upperBound of [2.0, 10.0, 50.0]) {
    let npvAtHigh = -cost
    for (let y = 1; y <= years; y++) npvAtHigh += annualBenefit / Math.pow(1 + upperBound, y)
    if (npvAtHigh > 0) continue

    let low = 0, high = upperBound
    for (let iter = 0; iter < 60; iter++) {
      const mid = (low + high) / 2
      let npvMid = -cost
      for (let y = 1; y <= years; y++) npvMid += annualBenefit / Math.pow(1 + mid, y)
      if (Math.abs(npvMid) < 0.01) return { value: Math.round(mid * 100), irrExceedsCapacity: false }
      if (npvMid > 0) low = mid; else high = mid
    }
    return { value: Math.round(((low + high) / 2) * 100), irrExceedsCapacity: false }
  }
  return { value: null, irrExceedsCapacity: true }
}

function dcfNpvIrr(ctx) {
  const { config } = ctx
  const { discountRate, horizonYears } = config

  for (const s of ctx.solutions) {
    const cost = n(s.totalCost)
    const annualBenefit = n(s.annualBenefit)

    // Zero cost or zero benefit → all zeros
    if (cost === 0 || annualBenefit === 0) {
      s.npv = 0
      s.roi = 0
      s.irr = null
      s.irrExceedsCapacity = false
      s.paybackMonths = null
      s.breakEvenYear = null
      s.discountedCashFlows = [0]
      s.financials = { npv: 0, roi: 0, irr: null, irrExceedsCapacity: false, paybackMonths: null, npvLow: null, npvHigh: null }
      continue
    }

    const npv = Math.round(calculateNPV(cost, annualBenefit, discountRate, horizonYears))
    const roi = Math.round(((annualBenefit * horizonYears - cost) / cost) * 100)
    const irr = calculateIRR(cost, annualBenefit, horizonYears)
    const paybackMonths = Math.round((cost / annualBenefit) * 12)

    // Discounted cash flows + break-even year
    const dcf = [-cost]
    let cumulative = -cost, breakEvenYear = null
    for (let y = 1; y <= horizonYears; y++) {
      const pv = Math.round(annualBenefit / Math.pow(1 + discountRate, y))
      dcf.push(pv)
      cumulative += pv
      if (cumulative >= 0 && breakEvenYear === null) breakEvenYear = y
    }

    // NPV range using vendor cost anchors
    const npvLow  = s.vendorCostLow  ? Math.round(calculateNPV(s.vendorCostLow,  annualBenefit, discountRate, horizonYears)) : null
    const npvHigh = s.vendorCostHigh ? Math.round(calculateNPV(s.vendorCostHigh, annualBenefit, discountRate, horizonYears)) : null

    s.npv = npv
    s.roi = roi
    s.irr = irr.value
    s.irrExceedsCapacity = irr.irrExceedsCapacity
    s.paybackMonths = paybackMonths
    s.breakEvenYear = breakEvenYear
    s.discountedCashFlows = dcf
    s.financials = {
      npv, roi,
      irr: irr.value,
      irrExceedsCapacity: irr.irrExceedsCapacity,
      paybackMonths,
      npvLow,
      npvHigh
    }
  }

  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 8 — portfolioAggregator
// ═════════════════════════════════════════════════════════════════
function portfolioAggregator(ctx) {
  const { config, budget, withinCeiling } = ctx
  const { discountRate, horizonYears } = config
  const active = ctx.solutions.filter(s => !s.ignore)

  const totalInitialCost    = active.reduce((s, x) => s + n(x.totalCost), 0)
  const totalAnnualRecurring = active.reduce((s, x) => s + n(x.recurringAnnualCost), 0)
  const totalTCO            = totalInitialCost + (totalAnnualRecurring * horizonYears)
  const totalBenefit        = active.reduce((s, x) => s + n(x.annualBenefit), 0)
  const totalNPV            = active.reduce((s, x) => s + n(x.npv), 0)

  // Average ROI (only positive)
  const positiveROIs = active.map(s => n(s.roi)).filter(r => r > 0)
  const averageROI = positiveROIs.length > 0
    ? Math.round(positiveROIs.reduce((a, b) => a + b, 0) / positiveROIs.length)
    : 0

  // Portfolio IRR from aggregated cash flows
  const netAnnualCashFlow = totalBenefit - totalAnnualRecurring
  const portfolioIRR = calculateIRR(totalInitialCost, netAnnualCashFlow, horizonYears).value
  const paybackMonths = totalBenefit > 0 ? Math.round((totalTCO / totalBenefit) * 12) : null

  // Budget status
  const budgetUtilizationPct = budget > 0 ? Math.round((totalTCO / budget) * 100) : null
  const withinBudget         = budget > 0 ? totalTCO <= budget : null
  const initialCostWithinBudget = budget > 0 ? totalInitialCost <= budget : null

  // Budget suggestion
  let budgetSuggestion = null
  if (withinBudget === false) {
    budgetSuggestion = `Total TCO ($${totalTCO.toLocaleString()}) exceeds budget ($${budget.toLocaleString()}) by $${(totalTCO - budget).toLocaleString()}. Consider deferring lower-priority solutions or negotiating vendor pricing.`
  } else if (budgetUtilizationPct !== null && budgetUtilizationPct < 50) {
    budgetSuggestion = `Budget utilization is only ${budgetUtilizationPct}%. Consider expanding scope or reallocating surplus.`
  }

  // Vendor cost ranges
  const vendorCostLows  = active.map(s => s.vendorCostLow).filter(v => v !== null)
  const vendorCostHighs = active.map(s => s.vendorCostHigh).filter(v => v !== null)

  ctx.portfolioMetrics = {
    portfolio: {
      totalInitialCost,
      totalAnnualRecurring,
      totalTCO,
      totalBenefit,
      totalNPV,
      averageROI,
      portfolioIRR,
      paybackMonths,
      withinBudget,
      withinCeiling,
      budgetUtilizationPct,
      initialCostWithinBudget,
      budgetSuggestion
    },
    portfolioCostRange: {
      low:  vendorCostLows.length  > 0 ? vendorCostLows.reduce((a, b) => a + b, 0) : null,
      high: vendorCostHighs.length > 0 ? vendorCostHighs.reduce((a, b) => a + b, 0) : null
    }
  }

  ctx.budgetAnalysis = {
    totalInitialCost,
    budget,
    budgetUtilizationPct,
    withinBudget,
    withinCeiling,
    tco: totalTCO,
    budgetSuggestion
  }

  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 9 — riskAnalyzer (sensitivity)
// ═════════════════════════════════════════════════════════════════
function riskAnalyzer(ctx) {
  const { config } = ctx
  const { discountRate, horizonYears } = config
  const active = ctx.solutions.filter(s => !s.ignore)

  // Discount rate sensitivity: base ±2%
  const discountRateScenarios = [-0.02, 0, 0.02].map(adj => {
    const rate = discountRate + adj
    const totalPV = active.reduce((sum, s) => {
      let npv = -n(s.totalCost)
      for (let y = 1; y <= horizonYears; y++) npv += n(s.annualBenefit) / Math.pow(1 + rate, y)
      return sum + npv
    }, 0)
    return {
      discountRate: Math.round(rate * 1000) / 1000,
      portfolioNPV: Math.round(totalPV),
      label: adj === 0 ? 'base' : adj < 0 ? 'optimistic' : 'conservative'
    }
  })

  // Benefit sensitivity: confidence-modulated bands
  const totalBaseBenefit = active.reduce((sum, s) => sum + n(s.annualBenefit), 0)

  const worstBenefits = Math.round(active.reduce((sum, s) => {
    const confidence = n(s.linking?.confidence?.benefits, 0.5)
    return sum + n(s.annualBenefit) * (0.70 + confidence * 0.10)
  }, 0))

  const bestBenefits = Math.round(active.reduce((sum, s) => {
    const confidence = n(s.linking?.confidence?.benefits, 0.5)
    return sum + n(s.annualBenefit) * (1.25 + confidence * 0.15)
  }, 0))

  ctx.sensitivityAnalysis = {
    discountRateScenarios,
    benefitScenarios: {
      worst: worstBenefits,
      base:  totalBaseBenefit,
      best:  bestBenefits
    }
  }

  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 10 — traceabilityHealth
// ═════════════════════════════════════════════════════════════════
function traceabilityHealth(ctx) {
  const { solutions, benefits, requirements, validatedData } = ctx
  const active = solutions.filter(s => !s.ignore)

  // Structural coverage
  let covered = 0
  for (const s of active) {
    covered += (s.linkedBenefits || []).length
    covered += (s.linkedRequirements || []).length
  }
  const theoretical = Math.min(
    solutions.length * benefits.length,
    solutions.length * requirements.length
  )
  const rawLinkageScore = theoretical > 0 ? Math.min(100, Math.round(covered / theoretical * 100)) : 100

  // Semantic score: average linking confidence
  const semanticScore = Math.min(100, Math.round(
    active.reduce((sum, s) => {
      const bc = n(s.linking?.confidence?.benefits)
      const rc = n(s.linking?.confidence?.requirements)
      return sum + (bc + rc) / 2
    }, 0) / Math.max(1, active.length) * 100
  ))

  // Blended health score
  const healthScore = Math.round(rawLinkageScore * 0.60 + semanticScore * 0.40)

  // Vendor compliance per solution
  const normStd = c => c.replace(/[-_\s]+/g, '').toUpperCase()
  const globalCompliance = (validatedData.complianceRequirements || []).map(normStd)

  const vendorCompliancePerSolution = active
    .filter(s => s.selectedVendor)
    .map(s => {
      const vendorCoverage = (s.selectedVendor.complianceCoverage || []).map(normStd)
      const coveredStandards = globalCompliance.filter(std => vendorCoverage.includes(std))
      const gaps = globalCompliance.filter(std => !vendorCoverage.includes(std))
      const vendorComplianceScore = globalCompliance.length > 0
        ? Math.round(coveredStandards.length / globalCompliance.length * 100)
        : 100
      return {
        solutionId: s.id,
        vendorName: s.selectedVendor.name,
        vendorComplianceScore,
        requiredStandards: globalCompliance,
        coveredStandards,
        gaps
      }
    })

  ctx.traceability = {
    healthScore,
    linkageScore: rawLinkageScore,
    coveredPairs: covered,
    theoreticalPairs: theoretical,
    vendorCompliancePerSolution
  }

  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 11 — responseHarmonizer
// ═════════════════════════════════════════════════════════════════
function responseHarmonizer(ctx) {
  const {
    raw, solutions, benefits, requirements,
    config, budget, validatedData,
    portfolioMetrics, budgetAnalysis,
    sensitivityAnalysis, traceability, warnings
  } = ctx

  const active = solutions.filter(s => !s.ignore)
  const incomingScore = n(raw.reflection?.overallScore)

  // Phase 2 quality score (composite)
  const traceScore = Math.min(100, traceability.healthScore)

  const withinBudget = portfolioMetrics.portfolio.withinBudget
  const budgetUtilizationPct = portfolioMetrics.portfolio.budgetUtilizationPct
  const budgetScore = withinBudget === true ? 100
    : withinBudget === false
      ? Math.max(0, 100 - (budgetUtilizationPct - 100) * 3)
      : 70

  const npvPositive = Math.round(
    active.filter(s => n(s.npv) > 0).length / Math.max(1, active.length) * 100
  )

  const phase2Score = Math.round(
    traceScore    * 0.30 +
    budgetScore   * 0.25 +
    npvPositive   * 0.25 +
    (incomingScore > 0 ? incomingScore : 50) * 0.20
  )

  return {
    status: 'success',
    phase: 2,
    trackingId: raw.trackingId || `req_${Date.now()}_p2`,
    timestamp: new Date().toISOString(),

    projectMeta: {
      projectTitle:       validatedData.projectTitle || null,
      industry:           validatedData.industry || null,
      timeHorizonYears:   config.horizonYears,
      discountRatePct:    Math.round(config.discountRate * 100),
      budget,
      annualRevenue:      validatedData.annualRevenue ?? null,
      annualOperatingCost: validatedData.annualOperatingCost ?? null,
      expectedTimeframe:  validatedData.expectedTimeframe ?? null
    },

    solutions,
    benefits,
    requirements,

    portfolioMetrics,
    budgetAnalysis,
    sensitivityAnalysis,
    traceability,

    qualityScore: {
      overallScore: phase2Score,
      traceScore,
      budgetScore,
      npvPositive,
      incomingScore: incomingScore || null
    },

    validation: {
      passed: true,
      errors: [],
      warnings
    },

    industryConfig: {
      industry:               config.industry,
      discountRate:           config.discountRate,
      benefitMultiplier:      config.benefitMultiplier,
      riskPenalty:            config.riskPenalty,
      benchmarkROI:           config.benchmarkROI,
      benchmarkPaybackMonths: config.benchmarkPaybackMonths,
      horizonYears:           config.horizonYears
    }
  }
}

// ═════════════════════════════════════════════════════════════════
// Route Handler
// ═════════════════════════════════════════════════════════════════
router.post('/phase2', async (req, res) => {
  try {
    const raw = req.body
    console.log('Phase 2 Financial Analysis — starting (pure JS, no AI call)')

    // Step 1
    const validated = inputValidation(raw)
    if (validated.errors.length) {
      return res.status(400).json([{
        status: 'error',
        phase: 2,
        errors: validated.errors
      }])
    }

    // Steps 2–11 — pure maths pipeline
    const withConfig    = industryConfig(validated)
    const withSolutions = solutionAnalyzer(withConfig)
    const withBenefits  = benefitCalculator(withSolutions)
    const withReqs      = requirementEstimator(withBenefits)
    const withLinks     = linkageValidator(withReqs)
    const withDCF       = dcfNpvIrr(withLinks)
    const withPortfolio = portfolioAggregator(withDCF)
    const withRisk      = riskAnalyzer(withPortfolio)
    const withTrace     = traceabilityHealth(withRisk)
    const response      = responseHarmonizer(withTrace)

    console.log(`Phase 2 complete — score: ${response.qualityScore.overallScore}, totalNPV: ${response.portfolioMetrics.portfolio.totalNPV}`)

    return res.json([response])

  } catch (err) {
    console.error('Phase 2 error:', err)
    return res.status(500).json([{
      status: 'error',
      phase: 2,
      errorMessage: err.message
    }])
  }
})

export default router
