---
name: bca-phase3-traceability
description: >
  BCA.AI Phase 3 — Traceability Validation. Use this skill whenever building
  or running the Phase 3 endpoint for the Business Case Analyzer app. Triggers
  when user asks to: build the phase3 API route, implement traceability
  validation, calculate fulfillment percentages, build project timeline, score
  confidence, compute executive health badge, check phase4 readiness, replicate
  the n8n Phase 3 workflow in Node.js, or test Phase 3 logic. IMPORTANT: Phase
  3 requires NO Claude API call — it is entirely pure JavaScript maths and
  logic. No AI key needed. Receives Phase 2 output, runs 10 sequential steps,
  validates solution↔benefit↔requirement linkages, builds project timeline with
  vendor delivery data, scores traceability health, sets phase4ContractReady
  gate, and returns array-wrapped output matching n8n exactly.
---

# BCA Phase 3 — Traceability Validation

## What this phase does (non-technical)

User-triggered after Phase 2. Validates that every solution links to at least
one benefit and one requirement. Builds the project timeline using vendor
implementation months. Scores how well the BCA hangs together. Returns a
readiness gate for Phase 4. No API key needed.

## Files in this skill

- `SKILL.md` — this file
- `references/output-shape.md` — exact JSON output shape
- `scripts/test-payload.json` — test request (Phase 2 output)

---

## CRITICAL — No Claude API call

Phase 3 is 100% pure JavaScript logic. No calls to `client.messages.create()`.

---

## Architecture (10 steps — all pure JS)

```
POST /api/phase3
      ↓
1.  normalizeInput()              — validate + normalise all input fields
2.  requirements()                — normalise requirement fields
3.  benefitsAndSolutions()        — normalise benefits + solutions, annualize values
4.  dependencyDetection()         — build solution↔benefit↔requirement edge graph
5.  confidenceScoring()           — score confidence distribution per solution
6.  calculateFulfillment()        — % fulfillment of requirements + benefits per solution
7.  timelineBuilder()             — build project timeline from vendor months
8.  traceabilityCoverage()        — compute linkage score + health score
9.  executiveHealthBadge()        — green/amber/red overall health
10. phase4ReadinessPackaging()    — gate check + output packaging
11. responseHarmonizer()          — final output shape
      ↓
return JSON (array-wrapped: [{ ...payload }])
```

---

## Step 1 — normalizeInput

```javascript
// pipelineError passthrough — if upstream failed, forward immediately
if (raw.pipelineError) return errorResponse(raw)

// Dual field sync — ensure both naming conventions present on every solution
for (const s of solutions) {
  if (s.linkedBenefits && !s.delivers_benefits?.length)
    s.delivers_benefits = [...new Set(s.linkedBenefits)]
  if (s.linkedRequirements && !s.depends_on_requirements?.length)
    s.depends_on_requirements = [...new Set(s.linkedRequirements)]
  if (s.linkedRequirements && !s.supported_by_requirements?.length)
    s.supported_by_requirements = [...new Set(s.linkedRequirements)]
}

// Merge projectMeta into validatedData (Phase 2 puts some fields in projectMeta)
const validatedData = {
  ...raw.validatedData,
  industry:         raw.projectMeta?.industry         || raw.validatedData?.industry,
  timeHorizonYears: raw.projectMeta?.timeHorizonYears || raw.validatedData?.timeHorizonYears || 3,
  discountRatePct:  raw.projectMeta?.discountRatePct  || raw.validatedData?.discountRatePct  || 12,
  budget:           raw.projectMeta?.budget           || raw.validatedData?.budget           || 0,
  annualRevenue:    raw.projectMeta?.annualRevenue     ?? raw.validatedData?.annualRevenue    ?? null
}

// Save phase2VendorCompliance before traceability is overwritten
const phase2VendorCompliance = raw.traceability?.vendorCompliancePerSolution || []
```

---

## Step 2 — requirements()

```javascript
requirements.map(r => ({
  ...r,
  id:           r.id || autoId('REQ', i),
  title:        r.title || r.name || r.description,
  priority:     ['must_have','should_have','could_have'].includes(r.priority)
                  ? r.priority : 'should_have',
  complexity:   Math.max(1, Math.min(5, r.complexity || 3)),
  estimatedCost: r.estimatedCost || r.cost || r.totalCost || 0,
  category:     r.category || 'general',
  status:       r.status !== undefined ? r.status : false
}))
```

