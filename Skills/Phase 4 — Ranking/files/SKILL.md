---
name: bca-phase4-ranking
description: >
  BCA.AI Phase 4 — Ranking & Recommendation. Use this skill whenever building
  or running the Phase 4 endpoint for the Business Case Analyzer app. Triggers
  when user asks to: build the phase4 API route, implement solution ranking,
  composite scoring, generate recommendation, build CBA summary, run sensitivity
  analysis, check phase5 contract guard, replicate the n8n Phase 4 workflow in
  Node.js, or test Phase 4 logic. IMPORTANT: Phase 4 requires NO Claude API
  call — it is entirely pure JavaScript maths. No AI key needed. Receives Phase
  3 output, runs 10 sequential steps, scores all solutions on 5 dimensions,
  picks the winner, generates rationale, runs sensitivity, checks Phase 5 gate,
  returns array-wrapped output matching n8n exactly.
---

# BCA Phase 4 — Ranking & Recommendation

## What this phase does (non-technical)

User-triggered after Phase 3. Scores every solution on 5 dimensions, ranks
them, picks the best one and explains why. Builds sensitivity tables. Checks
a Phase 5 contract gate to ensure all required data is present before report
generation. No API call needed.

## Files in this skill

- `SKILL.md` — this file
- `references/output-shape.md` — exact JSON output shape
- `scripts/test-payload.json` — test request (Phase 3 output)

---

## CRITICAL — No Claude API call

Phase 4 is 100% pure JavaScript maths. No calls to `client.messages.create()`.

---

## Architecture (10 steps — all pure JS)

```
POST /api/phase4
      ↓
1.  normalizeAndMap()         — validate + extract fields + industry config
2.  financialsPVROI()         — PV benefit, ROI, payback per solution
3.  sensitivity()             — 5-point discount rate + 3 benefit scenarios
4.  edgeSynthesis()           — build solution↔benefit↔requirement edges
5.  traceabilityReview()      — coverage metrics
6.  rankingAndRecommendation()— composite score, ranking, rationale
7.  portfolioAggregator()     — portfolio totals + budget analysis
8.  cbaSummary()              — markdown + HTML summary
9.  phase5ContractGuard()     — gate check before Phase 5
10. harmonizer()              — final output shape
      ↓
return JSON (array-wrapped: [{ ...payload }])
```

---

## Step 1 — normalizeAndMap

```javascript
// Hard errors
if (solutions.length === 0) → error 'MISSING_SOLUTIONS'
if (benefits.length === 0)  → error 'MISSING_BENEFITS'

// Industry config — user discountRatePct overrides industry default
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

// CRITICAL: user discountRatePct always overrides industry default
const userRate = raw.validatedData?.discountRatePct || raw.projectMeta?.discountRatePct
if (userRate) config.discountRate = userRate / 100

// Forward timeHorizonYears for all downstream steps
const timeHorizonYears = raw.validatedData?.timeHorizonYears
  || raw.projectMeta?.timeHorizonYears || 3
```

---

## Step 2 — financialsPVROI

```javascript
// Per solution: PV benefit over configured horizon
function pvBenefit(annualNet, rate, years) {
  let pv = 0
  for (let y = 1; y <= years; y++) pv += annualNet / Math.pow(1 + rate, y)
  return pv
}

solutions.map(s => {
  const cost = n(s.estimatedCostUSD || s.estimatedCost || s.totalCost || s.cost || 0)

  // Use solution's own annualBenefit if present — else portfolio average
  const rawBenefit = s.annualBenefit != null
    ? n(s.annualBenefit)
    : portfolioBenefitAvg

  // Apply industry benefitMultiplier and riskPenalty
  const annualNet = Math.max(0, rawBenefit * benefitMult - cost * riskPenalty)
  const pv        = Math.round(pvBenefit(annualNet, discountRate, horizonYears))
  const roiPct    = cost > 0 ? Math.round(((annualNet * horizonYears - cost) / cost) * 100 * 10) / 10 : 0

  // Payback — capped at 120 months
  const monthly       = annualNet / 12
  const rawPayback    = monthly > 0 ? Math.ceil(cost / monthly) : null
  const paybackMonths = rawPayback ? Math.min(rawPayback, 120) : null
  const paybackCapped = rawPayback ? rawPayback > 120 : false

  return { ...s, phase4: { pvBenefit3y: pv, roiPct, paybackMonths, paybackCapped,
    pvHorizonYears: horizonYears, appliedRiskPenalty: riskPenalty, appliedBenefitMult: benefitMult } }
})
```

