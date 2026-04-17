# Phase 2 — Exact Output Shape

CRITICAL: Array-wrapped: `res.json([{ ...payload }])`
NO Claude API call — pure maths only.

```javascript
[{
  status:     'success' | 'error',
  phase:      2,
  trackingId: 'req_1234_abc',
  timestamp:  '2026-01-01T00:00:00Z',

  projectMeta: {
    projectTitle, industry, timeHorizonYears, discountRatePct,
    budget, annualRevenue, annualOperatingCost, expectedTimeframe
  },

  // Solutions with full financial metrics attached
  solutions: [{
    id:                   'SOL-001',
    name:                 'string',
    totalCost:            52000,
    implementationTime:   5,
    riskLevel:            'Low',
    category:             'security_compliance',
    deliveryPhase:        1,
    annualBenefit:        35000,    // sum of annualizedValue of linked benefits
    selectedVendor:       { name, fitScore, vendorCostLow, vendorCostHigh, complianceCoverage, ... },
    vendorFitScore:       94,
    vendorCostLow:        30000,
    vendorCostHigh:       60000,

    // Financial metrics
    npv:                  38200,    // Net Present Value
    roi:                  102,      // % return over horizon
    irr:                  44,       // IRR % (null if not calculable)
    irrExceedsCapacity:   false,    // true when IRR > 5000%
    paybackMonths:        18,
    breakEvenYear:        2,
    discountedCashFlows:  [-52000, 31250, 27902, 24913],

    // NPV range using vendor cost anchors
    financials: {
      npv, roi, irr, irrExceedsCapacity, paybackMonths,
      npvLow:  42000,   // NPV if vendor cost = low
      npvHigh: 28000    // NPV if vendor cost = high
    },

    // Linkage details
    linkedBenefits:      ['BEN-001', 'BEN-002'],
    linkedRequirements:  ['REQ-001', 'REQ-002'],
    delivers_benefits:   ['BEN-001', 'BEN-002'],
    depends_on_requirements: ['REQ-001', 'REQ-002'],
    linking: {
      confidence: { benefits: 0.72, requirements: 0.68 }
    }
  }],

  benefits:     [...],   // with annualizedValue and phase2Adjusted:true
  requirements: [...],   // with estimatedCost

  portfolioMetrics: {
    portfolio: {
      totalInitialCost:      209000,
      totalAnnualRecurring:  75000,
      totalTCO:              434000,   // initial + recurring × horizonYears
      totalBenefit:          105000,   // sum of annualBenefit across solutions
      totalNPV:              180000,
      averageROI:            93,
      portfolioIRR:          38,       // null if not calculable
      paybackMonths:         25,
      withinBudget:          true,
      withinCeiling:         true,     // passed through from Phase 1.5
      budgetUtilizationPct:  87,       // TCO / budget
      initialCostWithinBudget: true,
      budgetSuggestion:      'string'
    },
    portfolioCostRange: {
      low:  null,   // sum of vendor cost lows
      high: null    // sum of vendor cost highs
    }
  },

  budgetAnalysis: {
    totalInitialCost:      209000,
    budget:                500000,
    budgetUtilizationPct:  87,
    withinBudget:          true,
    withinCeiling:         true,      // from Phase 1.5 — NOT recomputed
    tco:                   434000,
    budgetSuggestion:      'string'
  },

  sensitivityAnalysis: {
    discountRateScenarios: [
      { discountRate: 0.10, portfolioNPV: 195000, label: 'optimistic' },
      { discountRate: 0.12, portfolioNPV: 180000, label: 'base' },
      { discountRate: 0.14, portfolioNPV: 166000, label: 'conservative' }
    ],
    benefitScenarios: {
      worst: 82000,   // ~75% of base (confidence-modulated)
      base:  105000,
      best:  135000   // ~128% of base
    }
  },

  traceability: {
    healthScore:       88,   // blended: structural 60% + semantic 40%
    linkageScore:      88,   // structural coverage only
    coveredPairs:      14,
    theoreticalPairs:  16,
    vendorCompliancePerSolution: [{
      solutionId:            'SOL-001',
      vendorName:            'Vanta',
      vendorComplianceScore: 100,
      requiredStandards:     ['PCIDSS', 'GDPR'],
      coveredStandards:      ['PCIDSS', 'GDPR'],
      gaps:                  []
    }]
  },

  qualityScore: {
    overallScore:   82,
    traceScore:     88,
    budgetScore:    100,
    npvPositive:    100,
    incomingScore:  72
  },

  validation: {
    passed:   true,
    errors:   [],
    warnings: []
  },

  industryConfig: {
    industry:               'retail',
    discountRate:           0.12,
    benefitMultiplier:      1.0,
    riskPenalty:            0.08,
    benchmarkROI:           200,
    benchmarkPaybackMonths: 15,
    horizonYears:           3
  }
}]
```
