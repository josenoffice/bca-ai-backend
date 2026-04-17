---
name: bca-phase1-reflection
description: >
  BCA.AI Phase 1 Reflection — Quality Review. Use this skill whenever building
  or running the Phase 1 Reflection endpoint for the Business Case Analyzer app.
  Triggers when user asks to: build the phase1-reflection API route, implement
  quality review, validate BCA completeness, check benefit plausibility, flag
  linkage issues, replicate the n8n Phase 1 Reflection workflow in Node.js, or
  test Reflection logic. This skill auto-runs after Phase 1.5 completes. It
  receives the full Phase 1 + 1.6 + 1.5 pipeline output, validates IDs and
  cross-references, sends everything to Claude AI for critical quality review,
  returns a structured verdict (pass/pass_with_warnings/fail), quality score
  0-100, critical issues with affectedIds, and sets readyForPhase2 which is the
  hard gate before Phase 2 can run. Array-wrapped output matches n8n exactly.
---

# BCA Phase 1 Reflection — Quality Review

## What this phase does (non-technical)

Auto-runs after Phase 1.5. The AI critically reviews everything generated in
Phase 1 — checks if benefit values are realistic, if solutions are properly
linked to benefits and requirements, if compliance is covered, if costs make
sense. Returns a verdict: pass (auto-proceed to Phase 2), pass_with_warnings
(proceed with amber flag), or fail (Phase 2 blocked until issues fixed).

## Files in this skill

- `SKILL.md` — this file
- `references/reflection-prompt.md` — Claude system prompt and output format
- `references/output-shape.md` — exact JSON output shape
- `scripts/test-payload.json` — test request with full Phase 1+1.6+1.5 data

---

## Architecture

```
POST /api/phase1-reflection
      ↓
1. normalizeInputs(body)          — validate solutions[], benefits[], IDs
2. buildReviewContext(data)       — structure data for AI prompt
3. vendorComplianceCheck(data)    — pre-check vendor coverage before sending to AI
4. preparePrompt(context)         — build comprehensive review prompt
5. callClaudeAPI(prompt)          — claude-sonnet-4-6, max_tokens 4096
6. parseReviewResponse(text)      — JSON parse, normalise fields, retry on fail
7. autoAddVendorWarnings()        — inject any missed vendor gap warnings
8. harmonizeResponse()            — qualityWarnings[], final output
      ↓
return JSON (array-wrapped: [{ ...payload }])
```

---

## Step 1 — normalizeInputs

### Hard errors — return immediately
- `solutions` empty → `MISSING_SOLUTIONS`
- `benefits` empty → `MISSING_BENEFITS`
- Any solution/benefit/requirement missing `id` → `ID_VALIDATION_FAILED`
- Any benefit links to non-existent solution ID → `ID_VALIDATION_FAILED`

```javascript
const solutions     = raw.solutions    || []
const benefits      = raw.benefits     || []
const requirements  = raw.requirements || []
const validatedData = raw.validatedData || {}
const budgetAnalysis = raw.budgetAnalysis || {}
const deferredSolutionIds = raw.deferredSolutionIds || []

// ID cross-reference validation
const solIdSet = new Set(solutions.map(s => s.id).filter(Boolean))
for (const b of benefits) {
  for (const sid of (b.linkedSolutions || [])) {
    if (!solIdSet.has(sid)) idIssues.push(`Benefit ${b.id} links to non-existent solution ${sid}`)
  }
}
// Same check for requirements
```

---

## Step 2 — buildReviewContext

Build structured objects the prompt uses:

```javascript
// solutionReview — per solution summary
const solutionReview = solutions.map(s => ({
  id:                      s.id,
  name:                    s.name,
  riskLevel:               s.riskLevel || 'Medium',
  category:                s.category,
  linkedBenefits:          s.linkedBenefits || s.delivers_benefits || [],
  linkedRequirements:      s.linkedRequirements || s.depends_on_requirements || [],
  initialImplementationCost: s.costEstimate?.mid || s.costEstimate?.recommended || s.totalCost || 0,
  recurringAnnualCost:     s.recurringAnnualCost || 0,
  threeYearTCO:            (s.costEstimate?.mid || 0) + ((s.recurringAnnualCost || 0) * horizonYears),
  costEstimate:            s.costEstimate || null,
  vendorName:              s.vendorName || s.selectedVendor?.name || null,
  vendorFitScore:          s.vendorFitScore || s.selectedVendor?.fitScore || null
}))

// benefitReview — per benefit summary
const benefitReview = benefits.map(b => ({
  id:               b.id,
  category:         b.category,
  riskAdjustedValue: b.riskAdjustedValue || 0,
  confidence:       b.confidence || 0,
  valueBasis:       b.valueBasis || '',
  linkedSolutions:  b.linkedSolutions || b.delivered_by_solutions || [],
  deferredOnly:     (b.linkedSolutions || []).every(sid => deferredSolutionIds.includes(sid))
}))

// companyContext
const companyContext = {
  industry:           validatedData.industry,
  annualRevenue:      validatedData.annualRevenue,    // null if not provided
  annualOperatingCost: validatedData.annualOperatingCost,
  headcount:          validatedData.headcount,
  onlineRevenuePct:   validatedData.onlineRevenuePct,
  onlineRevenue:      validatedData.annualRevenue
    ? Math.round(validatedData.annualRevenue * (validatedData.onlineRevenuePct || 0) / 100)
    : null,
  budget:             validatedData.budget || 0,
  costHorizonYears:   validatedData.timeHorizonYears || 3,
  totalInitialCost:   solutionReview.reduce((s, x) => s + x.initialImplementationCost, 0),
  totalAnnualCost:    solutionReview.reduce((s, x) => s + x.recurringAnnualCost, 0),
  withinCeiling:      budgetAnalysis.withinCeiling
}
```

---

## Step 3 — vendorComplianceCheck

Pre-computes vendor compliance coverage per solution before AI review.
AI is then given this structured data and asked to flag gaps.

```javascript
// Category exclusions — some standards don't apply to certain solution types
const COMPLIANCE_EXCLUSIONS = {
  ecommerce_optimization: [],           // PCI-DSS applies — no exclusions
  frontend_modernization: ['PCI-DSS'],  // UI layer alone doesn't require PCI-DSS
  process_optimization:   ['PCI-DSS'],
  general_modernization:  ['PCI-DSS'],
  backend_infrastructure: [],
  security_compliance:    [],
  cloud_modernization:    []
}

const vendorComplianceReview = solutions
  .filter(s => !deferredSolutionIds.includes(s.id))
  .map(s => {
    const vendor      = s.selectedVendor || {}
    const covered     = vendor.complianceCoverage || []
    const required    = validatedData.complianceRequirements || []
    const notApplicable = COMPLIANCE_EXCLUSIONS[s.category] || []
    const applicable  = required.filter(c => !notApplicable.includes(c))
    const gaps        = applicable.filter(c =>
      !covered.some(vc => vc.toLowerCase().includes(c.toLowerCase()))
    )
    return {
      solutionId:           s.id,
      solutionName:         s.name,
      solutionCategory:     s.category,
      vendorName:           vendor.name || s.vendorName || 'None',
      vendorFitScore:       vendor.fitScore || s.vendorFitScore || null,
      requiredCompliance:   applicable,
      coveredByVendor:      covered,
      notApplicableSkipped: notApplicable,
      hasGaps:              gaps.length > 0,
      gaps
    }
  })
```

---

## Step 4 — preparePrompt

See `references/reflection-prompt.md` for full system prompt and output format.

Key sections injected into user prompt:
- Solutions with costs (CapEx + OpEx + 3yr TCO)
- Benefits with value basis and confidence
- Requirements with priority and linkages
- Company financials context
- Budget/ceiling status
- Vendor compliance review table
- Any normalisation warnings from Phase 1.5

---

## Step 5 — callClaudeAPI

```javascript
// Use Sonnet for Reflection — this requires careful reasoning, not just generation
const response = await client.messages.create({
  model:      'claude-sonnet-4-6',    // Sonnet for quality reasoning
  max_tokens: 4096,
  system:     systemPrompt,
  messages:   [{ role: 'user', content: userPrompt }]
})
```

**Retry logic:** retry once on parse fail (max 2 attempts total)

---

## Step 6 — parseReviewResponse