---

## Step 3 — benefitsAndSolutions()

```javascript
// Benefits — annualize riskAdjustedValue if annualizedValue not already set
benefits.map(b => {
  const riskAdjustedValue = n(b.riskAdjustedValue || b.annualizedValue || b.value || 0)
  const annualizedValue   = b.annualizedValue != null
    ? n(b.annualizedValue)
    : riskAdjustedValue > 0 && horizon > 1
      ? Math.round(riskAdjustedValue / horizon)
      : riskAdjustedValue

  // Normalise confidence: Phase 2 sends 0-1 decimal → convert to 0-100
  let confidence = n(b.confidence || b.confidenceScore || 0.7)
  if (confidence <= 1) confidence = Math.round(confidence * 100)

  return { ...b, id, annualizedValue, riskAdjustedValue, confidence }
})

// Solutions — extract vendor data + normalise timeline
solutions.map(s => {
  // Vendor implementation months → timeline weeks
  const vendorMonths = n(s.selectedVendor?.implementationMonths || s.vendorImplementationMonths || 0)
  const timelineWeeks = vendorMonths > 0
    ? Math.ceil(vendorMonths * 4)
    : s.timelineWeeks || Math.ceil(n(s.implementationTime || 12) * 4)

  // Confidence: reads strategicAlignment fallback (Phase 2 field)
  let confidenceScore = n(s.confidenceScore || s.confidence || s.strategicAlignment || 0.7)
  if (confidenceScore <= 1) confidenceScore = Math.round(confidenceScore * 100)

  return {
    ...s,
    id, name,
    estimatedCostUSD: n(s.totalCost || s.implementation_cost || s.estimatedCostUSD || 0),
    timelineWeeks,
    vendorImplementationMonths: vendorMonths || null,
    confidenceScore,
    riskLevel: ['Low','Medium','High'].includes(s.riskLevel) ? s.riskLevel : 'Medium'
  }
})
```

---

## Step 4 — dependencyDetection()

Build edge graph from solution↔benefit↔requirement links:

```javascript
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
// Score = (shared requirement count × 2) + timeline weeks
// Higher score = more foundational = appears earlier in delivery
const reqToSolCount = {}  // how many solutions share each requirement
solutions.forEach(s => {
  (s.depends_on_requirements || []).forEach(rid => {
    reqToSolCount[rid] = (reqToSolCount[rid] || 0) + 1
  })
})

const scored = solutions.map(s => ({
  id: s.id,
  score: (s.depends_on_requirements || []).reduce((sum, rid) => sum + (reqToSolCount[rid] || 1), 0) * 2
       + n(s.timelineWeeks || 0)
})).sort((a, b) => b.score - a.score)

const criticalPath = scored.slice(0, 3).map(x => x.id)
```

---

## Step 5 — confidenceScoring()

```javascript
// Confidence values are 0-100 after step 3 normalisation
const buckets = { low: 0, med: 0, high: 0 }
solutions.forEach(s => {
  const cs = n(s.confidenceScore || s.confidence || 70)
  if (cs < 60)      buckets.low++
  else if (cs < 75) buckets.med++
  else              buckets.high++
})

const avgConfidence = Math.round(
  solutions.reduce((a, s) => a + n(s.confidenceScore || s.confidence || 70), 0)
  / Math.max(1, solutions.length)
)

// Flag high-risk solutions with low confidence (< 65)
const highRiskLowConf = solutions
  .filter(s => s.riskLevel?.toLowerCase() === 'high' && n(s.confidenceScore || 70) < 65)
  .map(s => s.id)
```

---

## Step 6 — calculateFulfillment()

