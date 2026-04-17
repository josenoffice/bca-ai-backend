---
name: bca-phase2-financials
description: >
  BCA.AI Phase 2 — Financial Analysis. Use this skill whenever building or
  running the Phase 2 endpoint for the Business Case Analyzer app. Triggers
  when user asks to: build the phase2 API route, implement financial analysis,
  calculate NPV/IRR/ROI/payback, run DCF modelling, aggregate portfolio
  metrics, calculate traceability health, replicate the n8n Phase 2 workflow
  in Node.js, or test Phase 2 logic. IMPORTANT: Phase 2 requires NO Claude
  API call — it is entirely pure JavaScript maths. No AI key needed to test
  or run this phase. Receives the full Phase 1 Reflection output, runs 9
  sequential calculation steps, returns financial metrics per solution plus
  portfolio aggregates, sensitivity analysis, and traceability health score.
  Array-wrapped output matches n8n exactly.
---

# BCA Phase 2 — Financial Analysis

## What this phase does (non-technical)

User-triggered after Reflection passes. Takes all Phase 1 data and runs pure
financial calculations — no AI involved. Computes NPV, IRR, ROI and payback
for every solution, aggregates the portfolio, runs sensitivity scenarios, and
scores traceability health. No API key needed at all.

## Files in this skill

- `SKILL.md` — this file (all logic and calculation formulas)
- `references/output-shape.md` — exact JSON output shape
- `references/industry-config.md` — industry benchmark rates
- `scripts/test-payload.json` — test request (Phase 1 Reflection output)

---

## CRITICAL — No Claude API call

Phase 2 is 100% pure JavaScript maths. Do NOT add any AI call.
The route handler has zero calls to `client.messages.create()`.

---

## Architecture (9 steps — all pure JS)

```
POST /api/phase2
      ↓
1. inputValidation()     — validate solutions[], benefits[], requirements[]
2. industryConfig()      — load benchmark rates for industry
3. solutionAnalyzer()    — normalise solution fields, vendor data
4. benefitCalculator()   — annualize benefit values, apply industry multiplier
5. requirementEstimator()— estimate requirement implementation costs
6. linkageValidator()    — validate + auto-fill solution↔benefit↔requirement links
7. dcfNpvIrr()           — calculate NPV, IRR, ROI, payback per solution
8. portfolioAggregator() — sum portfolio totals, budget analysis
9. riskAnalyzer()        — sensitivity scenarios (discount rate ±2%, benefit ±30%)
10. traceabilityHealth()  — linkage coverage score + vendor compliance check
11. responseHarmonizer()  — final output shape
      ↓
return JSON (array-wrapped: [{ ...payload }])
```

---

## Step 1 — inputValidation

```javascript
// Hard errors
if (!solutions || solutions.length === 0) → error 'MISSING_SOLUTIONS'
if (!benefits  || benefits.length  === 0) → error 'MISSING_BENEFITS'
if (!requirements || requirements.length === 0) → error 'MISSING_REQUIREMENTS'

// Warnings
if (benefits.length < 2)     → warn 'Only N benefit(s) provided'
if (requirements.length < 2) → warn 'Only N requirement(s) provided'
if (solutions.every(s => !s.selectedVendor)) → warn 'No solutions have selectedVendor data'

// Extract validated fields
const validatedData = raw.validatedData || {}
const budget        = validatedData.budget || 0
const discountRatePct = validatedData.discountRatePct  // integer e.g. 12
const horizonYears  = validatedData.timeHorizonYears || 3

// annualRevenue: null-safe (Phase 1 sets null when blank — never 0)
const annualRevenue = validatedData.annualRevenue ?? null

// withinCeiling: carry through from Phase 1.5
const withinCeiling = raw.budgetAnalysis?.withinCeiling ?? null
```

---

## Step 2 — industryConfig

```javascript
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

// CRITICAL: user-supplied discountRatePct overrides industry default
// discountRatePct is integer (e.g. 12) — divide by 100
if (validatedData.discountRatePct) {
  config.discountRate = validatedData.discountRatePct / 100
}
config.horizonYears = horizonYears
```

---

## Step 3 — solutionAnalyzer

Normalise solution fields — preserve Phase 1 totalCost, extract vendor data:

