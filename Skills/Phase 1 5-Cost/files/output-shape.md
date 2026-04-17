# Phase 1.5 — Exact Output Shape

CRITICAL: Array-wrapped: `res.json([{ ...payload }])`

```javascript
[{
  status:     'success' | 'warning' | 'error',
  phase:      '1.5',
  trackingId: 'req_1234_abc',
  timestamp:  '2026-01-01T00:00:00Z',
  source:     'web_app',

  validatedData:   { ...full Phase 1 validatedData },
  benefits:        [...],
  requirements:    [...],
  discoveryMethod: 'ai_generated',
  suggestedBudget: null,
  budgetRationale: null,

  qualityMetrics: { overallScore: 85 },
  reflection:     null,              // null until Phase 1 Reflection runs
  defaultHorizonYears: 3,

  // Solutions with cost estimates attached
  solutions: [{
    id: 'SOL-001',
    // ...all Phase 1 solution fields preserved...
    costEstimate: {
      low:         95000,
      mid:         120000,
      high:        148000,
      recommended: 120000,
      breakdown: {
        labour:         60000,    // ALL 6 keys always present
        licensing:      18000,
        infrastructure: 20000,
        testing:        12000,
        training:        6000,
        contingency:     4000
      },
      implementationMonths: 5,
      costModel: 'fixed_price',
      source: 'ai_generated'
    },
    recurringAnnualCost: 32000    // annual ongoing cost post go-live
  }],

  portfolioCostSummary: {
    totalLow:    number,
    totalMid:    number,
    totalHigh:   number,
    budgetFit:   'within_budget' | 'within_ceiling' | 'exceeds_ceiling'
  },

  // Budget analysis — KEY fields
  budgetAnalysis: {
    totalRecommendedCost: 400000,
    budget:               500000,
    budgetUtilizationPct: 80,       // rounded integer
    withinBudget:         true,     // vs 100% of budget
    withinCeiling:        true,     // vs 85% ceiling — SEPARATE from withinBudget
    tcoExceedsBudget:     false,

    tco: {
      npvTCO:                   548200,    // NPV-discounted 3yr TCO
      simpleTCO:                572000,    // undiscounted 3yr TCO
      totalImplementationCost:  400000,
      totalAnnualRecurring:      86000,
      npvRecurring:             206400,
      discountRate:               0.12,   // from discountRatePct:12 / 100
      horizonYears:                  3,
      discountRateSource:  'user_supplied'  // or 'default_8pct'
    }
  },

  descopedBudgetAnalysis: null,     // populated when rescoping accepted
  readyForPhase2:         null,     // null=pending Reflection, false=blocked, true=passed
  descopedPortfolio:      [],       // rescoping entries (empty when ceiling not breached)
  rescopingRecommendation: null,    // populated when ceiling breached

  deferredSolutionIds:    [],       // IDs of deferred solutions

  costEstimationStatus:    'success',
  costEstimationWarnings: [
    // e.g. "vendor_cost_mismatch: SOL-001 AI estimate ($156K) exceeds vendor anchor high ($55K) by >30%"
  ],
  costEstimationError:     null,
  costsMissingForSolutions: [],     // IDs of solutions with no AI estimate

  budgetCeilingBreached:   false,   // true when totalMid > 85% of budget

  warnings:        [],
  phaseSummary:    [],
  deliverySequence: []
}]
```

## Budget ceiling breach example

When `budgetCeilingBreached: true`:

```javascript
rescopingRecommendation: {
  reason: "Full portfolio ($563,000) exceeds 85% ceiling ($425,000).",
  descopedPortfolioTotal: 404000,
  fitsWithinCeiling: true,
  solutionsToKeep: [
    { solutionId: "SOL-001", action: "keep_full_scope", adjustedMid: 120000, scopeNote: "..." },
    { solutionId: "SOL-002", action: "reduce_scope",    adjustedMid:  69000, scopeNote: "Reduce to core only" }
  ],
  solutionsToDefer: [
    { solutionId: "SOL-004", action: "defer", scopeNote: "Defer due to budget constraints" }
  ]
}
```