```javascript
// Per solution: requirement coverage + benefit contribution
solutions.map(sol => {
  const linkedReqs = edges.filter(e => e.type === 'requires' && e.to === sol.id).map(e => e.from)
  const linkedBens = edges.filter(e => e.type === 'delivers' && e.from === sol.id).map(e => e.to)

  // Requirement coverage: score per req based on inverse complexity
  const reqCoverage = linkedReqs.map(rid => {
    const req = requirements.find(r => r.id === rid)
    const complexity = n(req?.complexity || 3)
    return Math.max(50, 100 - complexity * 10)
  })
  const reqOverall = reqCoverage.length
    ? Math.round(reqCoverage.reduce((a,b) => a+b, 0) / reqCoverage.length) : 0

  // Benefit contribution: annualizedValue × (confidence / 100)
  // CRITICAL: use annualizedValue (annual) NOT riskAdjustedValue (lifetime)
  const benContribs = linkedBens.map(bid => {
    const ben = benefits.find(b => b.id === bid)
    const benValue   = n(ben?.annualizedValue || ben?.riskAdjustedValue || 0)
    const confidence = n(sol.confidenceScore || 70)
    return {
      benId:       bid,
      contributed: Math.round(benValue * confidence / 100),
      total:       benValue,
      percentage:  confidence
    }
  })
  const benOverall = benContribs.length
    ? Math.round(benContribs.reduce((a,b) => a + b.percentage, 0) / benContribs.length) : 0

  // Traceability score: geometric mean of req and ben coverage
  const traceabilityScore = (reqOverall > 0 && benOverall > 0)
    ? Math.round(Math.sqrt(reqOverall * benOverall))
    : Math.max(reqOverall, benOverall)

  return { solutionId: sol.id, reqCoverage: reqOverall, benContribution: benOverall, traceabilityScore }
})
```

---

## Step 7 — timelineBuilder()

```javascript
// Use vendor deliveryTimeline phase weights when available
const DEFAULT_WEIGHTS = { discovery: 15, build: 55, test: 25, goLive: 5 }

solutions.map(s => {
  // Use vendorImplementationMonths if available — most accurate
  const vendorMonths = n(s.vendorImplementationMonths || 0)
  const effectiveWeeks = vendorMonths > 0
    ? Math.ceil(vendorMonths * 4)
    : n(s.timelineWeeks || 12)

  // Use vendor deliveryTimeline weights if from Phase 1.6
  let weights = DEFAULT_WEIGHTS
  if (s.selectedVendor?.deliveryTimeline?.phases) {
    const phases = s.selectedVendor.deliveryTimeline.phases
    const total  = phases.reduce((sum, p) => sum + n(p.months), 0)
    if (total > 0) {
      weights = {
        discovery: Math.round(phases[0]?.months / total * 100) || 15,
        build:     Math.round(phases[1]?.months / total * 100) || 55,
        test:      Math.round(phases[2]?.months / total * 100) || 25,
        goLive:    Math.round(phases[3]?.months / total * 100) || 5
      }
    }
  }
  return { ...s, timelineWeeks: effectiveWeeks, phaseWeights: weights }
})

// Portfolio timeline
const maxWeeks     = Math.max(...solutions.map(s => n(s.timelineWeeks || 0)))
let totalDuration  = maxWeeks
let deliveryModel  = 'parallel'

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

// Start date — from validatedData.projectStartDate or today
const startDate = validatedData.projectStartDate
  ? new Date(validatedData.projectStartDate)
  : new Date()

const endDate = new Date(startDate)
endDate.setDate(endDate.getDate() + totalDuration * 7)

// 4 standard timeline phases
const phases = [
  { name: 'Discovery & Design',      startWeek: 1,
    endWeek: Math.max(1, Math.round(totalDuration * 0.15)) },
  { name: 'Build & Integrate',       startWeek: Math.round(totalDuration * 0.15) + 1,
    endWeek: Math.round(totalDuration * 0.70) },
  { name: 'Test & Validate',         startWeek: Math.round(totalDuration * 0.70) + 1,
    endWeek: Math.round(totalDuration * 0.95) },
  { name: 'Go-Live & Hypercare',     startWeek: Math.round(totalDuration * 0.95) + 1,
    endWeek: totalDuration }
]
```

---

## Step 8 — traceabilityCoverage()