---

## Step 3 — sensitivity

```javascript
// 5-point discount rate sensitivity: base ±2% and ±4%
const rateDeltas = [-0.04, -0.02, 0, 0.02, 0.04]
sensitivity = rateDeltas.map(delta => {
  const rate = Math.max(0.01, discountRate + delta)
  const portfolioPV = solutions.reduce((acc, s) => {
    const annualNet = Math.max(0, n(s.annualBenefit || 0) * benefitMult - n(s.estimatedCostUSD || s.totalCost || 0) * riskPenalty)
    return acc + pvBenefit(annualNet, rate, horizonYears)
  }, 0)
  return { discountRate: Math.round(rate * 1000) / 1000, portfolioPVBenefit: Math.round(portfolioPV), horizonYears }
})

// 3 benefit scenarios: pessimistic (-30%), base, optimistic (+20%)
benefitSensitivity = [
  { label: 'Pessimistic', multiplier: 0.70, description: 'Benefits 30% below estimate' },
  { label: 'Base',        multiplier: 1.00, description: 'Benefits as estimated' },
  { label: 'Optimistic',  multiplier: 1.20, description: 'Benefits 20% above estimate' }
].map(scenario => {
  const portfolioPV = solutions.reduce((acc, s) => {
    const annualNet = Math.max(0, n(s.annualBenefit || 0) * benefitMult - n(s.estimatedCostUSD || s.totalCost || 0) * riskPenalty)
    return acc + pvBenefit(annualNet * scenario.multiplier, discountRate, horizonYears)
  }, 0)
  const totalCost  = solutions.reduce((acc, s) => acc + n(s.estimatedCostUSD || s.totalCost || 0), 0)
  const portfolioROI = totalCost > 0 ? Math.round(((portfolioPV - totalCost) / totalCost) * 100 * 10) / 10 : 0
  return {
    label: scenario.label, multiplier: scenario.multiplier,
    portfolioPV: Math.round(portfolioPV), portfolioROI,
    solutions: solutions.map(s => {
      const annualNet = Math.max(0, n(s.annualBenefit || 0) * benefitMult - n(s.estimatedCostUSD || s.totalCost || 0) * riskPenalty)
      const solPV  = Math.round(pvBenefit(annualNet * scenario.multiplier, discountRate, horizonYears))
      const solROI = n(s.estimatedCostUSD || s.totalCost || 0) > 0
        ? Math.round(((solPV - n(s.estimatedCostUSD || s.totalCost || 0)) / n(s.estimatedCostUSD || s.totalCost || 0)) * 100)
        : 0
      return { solutionId: s.id, adjustedAnnualBenefit: Math.round(annualNet * scenario.multiplier), pvBenefit: solPV, roiPct: solROI }
    })
  }
})
```

---

## Step 4 — edgeSynthesis

```javascript
// Build edges from solution fields if no edge list already present
if (!hasEdges) {
  for (const s of solutions) {
    for (const b of (s.delivers_benefits || s.linkedBenefits || []))
      edges.push({ type: 'delivers', from: s.id, to: b })
    for (const r of (s.depends_on_requirements || s.linkedRequirements || []))
      edges.push({ type: 'requires', from: r, to: s.id })
  }
}
```

---

## Step 5 — traceabilityReview

```javascript
// Coverage = coveredPairs / theoreticalPairs
// CRITICAL: read from depends_on_requirements NOT linked_requirements
// (frontend sends depends_on_requirements — linked_requirements gives 0%)
let covered = 0
solutions.forEach(s => {
  const b = (solToBen.get(s.id) || new Set()).size
  const r = (solToReq.get(s.id) || new Set()).size
  covered += Math.min(b, r)
})
const theoretical = Math.max(1, Math.min(solutions.length * benefits.length, solutions.length * requirements.length))
const coveragePct = Math.round(covered / theoretical * 100)
```

---

## Step 6 — rankingAndRecommendation

### Scoring weights (hardcoded — do NOT make these configurable in the route)
```javascript
const W = {
  npv:         0.35,   // NPV — strongest signal
  roi:         0.20,   // ROI %
  confidence:  0.15,   // solution confidence score
  riskPenalty: 0.15,   // risk level penalty
  vendorFit:   0.15    // vendor fit score
}
```

