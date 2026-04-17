---
name: bca-phase16-vendors
description: >
  BCA.AI Phase 1.6 — Vendor Recommendations. Use this skill whenever building
  or running the Phase 1.6 endpoint for the Business Case Analyzer app.
  Triggers when user asks to: build the phase1-6 API route, implement vendor
  recommendations, research vendors per solution, handle parallel vendor calls,
  score vendor compliance fit, replicate the n8n Phase 1.6 workflow in Node.js,
  or test Phase 1.6 logic. This skill runs once per solution (called in parallel
  by the frontend), calls Claude API to research and rank 3-5 vendors, performs
  compliance gap analysis, integration gap analysis, checks known acquisitions,
  auto-selects rank 1 as selectedVendor (or honours user override), and returns
  a fully harmonised response array-wrapped to match the existing n8n output.
---

# BCA Phase 1.6 — Vendor Recommendations

## What this phase does (non-technical)

Called once per solution from Phase 1, in parallel. For each solution it
researches and ranks 3-5 real vendors based on the company's industry, budget,
compliance requirements, tech stack, and integrations. Scores each vendor 0-100
on fit. Auto-selects the top-ranked vendor. Checks for compliance gaps and
integration gaps. Flags any known acquisition mismatches from the AI.

## Files in this skill

- `SKILL.md` — this file (all logic and rules)
- `references/vendor-prompt.md` — full Claude system prompt and output format
- `references/output-shape.md` — exact JSON output shape (matches n8n webhook)
- `scripts/test-payload.json` — test request for a single solution

Read `references/vendor-prompt.md` before writing the AI prompt.
Read `references/output-shape.md` before writing the harmonizer/return block.

---

## Critical: how this route is called

**Called once per solution — in parallel (Promise.allSettled)**

The frontend calls this endpoint N times simultaneously, one per solution from
Phase 1. Each call is independent. The frontend maps each response back to its
solution using `solutionId` in the response.

```
Frontend sends:
POST /api/phase1-6-vendors  ← one call per solution, all at the same time
{
  solution: { id, name, description, category, riskLevel, costEstimate, ... },
  validatedData: { ...full Phase 1 validatedData... },
  budgetAnalysis: { ...from Phase 1... },
  trackingId: 'req_...',
  discoveryMethod: 'ai_generated',
  selectedVendorName: null  // or vendor name string if user overrode
}
```

---

## Architecture

```
POST /api/phase1-6-vendors
      ↓
1. normalizeInputs(body)          — validate solution.id + solution.name, extract context
2. prepareVendorPrompt(context)   — build Claude prompt with all project context
3. callClaudeAPI(prompt)          — claude-haiku-4-5, max_tokens 4096
4. parseVendorResponse(text)      — JSON parse, validate, build deliveryTimeline
5. checkKnownAcquisitions(vendors)— flag ownership mismatches
6. selectTopVendor(vendors)       — rank 1 auto-selected or user override honoured
7. harmonizeResponse(all)         — compliance gaps, integration gaps, summaries
      ↓
return JSON (array-wrapped: [{ ...payload }])
```

---

## Step 1 — normalizeInputs

### Required — hard error if missing
- `solution.id` — string
- `solution.name` — string

If either missing: return structured error payload immediately (do NOT call Claude):
```javascript
return res.json([{
  status: 'error',
  phase: '1.6',
  errorMessage: 'Webhook payload missing required fields: solution.id and/or solution.name.',
  errorCode: 'MISSING_SOLUTION_CONTEXT',
  vendors: [],
  vendorCount: 0,
  selectedVendor: null
}])
```

### Project context extracted
```javascript
const projectContext = {
  solutionId:           solution.id,
  solutionName:         solution.name,
  solutionDescription:  solution.description || '',
  solutionCategory:     solution.category || 'general_modernization',
  solutionRiskLevel:    solution.riskLevel || 'Medium',
  estimatedCost:        solution.costEstimate?.recommended || solution.costEstimate?.mid || solution.totalCost || 0,
  implementationMonths: solution.costEstimate?.implementationMonths || null,

  // From validatedData
  industry:             validatedData.industry || 'technology',
  companySize:          validatedData.companySize || 'SME',
  headcount:            validatedData.headcount || 0,
  annualRevenue:        validatedData.annualRevenue || 0,  // null-safe
  budget:               validatedData.budget || suggestedBudget || 0,
  technicalStack:       toArr(validatedData.technicalStack),
  systemIntegrations:   toArr(validatedData.systemIntegrations),
  complianceRequirements: toArr(validatedData.complianceRequirements),
  currentPainPoints:    validatedData.currentPainPoints || [],
  businessGoals:        validatedData.businessGoals || [],
  timeHorizonYears:     validatedData.timeHorizonYears || 3,
  discoveryMethod:      raw.discoveryMethod || 'unknown',

  // User vendor override (from frontend vendorOverrides map)
  selectedVendorName:   raw.selectedVendorName || null
}
```

