---
name: bca-phase1-discovery
description: >
  BCA.AI Phase 1 — Discovery & Company Financials. Use this skill whenever
  building or running the Phase 1 endpoint for the Business Case Analyzer app.
  Triggers when user asks to: build the phase1 API route, implement discovery,
  generate solutions/benefits/requirements, handle intake form submission,
  replicate the n8n Phase 1 workflow in Node.js, or test Phase 1 logic.
  This skill produces the complete Express route handler that normalises user
  inputs, computes benefit anchors, runs AI discovery via Claude API (with
  template fallback), validates quality, enforces the 85% budget ceiling, and
  returns a fully harmonised response matching the existing n8n webhook output
  shape exactly — so the React frontend needs zero changes.
---

# BCA Phase 1 — Discovery & Company Financials

## What this phase does (non-technical)

Takes the user's project brief and company financials, then uses Claude AI to
generate 5 tailored solutions, 5 benefits, and 5 requirements. If AI quality
fails it falls back to an industry template. Enforces an 85% budget ceiling.
Returns a structured payload that feeds directly into Phase 1.6 (Vendors).

## Files in this skill

- `SKILL.md` — this file (logic, rules, output shape)
- `references/prompt-rules.md` — the full AI system prompt and all mandatory rules
- `references/template-discovery.md` — template fallback logic per industry/category
- `references/output-shape.md` — exact JSON output shape (matches n8n webhook)
- `scripts/phase1.js` — complete Express route handler to generate

Read `references/prompt-rules.md` before writing the AI prompt.
Read `references/output-shape.md` before writing the harmonizer/return block.

---

## Architecture

```
POST /api/phase1
      ↓
1. normalizeAndValidate(body)     — required fields, defaults, benefit anchors
2. templateDiscovery(validated)   — fallback solutions/benefits/requirements
3. validateTemplateQuality(disc)  — check linkages, counts, fragility rules
4. prepareAIPrompt(validated)     — build Claude prompt with all mandatory rules
5. callClaudeAPI(prompt)          — claude-3-5-haiku, max_tokens 4096
6. parseAndValidateAI(response)   — JSON parse, security_compliance check
7. selectBestPath(ai, template)   — AI if passes quality, else template
8. harmonizeResponse(selected)    — normalise, 85% ceiling, final output
      ↓
return JSON (array-wrapped: [{ ...payload }])
```

---

## Step 1 — normalizeAndValidate

### Required fields (400 error if missing in non-draft mode)
- `projectTitle` — string, trimmed
- `businessUnit` — string, trimmed
- `currentState` — string, trimmed
- `businessImpact` — string, trimmed

### Draft mode
If `mode === 'draft'` (default), missing required fields become warnings not errors.

### All input fields with defaults
```javascript
const DEFAULT_HORIZON = 3
const DEFAULT_DISCOUNT = 12

const validated = {
  projectTitle:           (raw.projectTitle || '').trim(),
  businessUnit:           (raw.businessUnit || '').trim(),
  industry:               (raw.industry || 'technology').toLowerCase(),
  currentState:           (raw.currentState || '').trim(),
  businessImpact:         (raw.businessImpact || '').trim(),
  budget:                 num(raw.budget),           // 0 if blank
  expectedTimeframe:      raw.expectedTimeframe || '12 months',
  urgency:                (raw.urgency || 'medium').toLowerCase(),
  technicalStack:         toArr(raw.technicalStack),
  systemIntegrations:     toArr(raw.systemIntegrations),
  complianceRequirements: toArr(raw.complianceRequirements),
  currentPainPoints:      Array.isArray(raw.currentPainPoints) ? raw.currentPainPoints : [],
  businessGoals:          Array.isArray(raw.businessGoals) ? raw.businessGoals : [],
  stakeholders:           toArr(raw.stakeholders),
  timeHorizonYears:       num(raw.timeHorizonYears) || DEFAULT_HORIZON,
  discountRatePct:        num(raw.discountRatePct) || DEFAULT_DISCOUNT,
  projectStartDate:       raw.projectStartDate || null,
  // CRITICAL: annualRevenue must be null (not 0) when blank
  annualRevenue:          (raw.annualRevenue != null && raw.annualRevenue !== '')
                            ? num(raw.annualRevenue) : null,
  annualOperatingCost:    num(raw.annualOperatingCost) || 0,
  headcount:              num(raw.headcount) || 0,
  companySize:            (raw.companySize || '').trim(),
  // Clamped 0–100
  onlineRevenuePct:       Math.min(100, Math.max(0, num(raw.onlineRevenuePct) || 0)),
  budgetStatus:           num(raw.budget) > 0 ? 'user_provided' : 'ai_suggestion_needed',
  discoverWithAI:         raw.discoverWithAI !== false  // default true
}
```

