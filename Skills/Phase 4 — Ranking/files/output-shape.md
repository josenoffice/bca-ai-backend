# Phase 4 — Exact Output Shape

CRITICAL: Array-wrapped: `res.json([{ ...payload }])`
NO Claude API call — pure maths only.

```javascript
[{
  status:     'success' | 'warning' | 'error',
  phase:      4,
  trackingId: 'req_1234_abc',
  timestamp:  '2026-01-01T00:00:00Z',

  // THE KEY OUTPUT — recommendation
  recommendation: {
    recommendedSolutionId:   'SOL-003',
    recommendedSolutionName: 'Order Processing Automation',
    isOverride:              false,

    ranking: [{
      rank:           1,
      solutionId:     'SOL-003',
      name:           'Order Processing Automation',
      score:          0.812,
      npv:            187000,
      roiPct:         520,
      riskLevel:      'Medium',
      confidenceScore: 74,
      vendorName:     'Kissflow Process',
      vendorFitScore: 85,
      paybackMonths:  11,
      rationale:      'Strong ROI (520%), high confidence, best balance of returns and certainty'
    }],

    scoringWeights: { npv: 0.35, roi: 0.20, confidence: 0.15, riskPenalty: 0.15, vendorFit: 0.15 },

    // Only present when isOverride: true
    userOverride: null,
    aiRecommendation: null,

    industryContext: {
      discountRate:      0.12,
      riskPenalty:       0.08,
      benefitMultiplier: 1.00
    }
  },

  // Portfolio financials from Phase 4 calculations
  financialsP4: {
    totalCost:          209000,
    totalPVBenefit3y:   487000,
    avgROIPct:          356.0,
    discountRate:       0.12,
    appliedRiskPenalty: 0.08,
    appliedBenefitMult: 1.00,
    horizonYears:       3
  },

  // 5-point discount rate sensitivity
  sensitivity: [
    { discountRate: 0.08, portfolioPVBenefit: 545000, horizonYears: 3 },
    { discountRate: 0.10, portfolioPVBenefit: 514000, horizonYears: 3 },
    { discountRate: 0.12, portfolioPVBenefit: 487000, horizonYears: 3 },
    { discountRate: 0.14, portfolioPVBenefit: 462000, horizonYears: 3 },
    { discountRate: 0.16, portfolioPVBenefit: 439000, horizonYears: 3 }
  ],

  // 3 benefit scenarios
  benefitSensitivity: [
    {
      label: 'Pessimistic', multiplier: 0.70, portfolioPV: 341000, portfolioROI: 63.2,
      solutions: [{ solutionId: 'SOL-001', adjustedAnnualBenefit: 43750, pvBenefit: 78400, roiPct: 51 }]
    },
    { label: 'Base',        multiplier: 1.00, portfolioPV: 487000, portfolioROI: 133.0, solutions: [...] },
    { label: 'Optimistic',  multiplier: 1.20, portfolioPV: 584000, portfolioROI: 179.4, solutions: [...] }
  ],

  // Budget analysis
  budgetAnalysis: {
    totalRecommendedCost: 209000,
    budget:               500000,
    budgetUtilizationPct: 42,
    withinBudget:         true,
    withinCeiling:        true   // passed through from Phase 1.5 — NOT recomputed
  },
  withinCeiling: true,

  // Traceability coverage
  traceabilityCoverage: {
    coveredPairs:    8,
    theoreticalPairs: 25,
    coveragePct:     32
  },

  // Executive health dashboard
  executiveHealth: {
    overallStatus: 'green' | 'amber' | 'red',
    financialSummary: {
      totalInvestment:    209000,
      totalPVBenefit3y:   487000,
      avgROIPct:          356.0,
      withinBudget:       true,
      withinCeiling:      true
    },
    budgetHealth: {
      status:             'green',
      withinBudget:       true,
      utilizationPct:     42
    },
    traceabilityHealth: {
      status:             'green',
      coveragePct:        88
    },
    confidenceHealth: {
      status:             'green',
      overallConfidence:  78
    },
    recommendedSolutionId:   'SOL-003',
    recommendedSolutionName: 'Order Processing Automation'
  },

  // Phase 5 gate
  phase5Contract: {
    ok:         true,
    errors:     [],
    isOverride: false,
    required:   ['recommendedSolutionId','ranking[]','cbaSummary.markdown','cbaSummary.html','portfolioP4.totalPVBenefit3y']
  },

  // CBA summary strings
  cbaSummary: {
    markdown: '# Portfolio Comparison (Phase 4)\n...',
    html:     '<h2>Portfolio Summary</h2>...'
  },

  // All input data forwarded
  solutions:    [...],   // with phase4 financial metrics attached
  benefits:     [...],
  requirements: [...],
  timeline:     { ... },
  traceability: { ... },
  vendorData:   [...],

  // Override fields (top-level convenience)
  isOverride:              false,
  userSelectedSolutionId:  null,
  overrideReason:          null,
  aiRecommendedSolutionId: null,

  // Project context
  projectMeta: {
    projectTitle, industry, timeHorizonYears, discountRatePct,
    budget, annualRevenue, annualOperatingCost
  },

  // Phase breadcrumb
  phaseResults: [
    { phase: 1, ok: true },
    { phase: '1.6', ok: true },
    { phase: '1.5', ok: true },
    { phase: 'reflection', ok: true },
    { phase: 2, ok: true },
    { phase: 3, ok: true },
    { phase: 4, ok: true, metrics: { solutions: 5, coveragePct: 32, totalPV3y: 487000, isOverride: false } }
  ]
}]
```
