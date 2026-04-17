import express from 'express'
import Anthropic from '@anthropic-ai/sdk'
import crypto from 'crypto'

const router = express.Router()
const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

// ─── Constants ───────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior enterprise technology advisor with deep knowledge of the
vendor landscape across all major software categories.

Your job is to recommend the best-fit software vendors for a specific
solution within a business transformation project.

YOU MUST:
- Recommend exactly 3 to 5 vendors, ranked by fit score (highest first)
- Base recommendations on ALL context provided: industry, company size,
  budget, tech stack, integrations, compliance, pain points and goals
- Provide SPECIFIC, NAMED vendors — not categories or generic descriptions
- Size licensing and implementation costs realistically to company size and budget
- Include vendors across a range of tiers (enterprise, mid-market, SMB)
- Explain WHY each vendor fits THIS specific company — not generic marketing
- Flag honest cons — do not oversell any vendor
- Compliance coverage must match the ACTUAL requirements listed
- Integration compatibility must reference the ACTUAL tech stack listed

FIT SCORE RULES:
- 90–100: Near-perfect fit. Built for this industry/use case, budget aligned, compliance covered
- 75–89:  Strong fit. Minor gaps in one area (slightly over budget, one missing integration)
- 60–74:  Good fit. Usable but notable gaps — clearly explain them
- Below 60: Do not include — too many gaps to be credible

COST RULES:
- typicalCostRange covers the FULL solution cost: vendor licence + implementation labour combined
- Size costs to company size: SMB budgets should see SMB-tier vendors, not $500K enterprise deals
- If a vendor has no realistic fit for the budget, do not include it

ACQUISITION RULE:
- Always state the correct current parent company (many vendors have been acquired)
- Examples: Segment = Twilio, Dynamic Yield = Mastercard, Marketo = Adobe, Magento = Adobe

You must respond with valid JSON only — no markdown, no explanation, no preamble.`

const TIMELINE_WEIGHTS = {
  frontend_modernization:  { discovery: 10, setup: 25, integration: 25, testing: 30, golive: 10 },
  backend_infrastructure:  { discovery: 10, setup: 20, integration: 40, testing: 22, golive:  8 },
  security_compliance:     { discovery: 15, setup: 30, integration: 20, testing: 25, golive: 10 },
  ecommerce_optimization:  { discovery: 10, setup: 20, integration: 35, testing: 25, golive: 10 },
  cloud_modernization:     { discovery: 10, setup: 25, integration: 35, testing: 22, golive:  8 },
  process_optimization:    { discovery: 15, setup: 25, integration: 25, testing: 25, golive: 10 },
  general_modernization:   { discovery: 10, setup: 20, integration: 35, testing: 25, golive: 10 }
}

// LAST VERIFIED: 2026-03
const KNOWN_ACQUISITIONS = {
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

const COMPLIANCE_EXCLUSIONS = {
  ecommerce_optimization: [],
  frontend_modernization: ['PCI-DSS'],
  process_optimization:   ['PCI-DSS'],
  general_modernization:  ['PCI-DSS'],
  backend_infrastructure: [],
  security_compliance:    [],
  cloud_modernization:    []
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toArr(v) {
  if (Array.isArray(v)) return v
  if (typeof v === 'string' && v.trim()) return v.split(',').map(s => s.trim()).filter(Boolean)
  return []
}

function generateTrackingId() {
  return `req_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`
}

function fitLabel(score) {
  if (score >= 90) return 'Excellent Fit'
  if (score >= 75) return 'Strong Fit'
  if (score >= 60) return 'Good Fit'
  return 'Marginal Fit'
}

function buildDeliveryTimeline(implementationMonths, category) {
  if (!implementationMonths || implementationMonths <= 0) return null
  const w = TIMELINE_WEIGHTS[category] || TIMELINE_WEIGHTS.general_modernization
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

// ─── Step 1: normalizeInputs ─────────────────────────────────────────────────

function normalizeInputs(raw) {
  const solution = raw.solution || {}
  const validatedData = raw.validatedData || {}
  const budget = validatedData.budget || raw.suggestedBudget || 0

  const ctx = {
    solutionId:             solution.id,
    solutionName:           solution.name,
    solutionDescription:    solution.description || '',
    solutionCategory:       solution.category || 'general_modernization',
    solutionRiskLevel:      solution.riskLevel || 'Medium',
    estimatedCost:          solution.costEstimate?.recommended || solution.costEstimate?.mid || solution.totalCost || 0,
    implementationMonths:   solution.costEstimate?.implementationMonths || null,

    industry:               validatedData.industry || 'technology',
    companySize:            validatedData.companySize || 'SME',
    headcount:              validatedData.headcount || 0,
    annualRevenue:          validatedData.annualRevenue || 0,
    budget,
    technicalStack:         toArr(validatedData.technicalStack),
    systemIntegrations:     toArr(validatedData.systemIntegrations),
    complianceRequirements: toArr(validatedData.complianceRequirements),
    currentPainPoints:      validatedData.currentPainPoints || [],
    businessGoals:          validatedData.businessGoals || [],
    timeHorizonYears:       validatedData.timeHorizonYears || 3,
    discoveryMethod:        raw.discoveryMethod || 'unknown',

    selectedVendorName:     raw.selectedVendorName || null,

    trackingId:             raw.trackingId || generateTrackingId()
  }

  ctx.budgetTier = budget >= 500000 ? 'enterprise'
    : budget >= 150000 ? 'mid-market'
    : budget >= 50000  ? 'smb'
    : 'startup'

  return ctx
}

// ─── Step 2: prepareVendorPrompt ─────────────────────────────────────────────

function prepareVendorPrompt(ctx) {
  const costStr = ctx.estimatedCost > 0 ? `$${ctx.estimatedCost.toLocaleString()}` : 'Not specified'
  const sizeStr = ctx.companySize || 'SME'
  const headStr = ctx.headcount > 0 ? `${ctx.headcount} employees` : 'Not specified'
  const revenueStr = ctx.annualRevenue > 0 ? `$${ctx.annualRevenue.toLocaleString()}` : 'Not specified'
  const budgetStr = ctx.budget > 0 ? `$${ctx.budget.toLocaleString()} (${ctx.budgetTier})` : 'Not specified'
  const techStr = ctx.technicalStack.length > 0 ? ctx.technicalStack.join(', ') : 'Not specified'
  const intStr = ctx.systemIntegrations.length > 0 ? ctx.systemIntegrations.join(', ') : 'Not specified'
  const compStr = ctx.complianceRequirements.length > 0 ? ctx.complianceRequirements.join(', ') : 'None specified'
  const painStr = ctx.currentPainPoints.length > 0
    ? ctx.currentPainPoints.map(p => `- ${p}`).join('\n') : 'Not specified'
  const goalStr = ctx.businessGoals.length > 0
    ? ctx.businessGoals.map(g => `- ${g}`).join('\n') : 'Not specified'

  return `SOLUTION TO EVALUATE