```javascript
solutions.map(s => ({
  ...s,
  id:                   s.id,
  totalCost:            n(s.totalCost || s.implementation_cost || 0),
  implementation_cost:  n(s.totalCost || s.implementation_cost || 0),
  implementationTime:   vendorMonths > 0 ? vendorMonths : n(s.implementationTime || 12),
  riskLevel:            ['Low','Medium','High'].includes(s.riskLevel) ? s.riskLevel : 'Medium',
  selectedVendor:       s.selectedVendor || null,
  vendorCostLow:        n(s.selectedVendor?.vendorCostLow  || 0) || null,
  vendorCostHigh:       n(s.selectedVendor?.vendorCostHigh || 0) || null,
  vendorFitScore:       s.selectedVendor?.fitScore ?? null,
  linkedBenefits:       Array.isArray(s.linkedBenefits)     ? s.linkedBenefits     : [],
  linkedRequirements:   Array.isArray(s.linkedRequirements) ? s.linkedRequirements : [],
  npv: null, roi: null, irr: null   // cleared — recalculated in step 7
}))
```

---

## Step 4 — benefitCalculator

```javascript
benefits.map(b => {
  const baseValue = n(b.riskAdjustedValue || b.annualizedValue || b.value || 0)

  // Apply industry multiplier (only on first pass)
  const lifetimeValue = b.phase2Adjusted
    ? baseValue
    : Math.round(baseValue * config.benefitMultiplier)

  // CRITICAL: riskAdjustedValue from Phase 1 is a LIFETIME total
  // Divide by horizonYears to get annual figure
  const annualizedValue = Math.round(lifetimeValue / config.horizonYears)

  // Normalise confidence: 0-1 range (some inputs are 0-100)
  let confidence = n(b.confidence, 0.75)
  if (confidence > 1 && confidence <= 100) confidence = confidence / 100
  confidence = Math.max(0, Math.min(1, confidence))

  return {
    ...b,
    riskAdjustedValue:  lifetimeValue,
    annualizedValue,
    confidence,
    phase2Adjusted:     true,
    multiplierApplied:  config.benefitMultiplier !== 1.0
  }
})
```

---

## Step 5 — requirementEstimator

Estimate implementation cost per requirement when not provided:

```javascript
const BASE = 15000
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

if (!r.estimatedCost) {
  const complexity = Math.max(1, Math.min(5, r.complexity || 3))
  r.estimatedCost = CATEGORY_COSTS[r.category?.toLowerCase()] ||
    Math.round(BASE * complexity * (COMPLEXITY_MULTIPLIER[complexity] || 1.0))
}
```

---

## Step 6 — linkageValidator

Uses Jaccard token similarity to auto-fill missing solution↔benefit and
solution↔requirement links when fewer than 2 are present.

```javascript
function jaccard(tokensA, tokensB) {
  const A = new Set(tokensA), B = new Set(tokensB)
  let intersection = 0
  for (const t of A) if (B.has(t)) intersection++
  const union = A.size + B.size - intersection
  return union ? intersection / union : 0
}

function tokenize(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean)
}

// Link threshold: score >= 0.3 AND at least 2 shared tokens
function meetsThreshold(sol, item, score) {
  const sharedTokens = tokenize(sol.name + ' ' + sol.description)
    .filter(t => tokenize(item.description + ' ' + (item.category || '')).includes(t))
  return score >= 0.3 && sharedTokens.length >= 2
}
```

After linking, compute annualBenefit per solution:
```javascript
// Sum annualizedValue of all linked benefits
s.annualBenefit = linkedBenefits
  .map(bid => benefitMap[bid]?.annualizedValue || 0)
  .reduce((sum, v) => sum + v, 0)
```

---

## Step 7 — dcfNpvIrr (core financial calculations)