### Composite score calculation
```javascript
// Normalise each dimension to 0-1 range
function normalize(values) {
  const min = Math.min(...values), max = Math.max(...values)
  return values.map(v => max === min ? 0.5 : (v - min) / (max - min))
}

const N_npv        = normalize(solutions.map(s => n(s.phase4?.pvBenefit3y || s.npv || 0)))
const N_roi        = normalize(solutions.map(s => n(s.phase4?.roiPct || s.roi || 0)))
const N_conf       = normalize(solutions.map(s => n(s.confidenceScore || s.confidence || 70)))
const N_vendorFit  = allVendorFitNull
  ? solutions.map(() => 0.5)   // neutral when no vendor data
  : normalize(solutions.map(s => s.vendorFitScore != null ? n(s.vendorFitScore) : 0))

// Risk penalty: High=1.0, Medium=0.4, Low=0.0
function riskPenaltyScore(level) {
  return level?.toLowerCase() === 'high' ? 1.0
       : level?.toLowerCase() === 'medium' ? 0.4 : 0.0
}
const N_riskPenalty = solutions.map(s => riskPenaltyScore(s.riskLevel))

// Composite score per solution
const compositeScores = solutions.map((s, i) =>
  W.npv        * N_npv[i] +
  W.roi        * N_roi[i] +
  W.confidence * N_conf[i] +
  W.riskPenalty * (1 - N_riskPenalty[i]) +  // invert — lower risk = higher score
  W.vendorFit  * N_vendorFit[i]
)
```

### Ranking
```javascript
// Sort by composite score descending
const ranked = solutions
  .map((s, i) => ({ ...s, compositeScore: Math.round(compositeScores[i] * 1000) / 1000 }))
  .sort((a, b) => b.compositeScore - a.compositeScore)
  .map((s, i) => ({
    rank:       i + 1,
    solutionId: s.id,
    name:       s.name,
    score:      s.compositeScore,
    npv:        n(s.phase4?.pvBenefit3y || s.npv || 0),
    roiPct:     n(s.phase4?.roiPct || s.roi || 0),
    riskLevel:  s.riskLevel,
    confidenceScore: n(s.confidenceScore || s.confidence || 70),
    vendorName:      s.vendorName || s.selectedVendor?.name || null,
    vendorFitScore:  s.vendorFitScore != null ? n(s.vendorFitScore) : null,
    paybackMonths:   s.phase4?.paybackMonths || null,
    rationale:       generateRationale(s, i + 1, solutions.length)
  }))

// Recommended = rank 1 (unless user override)
const recommended = ranked[0]
```

### User override handling
```javascript
// Accept override from request body
if (raw.userOverride?.userSelectedSolutionId) {
  const override = solutions.find(s => s.id === raw.userOverride.userSelectedSolutionId)
  if (override) {
    recommendation.isOverride           = true
    recommendation.recommendedSolutionId = override.id
    recommendation.recommendedSolutionName = override.name
    recommendation.userOverride          = raw.userOverride
    recommendation.aiRecommendation      = { solutionId: ranked[0].solutionId, name: ranked[0].name }
  }
}
```

### Rationale generation
```javascript
function generateRationale(sol, rank, total) {
  const npv  = n(sol.phase4?.pvBenefit3y || sol.npv || 0)
  const roi  = n(sol.phase4?.roiPct || sol.roi || 0)
  const conf = n(sol.confidenceScore || sol.confidence || 70)
  const risk = (sol.riskLevel || 'Medium').toLowerCase()
  const parts = []

  // CRITICAL: only claim "Highest NPV" if it actually has the highest NPV
  const allNPVs   = solutions.map(s => n(s.phase4?.pvBenefit3y || s.npv || 0))
  const maxNPV    = Math.max(...allNPVs)
  const hasMaxNPV = npv === maxNPV && npv > 0

  if (rank === 1) {
    if (hasMaxNPV) parts.push(`Highest NPV ($${Math.round(npv/1000)}K)`)
    if (roi > 100) parts.push(`strong ROI (${Math.round(roi)}%)`)
    if (conf >= 75) parts.push(`high confidence (${conf}%)`)
    if (risk === 'low') parts.push('low risk profile')
    parts.push('Best balance of returns and certainty')
  } else if (rank === 2) {
    parts.push(`Competitive financials (NPV: $${Math.round(npv/1000)}K, ROI: ${Math.round(roi)}%)`)
    if (risk === 'high') parts.push('HIGH RISK — risk penalty reduced score despite strong returns')
    else parts.push('slightly lower confidence or higher risk than top choice')
  } else {
    if (risk === 'low') parts.push(`Lowest risk with acceptable returns`)
    else parts.push(`Lower composite score — consider as Phase 2 or Phase 3 delivery candidate`)
  }
  return parts.join(', ')
}
```

---