====================
Solution: ${ctx.solutionName}
Category: ${ctx.solutionCategory}
Description: ${ctx.solutionDescription}
Estimated Total Cost: ${costStr}
Implementation Period: ${ctx.implementationMonths ? ctx.implementationMonths + ' months' : 'Not specified'}
Risk Level: ${ctx.solutionRiskLevel}

COMPANY CONTEXT
===============
Industry: ${ctx.industry}
Company Size: ${sizeStr}
Headcount: ${headStr}
Annual Revenue: ${revenueStr}
Total Project Budget: ${budgetStr}
Time Horizon: ${ctx.timeHorizonYears} years

Technology Stack: ${techStr}
System Integrations Required: ${intStr}
Compliance Requirements: ${compStr}

Current Pain Points:
${painStr}

Business Goals:
${goalStr}

REQUIRED OUTPUT FORMAT
======================
{
  "vendors": [
    {
      "rank": 1,
      "name": "Vendor Name",
      "vendorCompany": "Parent Company Name",
      "category": "${ctx.solutionCategory}",
      "fitScore": 92,
      "typicalCostRange": {
        "low": 25000,
        "high": 55000,
        "model": "annual_subscription | project_based | revenue_share | perpetual_license"
      },
      "implementationMonths": 4,
      "complianceCoverage": [${compStr !== 'None specified' ? compStr.split(', ').map(c => `"${c}"`).join(', ') : ''}],
      "integrationCompatibility": [${techStr !== 'Not specified' ? techStr.split(', ').map(t => `"${t}"`).join(', ') : ''}],
      "whyRecommended": "2-3 sentences on why this fits THIS company specifically",
      "idealFor": "1 sentence on the ideal use case",
      "cons": "1-2 honest limitations for this company context",
      "learnMoreUrl": "https://vendor-website.com"
    }
  ],
  "marketContext": "2-3 sentences on the current vendor market for this solution category",
  "budgetNote": "1 sentence on budget fit across the recommended vendors",
  "implementationNote": "1 sentence on typical implementation complexity"
}`
}

// ─── Step 3: callClaude ──────────────────────────────────────────────────────

async function callClaude(anthropicClient, prompt) {
  const response = await anthropicClient.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  })
  return response.content?.[0]?.text || ''
}

// ─── Step 4: parseVendorResponse ─────────────────────────────────────────────

function parseVendorResponse(text, ctx) {
  let parsed
  try {
    const clean = text.replace(/^```[\w]*\s*/i, '').replace(/\s*```$/i, '').trim()
    parsed = JSON.parse(clean)
  } catch {
    console.error('Phase 1.6 JSON parse failed for', ctx.solutionId)
    return { vendors: [], narratives: {}, parseError: true }
  }

  const rawVendors = Array.isArray(parsed.vendors) ? parsed.vendors : []

  let vendors = rawVendors.map((v, i) => {
    const score = v.fitScore || 70
    return {
      rank:                      v.rank || i + 1,
      name:                      v.name || `Vendor ${i + 1}`,
      vendorCompany:             v.vendorCompany || '',
      category:                  v.category || ctx.solutionCategory,
      fitScore:                  score,
      fitLabel:                  fitLabel(score),
      typicalCostRange: {
        low:   v.typicalCostRange?.low  || 0,
        high:  v.typicalCostRange?.high || 0,
        model: v.typicalCostRange?.model || 'project_based'
      },
      implementationMonths:      v.implementationMonths || null,
      complianceCoverage:        v.complianceCoverage || [],
      integrationCompatibility:  v.integrationCompatibility || [],
      whyRecommended:            v.whyRecommended || '',
      idealFor:                  v.idealFor || '',
      cons:                      v.cons || '',
      learnMoreUrl:              v.learnMoreUrl || '',
      deliveryTimeline:          buildDeliveryTimeline(v.implementationMonths, ctx.solutionCategory)
    }
  })

  // Sort by fitScore descending, re-assign rank
  vendors = vendors
    .sort((a, b) => b.fitScore - a.fitScore)
    .map((v, i) => ({ ...v, rank: i + 1 }))

  // Exclude vendors with fitScore < 60
  vendors = vendors.filter(v => v.fitScore >= 60)

  const narratives = {
    marketContext:      parsed.marketContext || '',
    budgetNote:         parsed.budgetNote || '',
    implementationNote: parsed.implementationNote || ''
  }

  return { vendors, narratives, parseError: false }
}

// ─── Step 5: checkKnownAcquisitions ──────────────────────────────────────────

function checkKnownAcquisitions(vendors) {
  const warnings = []

  for (const vendor of vendors) {
    const nameLower = vendor.name.toLowerCase()
    for (const [knownName, knownParent] of Object.entries(KNOWN_ACQUISITIONS)) {
      if (nameLower.includes(knownName)) {
        const reportedParent = vendor.vendorCompany || ''
        if (reportedParent && !reportedParent.toLowerCase().includes(knownParent.toLowerCase())) {
          warnings.push(
            `ACQUISITION CHECK: ${vendor.name} — AI reported parent "${reportedParent}" ` +
            `but known parent is "${knownParent}". Verify before presenting to client.`
          )
        }
      }
    }
  }

  return warnings
}

// ─── Step 6: selectTopVendor ─────────────────────────────────────────────────

function selectTopVendor(vendors, selectedVendorName) {
  if (vendors.length === 0) return null

  let selected

  if (selectedVendorName) {
    const match = vendors.find(v =>
      v.name.toLowerCase().trim() === selectedVendorName.toLowerCase().trim()
    )
    selected = match || vendors[0]
  } else {
    selected = vendors[0]
  }

  return {
    name:                     selected.name,
    rank:                     selected.rank,
    fitScore:                 selected.fitScore,
    vendorCostLow:            selected.typicalCostRange?.low  || null,
    vendorCostHigh:           selected.typicalCostRange?.high || null,
    costModel:                selected.typicalCostRange?.model || null,
    implementationMonths:     selected.implementationMonths || null,
    deliveryTimeline:         selected.deliveryTimeline || null,
    complianceCoverage:       selected.complianceCoverage || [],
    integrationCompatibility: selected.integrationCompatibility || [],
    whyRecommended:           selected.whyRecommended || '',
    learnMoreUrl:             selected.learnMoreUrl || '',
    selectionMethod:          selectedVendorName ? 'user_override' : 'auto_rank1'
  }
}

// ─── Step 7: harmonizeResponse ───────────────────────────────────────────────

function harmonizeResponse(vendors, selectedVendor, ctx, narratives, acquisitionWarnings, parseError) {
  const timestamp = new Date().toISOString()

  // Compliance gap analysis
  const notApplicable = new Set(
    (COMPLIANCE_EXCLUSIONS[ctx.solutionCategory] || []).map(s => s.toUpperCase())
  )
  const requiredStandards = ctx.complianceRequirements
    .filter(c => !notApplicable.has(c.toUpperCase()))

  const allCovered = new Set(
    vendors.flatMap(v => v.complianceCoverage).map(s => s.toUpperCase())
  )
  const complianceGaps = requiredStandards.filter(c => !allCovered.has(c.toUpperCase()))

  // Integration gap analysis
  const integrationGaps = ctx.systemIntegrations.filter(
    i => !vendors.some(v =>
      v.integrationCompatibility.some(ic => ic.toLowerCase().includes(i.toLowerCase()))
    )
  )

  // Budget check
  const anyVendorWithinBudget = vendors.some(v => {
    const high = v.typicalCostRange?.high || 0
    return high > 0 && high <= ctx.estimatedCost
  })

  // Vendor summaries
  const vendorSummaries = vendors.map(v => ({
    rank:             v.rank,
    name:             v.name,
    fitScore:         v.fitScore,
    fitLabel:         v.fitLabel,
    costLow:          v.typicalCostRange?.low  || 0,
    costHigh:         v.typicalCostRange?.high || 0,
    costModel:        v.typicalCostRange?.model || '',
    months:           v.implementationMonths || null,
    deliveryTimeline: v.deliveryTimeline || null,
    learnMoreUrl:     v.learnMoreUrl || '',
    isSelected:       selectedVendor ? v.name === selectedVendor.name : false
  }))

  return {
    status:              vendors.length > 0 ? 'success' : 'error',
    phase:               '1.6',
    trackingId:          ctx.trackingId,
    timestamp,
    source:              'web_app',

    solutionId:          ctx.solutionId,
    solutionName:        ctx.solutionName,

    vendors,
    vendorCount:         vendors.length,
    selectedVendor,

    vendorSummaries,

    marketContext:       narratives.marketContext || '',
    budgetNote:          narratives.budgetNote || '',
    implementationNote:  narratives.implementationNote || '',

    anyVendorWithinBudget,
    complianceGaps,
    integrationGaps,

    validationWarnings:  acquisitionWarnings,
    validationIssues:    [],

    parseError,
    errorMessage:        vendors.length === 0 ? 'No vendors returned from AI after 2 attempts' : null,

    generatedAt:         timestamp,
    discoveryMethod:     ctx.discoveryMethod
  }
}

// ─── Route Handler ───────────────────────────────────────────────────────────

router.post('/phase1-6-vendors', async (req, res) => {
  try {
    const raw = req.body
    const solution = raw.solution || {}

    // Hard error if solution.id or solution.name missing
    if (!solution.id || !solution.name) {
      return res.status(400).json([{
        status:        'error',
        phase:         '1.6',
        errorCode:     'MISSING_SOLUTION_CONTEXT',
        errorMessage:  'Webhook payload missing required fields: solution.id and/or solution.name.',
        vendors:       [],
        vendorCount:   0,
        selectedVendor: null
      }])
    }

    const ctx = normalizeInputs(raw)
    const prompt = prepareVendorPrompt(ctx)

    let vendors = []
    let narratives = {}
    let parseError = false

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const text = await callClaude(client, prompt)
        console.log(`Phase 1.6 [${ctx.solutionId}] attempt ${attempt + 1} raw (first 300):`, text.substring(0, 300))
        const result = parseVendorResponse(text, ctx)
        vendors = result.vendors
        narratives = result.narratives
        parseError = result.parseError
        if (vendors.length > 0) break
        console.log(`Phase 1.6 [${ctx.solutionId}] attempt ${attempt + 1}: 0 vendors returned`)
      } catch (err) {
        console.error(`Phase 1.6 [${ctx.solutionId}] attempt ${attempt + 1} error:`, err.message)
        // Rate limit: wait 1s before retry
        if (err.status === 429 && attempt === 0) {
          await new Promise(r => setTimeout(r, 1000))
        }
      }
      // Wait 1s before retry
      if (attempt === 0 && vendors.length === 0) {
        await new Promise(r => setTimeout(r, 1000))
      }
    }

    const acquisitionWarnings = checkKnownAcquisitions(vendors)
    if (acquisitionWarnings.length > 0) {
      console.log(`Phase 1.6 [${ctx.solutionId}] acquisition warnings:`, acquisitionWarnings)
    }

    const selectedVendor = selectTopVendor(vendors, ctx.selectedVendorName)
    const response = harmonizeResponse(vendors, selectedVendor, ctx, narratives, acquisitionWarnings, parseError)

    return res.json([response])

  } catch (err) {
    console.error('Phase 1.6 error:', err)
    return res.status(500).json([{
      status:         'error',
      phase:          '1.6',
      errorMessage:   err.message,
      vendors:        [],
      vendorCount:    0,
      selectedVendor: null
    }])
  }
})

export default router
