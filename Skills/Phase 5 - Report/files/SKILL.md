---
name: bca-phase5-report
description: >
  BCA.AI Phase 5 — Report Generation. Use this skill whenever building or
  running the Phase 5 endpoint for the Business Case Analyzer app. Triggers
  when user asks to: build the phase5 API route, generate the executive report,
  build the HTML export, create the executive summary narrative, assemble the
  CBA summary, replicate the n8n Phase 5 workflow in Node.js, or test Phase 5
  logic. IMPORTANT: Phase 5 requires NO Claude API call — it is entirely pure
  JavaScript template assembly. No AI key needed. Receives Phase 4 output, runs
  6 sequential steps, builds the executive narrative from template, renders the
  CBA markdown to HTML, assembles a complete board-ready HTML report, validates
  all required fields, and returns array-wrapped output matching n8n exactly.
---

# BCA Phase 5 — Report Generation

## What this phase does (non-technical)

Auto-runs after Phase 4. Assembles everything into a polished board-ready
HTML report. Builds the executive summary narrative from templates using Phase
4 data. Renders the CBA markdown table. Produces a complete downloadable HTML
file with all sections — recommendation, ranked table, vendor summary,
financial tables, sensitivity analysis, and methodology note. No API call
needed — pure JavaScript template assembly.

## Files in this skill

- `SKILL.md` — this file
- `references/output-shape.md` — exact JSON output shape
- `references/html-template.md` — HTML report structure and sections
- `scripts/test-payload.json` — test request (Phase 4 output)

---

## CRITICAL — No Claude API call

Phase 5 is 100% pure JavaScript template assembly. No calls to
`client.messages.create()`. The executive narrative is built from templates
using Phase 4 data fields, not AI generation.

---

## Architecture (6 steps — all pure JS)

```
POST /api/phase5
      ↓
1. extractAndNormalize()       — validate + extract all Phase 4 fields
2. validateAndSyncFinancials() — validate required fields, build warnings
3. buildExecutiveNarrative()   — template-based headline + blurb + highlights
4. cbaSummaryRenderer()        — render markdown table → HTML
5. exportHtml()                — assemble complete board-ready HTML report
6. harmonizer()                — final output shape
      ↓
return JSON (array-wrapped: [{ ...payload }])
```

---

## Step 1 — extractAndNormalize

```javascript
// Explicitly map vendor fields on every solution
const solutions = rawSolutions.map(s => ({
  ...s,
  selectedVendor:   s.selectedVendor   || null,
  vendorFitScore:   s.vendorFitScore   ?? s.selectedVendor?.fitScore   ?? null,
  vendorName:       s.vendorName       || s.selectedVendor?.name       || null,
  vendorCostLow:    s.vendorCostLow    ?? s.selectedVendor?.vendorCostLow  ?? null,
  vendorCostHigh:   s.vendorCostHigh   ?? s.selectedVendor?.vendorCostHigh ?? null,
  deliveryTimeline: s.deliveryTimeline || s.selectedVendor?.deliveryTimeline || null,
  vendors:          Array.isArray(s.vendors) ? s.vendors : []
}))

// Read traceability (full object with vendorCompliance[]) separately from
// traceabilityCoverage (metrics only) — both needed downstream
const traceability         = raw.traceability         || null
const traceabilityCoverage = raw.traceabilityCoverage || raw.traceability || {}

// Flag missing financials
const financialsP4Missing = !raw.financialsP4?.totalPVBenefit3y

// User override fields from Phase 4
const userOverride = {
  isOverride:              raw.isOverride              || raw.recommendation?.isOverride || false,
  userSelectedSolutionId:  raw.userSelectedSolutionId  || raw.recommendation?.userOverride?.userSelectedSolutionId || null,
  overrideReason:          raw.overrideReason          || raw.recommendation?.userOverride?.overrideReason || null,
  aiRecommendedName:       raw.aiRecommendedSolutionId || raw.recommendation?.aiRecommendation?.solutionId || null
}

// Feature flag — enable HTML export
featureFlags = { exportHtml: true }
```

---

## Step 2 — validateAndSyncFinancials