## Step 7 — portfolioAggregator

```javascript
const totalCost    = solutions.reduce((s, x) => s + n(x.estimatedCostUSD || x.totalCost || 0), 0)
const totalPV      = solutions.reduce((s, x) => s + n(x.phase4?.pvBenefit3y || 0), 0)
const avgROI       = average of all solution roiPct values
const portfolioIRR = raw.portfolioIRR || raw.portfolioMetrics?.portfolio?.portfolioIRR || null

// withinCeiling — passed through from Phase 1.5 via Phase 2 and 3
// NOT recomputed in Phase 4
const withinCeiling = raw.budgetAnalysis?.withinCeiling ?? raw.withinCeiling ?? null

// Budget analysis
const budget = n(raw.validatedData?.budget || raw.projectMeta?.budget || 0)
const budgetUtilizationPct = budget > 0 ? Math.round(totalCost / budget * 100) : null
const withinBudget = budget > 0 ? totalCost <= budget : null
```

---

## Step 8 — cbaSummary

Generate markdown AND html summary strings.

```javascript
// Ceiling breach warning at top if applicable
if (withinCeiling === false) {
  markdown += '> ⚠️ Budget ceiling notice: Total cost exceeds 85% of stated budget.\n\n'
}

// If user override — show override disclaimer
if (isOverride) {
  markdown += `**Selected (User Override):** ${recName}\n`
  markdown += `**Override Reason:** ${overrideReason}\n`
  markdown += `**AI Recommendation was:** ${aiRecName}\n`
}

// Per-solution table
markdown += '| Rank | Solution | Score | PV(3Y) | ROI | Risk | Vendor | Fit |\n'
ranked.forEach(r => { markdown += `| ${r.rank} | ${r.name} | ${r.score} | ... |\n` })
```

---

## Step 9 — phase5ContractGuard

```javascript
const errors = []
if (!recommendation.recommendedSolutionId)  errors.push('Missing recommendedSolutionId')
if (!recommendation.ranking?.length)         errors.push('Missing ranking array')
if (!cbaSummary.markdown)                    errors.push('Missing cbaSummary.markdown')
if (!cbaSummary.html)                        errors.push('Missing cbaSummary.html')
if (portfolioP4.totalPVBenefit3y == null)    errors.push('Missing portfolioP4.totalPVBenefit3y')
if (withinCeiling === false)                 errors.push('Budget ceiling breached — review before Phase 5')

phase5Contract = { ok: errors.length === 0, errors, isOverride }
```

---

## Step 10 — harmonizer

### Executive health badge
```javascript
// Budget
const budgetStatus = withinBudget === true  ? 'green'
                   : withinBudget === false ? 'red' : 'amber'

// Traceability
const traceStatus = traceScore >= 60 ? 'green' : traceScore >= 40 ? 'amber' : 'red'

// Confidence
const confStatus = overallConf >= 70 ? 'green' : overallConf >= 50 ? 'amber' : 'red'

// Overall = worst of the three
const overallStatus = [budgetStatus, traceStatus, confStatus].includes('red')   ? 'red'
                    : [budgetStatus, traceStatus, confStatus].includes('amber') ? 'amber'
                    : 'green'
```

---

## Output shape

See `references/output-shape.md`. Array-wrapped: `res.json([{ ...payload }])`

---

## Express route

```javascript
router.post('/phase4', async (req, res) => {
  try {
    const raw = req.body

    // No API call — all pure JS
    const step1  = normalizeAndMap(raw)
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
    return res.status(500).json([{ status:'error', phase:4, errorMessage: err.message }])
  }
})
```

---

## Testing checklist — no API key needed

- [ ] Returns array `[{...}]`
- [ ] `phase: 4`
- [ ] `recommendation.recommendedSolutionId` set
- [ ] `recommendation.ranking` has all solutions sorted by score descending
- [ ] `recommendation.ranking[0].score` is highest score
- [ ] `phase5Contract.ok: true`
- [ ] `sensitivity` has 5 entries (±4%, ±2%, base)
- [ ] `benefitSensitivity` has 3 entries (pessimistic/base/optimistic)
- [ ] `benefitSensitivity[0].portfolioPV` < `[1].portfolioPV` < `[2].portfolioPV`
- [ ] `executiveHealth.overallStatus` = green/amber/red
- [ ] `withinCeiling` passed through from Phase 1.5
- [ ] `traceabilityCoverage.coveragePct` > 0
- [ ] Server responds WITHOUT `CLAUDE_API_KEY`
- [ ] `isOverride: false` for standard run
