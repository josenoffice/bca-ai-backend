# Phase 1 — Exact Output Shape

CRITICAL: Response must be array-wrapped: `res.json([{ ...payload }])`
The React frontend always reads `response[0]`.

## Complete output schema

```javascript
[{
  status:               'success' | 'warning',  // warning when fallbackUsed
  phase:                1,
  trackingId:           'req_1234_abc',          // generated on every request
  timestamp:            '2026-01-01T00:00:00Z',
  source:               'web_app',

  // Full normalised project data — passed to all downstream phases
  validatedData: {
    projectTitle, businessUnit, industry, currentState, businessImpact,
    budget, expectedTimeframe, urgency, technicalStack, systemIntegrations,
    complianceRequirements, currentPainPoints, businessGoals, stakeholders,
    timeHorizonYears, discountRatePct, projectStartDate,
    annualRevenue,        // null when not provided — NEVER 0
    annualOperatingCost, headcount, companySize, onlineRevenuePct,
    budgetStatus          // 'user_provided' | 'ai_suggestion_needed'
  },

  validation: {
    passed: true | false,
    errors: [],
    warnings: []
  },

  discountRatePct:      12,    // top-level convenience field
  timeHorizonYears:     3,
  defaultHorizonYears:  3,

  // Core discovery output
  solutions: [{
    id:                 'SOL-001',
    name:               'string',
    description:        'string',
    totalCost:          number,
    implementationTime: number,  // weeks
    riskLevel:          'Low' | 'Medium' | 'High',
    category:           'string',
    deliveryPhase:      1 | 2 | 3,
    // DUAL FIELDS — both naming conventions required
    linkedBenefits:          ['BEN-001'],
    linkedRequirements:      ['REQ-001'],
    delivers_benefits:       ['BEN-001'],
    depends_on_requirements: ['REQ-001'],
    supported_by_requirements: ['REQ-001'],
    costEstimate: {
      low: number, mid: number, high: number, recommended: number,
      breakdown: {
        labour, licensing, infrastructure, testing, training, contingency
        // all 6 keys always present — 0 if not applicable
      },
      implementationMonths: number,
      source: 'ai_generated' | 'template'
    }
  }],

  benefits: [{
    id:                 'BEN-001',
    category:           'string',
    description:        'string',
    riskAdjustedValue:  number,   // annual $ value
    confidence:         number,   // 0.0–1.0
    valueBasis:         'string [source: company financials | budget-scaled estimate | industry benchmark estimate]',
    // DUAL FIELDS
    linkedSolutions:         ['SOL-001'],
    delivered_by_solutions:  ['SOL-001']
  }],

  requirements: [{
    id:                 'REQ-001',
    description:        'string',
    priority:           'must_have' | 'should_have',
    // DUAL FIELDS
    linkedSolutions:    ['SOL-001'],
    supports_solutions: ['SOL-001']
  }],

  discoveryMethod:      'ai_generated' | 'template_based',
  fallbackUsed:         false,    // true when AI failed and template used

  // Budget suggestion (only when budget was blank)
  suggestedBudget:      number | null,
  budgetRationale:      'string' | null,

  // Budget analysis
  budgetAnalysis: {
    totalCost:            number,
    budget:               number,
    budgetUtilizationPct: number,  // rounded integer e.g. 84
    withinBudget:         true | false | null,
    withinCeiling:        true | false | null   // 85% ceiling check
  },

  portfolioCostSummary: {
    totalLow:    number,
    totalMid:    number,
    totalHigh:   number,
    budgetFit:   'within_budget' | 'over_budget' | 'unknown'
  },

  // CRITICAL: hard gate on Phase 1.6 and Phase 2
  budgetCeilingBreached: false,
  budgetWarnings:        [],

  revenueGoalWarnings:   [],
  revenueGoalAssessment: [],

  deliverySequence:      ['Phase 1: SOL-001, SOL-002', 'Phase 2: SOL-003'],
  phaseSummary:          [{ phase: 1, solutions: ['SOL-001'], theme: 'string' }],

  qualityMetrics: {
    overallScore:         number | null,   // 0–100
    dualFieldsValidated:  true
  },

  // Summary for Reflection phase to read
  reflection: {
    overallScore:     number | null,
    summary:          'string',
    readyForPhase2:   true | false,
    reflectionError:  'string' | null    // set when ceiling breached or quality failed
  },

  costEstimationStatus: 'pending',   // always pending after Phase 1

  warnings:        [],   // merged from: validation, budget, revenueGoal, quality
  recommendations: []    // human-readable summary strings
}]
```