```javascript
function calculateNPV(cost, annualBenefit, rate, years) {
  let npv = -cost
  for (let y = 1; y <= years; y++) {
    npv += annualBenefit / Math.pow(1 + rate, y)
  }
  return npv
}

function calculateIRR(cost, annualBenefit, years) {
  if (annualBenefit <= 0 || cost <= 0) return { value: null, irrExceedsCapacity: false }

  // Try progressively higher upper bounds: 200%, 1000%, 5000%
  for (const upperBound of [2.0, 10.0, 50.0]) {
    let npvAtHigh = -cost
    for (let y = 1; y <= years; y++) npvAtHigh += annualBenefit / Math.pow(1 + upperBound, y)
    if (npvAtHigh > 0) continue  // IRR is higher — try next bound

    // Bisection between 0 and upperBound
    let low = 0, high = upperBound
    for (let iter = 0; iter < 60; iter++) {
      const mid = (low + high) / 2
      let npv = -cost
      for (let y = 1; y <= years; y++) npv += annualBenefit / Math.pow(1 + mid, y)
      if (Math.abs(npv) < 0.01) return { value: Math.round(mid * 100), irrExceedsCapacity: false }
      if (npv > 0) low = mid; else high = mid
    }
    return { value: Math.round(((low + high) / 2) * 100), irrExceedsCapacity: false }
  }
  return { value: null, irrExceedsCapacity: true }  // IRR > 5000% — show as "—"
}

// Per solution
const npv = Math.round(calculateNPV(cost, annualBenefit, config.discountRate, config.horizonYears))
const roi = Math.round(((annualBenefit * horizonYears - cost) / cost) * 100)
const irr = calculateIRR(cost, annualBenefit, horizonYears)
const paybackMonths = Math.round((cost / annualBenefit) * 12)

// Discounted cash flows + break-even year
const dcf = [-cost]
let cumulative = -cost, breakEvenYear = null
for (let y = 1; y <= horizonYears; y++) {
  const pv = annualBenefit / Math.pow(1 + config.discountRate, y)
  dcf.push(pv)
  cumulative += pv
  if (cumulative >= 0 && breakEvenYear === null) breakEvenYear = y
}

// NPV range using vendor cost anchors
const npvLow  = vendorCostLow  ? Math.round(calculateNPV(vendorCostLow,  annualBenefit, config.discountRate, horizonYears)) : null
const npvHigh = vendorCostHigh ? Math.round(calculateNPV(vendorCostHigh, annualBenefit, config.discountRate, horizonYears)) : null

// Zero cost or zero benefit → return all zeros (not null)
if (cost === 0 || annualBenefit === 0) {
  return { npv: 0, roi: 0, irr: null, paybackMonths: null, breakEvenYear: null }
}
```

---

## Step 8 — portfolioAggregator

```javascript
const active = solutions.filter(s => !s.ignore)

const totalInitial    = active.reduce((s, x) => s + n(x.totalCost || 0), 0)
const totalAnnual     = active.reduce((s, x) => s + n(x.recurringAnnualCost || 0), 0)
const totalTCO        = totalInitial + (totalAnnual * horizonYears)
const totalBenefit    = active.reduce((s, x) => s + n(x.annualBenefit || 0), 0)
const totalNPV        = active.reduce((s, x) => s + n(x.npv || 0), 0)
const avgROI          = average of all positive solution ROIs
const portfolioIRR    = from portfolioDCF calculation
const paybackMonths   = totalBenefit > 0 ? Math.round((totalTCO / totalBenefit) * 12) : null

// Budget status
const budgetUtilizationPct    = budget > 0 ? Math.round((totalTCO / budget) * 100) : null
const withinBudget             = budget > 0 ? totalTCO <= budget : null
const initialCostWithinBudget  = budget > 0 ? totalInitial <= budget : null
// withinCeiling: passed through from Phase 1.5 — NOT recomputed here

// Portfolio DCF for IRR
const portfolioDCF = [-totalInitial]
for (let y = 1; y <= horizonYears; y++) {
  portfolioDCF.push((totalBenefit - totalAnnual) / Math.pow(1 + config.discountRate, y))
}
const portfolioIRR = calculateIRR(totalInitial, totalBenefit - totalAnnual, horizonYears).value
```

---

## Step 9 — riskAnalyzer (sensitivity)