```javascript
const errors   = []
const warnings = []

// Hard errors — block Phase 5
if (!recommendation?.recommendedSolutionId) errors.push('Phase 4 recommendation missing: recommendedSolutionId')
if (!recommendation?.ranking?.length)        errors.push('Phase 4 ranking missing or empty')
if (!solutions?.length)                      errors.push('Solutions array missing or empty')

// Soft warnings — report still generates
if (financialsP4Missing)     warnings.push('Missing Phase 4 portfolio financials — KPI cards may show blank')
if (!financialsP4?.avgROIPct) warnings.push('Missing Phase 4 average ROI percentage')
if (withinCeiling === false) warnings.push('Budget ceiling breached: total cost exceeds 85% of stated budget')
if (traceabilityCoverage?.coveragePct < 60)
  warnings.push(`Low traceability coverage: ${traceabilityCoverage.coveragePct}%`)

// Vendor data check
const hasVendorData       = Array.isArray(vendorData) && vendorData.length > 0
const solutionsWithVendor = solutions.filter(s => s.vendorName).length
if (!hasVendorData && solutionsWithVendor === 0)
  warnings.push('No vendor data — Phase 1.6 may not have run. Vendor fit defaulted to neutral in ranking.')

// Financial summary
const hasAuthoritative = solutions.some(s => s.financials?.npv != null) ||
  portfolioMetrics?.portfolio?.totalNPV != null
```

---

## Step 3 — buildExecutiveNarrative

Build all quality warnings FIRST, then assign executiveSummary once (no mutation):

```javascript
const qualityWarnings = []

// Build warnings
if (coverage < 60) qualityWarnings.push(`⚠️ Low traceability coverage (${coverage}%)`)
if (!hasAuthoritative) qualityWarnings.push('⚠️ Missing authoritative Phase 2 financial metrics')
if (ranking.length < 3) qualityWarnings.push(`⚠️ Limited solution comparison (${ranking.length} solutions)`)
if (!financialsP4?.totalPVBenefit3y) qualityWarnings.push('⚠️ Missing portfolio PV benefit calculation')
if (isOverride && aiName) qualityWarnings.push(`ℹ️ User override active — AI recommended "${aiName}". Reason: ${overrideReason}`)
if (hasComplianceGap) qualityWarnings.push(`⚠️ Recommended solution vendor has compliance gaps: ${gaps.join(', ')}`)
if (withinCeiling === false) qualityWarnings.push('⚠️ Budget ceiling breached: costs exceed 85% of stated budget')

// Build headline and blurb from template
let headline, blurb

if (!recRow) {
  headline = 'Recommendation Unavailable'
  blurb    = 'Phase 4 recommendation data not found. See portfolio comparison.'
} else if (isOverride) {
  headline = `Selected (User Override): ${recRow.name}`
  const vendorPart = recVendorName ? ` Delivery partner: ${recVendorName}${recFitScore != null ? ` (fit score: ${recFitScore}/100)` : ''}.` : ''
  blurb = `User selected ${recRow.name} as the preferred option, overriding the AI recommendation${aiName ? ` (AI pick: ${aiName})` : ''}.${vendorPart} See override reason in quality indicators.`
} else {
  headline = `Recommended: ${recRow.name}`
  const vendorPart = recVendorName ? ` Delivery partner: ${recVendorName}${recFitScore != null ? ` (fit score: ${recFitScore}/100)` : ''}.` : ''
  blurb = `Based on Phase 4 composite ranking, ${recRow.name} emerges as the preferred option.${vendorPart}`
}

// Single assignment
executiveSummary = {
  headline, blurb,
  rationale: recommendation?.recommendationRationale || '—',
  isOverride,
  highlights: {
    portfolioPV3y:              financialsP4?.totalPVBenefit3y  ?? null,
    portfolioAvgROI:            financialsP4?.avgROIPct         ?? null,
    traceabilityCoveragePct:    traceabilityCoverage?.coveragePct ?? null,
    solutionCount:              solutions.length,
    benefitCount:               benefits?.length     ?? 0,
    requirementCount:           requirements?.length ?? 0,
    recommendedVendorName:      recVendorName || null,
    recommendedVendorFitScore:  recFitScore   ?? null,
    vendorCostRange:            (recCostLow != null && recCostHigh != null)
                                  ? { low: recCostLow, high: recCostHigh } : null
  },
  qualityWarnings,
  healthBadge: executiveHealth ? {
    status:             (executiveHealth.overallStatus || '').toUpperCase(),
    budgetStatus:       (executiveHealth.budgetHealth?.status || '').toUpperCase(),
    traceabilityStatus: (executiveHealth.traceabilityHealth?.status || '').toUpperCase(),
    confidenceStatus:   (executiveHealth.confidenceHealth?.status || '').toUpperCase()
  } : null,
  notes: [
    'Phase 5 does not override the decision from Phase 4; it explains and packages the result.',
    recVendorName ? `Delivery vendor: ${recVendorName}${recFitScore != null ? ` (fit score: ${recFitScore}/100)` : ''}` : null
  ].filter(Boolean)
}
```

---

## Step 4 — cbaSummaryRenderer

Convert CBA markdown table to HTML:

```javascript
function mdToSimpleHtml(markdown) {
  // Parse pipe tables → proper HTML tables
  // Handle: h1/h2/h3, bold, italic, code, ul lists, blockquotes
  // Pipe table detection: line starts with |
  // Separator row detection: /^\|[-:\s|]+$/.test(row) → skip
}
```