```javascript
const clean = text.replace(/^```[\w]*\s*/g,'').replace(/```\s*$/g,'').trim()
const review = JSON.parse(clean)

// Normalise verdict
const valid = ['pass', 'pass_with_warnings', 'fail']
review.verdict = valid.includes(review.verdict?.toLowerCase())
  ? review.verdict.toLowerCase()
  : 'pass_with_warnings'

// Normalise area and severity fields
review.criticalIssues = (review.criticalIssues || []).map(i => ({
  ...i,
  area:     i.area?.toLowerCase().replace(/-/g, '_'),
  severity: i.severity?.toLowerCase()
}))

// If any critical issues exist — force readyForPhase2: false
const criticalCount = review.criticalIssues.filter(i => i.severity === 'critical').length
if (criticalCount > 0) review.readyForPhase2 = false
```

---

## Step 7 — autoAddVendorWarnings

After AI parse, check if AI missed any vendor compliance gaps from Step 3.
Auto-inject as warnings if AI didn't already cover them.

```javascript
const alreadyCovered = new Set([
  ...review.warnings.filter(w => w.area === 'vendor_compliance').flatMap(w => w.affectedIds || []),
  ...review.criticalIssues.filter(i => i.area === 'vendor_compliance').flatMap(i => i.affectedIds || [])
])

for (const v of vendorComplianceReview) {
  if (v.hasGaps && !alreadyCovered.has(v.solutionId)) {
    review.warnings.push({
      id:         `W-AUTO-VC-${autoCounter++}`,
      area:       'vendor_compliance',
      affectedIds: [v.solutionId],
      warning:    `${v.vendorName} does not cover required compliance: ${v.gaps.join(', ')} for ${v.solutionName}`,
      suggestion: 'Verify vendor compliance coverage or select an alternative vendor in Phase 1.6'
    })
  }
}
```

---

## Step 8 — harmonizeResponse

```javascript
// Build qualityWarnings[] — formatted strings for web app display
const qualityWarnings = []
for (const issue of (ref.criticalIssues || [])) {
  const prefix = issue.severity === 'critical' ? '[CRITICAL]'
               : issue.severity === 'high'     ? '[HIGH]'
               : '[MEDIUM]'
  const area   = issue.area ? `[${issue.area.toUpperCase()}]` : ''
  const ids    = (issue.affectedIds || []).join(', ')
  qualityWarnings.push(`${prefix} ${area}${ids ? ` (${ids})` : ''}: ${issue.issue} — ${issue.recommendation}`)
}
for (const w of (ref.warnings || [])) {
  const area = w.area ? `[${w.area.toUpperCase()}]` : ''
  const ids  = (w.affectedIds || []).join(', ')
  qualityWarnings.push(`[WARNING] ${area}${ids ? ` (${ids})` : ''}: ${w.warning} — ${w.suggestion}`)
}

// readyForPhase2: only true when explicitly true
const readyForPhase2 = ref.readyForPhase2 === true
```

---

## Auto-proceed logic (frontend responsibility)

```javascript
// Frontend implements this after receiving Reflection response:
if (reflection.verdict === 'pass' && reflection.criticalIssues.length === 0) {
  // Auto-advance to Phase 2 after 2 seconds
  setTimeout(() => advanceToPhase2(), 2000)
  showToast('Quality check passed — proceeding to analysis')
} else if (reflection.verdict === 'pass_with_warnings') {
  // Auto-advance but show amber warning
  setTimeout(() => advanceToPhase2(), 2000)
  showAmberToast('Quality check passed with warnings — review before proceeding')
} else {
  // verdict === 'fail' — BLOCK Phase 2
  lockPhase2()
  showCriticalIssues(reflection.criticalIssues)
  showReturnToDiscoveryButton()
}
```

---

## Output shape

See `references/output-shape.md`. Array-wrapped: `res.json([{ ...payload }])`

---

## Express route

```javascript
router.post('/phase1-reflection', async (req, res) => {
  try {
    const raw = req.body
    const { solutions, benefits, validatedData, errors } = normalizeInputs(raw)
    if (errors.length) return res.status(400).json([{ status:'error', phase:'reflection', errors }])

    const context  = buildReviewContext(raw)
    const vcReview = vendorComplianceCheck(solutions, validatedData, raw.deferredSolutionIds || [])
    const prompt   = preparePrompt(context, vcReview)

    let review = null
    for (let attempt = 0; attempt < 2; attempt++) {
      const text = await callClaude(client, prompt)
      review     = parseReviewResponse(text)
      if (review && review.verdict !== 'parse_failed') break
    }

    review = autoAddVendorWarnings(review, vcReview)
    const response = harmonizeResponse(review, raw)
    return res.json([response])

  } catch (err) {
    return res.status(500).json([{ status:'error', phase:'reflection', errorMessage: err.message }])
  }
})
```

---

## Testing checklist

- [ ] Returns array `[{...}]`
- [ ] `phase: 'reflection'`
- [ ] `reflection.verdict` = `pass_with_warnings` for Eco Platform (good BCA with minor warnings)
- [ ] `reflection.overallScore` between 70–90
- [ ] `reflection.readyForPhase2: true`
- [ ] `reflection.criticalIssues` = [] (no blocking issues for valid test data)
- [ ] `reflection.strengths` non-empty
- [ ] `qualityWarnings[]` formatted as `[WARNING] [AREA] (IDs): message`
- [ ] `status: 'ready'` when readyForPhase2 = true
- [ ] Force a fail: set a benefit's riskAdjustedValue to $50M and verify verdict = 'fail'