```javascript
// Discount rate sensitivity: base ±2%
const discountRateScenarios = [-0.02, 0, 0.02].map(adj => {
  const rate = config.discountRate + adj
  const totalPV = active.reduce((sum, s) => {
    let npv = -n(s.totalCost || 0)
    for (let y = 1; y <= horizonYears; y++) npv += n(s.annualBenefit || 0) / Math.pow(1 + rate, y)
    return sum + npv
  }, 0)
  return {
    discountRate: rate,
    portfolioNPV: Math.round(totalPV),
    label: adj === 0 ? 'base' : adj < 0 ? 'optimistic' : 'conservative'
  }
})

// Benefit sensitivity: fixed ±30% around base (confidence modulates band width)
// worst = base × (0.70 + confidence × 0.10)   → 70–80% of base
// best  = base × (1.25 + confidence × 0.15)   → 125–140% of base
// This guarantees worst < base < best regardless of confidence
const worstBenefits = active.reduce((sum, s) => {
  const confidence = n(s.linking?.confidence?.benefits || 0.5)
  return sum + n(s.annualBenefit) * (0.70 + confidence * 0.10)
}, 0)

const bestBenefits = active.reduce((sum, s) => {
  const confidence = n(s.linking?.confidence?.benefits || 0.5)
  return sum + n(s.annualBenefit) * (1.25 + confidence * 0.15)
}, 0)
```

---

## Step 10 — traceabilityHealth

```javascript
// Coverage = (covered pairs) / (theoretical max pairs)
let covered = 0, theoretical = 0
for (const s of active) {
  covered += (s.linkedBenefits || []).length
  covered += (s.linkedRequirements || []).length
}
theoretical = Math.min(
  solutions.length * benefits.length,
  solutions.length * requirements.length
)
const rawLinkageScore = theoretical > 0 ? Math.min(100, Math.round(covered / theoretical * 100)) : 100

// Semantic score: average linking confidence across all solutions
const semanticScore = Math.min(100, Math.round(
  active.reduce((sum, s) => sum + ((s.linking?.confidence?.requirements || 0) + (s.linking?.confidence?.benefits || 0)) / 2, 0)
  / Math.max(1, active.length) * 100
))

// Blended health score: structural 60% + semantic 40%
const healthScore = Math.round(rawLinkageScore * 0.60 + semanticScore * 0.40)

// Vendor compliance per solution
// FIX: normalise compliance standard names for direct comparison
// e.g. 'PCI-DSS' → 'PCIDSS', 'SOC 2' → 'SOC2'
const normStd = c => c.replace(/[-_\s]+/g, '').toUpperCase()
const globalCompliance = (validatedData.complianceRequirements || []).map(normStd)

// Per solution: check if selectedVendor.complianceCoverage covers all required standards
```

---

## Step 11 — responseHarmonizer

```javascript
// Phase 2 quality score (composite)
const traceScore = Math.min(100, traceability.healthScore)
const budgetScore = withinBudget === true ? 100
  : withinBudget === false
    ? Math.max(0, 100 - (budgetUtilizationPct - 100) * 3)  // -3pts per 1% over budget
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
```

---

## Output shape

See `references/output-shape.md`. Array-wrapped: `res.json([{ ...payload }])`

---

## Express route

```javascript
router.post('/phase2', async (req, res) => {
  try {
    const raw = req.body

    // No API call — all pure JS
    const validated     = inputValidation(raw)
    if (validated.errors.length) return res.status(400).json([{ status:'error', phase:2, errors: validated.errors }])

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

    return res.json([response])

  } catch (err) {
    console.error('Phase 2 error:', err)
    return res.status(500).json([{ status:'error', phase:2, errorMessage: err.message }])
  }
})
```

---

## Testing checklist — no API key needed

- [ ] Returns array `[{...}]`
- [ ] `phase: 2`
- [ ] Every solution has `npv`, `roi`, `irr`, `paybackMonths`
- [ ] `irr` = null for solutions with zero annualBenefit (not a crash)
- [ ] `portfolioMetrics.totalNPV` > 0 for Eco Platform (positive return BCA)
- [ ] `budgetAnalysis.discountRate` = 0.12 (from discountRatePct:12)
- [ ] `withinCeiling` passes through from Phase 1.5
- [ ] `traceability.healthScore` between 0–100
- [ ] `sensitivityAnalysis.discountRateScenarios` has 3 entries (optimistic/base/conservative)
- [ ] `sensitivityAnalysis.benefitScenarios.worst` < `.base` < `.best`
- [ ] Server starts and responds WITHOUT a CLAUDE_API_KEY set