### Benefit anchors (computed from financials)
```javascript
// Use onlineRevenue (not total revenue) for ecommerce uplifts
const onlineRevenue = (validated.annualRevenue && validated.onlineRevenuePct > 0)
  ? Math.round(validated.annualRevenue * validated.onlineRevenuePct / 100)
  : (validated.annualRevenue || 0)

const benefitAnchors = {
  hasRevenue:        validated.annualRevenue !== null && validated.annualRevenue > 0,
  hasOpCost:         validated.annualOperatingCost > 0,
  hasHeadcount:      validated.headcount > 0,
  onlineRevenue,
  onlineRevenuePct:  validated.onlineRevenuePct,
  revenueUplift1pct: Math.round(onlineRevenue * 0.01),
  revenueUplift2pct: Math.round(onlineRevenue * 0.02),
  opCostSaving3pct:  Math.round(validated.annualOperatingCost * 0.03),
  opCostSaving5pct:  Math.round(validated.annualOperatingCost * 0.05),
  costPerEmployee:   validated.headcount > 0
    ? Math.round(validated.annualOperatingCost / validated.headcount) : null
}
```

---

## Step 2 — templateDiscovery (fallback)

See `references/template-discovery.md` for full implementation.

Key rules:
- Always inject `security_compliance` solution FIRST when complianceRequirements.length > 0 or industry is 'healthcare'/'finance'
- Generate 5 solutions based on industry + currentState + painPoints keywords
- Generate 5 benefits with riskAdjustedValue anchored to benefitAnchors when available, or budget-scaled when not
- Generate 5 requirements (3 must_have, 2 should_have)
- All solutions must have: id (SOL-001…), name, description, totalCost, riskLevel, category, deliveryPhase (1/2/3), linkedBenefits[], linkedRequirements[], delivers_benefits[], depends_on_requirements[], costEstimate{low,mid,high,recommended,breakdown,implementationMonths,source:'template'}

### Cost breakdown splits by category
```javascript
const SPLITS = {
  security_compliance:    { labour:0.45, licensing:0.20, infrastructure:0.10, testing:0.12, training:0.08, contingency:0.05 },
  frontend_modernization: { labour:0.55, licensing:0.10, infrastructure:0.12, testing:0.12, training:0.07, contingency:0.04 },
  backend_infrastructure: { labour:0.50, licensing:0.15, infrastructure:0.18, testing:0.10, training:0.04, contingency:0.03 },
  ecommerce_optimization: { labour:0.52, licensing:0.12, infrastructure:0.14, testing:0.12, training:0.06, contingency:0.04 },
  cloud_modernization:    { labour:0.40, licensing:0.08, infrastructure:0.30, testing:0.10, training:0.07, contingency:0.05 },
  process_optimization:   { labour:0.55, licensing:0.08, infrastructure:0.10, testing:0.12, training:0.10, contingency:0.05 },
  general_modernization:  { labour:0.50, licensing:0.12, infrastructure:0.15, testing:0.12, training:0.07, contingency:0.04 }
}
```

### Benefit value basis (3-tier priority — matches n8n logic exactly)
1. Company financials (benefitAnchors) — use anchors.revenueUplift1pct etc. Label: `[source: company financials]`
2. Budget-scaled — when no financials but budget provided. Revenue 40%, Efficiency 30%, Risk 25%, Performance 25%, CX 30% of budget. Label: `[source: budget-scaled estimate (X% of $Y budget)]`
3. Industry benchmark — last resort. Label: `[source: industry benchmark estimate]`

---

## Step 3 — validateTemplateQuality

Pass/fail check — if fails, AI path used instead.

### Pass conditions
- solutions.length >= 5
- benefits.length >= 5
- requirements.length >= 5
- Every solution has >= 3 linkedBenefits and >= 3 linkedRequirements
- No orphaned benefits or requirements (each must link to at least 1 solution)
- All cross-references point to real IDs
- All required fields present per entity

### Fragility warnings (non-blocking)
- Rule A: benefit > 20% of portfolio value AND linked to only 1 solution → warn
- Rule B: benefit > 25% of portfolio value AND linked to ≤ 2 solutions → warn

### Budget warnings (non-blocking)
- budgetUtilizationPct < 70% → "Low budget utilization"
- budgetUtilizationPct > 100% → "Over budget"

---

## Step 4 — prepareAIPrompt

See `references/prompt-rules.md` for the full system prompt.