---

## Step 5 — exportHtml

See `references/html-template.md` for full HTML structure.

Key sections assembled:
1. **Banner** — recommendation hero or override notice
2. **Quality warnings** — amber/red boxes if any
3. **Executive Summary** — blurb paragraph + KPI metric cards
4. **Solution Overview** — portfolio table (solution, cost, vendor, fit score)
5. **Ranking Table** — all solutions with score, NPV, ROI, risk, vendor, fit, payback
6. **Vendor Summary** — per-solution vendor detail + compliance coverage
7. **Benefits Summary** — category, value, confidence, value basis
8. **Budget Analysis** — utilisation, TCO, ceiling check
9. **Sensitivity Analysis** — discount rate table + benefit scenarios
10. **Timeline** — project phases with week ranges
11. **Methodology Note** — scoring weights + quality scores
12. **Footer** — trackingId, discount rate, horizon

```javascript
// Ceiling breach banner
const ceilingBannerHtml = withinCeiling === false
  ? `<div style="background:#fff3cd;border-left:4px solid #ffc107;padding:12px 16px;margin:12px 0">
      ⚠️ <strong>Budget Ceiling Notice:</strong> Total portfolio cost exceeds 85% of the
      stated budget. Review cost estimates before client delivery.
     </div>`
  : ''

// Override notice
const overrideBannerHtml = isOverride
  ? `<div style="background:#e3f2fd;border-left:4px solid #1976d2;padding:12px 16px;margin:12px 0">
      👤 <strong>User Override Active:</strong> AI recommended "${aiName}".
      User selected "${recRow?.name}". Reason: ${overrideReason}
     </div>`
  : ''

// CRITICAL: sanitise cbaSummary.html before injection
function sanitiseCbaHtml(html) {
  return String(html || '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
}
```

---

## Step 6 — harmonizer

```javascript
return [{
  status:    validation.ok ? 'success' : 'warning',
  phase:     5,
  trackingId,
  project,
  solutions, benefits, requirements, timeline,
  recommendation,       // with scoringWeights preserved
  executiveSummary,
  executiveHealth,
  financialsP4,
  financialSummary,
  portfolioMetrics,
  budgetAnalysis,
  qualityScore,
  sensitivity,
  benefitSensitivity,
  traceability,         // full object with vendorCompliance[]
  traceabilityCoverage,
  cbaSummary,
  export: {
    enabled: true,
    format:  'html',
    html:    htmlDocument  // complete board-ready HTML string
  },
  validation,
  userOverride,
  vendorData,           // top-level for web app
  phaseResults:         breadcrumb,
  timestamp
}]
```

---

## Output shape

See `references/output-shape.md`. Array-wrapped: `res.json([{ ...payload }])`

---

## Express route

```javascript
router.post('/phase5', async (req, res) => {
  try {
    const raw = req.body

    // No API call — all pure JS
    const step1 = extractAndNormalize(raw)
    const step2 = validateAndSyncFinancials(step1)

    if (!step2.validation.ok) {
      return res.status(400).json([{
        status: 'error', phase: 5,
        errors: step2.validation.errors
      }])
    }

    const step3  = buildExecutiveNarrative(step2)
    const step4  = cbaSummaryRenderer(step3)
    const step5  = exportHtml(step4)
    const output = harmonizer(step5)

    return res.json([output])

  } catch (err) {
    console.error('Phase 5 error:', err)
    return res.status(500).json([{
      status: 'error', phase: 5, errorMessage: err.message
    }])
  }
})
```

---

## Testing checklist — no API key needed

- [ ] Returns array `[{...}]`
- [ ] `phase: 5`
- [ ] `status: 'success'`
- [ ] `executiveSummary.headline` contains recommended solution name
- [ ] `executiveSummary.blurb` contains vendor name
- [ ] `executiveSummary.qualityWarnings` array present (may be empty)
- [ ] `export.enabled: true`
- [ ] `export.html` is a non-empty string starting with `<!DOCTYPE html>`
- [ ] `export.html` contains recommendation name
- [ ] `export.html` contains ranking table
- [ ] `export.html` contains vendor summary section
- [ ] `export.html` contains sensitivity analysis table
- [ ] `export.html` does NOT contain any `<script>` tags from cbaSummary (sanitised)
- [ ] `validation.ok: true`
- [ ] `phaseResults` has 8 entries (phases 1→1.6→1.5→reflection→2→3→4→5)
- [ ] Server responds WITHOUT `CLAUDE_API_KEY`
- [ ] Download filename format: `{projectTitle}_{YYYY-MM-DD}.html`
