# Phase 5 — Exact Output Shape

CRITICAL: Array-wrapped: `res.json([{ ...payload }])`
NO Claude API call — pure JavaScript template assembly.

```javascript
[{
  status:     'success' | 'warning',
  phase:      5,
  trackingId: 'req_1234_abc',
  timestamp:  '2026-01-01T00:00:00Z',

  // Executive narrative (template-generated — NOT AI)
  executiveSummary: {
    headline:  'Recommended: Security & Compliance Foundation',
    blurb:     'Based on Phase 4 composite ranking, Security & Compliance Foundation emerges as the preferred option. Delivery partner: Vanta (fit score: 94/100).',
    rationale: 'string from Phase 4',
    isOverride: false,

    highlights: {
      portfolioPV3y:              474475,
      portfolioAvgROI:            171.1,
      traceabilityCoveragePct:    32,
      solutionCount:              5,
      benefitCount:               5,
      requirementCount:           5,
      recommendedVendorName:      'Vanta',
      recommendedVendorFitScore:  94,
      vendorCostRange:            { low: 30000, high: 60000 }
    },

    qualityWarnings: [
      '⚠️ Low traceability coverage (32%)',
      // Empty array when all checks pass
    ],

    healthBadge: {
      status:             'RED',
      budgetStatus:       'GREEN',
      traceabilityStatus: 'RED',
      confidenceStatus:   'GREEN'
    },

    notes: [
      'Phase 5 does not override the decision from Phase 4; it explains and packages the result.',
      'Delivery vendor: Vanta (fit score: 94/100)'
    ]
  },

  // THE KEY DELIVERABLE — complete board-ready HTML document
  export: {
    enabled: true,
    format:  'html',
    html:    '<!DOCTYPE html><html>...</html>'
    // Complete HTML string with all sections:
    // - Recommendation banner
    // - Executive summary + KPI cards
    // - Portfolio overview table
    // - CBA summary (from Phase 4)
    // - Ranking table with vendor columns
    // - Vendor summary with compliance gaps
    // - Benefits summary
    // - Budget analysis
    // - Sensitivity tables (5-point rate + 3 scenarios)
    // - Methodology note with scoring weights
    // - © Nidhish Jose footer
  },

  // Validation
  validation: {
    ok:       true,
    errors:   [],
    warnings: ['Low traceability coverage: 32%'],
    financialsP4Missing: false,
    vendorDataPresent:   true
  },

  // All Phase 4 data forwarded unchanged
  recommendation:     { ... },   // with scoringWeights preserved
  solutions:          [...],
  benefits:           [...],
  requirements:       [...],
  timeline:           { ... },
  financialsP4:       { ... },
  financialSummary:   { ... },
  portfolioMetrics:   { ... },
  budgetAnalysis:     { ... },
  sensitivity:        [...],
  benefitSensitivity: [...],
  traceability:       { ... },   // full object with vendorCompliance[]
  traceabilityCoverage: { ... },
  cbaSummary:         { markdown: '...', html: '...' },
  executiveHealth:    { ... },
  qualityScore:       { overallScore: 82 },
  vendorData:         [...],     // top-level for web app
  userOverride:       null,

  // Phase breadcrumb — 8 entries
  phaseResults: [
    { phase: 1, ok: true },
    { phase: '1.6', ok: true },
    { phase: '1.5', ok: true },
    { phase: 'reflection', ok: true },
    { phase: 2, ok: true },
    { phase: 3, ok: true },
    { phase: 4, ok: true },
    { phase: 5, ok: true, metrics: { solutions: 5, traceabilityCoveragePct: 32, exportEnabled: true } }
  ]
}]
```

## Download filename convention (frontend responsibility)

```javascript
const date     = new Date().toISOString().split('T')[0]  // YYYY-MM-DD
const title    = (projectTitle || 'BCA').replace(/\s+/g, '_')
const filename = `${title}_${date}.html`
// e.g. "Eco_Platform_Upgrade_2026-04-01.html"
```