### Financial context block
```javascript
// With company financials:
`Annual Revenue: $${annualRevenue.toLocaleString()}
  - 1% uplift = $${uplift1}/yr = $${uplift1 * horizon} over ${horizon} years
  - 2% uplift = $${uplift2}/yr
Annual Operating Cost: $${opCost.toLocaleString()}
  - 3% saving = $${saving3}/yr
  - 5% saving = $${saving5}/yr`

// Without company financials (budget-scaled caps):
`No company financials provided.
BENEFIT CAPS (must not exceed):
  - Revenue/Customer: max $${Math.round(budget * 0.40).toLocaleString()}/yr (40% of budget)
  - Efficiency/Operational: max $${Math.round(budget * 0.30).toLocaleString()}/yr (30% of budget)
  - Risk/Compliance: max $${Math.round(budget * 0.25).toLocaleString()}/yr (25% of budget)
  - Strategic/Other: max $${Math.round(budget * 0.30).toLocaleString()}/yr (30% of budget)
Do NOT invent company revenue, headcount, or customer figures.`
```

### Mandatory prompt rules (always include)
1. **Security compliance mandate** — if complianceRequirements.length > 0: must include exactly one `security_compliance` solution in deliveryPhase 1
2. **85% budget ceiling** — total solution costs must not exceed `budget * 0.85`
3. **Delivery phase sequencing** — Phase 1=foundation/security, Phase 2=core build, Phase 3=optimisation
4. **suggestedBudget rule** — if no budget: suggestedBudget >= sum of ALL solution costs
5. **Performance Improvement** category — restricted to speed/uptime only, never revenue
6. **Risk Mitigation benefit** — required, must link to all payment/data solutions

---

## Step 5 — callClaudeAPI

```javascript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.CLAUDE_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-haiku-4-5-20251001',  // fast + cost-effective for this task
    max_tokens: 4096,
    system: SYSTEM_PROMPT,   // from references/prompt-rules.md
    messages: [{ role: 'user', content: userPrompt }]
  })
})
const data = await response.json()
const text = data.content?.[0]?.text || ''
```

---

## Step 6 — parseAndValidateAI

```javascript
// Strip markdown fences
const clean = text.replace(/```json\s*|\s*```/g, '').trim()
const parsed = JSON.parse(clean)  // throw = parseError flag

// Validate
const issues = []
if (parsed.solutions?.length < 5) issues.push(`Only ${parsed.solutions.length}/5 solutions`)
if (parsed.benefits?.length < 5) issues.push(`Only ${parsed.benefits.length}/5 benefits`)
if (parsed.requirements?.length < 5) issues.push(`Only ${parsed.requirements.length}/5 requirements`)

// CRITICAL: security_compliance check
const secSols = parsed.solutions.filter(s => s.category === 'security_compliance')
if (secSols.length === 0) issues.push('No security_compliance solution — mandate violated. Reject.')

// Cross-reference validation — same rules as validateTemplateQuality
// Invented financials detection (when no company financials provided)
const inventedPattern = /\$[\d,]+[MK]?\s*(annual|revenue|turnover|ARR)|[\d,]+\s*(users|customers|subscribers)/i
if (!benefitAnchors.hasRevenue && !benefitAnchors.hasOpCost) {
  for (const ben of parsed.benefits) {
    if (ben.valueBasis && inventedPattern.test(ben.valueBasis)) {
      warnings.push(`INVENTED FINANCIALS: ${ben.id} — valueBasis contains specific figures not provided by user`)
    }
  }
}

const passed = issues.length === 0
```

**Retry logic:** If `!passed`, retry once with same prompt. If retry also fails, use template fallback.

---

## Step 7 — selectBestPath

```javascript
const hasGoodAI = parsed && !parseError && aiQuality.passed && validated.discoverWithAI
const hasGoodTemplate = templateDiscovery && templateQuality.passed

let final, discoveryMethod, fallbackUsed = false

if (hasGoodAI) {
  final = aiDiscovery
  discoveryMethod = 'ai_generated'
} else if (hasGoodTemplate) {
  final = templateDiscovery
  discoveryMethod = 'template_based'
  fallbackUsed = hasGoodAI === false  // true only when AI was tried and failed
} else {
  return { status: 'error', error: 'NO_VALID_DISCOVERY_DATA' }
}
```

---

## Step 8 — harmonizeResponse (85% ceiling + output normalisation)

