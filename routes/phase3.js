// ═══════════════════════════════════════════════════════════════════
// BCA.AI — Phase 3: Traceability Validation
// Pure JavaScript logic — NO Claude API call
// 10 sequential steps + responseHarmonizer
// ═══════════════════════════════════════════════════════════════════
import { Router } from 'express'

const router = Router()

// ─── Utility ─────────────────────────────────────────────────────
const n = (v, fallback = 0) => {
  const num = Number(v)
  return Number.isFinite(num) ? num : fallback
}

function autoId(prefix, index) {
  return `${prefix}-${String(index + 1).padStart(3, '0')}`
}

// ═════════════════════════════════════════════════════════════════
// Step 1 — normalizeInput
// ═════════════════════════════════════════════════════════════════
function normalizeInput(raw) {
  // Pipeline error passthrough
  if (raw.pipelineError) {
    return { error: true, pipelineError: raw.pipelineError, raw }
  }

  const solutions    = raw.solutions    || []
  const benefits     = raw.benefits     || []
  const requirements = raw.requirements || []

  const errors = []
  if (!solutions.length)    errors.push('MISSING_SOLUTIONS')
  if (!benefits.length)     errors.push('MISSING_BENEFITS')
  if (!requirements.length) errors.push('MISSING_REQUIREMENTS')

  // Dual field sync — ensure both naming conventions present
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

  // Merge projectMeta into validatedData
  const validatedData = {
    ...raw.validatedData,
    industry:         raw.projectMeta?.industry         || raw.validatedData?.industry,
    timeHorizonYears: raw.projectMeta?.timeHorizonYears || raw.validatedData?.timeHorizonYears || 3,
    discountRatePct:  raw.projectMeta?.discountRatePct  || raw.validatedData?.discountRatePct  || 12,
    budget:           raw.projectMeta?.budget           || raw.validatedData?.budget           || 0,
    annualRevenue:    raw.projectMeta?.annualRevenue     ?? raw.validatedData?.annualRevenue    ?? null
  }

  const projectTitle = validatedData.projectTitle || raw.projectMeta?.projectTitle || ''

  // Save phase2VendorCompliance before traceability is overwritten
  const phase2VendorCompliance = raw.traceability?.vendorCompliancePerSolution || []

  return {
    raw, solutions, benefits, requirements, validatedData, projectTitle,
    phase2VendorCompliance, errors,
    horizon: n(validatedData.timeHorizonYears, 3)
  }
}