### Budget tier (used in prompt)
```javascript
const budgetTier = budget >= 500000 ? 'enterprise'
  : budget >= 150000 ? 'mid-market'
  : budget >= 50000  ? 'smb'
  : 'startup'
```

---

## Step 2 — prepareVendorPrompt

See `references/vendor-prompt.md` for full system prompt and output format.

Key context injected into prompt:
- Solution name, category, description, estimated cost, implementation months
- Company: industry, size, headcount, revenue, budget tier
- Tech stack, system integrations, compliance requirements
- Pain points and business goals
- Time horizon

---

## Step 3 — callClaudeAPI

```javascript
const response = await client.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 4096,
  system: SYSTEM_PROMPT,
  messages: [{ role: 'user', content: userPrompt }]
})
const text = response.content?.[0]?.text || ''
```

**Retry logic:**
- If vendors array is empty after parse: retry once with same prompt
- If retry also returns empty: return error payload (do NOT crash)
- Rate limit (429): wait 1 second then retry automatically

---

## Step 4 — parseVendorResponse

```javascript
const clean = text.replace(/^```[\w]*\s*/i, '').replace(/\s*```$/i, '').trim()
const parsed = JSON.parse(clean)  // catch = return parseError payload
const rawVendors = Array.isArray(parsed.vendors) ? parsed.vendors : []
```

### Vendor field normalisation (per vendor)
```javascript
vendors = rawVendors.map((v, i) => ({
  rank:          v.rank || i + 1,
  name:          v.name || `Vendor ${i + 1}`,
  category:      v.category || projectContext.solutionCategory,
  fitScore:      v.fitScore || 70,   // default 70 if missing
  fitLabel:      fitScore >= 90 ? 'Excellent Fit'
               : fitScore >= 75 ? 'Strong Fit'
               : fitScore >= 60 ? 'Good Fit'
               : 'Marginal Fit',
  typicalCostRange: {
    low:   v.typicalCostRange?.low  || 0,
    high:  v.typicalCostRange?.high || 0,
    model: v.typicalCostRange?.model || 'project_based'
  },
  implementationMonths:     v.implementationMonths || null,
  complianceCoverage:       v.complianceCoverage || [],
  integrationCompatibility: v.integrationCompatibility || [],
  whyRecommended:           v.whyRecommended || '',
  idealFor:                 v.idealFor || '',
  cons:                     v.cons || '',
  learnMoreUrl:             v.learnMoreUrl || '',
  deliveryTimeline:         buildDeliveryTimeline(v.implementationMonths, projectContext.solutionCategory)
}))
// Sort by fitScore descending, re-assign rank
.sort((a, b) => b.fitScore - a.fitScore)
.map((v, i) => ({ ...v, rank: i + 1 }))
```

### Exclude vendors with fitScore < 60
```javascript
vendors = vendors.filter(v => v.fitScore >= 60)
```

### buildDeliveryTimeline (per vendor)
Phase weights by solution category — all weights sum to 100%:

```javascript
const timelineWeights = {
  frontend_modernization:  { discovery:10, setup:25, integration:25, testing:30, golive:10 },
  backend_infrastructure:  { discovery:10, setup:20, integration:40, testing:22, golive: 8 },
  security_compliance:     { discovery:15, setup:30, integration:20, testing:25, golive:10 },
  ecommerce_optimization:  { discovery:10, setup:20, integration:35, testing:25, golive:10 },
  cloud_modernization:     { discovery:10, setup:25, integration:35, testing:22, golive: 8 },
  process_optimization:    { discovery:15, setup:25, integration:25, testing:25, golive:10 },
  general_modernization:   { discovery:10, setup:20, integration:35, testing:25, golive:10 }
}

function buildDeliveryTimeline(implementationMonths, category) {
  if (!implementationMonths || implementationMonths <= 0) return null
  const w = timelineWeights[category] || timelineWeights.general_modernization
  const m = +implementationMonths
  return {
    totalMonths: m,
    phases: [
      { name: 'Discovery & Planning',  months: Math.max(0.5, Math.round(m * w.discovery   / 100 * 2) / 2) },
      { name: 'Setup & Configuration', months: Math.max(0.5, Math.round(m * w.setup       / 100 * 2) / 2) },
      { name: 'Integration',           months: Math.max(0.5, Math.round(m * w.integration / 100 * 2) / 2) },
      { name: 'Testing & UAT',         months: Math.max(0.5, Math.round(m * w.testing     / 100 * 2) / 2) },
      { name: 'Go-Live & Hypercare',   months: Math.max(0.5, Math.round(m * w.golive      / 100 * 2) / 2) }
    ]
  }
}
```

---

## Step 5 — checkKnownAcquisitions

After parsing vendors, check each vendor name against the known acquisitions map.
If AI reported the wrong parent company, push a warning.

```javascript
// LAST VERIFIED: 2026-03 — update this map when ownership changes
const knownAcquisitions = {
  'segment':             'Twilio',
  'dynamic yield':       'Mastercard',
  'marketo':             'Adobe',
  'eloqua':              'Oracle',
  'responsys':           'Oracle',
  'monetate':            'Kibo Commerce',
  'certona':             'Kibo Commerce',
  'evergage':            'Salesforce',
  'interaction studio':  'Salesforce',
  'demandware':          'Salesforce',
  'commerce cloud':      'Salesforce',
  'hybris':              'SAP',
  'magento':             'Adobe',
  'netsuite':            'Oracle',
  'mulesoft':            'Salesforce',
  'tableau':             'Salesforce',
  'looker':              'Google',
  'mandrill':            'Mailchimp',
  'mailchimp':           'Intuit',
  'github':              'Microsoft',
  'linkedin':            'Microsoft',
  'nuance':              'Microsoft'
}

for (const vendor of vendors) {
  const nameLower = vendor.name.toLowerCase()
  for (const [knownName, knownParent] of Object.entries(knownAcquisitions)) {
    if (nameLower.includes(knownName)) {
      const reportedParent = vendor.vendorCompany || ''
      if (reportedParent && !reportedParent.toLowerCase().includes(knownParent.toLowerCase())) {
        validationWarnings.push(
          `ACQUISITION CHECK: ${vendor.name} — AI reported parent "${reportedParent}" ` +
          `but known parent is "${knownParent}". Verify before presenting to client.`
        )
      }
    }
  }
}
```

---

## Step 6 — selectTopVendor

```javascript
let selectedVendor = null

if (projectContext.selectedVendorName) {
  // User override — match by name (case-insensitive)
  const match = vendors.find(v =>
    v.name.toLowerCase().trim() === projectContext.selectedVendorName.toLowerCase().trim()
  )
  selectedVendor = match || vendors[0]  // fallback to rank 1 if name not found
} else {
  selectedVendor = vendors[0]  // auto rank 1
}

// Build clean selectedVendor summary for downstream phases
selectedVendor = {
  name:                    selectedVendor.name,
  rank:                    selectedVendor.rank,
  fitScore:                selectedVendor.fitScore,
  vendorCostLow:           selectedVendor.typicalCostRange?.low  || null,
  vendorCostHigh:          selectedVendor.typicalCostRange?.high || null,
  costModel:               selectedVendor.typicalCostRange?.model || null,
  implementationMonths:    selectedVendor.implementationMonths || null,
  deliveryTimeline:        selectedVendor.deliveryTimeline || null,
  complianceCoverage:      selectedVendor.complianceCoverage || [],
  integrationCompatibility: selectedVendor.integrationCompatibility || [],
  whyRecommended:          selectedVendor.whyRecommended || '',
  learnMoreUrl:            selectedVendor.learnMoreUrl || '',
  selectionMethod:         projectContext.selectedVendorName ? 'user_override' : 'auto_rank1'
}
```

---

## Step 7 — harmonizeResponse

### Compliance gap analysis
```javascript
// Category exclusions — some standards don't apply to certain solution types
const complianceExclusions = {
  ecommerce_optimization: [],          // PCI-DSS DOES apply to ecommerce — no exclusions
  frontend_modernization: ['PCI-DSS'], // UI layer alone does not require PCI-DSS
  process_optimization:   ['PCI-DSS'],
  general_modernization:  ['PCI-DSS'],
  backend_infrastructure: [],
  security_compliance:    [],
  cloud_modernization:    []
}

const notApplicable = new Set(
  (complianceExclusions[projectContext.solutionCategory] || []).map(s => s.toUpperCase())
)
const requiredStandards = projectContext.complianceRequirements
  .filter(c => !notApplicable.has(c.toUpperCase()))

const allCovered = new Set(
  vendors.flatMap(v => v.complianceCoverage).map(s => s.toUpperCase())
)
const complianceGaps = requiredStandards.filter(c => !allCovered.has(c.toUpperCase()))
```

### Integration gap analysis
```javascript
const allIntegrations = new Set(
  vendors.flatMap(v => v.integrationCompatibility).map(s => s.toLowerCase())
)
const integrationGaps = projectContext.systemIntegrations.filter(
  i => !vendors.some(v =>
    v.integrationCompatibility.some(ic => ic.toLowerCase().includes(i.toLowerCase()))
  )
)
```

### vendorSummaries (compact list for quick rendering)
```javascript
const vendorSummaries = vendors.map(v => ({
  rank:            v.rank,
  name:            v.name,
  fitScore:        v.fitScore,
  fitLabel:        v.fitLabel,
  costLow:         v.typicalCostRange?.low  || 0,
  costHigh:        v.typicalCostRange?.high || 0,
  costModel:       v.typicalCostRange?.model || '',
  months:          v.implementationMonths || null,
  deliveryTimeline: v.deliveryTimeline || null,
  learnMoreUrl:    v.learnMoreUrl || '',
  isSelected:      v.name === selectedVendor?.name
}))
```

---

## Output shape

See `references/output-shape.md` for complete schema.

**CRITICAL: response must be array-wrapped** — `return res.json([{ ...payload }])`

Top-level fields:
```
status, phase: '1.6', trackingId, timestamp, source,
solutionId, solutionName,
vendors[], vendorCount, selectedVendor,
vendorSummaries[],
marketContext, budgetNote, implementationNote,
anyVendorWithinBudget, complianceGaps[], integrationGaps[],
validationWarnings[], validationIssues[],
parseError, errorMessage,
generatedAt, discoveryMethod
```

---

## Express route structure

```javascript
// routes/phase16.js
import express from 'express'
import Anthropic from '@anthropic-ai/sdk'

const router = express.Router()
const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

router.post('/phase1-6-vendors', async (req, res) => {
  try {
    const raw = req.body
    const solution = raw.solution || {}

    // Hard error if solution.id or solution.name missing
    if (!solution.id || !solution.name) {
      return res.status(400).json([{
        status: 'error', phase: '1.6',
        errorCode: 'MISSING_SOLUTION_CONTEXT',
        errorMessage: 'solution.id and solution.name are required',
        vendors: [], vendorCount: 0, selectedVendor: null
      }])
    }

    const context = normalizeInputs(raw)
    const prompt  = prepareVendorPrompt(context)

    let vendors = []
    for (let attempt = 0; attempt < 2; attempt++) {
      const text = await callClaude(client, prompt)
      vendors = parseVendorResponse(text, context)
      if (vendors.length > 0) break
      // Wait 1s before retry (rate limit buffer)
      if (attempt === 0) await new Promise(r => setTimeout(r, 1000))
    }

    vendors = checkKnownAcquisitions(vendors)
    const selectedVendor = selectTopVendor(vendors, context.selectedVendorName)
    const response = harmonizeResponse(vendors, selectedVendor, context)

    return res.json([response])

  } catch (err) {
    console.error('Phase 1.6 error:', err)
    return res.status(500).json([{
      status: 'error', phase: '1.6',
      errorMessage: err.message,
      vendors: [], vendorCount: 0, selectedVendor: null
    }])
  }
})

export default router
```

---

## Testing checklist

Run with `scripts/test-payload.json` (security_compliance solution for Eco Platform):

- [ ] Returns array `[{...}]`
- [ ] `solutionId` matches input `solution.id`
- [ ] `vendors` has 3–5 items, all with fitScore >= 60
- [ ] Vendors sorted by fitScore descending
- [ ] `selectedVendor` = vendors[0] (rank 1) when no override
- [ ] `selectedVendor.vendorCostLow` and `vendorCostHigh` populated
- [ ] `deliveryTimeline` present on each vendor with 5 phases
- [ ] `complianceGaps` = [] when vendors cover PCI-DSS and GDPR
- [ ] `validationWarnings` contains ACQUISITION CHECK if applicable
- [ ] `phase: '1.6'` in response
- [ ] Response matches n8n Phase 1.6 output shape