```javascript
// Per-solution score: balanced linkage (min/max of benefits vs requirements)
// A solution with 3 benefits and 3 requirements → 100%
// A solution with 3 benefits and 1 requirement → 33%
const perSolutionScores = solutions.map(s => {
  const benCount = (solToBen.get(s.id) || new Set()).size
  const reqCount = (solToReq.get(s.id) || new Set()).size
  if (benCount === 0 && reqCount === 0) return 0
  if (benCount === 0 || reqCount === 0) return 30  // partial credit
  return Math.round(Math.min(benCount, reqCount) / Math.max(benCount, reqCount) * 100)
})

const rawLinkageScore = Math.round(
  perSolutionScores.reduce((a,b) => a+b, 0) / Math.max(1, perSolutionScores.length)
)

// Blend with vendor compliance from Phase 2
// healthScore = linkageScore × 0.7 + avgVendorCompliance × 0.3
const evaluatedCompliance = phase2VendorCompliance
  .filter(v => v.vendorComplianceScore !== null)
  .map(v => v.vendorComplianceScore)

const healthScore = evaluatedCompliance.length > 0
  ? Math.round(rawLinkageScore * 0.7
      + (evaluatedCompliance.reduce((a,b) => a+b, 0) / evaluatedCompliance.length) * 0.3)
  : rawLinkageScore

// coveredPairs and theoreticalPairs kept for reference
const coveredPairs = solutions.reduce((sum, s) => {
  const b = (solToBen.get(s.id) || new Set()).size
  const r = (solToReq.get(s.id) || new Set()).size
  return sum + Math.min(b, r)
}, 0)
const theoreticalPairs = Math.max(1, Math.min(
  solutions.length * benefits.length,
  solutions.length * requirements.length
))
```

---

## Step 9 — executiveHealthBadge()

```javascript
// Health = green when linkage ≥ 90% AND financial coverage ≥ 90%
// Amber when both ≥ 70%, red otherwise
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
```

---

## Step 10 — phase4ReadinessPackaging()

```javascript
const phase4ContractReady = solutions.length > 0  // basic gate

const portfolioConfidence = Math.round(
  solutions.reduce((sum, s) => sum + n(s.confidenceScore || 70), 0)
  / Math.max(1, solutions.length)
)

// Phase 4 readiness object
const readiness = {
  phase4ContractReady,
  hasTitle:         !!projectTitle,
  hasTimelineWeeks: totalDurationWeeks > 0,
  hasPhases:        phases.length >= 3,
  portfolioConfidence,
  completeness: {
    solutions:    solutions.length,
    benefits:     benefits.length,
    requirements: requirements.length,
    phases:       phases.length
  }
}

// Vendor data forwarded to Phase 4
const vendorData = solutions
  .filter(s => s.vendorName || s.selectedVendor?.name)
  .map(s => ({
    solutionId:   s.id,
    vendorName:   s.vendorName || s.selectedVendor?.name,
    fitScore:     s.vendorFitScore || s.selectedVendor?.fitScore || null,
    vendorCostLow:  s.vendorCostLow  || s.selectedVendor?.vendorCostLow  || null,
    vendorCostHigh: s.vendorCostHigh || s.selectedVendor?.vendorCostHigh || null
  }))
```

---

## Output shape

See `references/output-shape.md`. Array-wrapped: `res.json([{ ...payload }])`

---

## Express route

```javascript
router.post('/phase3', async (req, res) => {
  try {
    const raw = req.body

    // No API call — all pure JS
    const step1  = normalizeInput(raw)
    const step2  = requirements(step1)
    const step3  = benefitsAndSolutions(step2)
    const step4  = dependencyDetection(step3)
    const step5  = confidenceScoring(step4)
    const step6  = calculateFulfillment(step5)
    const step7  = timelineBuilder(step6)
    const step8  = traceabilityCoverage(step7)
    const step9  = executiveHealthBadge(step8)
    const step10 = phase4ReadinessPackaging(step9)
    const output = responseHarmonizer(step10)

    return res.json([output])
  } catch (err) {
    console.error('Phase 3 error:', err)
    return res.status(500).json([{
      status: 'error', phase: 3, errorMessage: err.message
    }])
  }
})
```

---

## Testing checklist — no API key needed

- [ ] Returns array `[{...}]`
- [ ] `phase: 3`
- [ ] `traceability.healthScore` between 0–100
- [ ] `traceability.linkageScore` between 0–100
- [ ] `timeline.projectTimeline.totalDurationWeeks` > 0
- [ ] `timeline.phases` has 4 entries
- [ ] `phase4Readiness.phase4ContractReady: true` for valid payload
- [ ] `confidenceAnalysis.average` between 0–100
- [ ] `executiveHealth.status` = 'green' | 'amber' | 'red'
- [ ] `traceabilityCoverage.coveragePct` matches `traceability.healthScore`
- [ ] All solution dual fields present: `delivers_benefits` AND `linkedBenefits`
- [ ] Server responds WITHOUT `CLAUDE_API_KEY`
- [ ] `portfolioIRR` forwarded from Phase 2 input