// ═════════════════════════════════════════════════════════════════
// Step 2 — normalizeRequirements
// ═════════════════════════════════════════════════════════════════
function normalizeRequirements(ctx) {
  ctx.requirements = ctx.requirements.map((r, i) => ({
    ...r,
    id:            r.id || autoId('REQ', i),
    title:         r.title || r.name || r.description,
    priority:      ['must_have', 'should_have', 'could_have'].includes(r.priority)
                     ? r.priority : 'should_have',
    complexity:    Math.max(1, Math.min(5, n(r.complexity, 3))),
    estimatedCost: n(r.estimatedCost || r.cost || r.totalCost, 0),
    category:      r.category || 'general',
    status:        r.status !== undefined ? r.status : false
  }))
  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 3 — benefitsAndSolutions
// ═════════════════════════════════════════════════════════════════
function benefitsAndSolutions(ctx) {
  const { horizon } = ctx

  // Normalise benefits
  ctx.benefits = ctx.benefits.map((b, i) => {
    const riskAdjustedValue = n(b.riskAdjustedValue || b.annualizedValue || b.value, 0)
    const annualizedValue = b.annualizedValue != null
      ? n(b.annualizedValue)
      : riskAdjustedValue > 0 && horizon > 1
        ? Math.round(riskAdjustedValue / horizon)
        : riskAdjustedValue

    // Normalise confidence: 0-1 → 0-100
    let confidence = n(b.confidence || b.confidenceScore, 0.7)
    if (confidence <= 1) confidence = Math.round(confidence * 100)

    return {
      ...b,
      id: b.id || autoId('BEN', i),
      annualizedValue,
      riskAdjustedValue,
      confidence
    }
  })

  // Normalise solutions
  ctx.solutions = ctx.solutions.map((s, i) => {
    const vendorMonths = n(s.selectedVendor?.implementationMonths || s.vendorImplementationMonths, 0)
    const timelineWeeks = vendorMonths > 0
      ? Math.ceil(vendorMonths * 4)
      : s.timelineWeeks || Math.ceil(n(s.implementationTime, 12) * 4)

    let confidenceScore = n(s.confidenceScore || s.confidence || s.strategicAlignment, 0.7)
    if (confidenceScore <= 1) confidenceScore = Math.round(confidenceScore * 100)

    return {
      ...s,
      id: s.id || autoId('SOL', i),
      name: s.name || s.solutionName || `Solution ${i + 1}`,
      estimatedCostUSD: n(s.totalCost || s.implementation_cost || s.estimatedCostUSD, 0),
      timelineWeeks,
      vendorImplementationMonths: vendorMonths || null,
      confidenceScore,
      riskLevel: ['Low', 'Medium', 'High'].includes(s.riskLevel) ? s.riskLevel : 'Medium'
    }
  })

  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 4 — dependencyDetection
// ═════════════════════════════════════════════════════════════════
function dependencyDetection(ctx) {
  const { solutions } = ctx
  const edges = []

  for (const sol of solutions) {
    const sId = sol.id
    for (const bid of (sol.delivers_benefits || sol.linkedBenefits || [])) {
      edges.push({ from: sId, to: bid, type: 'delivers' })
    }
    for (const rid of (sol.depends_on_requirements || sol.linkedRequirements || [])) {
      edges.push({ from: rid, to: sId, type: 'requires' })
    }
  }

  // Critical path — dependency-aware topological ordering
  const reqToSolCount = {}
  solutions.forEach(s => {
    (s.depends_on_requirements || []).forEach(rid => {
      reqToSolCount[rid] = (reqToSolCount[rid] || 0) + 1
    })
  })

  const scored = solutions.map(s => ({
    id: s.id,
    score: (s.depends_on_requirements || []).reduce((sum, rid) => sum + (reqToSolCount[rid] || 1), 0) * 2
         + n(s.timelineWeeks, 0)
  })).sort((a, b) => b.score - a.score)

  const criticalPath = scored.slice(0, 3).map(x => x.id)

  // Average requirement complexity
  const avgReqComplexity = ctx.requirements.length > 0
    ? Math.round(ctx.requirements.reduce((sum, r) => sum + n(r.complexity, 3), 0) / ctx.requirements.length)
    : 3

  ctx.edges = edges
  ctx.criticalPath = criticalPath
  ctx.avgReqComplexity = avgReqComplexity
  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 5 — confidenceScoring
// ═════════════════════════════════════════════════════════════════
function confidenceScoring(ctx) {
  const { solutions } = ctx
  const buckets = { low: 0, med: 0, high: 0 }

  solutions.forEach(s => {
    const cs = n(s.confidenceScore, 70)
    if (cs < 60)       buckets.low++
    else if (cs < 75)  buckets.med++
    else               buckets.high++
  })

  const avgConfidence = Math.round(
    solutions.reduce((a, s) => a + n(s.confidenceScore, 70), 0)
    / Math.max(1, solutions.length)
  )

  const highRiskLowConf = solutions
    .filter(s => s.riskLevel?.toLowerCase() === 'high' && n(s.confidenceScore, 70) < 65)
    .map(s => s.id)

  ctx.confidenceAnalysis = {
    average: avgConfidence,
    distribution: buckets,
    highRiskLowConfidenceSolutions: highRiskLowConf
  }
  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 6 — calculateFulfillment
// ═════════════════════════════════════════════════════════════════
function calculateFulfillment(ctx) {
  const { solutions, requirements, benefits, edges } = ctx

  ctx.fulfillmentAnalysis = {
    solutions: solutions.map(sol => {
      const linkedReqs = edges.filter(e => e.type === 'requires' && e.to === sol.id).map(e => e.from)
      const linkedBens = edges.filter(e => e.type === 'delivers' && e.from === sol.id).map(e => e.to)

      // Requirement coverage: inverse complexity scoring
      const reqCoverage = linkedReqs.map(rid => {
        const req = requirements.find(r => r.id === rid)
        const complexity = n(req?.complexity, 3)
        return Math.max(50, 100 - complexity * 10)
      })
      const reqOverall = reqCoverage.length
        ? Math.round(reqCoverage.reduce((a, b) => a + b, 0) / reqCoverage.length) : 0

      // Benefit contribution: annualizedValue * (confidence / 100)
      const benContribs = linkedBens.map(bid => {
        const ben = benefits.find(b => b.id === bid)
        const benValue   = n(ben?.annualizedValue || ben?.riskAdjustedValue, 0)
        const confidence = n(sol.confidenceScore, 70)
        return {
          benId:       bid,
          contributed: Math.round(benValue * confidence / 100),
          total:       benValue,
          percentage:  confidence
        }
      })
      const benOverall = benContribs.length
        ? Math.round(benContribs.reduce((a, b) => a + b.percentage, 0) / benContribs.length) : 0

      // Traceability score: geometric mean
      const traceabilityScore = (reqOverall > 0 && benOverall > 0)
        ? Math.round(Math.sqrt(reqOverall * benOverall))
        : Math.max(reqOverall, benOverall)

      return { solutionId: sol.id, reqCoverage: reqOverall, benContribution: benOverall, traceabilityScore }
    })
  }
  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 7 — timelineBuilder
// ═════════════════════════════════════════════════════════════════
function timelineBuilder(ctx) {
  const { solutions, validatedData, criticalPath } = ctx
  const DEFAULT_WEIGHTS = { discovery: 15, build: 55, test: 25, goLive: 5 }

  // Per-solution timeline with phase weights
  const solutionTimelines = solutions.map(s => {
    const vendorMonths = n(s.vendorImplementationMonths, 0)
    const effectiveWeeks = vendorMonths > 0
      ? Math.ceil(vendorMonths * 4)
      : n(s.timelineWeeks, 12)

    let weights = { ...DEFAULT_WEIGHTS }
    if (s.selectedVendor?.deliveryTimeline?.phases) {
      const phases = s.selectedVendor.deliveryTimeline.phases
      const total  = phases.reduce((sum, p) => sum + n(p.months), 0)
      if (total > 0) {
        weights = {
          discovery: Math.round((n(phases[0]?.months) / total) * 100) || 15,
          build:     Math.round((n(phases[1]?.months) / total) * 100) || 55,
          test:      Math.round((n(phases[2]?.months) / total) * 100) || 25,
          goLive:    Math.round((n(phases[3]?.months) / total) * 100) || 5
        }
      }
    }
    return {
      solutionId: s.id,
      name: s.name,
      timelineWeeks: effectiveWeeks,
      vendorImplementationMonths: vendorMonths || null,
      phaseWeights: weights
    }
  })

  // Portfolio timeline
  const maxWeeks = Math.max(...solutions.map(s => n(s.timelineWeeks, 0)), 1)
  let totalDuration = maxWeeks
  let deliveryModel = 'parallel'

  // Adjust for sequential dependencies on critical path
  const cpSolutions = solutions.filter(s => criticalPath.includes(s.id))
  let sharedReqCount = 0
  for (let i = 0; i < cpSolutions.length; i++) {
    for (let j = i + 1; j < cpSolutions.length; j++) {
      const setA = new Set(cpSolutions[i].depends_on_requirements || [])
      const setB = new Set(cpSolutions[j].depends_on_requirements || [])
      for (const r of setA) if (setB.has(r)) sharedReqCount++
    }
  }
  if (sharedReqCount > 0) {
    const overheadPct = Math.min(0.50, sharedReqCount * 0.20)
    totalDuration = Math.ceil(maxWeeks * (1 + overheadPct))
    deliveryModel = 'sequential_adjusted'
  }

  // Start / end dates
  const startDate = validatedData.projectStartDate
    ? new Date(validatedData.projectStartDate)
    : new Date()
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + totalDuration * 7)

  // 4 standard timeline phases
  const phases = [
    { name: 'Discovery & Design',
      startWeek: 1,
      endWeek: Math.max(1, Math.round(totalDuration * 0.15)) },
    { name: 'Build & Integrate',
      startWeek: Math.round(totalDuration * 0.15) + 1,
      endWeek: Math.round(totalDuration * 0.70) },
    { name: 'Test & Validate',
      startWeek: Math.round(totalDuration * 0.70) + 1,
      endWeek: Math.round(totalDuration * 0.95) },
    { name: 'Go-Live & Hypercare',
      startWeek: Math.round(totalDuration * 0.95) + 1,
      endWeek: totalDuration }
  ]

  const totalCost = solutions.reduce((sum, s) => sum + n(s.totalCost || s.estimatedCostUSD, 0), 0)

  ctx.timeline = {
    projectTimeline: {
      totalDurationWeeks: totalDuration,
      deliveryModel,
      projectStartDate: startDate.toISOString().split('T')[0],
      projectEndDate:   endDate.toISOString().split('T')[0],
      totalCost
    },
    phases,
    solutions: solutionTimelines
  }
  ctx.totalDurationWeeks = totalDuration
  ctx.timelinePhases = phases
  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 8 — traceabilityCoverage
// ═════════════════════════════════════════════════════════════════
function traceabilityCoverage(ctx) {
  const { solutions, benefits, requirements, phase2VendorCompliance } = ctx

  // Build lookup maps
  const solToBen = new Map()
  const solToReq = new Map()
  for (const s of solutions) {
    solToBen.set(s.id, new Set(s.delivers_benefits || s.linkedBenefits || []))
    solToReq.set(s.id, new Set(s.depends_on_requirements || s.linkedRequirements || []))
  }

  // Per-solution balance score
  const perSolutionScores = solutions.map(s => {
    const benCount = (solToBen.get(s.id) || new Set()).size
    const reqCount = (solToReq.get(s.id) || new Set()).size
    if (benCount === 0 && reqCount === 0) return 0
    if (benCount === 0 || reqCount === 0) return 30
    return Math.round(Math.min(benCount, reqCount) / Math.max(benCount, reqCount) * 100)
  })

  const rawLinkageScore = Math.round(
    perSolutionScores.reduce((a, b) => a + b, 0) / Math.max(1, perSolutionScores.length)
  )

  // Blend with vendor compliance from Phase 2
  const evaluatedCompliance = phase2VendorCompliance
    .filter(v => v.vendorComplianceScore !== null && v.vendorComplianceScore !== undefined)
    .map(v => v.vendorComplianceScore)

  const healthScore = evaluatedCompliance.length > 0
    ? Math.round(rawLinkageScore * 0.7
        + (evaluatedCompliance.reduce((a, b) => a + b, 0) / evaluatedCompliance.length) * 0.3)
    : rawLinkageScore

  // Covered and theoretical pairs
  const coveredPairs = solutions.reduce((sum, s) => {
    const b = (solToBen.get(s.id) || new Set()).size
    const r = (solToReq.get(s.id) || new Set()).size
    return sum + Math.min(b, r)
  }, 0)
  const theoreticalPairs = Math.max(1, Math.min(
    solutions.length * benefits.length,
    solutions.length * requirements.length
  ))

  ctx.traceability = {
    healthScore,
    linkageScore: rawLinkageScore,
    coveredPairs,
    theoreticalPairs,
    vendorCompliancePerSolution: phase2VendorCompliance
  }
  ctx.traceabilityCoverage_ = { coveragePct: healthScore }
  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 9 — executiveHealthBadge
// ═════════════════════════════════════════════════════════════════
function executiveHealthBadge(ctx) {
  const { solutions } = ctx

  const fullyLinked = solutions.filter(s =>
    (s.delivers_benefits || []).length > 0 &&
    (s.depends_on_requirements || []).length > 0
  ).length

  const withFinance = solutions.filter(s => {
    const hasCost    = n(s.totalCost || s.estimatedCostUSD || s.implementation_cost) > 0
    const hasBenefit = (s.linkedBenefits || s.delivers_benefits || []).length > 0
    return hasCost && hasBenefit
  }).length

  const linkageRate     = Math.round(fullyLinked / Math.max(1, solutions.length) * 100)
  const financeCoverage = Math.round(withFinance / Math.max(1, solutions.length) * 100)

  const status = linkageRate >= 90 && financeCoverage >= 90 ? 'green'
               : linkageRate >= 70 && financeCoverage >= 70 ? 'amber'
               : 'red'

  const notes = []
  if (linkageRate < 100) notes.push(`${solutions.length - fullyLinked} solution(s) missing benefit or requirement links`)
  if (financeCoverage < 100) notes.push(`${solutions.length - withFinance} solution(s) missing cost or benefit data`)

  ctx.executiveHealth = {
    status,
    linkage: {
      totalSolutions: solutions.length,
      fullyLinked,
      linkageRatePct: linkageRate
    },
    finance: {
      solutionsWithCostAndBenefitPct: financeCoverage
    },
    notes
  }
  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 10 — phase4ReadinessPackaging
// ═════════════════════════════════════════════════════════════════
function phase4ReadinessPackaging(ctx) {
  const { solutions, benefits, requirements, projectTitle, timelinePhases, totalDurationWeeks } = ctx

  const phase4ContractReady = solutions.length > 0

  const portfolioConfidence = Math.round(
    solutions.reduce((sum, s) => sum + n(s.confidenceScore, 70), 0)
    / Math.max(1, solutions.length)
  )

  ctx.phase4Readiness = {
    phase4ContractReady,
    hasTitle:         !!projectTitle,
    hasTimelineWeeks: totalDurationWeeks > 0,
    hasPhases:        timelinePhases.length >= 3,
    portfolioConfidence,
    completeness: {
      solutions:    solutions.length,
      benefits:     benefits.length,
      requirements: requirements.length,
      phases:       timelinePhases.length
    }
  }

  // Vendor data forwarded to Phase 4
  ctx.vendorData = solutions
    .filter(s => s.vendorName || s.selectedVendor?.name)
    .map(s => ({
      solutionId:    s.id,
      vendorName:    s.vendorName || s.selectedVendor?.name,
      fitScore:      s.vendorFitScore || s.selectedVendor?.fitScore || null,
      vendorCostLow: s.vendorCostLow  || s.selectedVendor?.vendorCostLow  || null,
      vendorCostHigh: s.vendorCostHigh || s.selectedVendor?.vendorCostHigh || null
    }))

  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 11 — responseHarmonizer
// ═════════════════════════════════════════════════════════════════
function responseHarmonizer(ctx) {
  const {
    raw, solutions, benefits, requirements, validatedData, projectTitle,
    timeline, traceability, traceabilityCoverage_, fulfillmentAnalysis,
    confidenceAnalysis, phase4Readiness, executiveHealth,
    edges, criticalPath, avgReqComplexity, vendorData
  } = ctx

  const totalCost = solutions.reduce((sum, s) => sum + n(s.totalCost || s.estimatedCostUSD, 0), 0)

  // Build phase breadcrumb — forward existing + add Phase 3
  const existingPhases = raw.phaseResults || []
  const phaseResults = [
    ...existingPhases,
    {
      phase: 3,
      ok: true,
      avgConfidence: confidenceAnalysis.average,
      totalCost,
      totalDurationWeeks: timeline.projectTimeline.totalDurationWeeks
    }
  ]

  return {
    status: 'success',
    phase: 3,
    trackingId: raw.trackingId || `req_${Date.now()}_p3`,
    projectTitle,

    // Full pipeline data forwarded
    solutions,
    benefits,
    requirements,

    // Timeline
    timeline,

    // Traceability — primary output
    traceability,
    traceabilityCoverage: traceabilityCoverage_,

    // Fulfillment analysis
    fulfillmentAnalysis,

    // Confidence
    confidenceAnalysis,

    // Phase 4 readiness gate
    phase4Readiness,

    // Executive health badge
    executiveHealth,

    // Dependency graph
    dependencyAnalysis: {
      edges,
      criticalPath,
      avgRequirementComplexity: avgReqComplexity,
      criticalPathMethod: 'dependency_aware'
    },

    // Financial summary forwarded from Phase 2
    portfolioMetrics:    raw.portfolioMetrics    || null,
    portfolioIRR:        raw.portfolioMetrics?.portfolio?.portfolioIRR ?? null,
    sensitivityAnalysis: raw.sensitivityAnalysis || null,
    budgetAnalysis:      raw.budgetAnalysis      || null,

    // Vendor data for Phase 4
    vendorData,

    // Phase breadcrumb
    phaseResults,

    // Pass-through
    validatedData,
    projectMeta: raw.projectMeta || null
  }
}

// ═════════════════════════════════════════════════════════════════
// Route Handler
// ═════════════════════════════════════════════════════════════════
router.post('/phase3', async (req, res) => {
  try {
    const raw = req.body
    console.log('Phase 3 Traceability Validation — starting (pure JS, no AI call)')

    // Step 1
    const step1 = normalizeInput(raw)
    if (step1.error) {
      return res.status(400).json([{
        status: 'error', phase: 3,
        pipelineError: step1.pipelineError,
        errorMessage: 'Pipeline error passthrough'
      }])
    }
    if (step1.errors.length) {
      return res.status(400).json([{
        status: 'error', phase: 3, errors: step1.errors
      }])
    }

    // Steps 2–11 — pure logic pipeline
    const step2  = normalizeRequirements(step1)
    const step3  = benefitsAndSolutions(step2)
    const step4  = dependencyDetection(step3)
    const step5  = confidenceScoring(step4)
    const step6  = calculateFulfillment(step5)
    const step7  = timelineBuilder(step6)
    const step8  = traceabilityCoverage(step7)
    const step9  = executiveHealthBadge(step8)
    const step10 = phase4ReadinessPackaging(step9)
    const output = responseHarmonizer(step10)

    console.log(`Phase 3 complete — health: ${output.executiveHealth.status}, traceability: ${output.traceability.healthScore}%, confidence: ${output.confidenceAnalysis.average}`)

    return res.json([output])

  } catch (err) {
    console.error('Phase 3 error:', err)
    return res.status(500).json([{
      status: 'error', phase: 3, errorMessage: err.message
    }])
  }
})

export default router
