# Phase 3 — Exact Output Shape

CRITICAL: Array-wrapped: `res.json([{ ...payload }])`
NO Claude API call — pure maths/logic only.

```javascript
[{
  status:       'success' | 'error',
  phase:        3,
  trackingId:   'req_1234_abc',
  projectTitle: 'Eco Platform Upgrade',

  // Full pipeline data forwarded to Phase 4
  solutions:    [...],   // with confidenceScore (0-100), timelineWeeks, vendorData
  benefits:     [...],   // with annualizedValue, confidence (0-100)
  requirements: [...],   // with estimatedCost, complexity, priority

  // Timeline
  timeline: {
    projectTimeline: {
      totalDurationWeeks: 28,
      deliveryModel:      'parallel' | 'sequential_adjusted',
      projectStartDate:   '2026-04-01',
      projectEndDate:     '2026-10-15',
      totalCost:          209000
    },
    phases: [
      { name: 'Discovery & Design',   startWeek: 1,  endWeek: 4  },
      { name: 'Build & Integrate',    startWeek: 5,  endWeek: 20 },
      { name: 'Test & Validate',      startWeek: 21, endWeek: 27 },
      { name: 'Go-Live & Hypercare',  startWeek: 28, endWeek: 28 }
    ],
    solutions: [...]   // per-solution timeline with phaseWeights
  },

  // Traceability — PRIMARY output of Phase 3
  traceability: {
    healthScore:    88,   // blended: linkage 70% + vendor compliance 30%
    linkageScore:   91,   // structural linkage balance per solution
    coveredPairs:   14,
    theoreticalPairs: 16,
    vendorCompliancePerSolution: [{
      solutionId:            'SOL-001',
      vendorName:            'Vanta',
      vendorComplianceScore: 100,
      requiredStandards:     ['PCIDSS', 'GDPR'],
      coveredStandards:      ['PCIDSS', 'GDPR'],
      gaps:                  []
    }]
  },
  traceabilityCoverage: { coveragePct: 88 },  // alias for frontend

  // Fulfillment — per solution breakdown
  fulfillmentAnalysis: {
    solutions: [{
      solutionId:        'SOL-001',
      reqCoverage:       85,    // % requirement fulfillment
      benContribution:   78,    // % benefit contribution
      traceabilityScore: 81     // geometric mean of above two
    }]
  },

  // Confidence
  confidenceAnalysis: {
    average:      78,
    distribution: { low: 0, med: 2, high: 3 },
    highRiskLowConfidenceSolutions: []
  },

  // Phase 4 readiness gate
  phase4Readiness: {
    phase4ContractReady: true,
    hasTitle:            true,
    hasTimelineWeeks:    true,
    hasPhases:           true,
    portfolioConfidence: 78,
    completeness: {
      solutions: 5, benefits: 5, requirements: 5, phases: 4
    }
  },

  // Executive health badge
  executiveHealth: {
    status: 'green' | 'amber' | 'red',
    linkage: {
      totalSolutions:   5,
      fullyLinked:      5,
      linkageRatePct:   100
    },
    finance: {
      solutionsWithCostAndBenefitPct: 100
    },
    notes: []
  },

  // Dependency graph
  dependencyAnalysis: {
    edges: [
      { from: 'SOL-001', to: 'BEN-003', type: 'delivers' },
      { from: 'REQ-001', to: 'SOL-001', type: 'requires' }
    ],
    criticalPath:              ['SOL-003', 'SOL-001', 'SOL-002'],
    avgRequirementComplexity:  3,
    criticalPathMethod:        'dependency_aware'
  },

  // Financial summary forwarded from Phase 2
  portfolioMetrics: { portfolio: { totalNPV, averageROI, portfolioIRR, ... } },
  portfolioIRR:     91,    // explicit forward for Phase 4 ranking
  sensitivityAnalysis: { ... },

  // Vendor data forwarded to Phase 4
  vendorData: [{
    solutionId:   'SOL-001',
    vendorName:   'Vanta',
    fitScore:     94,
    vendorCostLow:  30000,
    vendorCostHigh: 60000
  }],

  // Phase breadcrumb
  phaseResults: [
    { phase: 1, ok: true },
    { phase: '1.6', ok: true },
    { phase: '1.5', ok: true },
    { phase: 'reflection', ok: true },
    { phase: 2, ok: true },
    { phase: 3, ok: true, avgConfidence: 78, totalCost: 209000, totalDurationWeeks: 28 }
  ],

  validatedData: { ... },
  projectMeta:   { ... }
}]
```
