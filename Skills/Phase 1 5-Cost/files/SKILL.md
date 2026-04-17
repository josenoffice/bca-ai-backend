---
name: bca-phase15-cost
description: >
  BCA.AI Phase 1.5 — Cost Estimation. Use this skill whenever building or
  running the Phase 1.5 endpoint for the Business Case Analyzer app.
  Triggers when user asks to: build the phase1-5-cost API route, implement
  cost estimation, generate low/mid/high cost ranges, calculate TCO or NPV,
  handle budget ceiling breach and rescoping, replicate the n8n Phase 1.5
  workflow in Node.js, or test Phase 1.5 logic. This skill auto-runs after
  all Phase 1.6 calls complete. Receives solutions with Phase 1.6 vendor
  data injected, calls Claude API for market-rate cost estimates per solution,
  calculates NPV-based 3-year TCO using user discount rate, enforces 85%
  budget ceiling, generates rescoping recommendation if breached, returns
  array-wrapped response matching n8n output exactly.
---

# BCA Phase 1.5 — Cost Estimation

## What this phase does (non-technical)

Auto-runs after all Phase 1.6 vendor calls complete. Gets market-rate cost
estimates for every solution — low, mid, high range with a 6-part breakdown.
Calculates 3-year TCO using the user's actual discount rate. If portfolio
exceeds 85% of budget, generates a rescoping plan — which solutions to keep,
reduce scope, or defer.

## Files in this skill

- `SKILL.md` — this file
- `references/cost-prompt.md` — Claude system prompt and output format
- `references/output-shape.md` — exact JSON output shape
- `scripts/test-payload.json` — test request with Phase 1 + 1.6 data merged

---

## CRITICAL: vendor data must be injected BEFORE this call

```javascript
const solutionsWithVendors = phase1Solutions
  .filter(s => !deferredSolutionIds.includes(s.id))
  .map(s => ({
    ...s,
    selectedVendor:  phase16Results[s.id]?.selectedVendor  || null,
    vendorName:      phase16Results[s.id]?.selectedVendor?.name     || null,
    vendorFitScore:  phase16Results[s.id]?.selectedVendor?.fitScore || null,
    vendorCostLow:   phase16Results[s.id]?.selectedVendor?.vendorCostLow  || null,
    vendorCostHigh:  phase16Results[s.id]?.selectedVendor?.vendorCostHigh || null,
  }))
```

---

## Architecture

```
POST /api/phase1-5-cost
      ↓
1. normalizeInputs(body)        — validate solutions[], benefits[], IDs
2. buildSolutionSummaries()     — extract fields Claude needs per solution
3. preparePrompt(summaries)     — build prompt with vendor anchors + budget rules
4. callClaudeAPI(prompt)        — claude-haiku-4-5, max_tokens 8192
5. parseCostResponse(text)      — JSON parse, normalise breakdown, compute totals
6. checkBudgetCeiling()         — 85% threshold, set budgetCeilingBreached
7. harmonizeResponse()          — NPV TCO, withinCeiling, rescoping, final output
      ↓
return JSON (array-wrapped: [{ ...payload }])
```

---

## Step 1 — normalizeInputs

### Hard errors — return 400
- `solutions` empty → `MISSING_SOLUTIONS`
- `benefits` empty → `MISSING_BENEFITS`
- Any solution missing `id` → `INVALID_IDS`

```javascript
const validatedData     = raw.validatedData || {}
const budget            = validatedData.budget || raw.suggestedBudget || 0
const discountRatePct   = validatedData.discountRatePct   // integer e.g. 12
const timeHorizonYears  = validatedData.timeHorizonYears || 3
const deferredSolutionIds = raw.deferredSolutionIds || []
const activeSolutions   = solutions.filter(s => !deferredSolutionIds.includes(s.id))
```

---

## Step 2 — buildSolutionSummaries

```javascript
const summaries = activeSolutions.map(s => ({
  id:               s.id,
  name:             s.name,
  category:         s.category,
  description:      (s.description || '').slice(0, 300),
  currentEstimate:  s.costEstimate?.recommended || s.costEstimate?.mid || s.totalCost || 0,
  implementationTime: s.costEstimate?.implementationMonths || s.implementationTime || 0,
  riskLevel:        s.riskLevel || 'Medium',
  selectedVendor:   s.selectedVendor ? {
    name:                s.selectedVendor.name,
    vendorCostLow:       s.selectedVendor.vendorCostLow  || null,
    vendorCostHigh:      s.selectedVendor.vendorCostHigh || null,
    implementationMonths: s.selectedVendor.implementationMonths || null
  } : null
}))
```

---

## Step 3 — preparePrompt

See `references/cost-prompt.md` for full system and user prompts.

Key injections per solution:
```
Vendor pricing anchor: [Name] — total cost $X to $Y, timeline: N months.
Use as primary market rate reference.
```

Budget awareness block (when budget > 0):
```
85% ceiling = $Y. Provide realistic estimates even if over budget.
If total mid > ceiling: return descopedPortfolio with keep/reduce/defer per solution.
If total mid within ceiling: return descopedPortfolio as [].
```

---

## Step 4 — callClaudeAPI

```javascript
const response = await client.messages.create({
  model:      'claude-haiku-4-5-20251001',
  max_tokens: 8192,   // MUST be 8192 — 4096 truncates on large portfolios
  system:     SYSTEM_PROMPT,
  messages:   [{ role: 'user', content: userPrompt }]
})
```

Retry once on parse fail or empty estimates array.

---

## Step 5 — parseCostResponse