### 85% budget ceiling (user-provided budgets only — NOT AI-suggested)
```javascript
const CEILING_PCT = 0.85
const budgetIsUserProvided = validated.budgetStatus === 'user_provided'
const effectiveBudget = validated.budget > 0 ? validated.budget : (suggestedBudget || 0)
const totalCost = final.solutions.reduce((s, x) => s + (x.totalCost || 0), 0)

let budgetCeilingBreached = false
if (effectiveBudget > 0 && budgetIsUserProvided) {
  const ceiling = Math.round(effectiveBudget * CEILING_PCT)
  if (totalCost > ceiling) {
    budgetCeilingBreached = true
    budgetWarnings.push(`BUDGET CEILING BREACHED: $${totalCost.toLocaleString()} exceeds 85% ceiling ($${ceiling.toLocaleString()})`)
  }
}

// readyForPhase2 = quality passed AND ceiling not breached
const readyForPhase2 = qualityPassed && !budgetCeilingBreached
```

### Normalise solutions costEstimate
Every solution must have a normalised costEstimate with all 6 breakdown keys:
`labour, licensing, infrastructure, testing, training, contingency`

### Dual fields — both naming conventions preserved
```javascript
// Solutions
delivers_benefits: s.delivers_benefits || s.linkedBenefits || []
depends_on_requirements: s.depends_on_requirements || s.linkedRequirements || []
supported_by_requirements: s.supported_by_requirements || s.linkedRequirements || []

// Benefits
delivered_by_solutions: b.delivered_by_solutions || b.linkedSolutions || []

// Requirements
supports_solutions: r.supports_solutions || r.linkedSolutions || []
```

---

## Output shape

See `references/output-shape.md` for complete schema.

**CRITICAL: response must be array-wrapped** — `return res.json([{ ...payload }])`

Top-level fields:
```
status, phase, trackingId, timestamp, source, validatedData, validation,
discountRatePct, timeHorizonYears, defaultHorizonYears,
solutions[], benefits[], requirements[],
discoveryMethod, fallbackUsed, suggestedBudget, budgetRationale,
budgetAnalysis{ totalCost, budget, budgetUtilizationPct, withinBudget, withinCeiling },
portfolioCostSummary{ totalLow, totalMid, totalHigh, budgetFit },
budgetCeilingBreached, budgetWarnings[], revenueGoalWarnings[], revenueGoalAssessment[],
deliverySequence[], phaseSummary[],
qualityMetrics{ overallScore, dualFieldsValidated },
reflection{ overallScore, summary, readyForPhase2, reflectionError },
costEstimationStatus: 'pending',
warnings[], recommendations[]
```

---

## Express route structure

```javascript
// routes/phase1.js
import express from 'express'
import Anthropic from '@anthropic-ai/sdk'

const router = express.Router()
const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

router.post('/phase1', async (req, res) => {
  try {
    const raw = req.body
    const { validated, benefitAnchors, errors, warnings } = normalizeAndValidate(raw)

    if (errors.length && raw.mode !== 'draft') {
      return res.status(400).json([{ status: 'error', errors }])
    }

    // Run template discovery (always — used as fallback)
    const { discovery: templateDiscovery, quality: templateQuality } =
      validateTemplateQuality(runTemplateDiscovery(validated, benefitAnchors))

    // AI path (if enabled)
    let aiDiscovery = null, aiQuality = { passed: false }
    if (validated.discoverWithAI) {
      const prompt = prepareAIPrompt(validated, benefitAnchors)
      for (let attempt = 0; attempt < 2; attempt++) {
        const text = await callClaude(client, prompt)
        const result = parseAndValidateAI(text, validated, benefitAnchors)
        if (result.passed) { aiDiscovery = result.discovery; aiQuality = result.quality; break }
      }
    }

    const { final, discoveryMethod, fallbackUsed } =
      selectBestPath(aiDiscovery, aiQuality, templateDiscovery, templateQuality, validated)

    const response = harmonizeResponse(final, validated, benefitAnchors, discoveryMethod, fallbackUsed, warnings)
    return res.json([response])

  } catch (err) {
    console.error('Phase 1 error:', err)
    return res.status(500).json([{ status: 'error', error: err.message }])
  }
})

export default router
```

---

## Testing checklist

Run with the Eco Platform Upgrade sample payload (in `scripts/test-payload.json`):

- [ ] Returns array `[{...}]`
- [ ] `discoveryMethod` = `ai_generated` when AI passes, `template_based` when forced off
- [ ] `annualRevenue` is `null` (not `0`) when left blank
- [ ] `budgetCeilingBreached: true` when totalCost > 85% of budget
- [ ] `readyForPhase2: false` when ceiling breached
- [ ] `security_compliance` solution always present first when compliance requirements given
- [ ] All 6 cost breakdown keys present on every solution
- [ ] Dual field names present: `delivers_benefits` AND `linkedBenefits`
- [ ] Response matches n8n Phase 1 output shape (compare against saved Postman response)
