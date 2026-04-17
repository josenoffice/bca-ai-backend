# Phase 1 Reflection — Exact Output Shape

CRITICAL: Array-wrapped: `res.json([{ ...payload }])`

```javascript
[{
  status:     'ready' | 'needs_review',   // ready = readyForPhase2:true
  phase:      'reflection',
  trackingId: 'req_1234_abc',
  timestamp:  '2026-01-01T00:00:00Z',
  source:     'web_app',

  // Full pipeline data forwarded to Phase 2
  solutions:    [...],   // with Phase 1.5 costs attached
  benefits:     [...],
  requirements: [...],
  validatedData: { ... },

  budgetAnalysis: {
    totalRecommendedCost: 209000,
    budget:               500000,
    budgetUtilizationPct: 42,
    withinBudget:         true,
    withinCeiling:        true
  },

  portfolioCostSummary:    { ... },
  suggestedBudget:         null,
  budgetRationale:         null,
  discoveryMethod:         'ai_generated',
  costEstimationStatus:    'success',
  costEstimationWarnings:  [],
  defaultHorizonYears:     3,
  portfolioCostReview:     null,

  deferredSolutionIds:     [],
  descopedBudgetAnalysis:  null,
  rescopingRecommendation: null,
  descopedPortfolio:       [],

  // THE KEY OUTPUT — gates Phase 2
  reflection: {
    verdict:        'pass' | 'pass_with_warnings' | 'fail' | 'parse_failed',
    overallScore:   85,               // 0–100
    summary:        'string',
    readyForPhase2: true,             // HARD GATE — Phase 2 blocked if false
    reflectionError: null,            // set if fail or parse_failed

    strengths: [
      'Company financials provided — benefit values are anchored',
      'Clear solution phasing with Phase 1 security foundation'
    ],
    criticalIssues: [
      // Only present when blocking issues found
      {
        id:           'CI-001',
        severity:     'critical' | 'high' | 'medium',
        area:         'benefits' | 'costs' | 'linkages' | 'requirements' | 'solutions' | 'vendor_compliance',
        affectedIds:  ['BEN-001'],
        issue:        'Specific problem',
        recommendation: 'How to fix'
      }
    ],
    warnings: [
      {
        id:          'W-001',
        area:        'benefits',
        affectedIds: ['BEN-003'],
        warning:     'Non-critical concern',
        suggestion:  'How to improve'
      }
    ],
    missingElements: ['Risk register', 'Success metrics / KPIs']
  },

  qualityMetrics: {
    overallScore:        85,
    reflectionScore:     85,
    phase1Score:         84,          // from Phase 1 quality check
    dualFieldsPresent:   true,
    dualFieldsValidated: true
  },

  // Formatted strings for web app display
  qualityWarnings: [
    '[WARNING] [BENEFITS] (BEN-003): Strategic value basis is subjective — consider adding supporting evidence',
    '[WARNING] [VENDOR_COMPLIANCE] (SOL-002): Vercel does not cover PCI-DSS for frontend_modernization — note: not applicable to this category'
  ],

  reflectionError:  null,             // set if fail
  reflectionStatus: 'success',        // or 'parse_failed'
  retryRecommended: false,
  retryCount:       0
}]
```

## Fail example

```javascript
{
  status: 'needs_review',
  reflection: {
    verdict:        'fail',
    overallScore:   35,
    readyForPhase2: false,
    reflectionError: 'Quality review found 2 critical issue(s). Review and address before proceeding to Phase 2.',
    criticalIssues: [
      {
        id: 'CI-001', severity: 'critical', area: 'benefits',
        affectedIds: ['BEN-001'],
        issue: 'Revenue uplift of $2.5M uses total annual revenue as base — should use online revenue ($3.4M × 68% = $2.3M)',
        recommendation: 'Recalculate using online revenue figure'
      }
    ]
  }
}
```
