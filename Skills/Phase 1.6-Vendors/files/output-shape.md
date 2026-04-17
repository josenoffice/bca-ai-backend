# Phase 1.6 — Exact Output Shape

CRITICAL: Response must be array-wrapped: `res.json([{ ...payload }])`

```javascript
[{
  status:      'success' | 'error',
  phase:       '1.6',
  trackingId:  'req_1234_abc',
  timestamp:   '2026-01-01T00:00:00Z',
  source:      'web_app',

  // Solution reference — frontend uses this to map result to correct card
  solutionId:   'SOL-001',
  solutionName: 'Security & Compliance Foundation',

  // Full ranked vendor list — frontend renders as vendor selector cards
  vendors: [{
    rank:     1,
    name:     'CrowdStrike Falcon',
    category: 'security_compliance',
    fitScore: 92,
    fitLabel: 'Excellent Fit',   // computed from fitScore
    typicalCostRange: {
      low:   25000,
      high:  55000,
      model: 'annual_subscription'
    },
    implementationMonths:     4,
    complianceCoverage:       ['PCI-DSS', 'SOC 2', 'GDPR'],
    integrationCompatibility: ['AWS', 'Azure AD', 'Splunk'],
    whyRecommended:           'string',
    idealFor:                 'string',
    cons:                     'string',
    learnMoreUrl:             'https://...',
    deliveryTimeline: {
      totalMonths: 4,
      phases: [
        { name: 'Discovery & Planning',  months: 0.5 },
        { name: 'Setup & Configuration', months: 1.5 },
        { name: 'Integration',           months: 1.0 },
        { name: 'Testing & UAT',         months: 0.5 },
        { name: 'Go-Live & Hypercare',   months: 0.5 }
      ]
    }
  }],

  vendorCount: 3,

  // Auto-selected rank 1 (or user override) — flows to Phase 1.5, 2, 3, 4
  selectedVendor: {
    name:                    'CrowdStrike Falcon',
    rank:                    1,
    fitScore:                92,
    vendorCostLow:           25000,   // Phase 1.5 uses as pricing anchor
    vendorCostHigh:          55000,
    costModel:               'annual_subscription',
    implementationMonths:    4,
    deliveryTimeline:        { ... },
    complianceCoverage:      ['PCI-DSS', 'SOC 2', 'GDPR'],
    integrationCompatibility: ['AWS', 'Azure AD'],
    whyRecommended:          'string',
    learnMoreUrl:            'https://...',
    selectionMethod:         'auto_rank1' | 'user_override'
  },

  // Compact list for quick card rendering
  vendorSummaries: [{
    rank:            1,
    name:            'CrowdStrike Falcon',
    fitScore:        92,
    fitLabel:        'Excellent Fit',
    costLow:         25000,
    costHigh:        55000,
    costModel:       'annual_subscription',
    months:          4,
    deliveryTimeline: { ... },
    learnMoreUrl:    'https://...',
    isSelected:      true   // highlights selected vendor in UI
  }],

  // Narrative strings for vendor card display
  marketContext:      'string — 2-3 sentences on the vendor market',
  budgetNote:         'string — budget fit note',
  implementationNote: 'string — implementation complexity note',

  // Gap analysis
  anyVendorWithinBudget: true,
  complianceGaps:        [],   // standards not covered by any vendor
  integrationGaps:       [],   // systems not mentioned by any vendor

  // Validation
  validationWarnings: [
    // e.g. "ACQUISITION CHECK: Vendor X — AI reported parent Y but known parent is Z"
  ],
  validationIssues: [],

  // Error state
  parseError:   false,
  errorMessage: null,

  // Metadata
  generatedAt:     '2026-01-01T00:00:00Z',
  discoveryMethod: 'ai_generated'
}]
```