```javascript
// All 6 breakdown keys must be present — normalise if any missing
const BREAKDOWN_KEYS = ['labour','licensing','infrastructure','testing','training','contingency']

function normaliseBreakdown(breakdown, totalCost) {
  const result = {}
  for (const key of BREAKDOWN_KEYS) {
    result[key] = typeof breakdown?.[key] === 'number' ? breakdown[key] : 0
  }
  const sum = Object.values(result).reduce((a,b) => a+b, 0)
  if (sum === 0 && totalCost > 0) {
    // Apply default split when AI returns nothing
    result.labour         = Math.round(totalCost * 0.50)
    result.licensing      = Math.round(totalCost * 0.12)
    result.infrastructure = Math.round(totalCost * 0.15)
    result.testing        = Math.round(totalCost * 0.12)
    result.training       = Math.round(totalCost * 0.07)
    result.contingency    = Math.round(totalCost * 0.04)
  }
  return result
}
```

### Warning types generated
| Type | Condition |
|---|---|
| `vendor_cost_mismatch` | AI mid estimate differs from vendor anchor high by >30% |
| `ceiling_breach` | Total mid exceeds 85% ceiling |
| `budget_flag` | Total mid exceeds 100% of budget |
| `range_error` | low > mid or mid > high |
| `vendor_months_fallback` | AI timeline differs from vendor implementationMonths |

### descopedPortfolio action normalisation
```javascript
const ACTION_MAP = {
  'keep': 'keep_full_scope', 'full_scope': 'keep_full_scope', 'keep_full_scope': 'keep_full_scope',
  'reduce': 'reduce_scope', 'reduce_scope': 'reduce_scope', 'descope': 'reduce_scope',
  'defer': 'defer', 'deferred': 'defer', 'skip': 'defer', 'exclude': 'defer'
}
```

---

## Step 6 — checkBudgetCeiling

```javascript
const ceiling = budget > 0 ? Math.round(budget * 0.85) : 0
const totalMid = activeSolutions.reduce((sum, s) =>
  sum + (s.costEstimate?.mid || s.totalCost || 0), 0)
const budgetCeilingBreached = ceiling > 0 && totalMid > ceiling
```

---

## Step 7 — harmonizeResponse (NPV TCO)

```javascript
// CRITICAL: discountRatePct is INTEGER (e.g. 12) — divide by 100
// NEVER read validatedData.discountRate — that field does not exist
const rawPct = validatedData.discountRatePct
const discountRate = (rawPct && Number(rawPct) > 0) ? Number(rawPct) / 100 : 0.08
const discountRateSource = rawPct ? 'user_supplied' : 'default_8pct'

// NPV of recurring costs
let npvRecurring = 0
for (let t = 1; t <= horizonYears; t++) {
  npvRecurring += totalAnnualRecurring / Math.pow(1 + discountRate, t)
}
npvRecurring = Math.round(npvRecurring)

const npvTCO    = totalImplementationCost + npvRecurring
const simpleTCO = totalImplementationCost + (totalAnnualRecurring * horizonYears)

// Ceiling check is SEPARATE from budget check
const withinBudget  = budget > 0 ? totalRecommendedCost <= budget  : null
const withinCeiling = ceiling > 0 ? totalRecommendedCost <= ceiling : null

// TCO warning
if (budget > 0 && simpleTCO > budget) {
  warnings.push(`TCO_EXCEEDS_BUDGET: ${horizonYears}-year TCO ($${simpleTCO.toLocaleString()}) exceeds budget`)
}

// readyForPhase2: null=pending, false=blocked, true=passed
const readyForPhase2 = budgetCeilingBreached ? false
  : hasReflection ? (reflection.readyForPhase2 !== false)
  : null
```

---

## Output shape

See `references/output-shape.md`. Array-wrapped: `res.json([{ ...payload }])`

---

## Express route

```javascript
router.post('/phase1-5-cost', async (req, res) => {
  try {
    const raw = req.body
    const { solutions, benefits, validatedData, errors } = normalizeInputs(raw)
    if (errors.length) return res.status(400).json([{ status:'error', phase:'1.5', errors }])

    const summaries = buildSolutionSummaries(solutions, raw.deferredSolutionIds || [])
    const prompt    = preparePrompt(summaries, validatedData)

    let estimates = []
    for (let attempt = 0; attempt < 2; attempt++) {
      const text = await callClaude(client, prompt)
      estimates  = parseCostResponse(text, summaries)
      if (estimates.length > 0) break
    }

    const withCosts  = mergeCosts(solutions, estimates)
    const ceiling    = checkBudgetCeiling(withCosts, validatedData)
    const response   = harmonizeResponse(withCosts, ceiling, raw, validatedData)
    return res.json([response])

  } catch (err) {
    return res.status(500).json([{ status:'error', phase:'1.5', errorMessage: err.message }])
  }
})
```

---

## Testing checklist

- [ ] Returns array `[{...}]`
- [ ] `phase: '1.5'`
- [ ] Every solution has costEstimate with all 6 breakdown keys
- [ ] Every SaaS/cloud solution has `recurringAnnualCost` > 0
- [ ] `budgetAnalysis.tco.discountRate` = 0.12 (from discountRatePct:12, NOT 0.08)
- [ ] `budgetAnalysis.discountRateSource` = `'user_supplied'`
- [ ] `budgetAnalysis.withinCeiling` present
- [ ] `budgetCeilingBreached: false` for Eco Platform (total < $425K ceiling)
- [ ] `costEstimationWarnings` shows `vendor_cost_mismatch` where applicable
