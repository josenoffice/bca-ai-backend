import express from 'express'
import Anthropic from '@anthropic-ai/sdk'
import crypto from 'crypto'

const router = express.Router()
const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_HORIZON = 3
const DEFAULT_DISCOUNT = 12
const CEILING_PCT = 0.85

const COST_SPLITS = {
  security_compliance:    { labour: 0.45, licensing: 0.20, infrastructure: 0.10, testing: 0.12, training: 0.08, contingency: 0.05 },
  frontend_modernization: { labour: 0.55, licensing: 0.10, infrastructure: 0.12, testing: 0.12, training: 0.07, contingency: 0.04 },
  backend_infrastructure: { labour: 0.50, licensing: 0.15, infrastructure: 0.18, testing: 0.10, training: 0.04, contingency: 0.03 },
  ecommerce_optimization: { labour: 0.52, licensing: 0.12, infrastructure: 0.14, testing: 0.12, training: 0.06, contingency: 0.04 },
  cloud_modernization:    { labour: 0.40, licensing: 0.08, infrastructure: 0.30, testing: 0.10, training: 0.07, contingency: 0.05 },
  process_optimization:   { labour: 0.55, licensing: 0.08, infrastructure: 0.10, testing: 0.12, training: 0.10, contingency: 0.05 },
  general_modernization:  { labour: 0.50, licensing: 0.12, infrastructure: 0.15, testing: 0.12, training: 0.07, contingency: 0.04 }
}

const SYSTEM_PROMPT = `You are an expert business case analyst and technology strategist.
Your job is to analyse a project brief and generate a structured,
realistic, and commercially credible set of solutions, benefits,
and requirements for a technology investment business case.

You must respond with valid JSON only — no markdown, no explanation,
no preamble. Your entire response must be a single parseable JSON object.`

// ─── Helpers ─────────────────────────────────────────────────────────────────

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function toArr(v) {
  if (Array.isArray(v)) return v
  if (typeof v === 'string' && v.trim()) return v.split(',').map(s => s.trim()).filter(Boolean)
  return []
}

function generateTrackingId() {
  return `req_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`
}

// ─── Step 1: normalizeAndValidate ────────────────────────────────────────────

function normalizeAndValidate(raw) {
  const errors = []
  const warnings = []
  const isDraft = (raw.mode || 'draft') === 'draft'

  const requiredFields = ['projectTitle', 'businessUnit', 'currentState', 'businessImpact']
  for (const field of requiredFields) {
    if (!raw[field] || !(raw[field] + '').trim()) {
      if (isDraft) {
        warnings.push(`Missing recommended field: ${field}`)
      } else {
        errors.push(`Missing required field: ${field}`)
      }
    }
  }

  const validated = {
    projectTitle:           (raw.projectTitle || '').trim(),
    businessUnit:           (raw.businessUnit || '').trim(),
    industry:               (raw.industry || 'technology').toLowerCase(),
    currentState:           (raw.currentState || '').trim(),
    businessImpact:         (raw.businessImpact || '').trim(),
    budget:                 num(raw.budget),
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
    annualRevenue:          (raw.annualRevenue != null && raw.annualRevenue !== '')
                              ? num(raw.annualRevenue) : null,
    annualOperatingCost:    num(raw.annualOperatingCost) || 0,
    headcount:              num(raw.headcount) || 0,
    companySize:            (raw.companySize || '').trim(),
    onlineRevenuePct:       Math.min(100, Math.max(0, num(raw.onlineRevenuePct) || 0)),
    budgetStatus:           num(raw.budget) > 0 ? 'user_provided' : 'ai_suggestion_needed',
    discoverWithAI:         raw.discoverWithAI !== false
  }

  // Benefit anchors
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

  return { validated, benefitAnchors, errors, warnings }
}

// ─── Step 2: templateDiscovery (fallback) ────────────────────────────────────

function runTemplateDiscovery(validated, benefitAnchors) {
  const budget = validated.budget || 200000
  const ceiling = Math.round(budget * CEILING_PCT)
  const needsSecurity = validated.complianceRequirements.length > 0 ||
    ['healthcare', 'finance'].includes(validated.industry)

  // Generate 5 solutions based on industry + context
  const solutionTemplates = buildSolutionTemplates(validated, ceiling, needsSecurity)

  // Generate 5 benefits anchored to financials
  const benefits = buildTemplateBenefits(validated, benefitAnchors, budget)

  // Generate 5 requirements
  const requirements = buildTemplateRequirements(validated)

  // Wire cross-references
  for (const sol of solutionTemplates) {
    sol.linkedBenefits = benefits.filter((_, i) => {
      const idx = solutionTemplates.indexOf(sol)
      return i === idx || i === (idx + 1) % 5 || i === (idx + 2) % 5
    }).map(b => b.id)
    sol.linkedRequirements = requirements.filter((_, i) => {
      const idx = solutionTemplates.indexOf(sol)
      return i === idx || i === (idx + 1) % 5 || i === (idx + 2) % 5
    }).map(r => r.id)
    sol.delivers_benefits = [...sol.linkedBenefits]
    sol.depends_on_requirements = [...sol.linkedRequirements]
    sol.supported_by_requirements = [...sol.linkedRequirements]
  }

  for (const ben of benefits) {
    ben.linkedSolutions = solutionTemplates
      .filter(s => s.linkedBenefits.includes(ben.id))
      .map(s => s.id)
    ben.delivered_by_solutions = [...ben.linkedSolutions]
  }

  for (const req of requirements) {
    req.linkedSolutions = solutionTemplates
      .filter(s => s.linkedRequirements.includes(req.id))
      .map(s => s.id)
    req.supports_solutions = [...req.linkedSolutions]
  }

  return { solutions: solutionTemplates, benefits, requirements }
}

function buildSolutionTemplates(validated, ceiling, needsSecurity) {
  const industry = validated.industry
  const perSolution = Math.round(ceiling / 5)

  const categories = needsSecurity
    ? ['security_compliance', 'frontend_modernization', 'backend_infrastructure', 'ecommerce_optimization', 'process_optimization']
    : ['frontend_modernization', 'backend_infrastructure', 'ecommerce_optimization', 'cloud_modernization', 'process_optimization']

  if (industry === 'healthcare' && !categories.includes('security_compliance')) {
    categories[0] = 'security_compliance'
  }

  const solutions = categories.map((category, i) => {
    const id = `SOL-${String(i + 1).padStart(3, '0')}`
    const phase = category === 'security_compliance' ? 1 : (i < 3 ? Math.min(i + 1, 2) : 3)
    const splits = COST_SPLITS[category] || COST_SPLITS.general_modernization
    const cost = Math.round(perSolution * (0.8 + Math.random() * 0.4))
    const breakdown = {}
    for (const [key, pct] of Object.entries(splits)) {
      breakdown[key] = Math.round(cost * pct)
    }

    return {
      id,
      name: formatCategoryName(category),
      description: generateSolutionDescription(category, validated),
      totalCost: cost,
      implementationTime: phase === 1 ? 8 : phase === 2 ? 12 : 16,
      riskLevel: category === 'security_compliance' ? 'High' : (phase === 1 ? 'Medium' : 'Low'),
      category,
      deliveryPhase: phase,
      linkedBenefits: [],
      linkedRequirements: [],
      delivers_benefits: [],
      depends_on_requirements: [],
      supported_by_requirements: [],
      costEstimate: {
        low: Math.round(cost * 0.8),
        mid: cost,
        high: Math.round(cost * 1.3),
        recommended: cost,
        breakdown,
        implementationMonths: phase === 1 ? 2 : phase === 2 ? 3 : 4,
        source: 'template'
      }
    }
  })

  return solutions
}

function formatCategoryName(category) {
  return category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function generateSolutionDescription(category, validated) {
  const descriptions = {
    security_compliance: `Implement comprehensive security and compliance framework addressing ${validated.complianceRequirements.join(', ') || 'industry standards'}. Establish data protection protocols and audit-ready documentation. Foundation for all subsequent platform changes.`,
    frontend_modernization: `Modernize the user-facing application with improved performance, responsive design, and accessibility standards. Address current page load issues and improve conversion funnels. Deliver measurable UX improvements.`,
    backend_infrastructure: `Upgrade backend systems for scalability, reliability, and maintainability. Implement modern API architecture and improve data processing pipelines. Enable automated workflows and reduce manual processing.`,
    ecommerce_optimization: `Optimize the ecommerce platform to reduce cart abandonment and improve checkout conversion. Implement real-time inventory management and streamlined order processing. Drive measurable revenue improvement.`,
    cloud_modernization: `Migrate and modernize cloud infrastructure for improved performance, cost efficiency, and scalability. Implement containerization and infrastructure-as-code practices. Enable rapid deployment and auto-scaling.`,
    process_optimization: `Streamline and automate core business processes to reduce manual effort and error rates. Implement workflow automation and real-time monitoring. Deliver operational efficiency gains across the organization.`
  }
  return descriptions[category] || descriptions.process_optimization
}

function buildTemplateBenefits(validated, anchors, budget) {
  const categories = ['Revenue Impact', 'Operational Efficiency', 'Risk Mitigation', 'Performance Improvement', 'Customer Experience']

  return categories.map((category, i) => {
    const id = `BEN-${String(i + 1).padStart(3, '0')}`
    let riskAdjustedValue, confidence, valueBasis

    if (anchors.hasRevenue || anchors.hasOpCost) {
      // Tier 1: company financials
      switch (category) {
        case 'Revenue Impact':
          riskAdjustedValue = anchors.revenueUplift2pct
          confidence = 0.7
          valueBasis = `2% online revenue uplift = $${anchors.revenueUplift2pct.toLocaleString()}/yr [source: company financials]`
          break
        case 'Operational Efficiency':
          riskAdjustedValue = anchors.opCostSaving5pct
          confidence = 0.8
          valueBasis = `5% operating cost saving = $${anchors.opCostSaving5pct.toLocaleString()}/yr [source: company financials]`
          break
        case 'Risk Mitigation':
          riskAdjustedValue = Math.round(budget * 0.15)
          confidence = 0.85
          valueBasis = `Avoided compliance penalties and breach costs estimated at $${Math.round(budget * 0.15).toLocaleString()}/yr [source: company financials]`
          break
        case 'Performance Improvement':
          riskAdjustedValue = anchors.opCostSaving3pct
          confidence = 0.75
          valueBasis = `3% operating cost saving from performance gains = $${anchors.opCostSaving3pct.toLocaleString()}/yr [source: company financials]`
          break
        default:
          riskAdjustedValue = anchors.revenueUplift1pct
          confidence = 0.65
          valueBasis = `1% online revenue uplift from improved CX = $${anchors.revenueUplift1pct.toLocaleString()}/yr [source: company financials]`
      }
    } else if (budget > 0) {
      // Tier 2: budget-scaled
      const pcts = { 'Revenue Impact': 0.40, 'Operational Efficiency': 0.30, 'Risk Mitigation': 0.25, 'Performance Improvement': 0.25, 'Customer Experience': 0.30 }
      const pct = pcts[category] || 0.25
      riskAdjustedValue = Math.round(budget * pct)
      confidence = 0.6
      valueBasis = `${Math.round(pct * 100)}% of $${budget.toLocaleString()} budget [source: budget-scaled estimate (${Math.round(pct * 100)}% of $${budget.toLocaleString()} budget)]`
    } else {
      // Tier 3: industry benchmark
      const benchmarks = { 'Revenue Impact': 50000, 'Operational Efficiency': 40000, 'Risk Mitigation': 35000, 'Performance Improvement': 30000, 'Customer Experience': 45000 }
      riskAdjustedValue = benchmarks[category] || 35000
      confidence = 0.5
      valueBasis = `Estimated at $${riskAdjustedValue.toLocaleString()}/yr [source: industry benchmark estimate]`
    }

    return {
      id,
      category,
      description: generateBenefitDescription(category, validated),
      riskAdjustedValue,
      confidence,
      valueBasis,
      linkedSolutions: [],
      delivered_by_solutions: []
    }
  })
}

function generateBenefitDescription(category, validated) {
  const descriptions = {
    'Revenue Impact': 'Increased online revenue through reduced cart abandonment, improved conversion rates, and optimized checkout experience.',
    'Operational Efficiency': 'Reduced manual processing time and operational costs through automation of order processing and inventory management.',
    'Risk Mitigation': `Reduced compliance and security risk through ${validated.complianceRequirements.join(', ') || 'industry standard'} compliance and improved data protection.`,
    'Performance Improvement': 'Improved platform speed and uptime leading to better user experience and reduced infrastructure costs.',
    'Customer Experience': 'Enhanced customer satisfaction and retention through faster page loads, streamlined checkout, and personalized experiences.'
  }
  return descriptions[category] || 'Measurable business improvement from technology investment.'
}

function buildTemplateRequirements(validated) {
  const reqs = [
    { description: `${validated.complianceRequirements.length > 0 ? validated.complianceRequirements.join(', ') + ' compliance' : 'Security compliance'} certification and audit readiness`, priority: 'must_have' },
    { description: 'Platform performance targets: sub-1s page load, 99.9% uptime SLA', priority: 'must_have' },
    { description: 'Data migration strategy with zero-downtime cutover plan', priority: 'must_have' },
    { description: 'Integration with existing systems: ' + (validated.systemIntegrations.join(', ') || 'current ecosystem'), priority: 'should_have' },
    { description: 'Staff training program and change management support', priority: 'should_have' }
  ]

  return reqs.map((r, i) => ({
    id: `REQ-${String(i + 1).padStart(3, '0')}`,
    description: r.description,
    priority: r.priority,
    linkedSolutions: [],
    supports_solutions: []
  }))
}

// ─── Step 3: validateTemplateQuality ─────────────────────────────────────────

function validateTemplateQuality(discovery) {
  const issues = []
  const warnings = []

  if (discovery.solutions.length < 5) issues.push(`Only ${discovery.solutions.length}/5 solutions`)
  if (discovery.benefits.length < 5) issues.push(`Only ${discovery.benefits.length}/5 benefits`)
  if (discovery.requirements.length < 5) issues.push(`Only ${discovery.requirements.length}/5 requirements`)

  const solIds = new Set(discovery.solutions.map(s => s.id))
  const benIds = new Set(discovery.benefits.map(b => b.id))
  const reqIds = new Set(discovery.requirements.map(r => r.id))

  for (const s of discovery.solutions) {
    if ((s.linkedBenefits || []).length < 3) issues.push(`${s.id} has fewer than 3 linked benefits`)
    if ((s.linkedRequirements || []).length < 3) issues.push(`${s.id} has fewer than 3 linked requirements`)
    for (const ref of (s.linkedBenefits || [])) {
      if (!benIds.has(ref)) issues.push(`${s.id} references unknown benefit ${ref}`)
    }
    for (const ref of (s.linkedRequirements || [])) {
      if (!reqIds.has(ref)) issues.push(`${s.id} references unknown requirement ${ref}`)
    }
  }

  for (const b of discovery.benefits) {
    if (!(b.linkedSolutions || []).some(id => solIds.has(id))) {
      issues.push(`Orphaned benefit: ${b.id}`)
    }
  }

  for (const r of discovery.requirements) {
    if (!(r.linkedSolutions || []).some(id => solIds.has(id))) {
      issues.push(`Orphaned requirement: ${r.id}`)
    }
  }

  // Fragility warnings
  const totalBenefitValue = discovery.benefits.reduce((s, b) => s + (b.riskAdjustedValue || 0), 0)
  for (const b of discovery.benefits) {
    const pct = totalBenefitValue > 0 ? (b.riskAdjustedValue / totalBenefitValue) * 100 : 0
    const linkedCount = (b.linkedSolutions || []).length
    if (pct > 20 && linkedCount <= 1) {
      warnings.push(`Rule A: ${b.id} is ${Math.round(pct)}% of portfolio value but linked to only ${linkedCount} solution(s)`)
    }
    if (pct > 25 && linkedCount <= 2) {
      warnings.push(`Rule B: ${b.id} is ${Math.round(pct)}% of portfolio value but linked to only ${linkedCount} solution(s)`)
    }
  }

  return {
    discovery,
    quality: {
      passed: issues.length === 0,
      issues,
      warnings
    }
  }
}

// ─── Step 4: prepareAIPrompt ─────────────────────────────────────────────────

function prepareAIPrompt(validated, benefitAnchors) {
  const painPoints = validated.currentPainPoints.length > 0
    ? validated.currentPainPoints.map(p => `- ${p}`).join('\n')
    : 'Not specified'

  const goals = validated.businessGoals.length > 0
    ? validated.businessGoals.map(g => `- ${g}`).join('\n')
    : 'Not specified'

  const techStack = validated.technicalStack.length > 0
    ? validated.technicalStack.join(', ') : 'Not specified'

  const integrations = validated.systemIntegrations.length > 0
    ? validated.systemIntegrations.join(', ') : 'Not specified'

  const compliance = validated.complianceRequirements.length > 0
    ? validated.complianceRequirements.join(', ') : 'None specified'

  const budgetStr = validated.budget > 0
    ? `$${validated.budget.toLocaleString()}`
    : 'Not specified (suggest a budget)'

  // Financial context
  let financialContext
  if (benefitAnchors.hasRevenue || benefitAnchors.hasOpCost) {
    const parts = []
    if (benefitAnchors.hasRevenue) {
      const horizon = validated.timeHorizonYears
      parts.push(`Annual Revenue: $${validated.annualRevenue.toLocaleString()}`)
      parts.push(`  - 1% uplift = $${benefitAnchors.revenueUplift1pct.toLocaleString()}/yr = $${(benefitAnchors.revenueUplift1pct * horizon).toLocaleString()} over ${horizon} years`)
      parts.push(`  - 2% uplift = $${benefitAnchors.revenueUplift2pct.toLocaleString()}/yr`)
    }
    if (benefitAnchors.hasOpCost) {
      parts.push(`Annual Operating Cost: $${validated.annualOperatingCost.toLocaleString()}`)
      parts.push(`  - 3% saving = $${benefitAnchors.opCostSaving3pct.toLocaleString()}/yr`)
      parts.push(`  - 5% saving = $${benefitAnchors.opCostSaving5pct.toLocaleString()}/yr`)
    }
    financialContext = parts.join('\n')
  } else {
    const budget = validated.budget || 200000
    financialContext = `No company financials provided.
BENEFIT CAPS (must not exceed):
  - Revenue/Customer: max $${Math.round(budget * 0.40).toLocaleString()}/yr (40% of budget)
  - Efficiency/Operational: max $${Math.round(budget * 0.30).toLocaleString()}/yr (30% of budget)
  - Risk/Compliance: max $${Math.round(budget * 0.25).toLocaleString()}/yr (25% of budget)
  - Strategic/Other: max $${Math.round(budget * 0.30).toLocaleString()}/yr (30% of budget)
Do NOT invent company revenue, headcount, or customer figures.`
  }

  // Mandatory prompt insertions
  let complianceMandate = ''
  if (validated.complianceRequirements.length > 0) {
    complianceMandate = `SECURITY & COMPLIANCE SOLUTION MANDATE (non-negotiable — do not omit):
You MUST include exactly one solution with category "security_compliance"
as a dedicated Security & Compliance workstream. Requirements:
  - deliveryPhase MUST be 1 (foundation — before any payment/data solutions)
  - It must specifically address: ${compliance}
  - Compliance work must NOT be distributed across other solutions only
  - This solution MUST appear in the linkedBenefits of any Risk Mitigation benefit
  - Every solution that handles payment data or personal customer data
    MUST link back to this solution in its depends_on_requirements`
  }

  let budgetCeilingInstruction = ''
  if (validated.budget > 0) {
    budgetCeilingInstruction = `BUDGET CEILING RULE (mandatory):
Total solution costs must NOT exceed 85% of stated budget = $${Math.round(validated.budget * 0.85).toLocaleString()}.
The remaining 15% ($${Math.round(validated.budget * 0.15).toLocaleString()}) is a protected
contingency reserve — do not allocate to solutions.
Note the ceiling in budgetRationale.`
  }

  const deliveryPhaseInstruction = `DELIVERY PHASE RULE (mandatory):
Add "deliveryPhase" to each solution:
  - Phase 1: Foundation (security, compliance, data infrastructure)
  - Phase 2: Core capability build
  - Phase 3: Optimisation and enhancement
Phase 1 must be completed before Phase 2 can begin.
Phase 2 must be completed before Phase 3 can begin.`

  let suggestedBudgetRule = ''
  if (validated.budget <= 0) {
    suggestedBudgetRule = `SUGGESTED BUDGET RULE (mandatory — no user budget provided):
suggestedBudget MUST be >= sum of ALL solution costs across ALL phases.
Do NOT set it to cover only Phase 1 or a subset.
If total solution costs = $X, then suggestedBudget >= $X.`
  }

  const userPrompt = `PROJECT BRIEF
=============
Project: ${validated.projectTitle}
Business Unit: ${validated.businessUnit}
Industry: ${validated.industry}
Company Size: ${validated.companySize || 'Not specified'}

Current State:
${validated.currentState}

Business Impact (if unresolved):
${validated.businessImpact}

Current Pain Points:
${painPoints}

Business Goals:
${goals}

Technical Stack: ${techStack}
System Integrations: ${integrations}
Compliance Requirements: ${compliance}
Expected Timeframe: ${validated.expectedTimeframe}
Urgency: ${validated.urgency}
Budget: ${budgetStr}
Time Horizon: ${validated.timeHorizonYears} years
Discount Rate: ${validated.discountRatePct}%

FINANCIAL CONTEXT
=================
${financialContext}

MANDATORY RULES
===============
${complianceMandate}
${budgetCeilingInstruction}
${deliveryPhaseInstruction}
${suggestedBudgetRule}

BENEFIT CATEGORY RULES (mandatory)
====================================
1. RISK MITIGATION benefit is required. It must be linked to every solution
   that handles payment data, personal data, or regulated content.
2. PERFORMANCE IMPROVEMENT category is restricted to speed, uptime, and
   reliability improvements only. Never use it for revenue-generating benefits.
3. STRATEGIC VALUE benefits are Phase 3 exclusive — only assign to solutions
   with deliveryPhase: 3.
4. Each benefit riskAdjustedValue must include valueBasis explaining the source:
   [source: company financials] or [source: budget-scaled estimate] or
   [source: industry benchmark estimate]

REQUIRED OUTPUT FORMAT
======================
{
  "solutions": [
    {
      "id": "SOL-001",
      "name": "string",
      "description": "string (2-3 sentences)",
      "totalCost": number,
      "implementationTime": number (weeks),
      "riskLevel": "Low|Medium|High",
      "category": "security_compliance|frontend_modernization|backend_infrastructure|ecommerce_optimization|cloud_modernization|process_optimization|general_modernization",
      "deliveryPhase": 1|2|3,
      "linkedBenefits": ["BEN-001", ...],
      "linkedRequirements": ["REQ-001", ...],
      "delivers_benefits": ["BEN-001", ...],
      "depends_on_requirements": ["REQ-001", ...],
      "costEstimate": {
        "low": number,
        "mid": number,
        "high": number,
        "recommended": number,
        "breakdown": {
          "labour": number,
          "licensing": number,
          "infrastructure": number,
          "testing": number,
          "training": number,
          "contingency": number
        },
        "implementationMonths": number,
        "source": "ai_generated"
      }
    }
  ],
  "benefits": [
    {
      "id": "BEN-001",
      "category": "Operational Efficiency|Revenue Impact|Risk Mitigation|Performance Improvement|Customer Experience|Strategic Value",
      "description": "string",
      "riskAdjustedValue": number (annual $),
      "confidence": number (0.0-1.0),
      "valueBasis": "string explaining calculation [source: ...]",
      "linkedSolutions": ["SOL-001", ...],
      "delivered_by_solutions": ["SOL-001", ...]
    }
  ],
  "requirements": [
    {
      "id": "REQ-001",
      "description": "string",
      "priority": "must_have|should_have",
      "linkedSolutions": ["SOL-001", ...],
      "supports_solutions": ["SOL-001", ...]
    }
  ],
  "suggestedBudget": number|null,
  "budgetRationale": "string|null",
  "deliverySequence": ["Phase 1: SOL-001, SOL-002", "Phase 2: SOL-003"],
  "phaseSummary": [
    { "phase": 1, "solutions": ["SOL-001"], "theme": "string" }
  ],
  "revenueGoalAssessment": []
}

QUANTITY RULES (non-negotiable):
- Exactly 5 solutions
- Exactly 5 benefits
- Exactly 5 requirements (3 must_have, 2 should_have)
- Each solution must link to at least 3 benefits and 3 requirements
- Each benefit must link to at least 1 solution
- Each requirement must link to at least 1 solution
- All cross-references must use valid IDs from this response only`

  return userPrompt
}

// ─── Step 5: callClaude ──────────────────────────────────────────────────────

async function callClaude(anthropicClient, userPrompt) {
  const response = await anthropicClient.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }]
  })
  return response.content?.[0]?.text || ''
}

// ─── Step 5.5: autoRepairCrossRefs ───────────────────────────────────────────
// Patches under-linked solutions, orphaned benefits/requirements so the AI
// path isn't rejected for minor cross-reference gaps (common LLM tail-drop).

function autoRepairCrossRefs(parsed) {
  if (!parsed.solutions || !parsed.benefits || !parsed.requirements) return parsed
  const repairs = []

  const solIds = parsed.solutions.map(s => s.id)
  const benIds = parsed.benefits.map(b => b.id)
  const reqIds = parsed.requirements.map(r => r.id)

  // Helper: add unique items to an array field
  const addUnique = (arr, items) => {
    for (const item of items) {
      if (!arr.includes(item)) arr.push(item)
    }
  }

  // 1. Ensure every solution has ≥3 linkedBenefits and ≥3 linkedRequirements
  for (const sol of parsed.solutions) {
    sol.linkedBenefits = sol.linkedBenefits || sol.delivers_benefits || []
    sol.linkedRequirements = sol.linkedRequirements || sol.depends_on_requirements || []

    // Filter out invalid refs
    sol.linkedBenefits = sol.linkedBenefits.filter(id => benIds.includes(id))
    sol.linkedRequirements = sol.linkedRequirements.filter(id => reqIds.includes(id))

    // Pad benefits to 3 by round-robin from available benefit IDs
    if (sol.linkedBenefits.length < 3) {
      const missing = 3 - sol.linkedBenefits.length
      const candidates = benIds.filter(id => !sol.linkedBenefits.includes(id))
      const toAdd = candidates.slice(0, missing)
      addUnique(sol.linkedBenefits, toAdd)
      if (toAdd.length > 0) repairs.push(`${sol.id}: added ${toAdd.join(',')} to linkedBenefits`)
    }

    // Pad requirements to 3
    if (sol.linkedRequirements.length < 3) {
      const missing = 3 - sol.linkedRequirements.length
      const candidates = reqIds.filter(id => !sol.linkedRequirements.includes(id))
      const toAdd = candidates.slice(0, missing)
      addUnique(sol.linkedRequirements, toAdd)
      if (toAdd.length > 0) repairs.push(`${sol.id}: added ${toAdd.join(',')} to linkedRequirements`)
    }

    // Sync dual fields
    sol.delivers_benefits = [...sol.linkedBenefits]
    sol.depends_on_requirements = [...sol.linkedRequirements]
    sol.supported_by_requirements = [...sol.linkedRequirements]
  }

  // 2. Rebuild benefit.linkedSolutions from solutions' linkedBenefits
  for (const ben of parsed.benefits) {
    const linkedFrom = parsed.solutions
      .filter(s => s.linkedBenefits.includes(ben.id))
      .map(s => s.id)
    if (linkedFrom.length === 0) {
      // Orphaned — link to least-linked solution
      const leastLinked = parsed.solutions
        .slice()
        .sort((a, b) => a.linkedBenefits.length - b.linkedBenefits.length)[0]
      addUnique(leastLinked.linkedBenefits, [ben.id])
      leastLinked.delivers_benefits = [...leastLinked.linkedBenefits]
      linkedFrom.push(leastLinked.id)
      repairs.push(`${ben.id}: was orphaned, linked to ${leastLinked.id}`)
    }
    ben.linkedSolutions = linkedFrom
    ben.delivered_by_solutions = [...linkedFrom]
  }

  // 3. Rebuild requirement.linkedSolutions from solutions' linkedRequirements
  for (const req of parsed.requirements) {
    const linkedFrom = parsed.solutions
      .filter(s => s.linkedRequirements.includes(req.id))
      .map(s => s.id)
    if (linkedFrom.length === 0) {
      const leastLinked = parsed.solutions
        .slice()
        .sort((a, b) => a.linkedRequirements.length - b.linkedRequirements.length)[0]
      addUnique(leastLinked.linkedRequirements, [req.id])
      leastLinked.depends_on_requirements = [...leastLinked.linkedRequirements]
      leastLinked.supported_by_requirements = [...leastLinked.linkedRequirements]
      linkedFrom.push(leastLinked.id)
      repairs.push(`${req.id}: was orphaned, linked to ${leastLinked.id}`)
    }
    req.linkedSolutions = linkedFrom
    req.supports_solutions = [...linkedFrom]
  }

  if (repairs.length > 0) {
    console.log(`Auto-repair: ${repairs.length} fix(es) applied:`)
    for (const r of repairs) console.log(`  - ${r}`)
  }

  return parsed
}

// ─── Step 6: parseAndValidateAI ──────────────────────────────────────────────

function parseAndValidateAI(text, validated, benefitAnchors) {
  let parsed
  let parseError = false

  try {
    const clean = text.replace(/```json\s*|\s*```/g, '').trim()
    parsed = JSON.parse(clean)
  } catch {
    return { passed: false, parseError: true, discovery: null, quality: { passed: false, issues: ['JSON parse failed'] } }
  }

  const issues = []
  const warnings = []

  if (!parsed.solutions || parsed.solutions.length < 5) issues.push(`Only ${parsed.solutions?.length || 0}/5 solutions`)
  if (!parsed.benefits || parsed.benefits.length < 5) issues.push(`Only ${parsed.benefits?.length || 0}/5 benefits`)
  if (!parsed.requirements || parsed.requirements.length < 5) issues.push(`Only ${parsed.requirements?.length || 0}/5 requirements`)

  if (issues.length > 0) {
    return { passed: false, parseError, discovery: parsed, quality: { passed: false, issues, warnings } }
  }

  // Security compliance check
  const secSols = parsed.solutions.filter(s => s.category === 'security_compliance')
  if (validated.complianceRequirements.length > 0 && secSols.length === 0) {
    issues.push('No security_compliance solution — mandate violated. Reject.')
  }

  // Auto-repair under-linked cross-references before validation
  parsed = autoRepairCrossRefs(parsed)

  // Cross-reference validation (post-repair)
  const solIds = new Set(parsed.solutions.map(s => s.id))
  const benIds = new Set(parsed.benefits.map(b => b.id))
  const reqIds = new Set(parsed.requirements.map(r => r.id))

  for (const s of parsed.solutions) {
    const lb = s.linkedBenefits || s.delivers_benefits || []
    const lr = s.linkedRequirements || s.depends_on_requirements || []
    if (lb.length < 3) issues.push(`${s.id} has fewer than 3 linked benefits`)
    if (lr.length < 3) issues.push(`${s.id} has fewer than 3 linked requirements`)
  }

  for (const b of parsed.benefits) {
    const ls = b.linkedSolutions || b.delivered_by_solutions || []
    if (ls.length === 0) issues.push(`Orphaned benefit: ${b.id}`)
  }

  for (const r of parsed.requirements) {
    const ls = r.linkedSolutions || r.supports_solutions || []
    if (ls.length === 0) issues.push(`Orphaned requirement: ${r.id}`)
  }

  // Invented financials detection
  const inventedPattern = /\$[\d,]+[MK]?\s*(annual|revenue|turnover|ARR)|[\d,]+\s*(users|customers|subscribers)/i
  if (!benefitAnchors.hasRevenue && !benefitAnchors.hasOpCost) {
    for (const ben of parsed.benefits) {
      if (ben.valueBasis && inventedPattern.test(ben.valueBasis)) {
        warnings.push(`INVENTED FINANCIALS: ${ben.id} — valueBasis contains specific figures not provided by user`)
      }
    }
  }

  return {
    passed: issues.length === 0,
    parseError,
    discovery: parsed,
    quality: { passed: issues.length === 0, issues, warnings }
  }
}

// ─── Step 7: selectBestPath ──────────────────────────────────────────────────

function selectBestPath(aiDiscovery, aiQuality, templateDiscovery, templateQuality, validated) {
  const hasGoodAI = aiDiscovery && !aiDiscovery.parseError && aiQuality.passed && validated.discoverWithAI
  const hasGoodTemplate = templateDiscovery && templateQuality.passed

  if (hasGoodAI) {
    return { final: aiDiscovery, discoveryMethod: 'ai_generated', fallbackUsed: false }
  } else if (hasGoodTemplate) {
    return { final: templateDiscovery, discoveryMethod: 'template_based', fallbackUsed: validated.discoverWithAI }
  } else {
    return { final: null, discoveryMethod: null, fallbackUsed: true }
  }
}

// ─── Step 8: harmonizeResponse ───────────────────────────────────────────────

function harmonizeResponse(final, validated, benefitAnchors, discoveryMethod, fallbackUsed, validationWarnings) {
  const trackingId = generateTrackingId()
  const timestamp = new Date().toISOString()
  const allWarnings = [...validationWarnings]
  const budgetWarnings = []

  // Normalise solutions — ensure dual fields and cost breakdown
  const solutions = final.solutions.map(s => {
    const costEstimate = s.costEstimate || {}
    const totalCost = s.totalCost || costEstimate.mid || costEstimate.recommended || 0
    const splits = COST_SPLITS[s.category] || COST_SPLITS.general_modernization
    const breakdown = costEstimate.breakdown || {}
    for (const key of ['labour', 'licensing', 'infrastructure', 'testing', 'training', 'contingency']) {
      if (breakdown[key] == null) {
        breakdown[key] = Math.round(totalCost * (splits[key] || 0))
      }
    }

    return {
      id: s.id,
      name: s.name,
      description: s.description,
      totalCost,
      implementationTime: s.implementationTime || 12,
      riskLevel: s.riskLevel || 'Medium',
      category: s.category,
      deliveryPhase: s.deliveryPhase || 2,
      linkedBenefits: s.linkedBenefits || s.delivers_benefits || [],
      linkedRequirements: s.linkedRequirements || s.depends_on_requirements || [],
      delivers_benefits: s.delivers_benefits || s.linkedBenefits || [],
      depends_on_requirements: s.depends_on_requirements || s.linkedRequirements || [],
      supported_by_requirements: s.supported_by_requirements || s.linkedRequirements || [],
      costEstimate: {
        low: costEstimate.low || Math.round(totalCost * 0.8),
        mid: costEstimate.mid || totalCost,
        high: costEstimate.high || Math.round(totalCost * 1.3),
        recommended: costEstimate.recommended || totalCost,
        breakdown,
        implementationMonths: costEstimate.implementationMonths || 3,
        source: costEstimate.source || discoveryMethod === 'ai_generated' ? 'ai_generated' : 'template'
      }
    }
  })

  // Normalise benefits — ensure dual fields
  const benefits = final.benefits.map(b => ({
    id: b.id,
    category: b.category,
    description: b.description,
    riskAdjustedValue: b.riskAdjustedValue || 0,
    confidence: b.confidence || 0.5,
    valueBasis: b.valueBasis || '',
    linkedSolutions: b.linkedSolutions || b.delivered_by_solutions || [],
    delivered_by_solutions: b.delivered_by_solutions || b.linkedSolutions || []
  }))

  // Normalise requirements — ensure dual fields
  const requirements = final.requirements.map(r => ({
    id: r.id,
    description: r.description,
    priority: r.priority || 'should_have',
    linkedSolutions: r.linkedSolutions || r.supports_solutions || [],
    supports_solutions: r.supports_solutions || r.linkedSolutions || []
  }))

  // Budget analysis
  const totalCost = solutions.reduce((s, x) => s + (x.totalCost || 0), 0)
  const suggestedBudget = final.suggestedBudget || null
  const effectiveBudget = validated.budget > 0 ? validated.budget : (suggestedBudget || 0)
  const budgetIsUserProvided = validated.budgetStatus === 'user_provided'

  let budgetCeilingBreached = false
  if (effectiveBudget > 0 && budgetIsUserProvided) {
    const ceiling = Math.round(effectiveBudget * CEILING_PCT)
    if (totalCost > ceiling) {
      budgetCeilingBreached = true
      budgetWarnings.push(`BUDGET CEILING BREACHED: $${totalCost.toLocaleString()} exceeds 85% ceiling ($${ceiling.toLocaleString()})`)
    }
  }

  const budgetUtilizationPct = effectiveBudget > 0
    ? Math.round((totalCost / effectiveBudget) * 100) : 0

  if (budgetUtilizationPct < 70 && effectiveBudget > 0) {
    budgetWarnings.push('Low budget utilization')
  }
  if (budgetUtilizationPct > 100) {
    budgetWarnings.push('Over budget')
  }

  allWarnings.push(...budgetWarnings)

  // Portfolio cost summary
  const totalLow = solutions.reduce((s, x) => s + (x.costEstimate.low || 0), 0)
  const totalMid = solutions.reduce((s, x) => s + (x.costEstimate.mid || 0), 0)
  const totalHigh = solutions.reduce((s, x) => s + (x.costEstimate.high || 0), 0)

  let budgetFit = 'unknown'
  if (effectiveBudget > 0) {
    budgetFit = totalMid <= effectiveBudget ? 'within_budget' : 'over_budget'
  }

  // Delivery sequence & phase summary
  const phases = [1, 2, 3]
  const deliverySequence = phases
    .map(p => {
      const phaseSols = solutions.filter(s => s.deliveryPhase === p).map(s => s.id)
      return phaseSols.length > 0 ? `Phase ${p}: ${phaseSols.join(', ')}` : null
    })
    .filter(Boolean)

  const phaseSummary = phases
    .map(p => {
      const phaseSols = solutions.filter(s => s.deliveryPhase === p)
      if (phaseSols.length === 0) return null
      const themes = { 1: 'Foundation & Security', 2: 'Core Build', 3: 'Optimisation & Enhancement' }
      return { phase: p, solutions: phaseSols.map(s => s.id), theme: themes[p] }
    })
    .filter(Boolean)

  // Quality metrics
  const qualityPassed = solutions.length >= 5 && benefits.length >= 5 && requirements.length >= 5
  const overallScore = qualityPassed ? 85 : 50

  const readyForPhase2 = qualityPassed && !budgetCeilingBreached

  // Recommendations
  const recommendations = []
  if (budgetCeilingBreached) recommendations.push('Review solution scope to fit within 85% budget ceiling')
  if (fallbackUsed) recommendations.push('AI discovery failed — template-based fallback was used. Consider reviewing inputs.')

  return {
    status: fallbackUsed ? 'warning' : 'success',
    phase: 1,
    trackingId,
    timestamp,
    source: 'web_app',

    validatedData: {
      projectTitle: validated.projectTitle,
      businessUnit: validated.businessUnit,
      industry: validated.industry,
      currentState: validated.currentState,
      businessImpact: validated.businessImpact,
      budget: validated.budget,
      expectedTimeframe: validated.expectedTimeframe,
      urgency: validated.urgency,
      technicalStack: validated.technicalStack,
      systemIntegrations: validated.systemIntegrations,
      complianceRequirements: validated.complianceRequirements,
      currentPainPoints: validated.currentPainPoints,
      businessGoals: validated.businessGoals,
      stakeholders: validated.stakeholders,
      timeHorizonYears: validated.timeHorizonYears,
      discountRatePct: validated.discountRatePct,
      projectStartDate: validated.projectStartDate,
      annualRevenue: validated.annualRevenue,
      annualOperatingCost: validated.annualOperatingCost,
      headcount: validated.headcount,
      companySize: validated.companySize,
      onlineRevenuePct: validated.onlineRevenuePct,
      budgetStatus: validated.budgetStatus
    },

    validation: {
      passed: true,
      errors: [],
      warnings: validationWarnings
    },

    discountRatePct: validated.discountRatePct,
    timeHorizonYears: validated.timeHorizonYears,
    defaultHorizonYears: DEFAULT_HORIZON,

    solutions,
    benefits,
    requirements,

    discoveryMethod,
    fallbackUsed,

    suggestedBudget,
    budgetRationale: final.budgetRationale || null,

    budgetAnalysis: {
      totalCost,
      budget: effectiveBudget,
      budgetUtilizationPct,
      withinBudget: effectiveBudget > 0 ? totalCost <= effectiveBudget : null,
      withinCeiling: effectiveBudget > 0 && budgetIsUserProvided
        ? totalCost <= Math.round(effectiveBudget * CEILING_PCT) : null
    },

    portfolioCostSummary: {
      totalLow,
      totalMid,
      totalHigh,
      budgetFit
    },

    budgetCeilingBreached,
    budgetWarnings,

    revenueGoalWarnings: [],
    revenueGoalAssessment: final.revenueGoalAssessment || [],

    deliverySequence,
    phaseSummary,

    qualityMetrics: {
      overallScore,
      dualFieldsValidated: true
    },

    reflection: {
      overallScore,
      summary: readyForPhase2
        ? 'Discovery complete. All quality checks passed. Ready for Phase 1.6 (Vendors).'
        : `Discovery complete with issues. ${budgetCeilingBreached ? 'Budget ceiling breached. ' : ''}${!qualityPassed ? 'Quality checks failed. ' : ''}Review recommended before proceeding.`,
      readyForPhase2,
      reflectionError: budgetCeilingBreached
        ? `Budget ceiling breached: $${totalCost.toLocaleString()} exceeds 85% of $${effectiveBudget.toLocaleString()}`
        : (!qualityPassed ? 'Quality validation failed' : null)
    },

    costEstimationStatus: 'pending',

    warnings: allWarnings,
    recommendations
  }
}

// ─── Route Handler ───────────────────────────────────────────────────────────

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
    let aiDiscovery = null
    let aiQuality = { passed: false }

    if (validated.discoverWithAI) {
      const prompt = prepareAIPrompt(validated, benefitAnchors)
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const text = await callClaude(client, prompt)
          console.log(`AI attempt ${attempt + 1} raw response (first 500 chars):`, text.substring(0, 500))
          const result = parseAndValidateAI(text, validated, benefitAnchors)
          if (result.passed) {
            aiDiscovery = result.discovery
            aiQuality = result.quality
            break
          }
          console.log(`AI attempt ${attempt + 1} failed validation:`)
          console.log('  issues:', JSON.stringify(result.quality.issues, null, 2))
          console.log('  warnings:', JSON.stringify(result.quality.warnings, null, 2))
          console.log('  parseError:', result.parseError)
          console.log('  counts: solutions=' + (result.discovery?.solutions?.length ?? 0) +
            ' benefits=' + (result.discovery?.benefits?.length ?? 0) +
            ' requirements=' + (result.discovery?.requirements?.length ?? 0))
        } catch (err) {
          console.error(`AI attempt ${attempt + 1} error:`, err.message)
        }
      }
    }

    const { final, discoveryMethod, fallbackUsed } =
      selectBestPath(aiDiscovery, aiQuality, templateDiscovery, templateQuality, validated)

    if (!final) {
      return res.status(500).json([{ status: 'error', error: 'NO_VALID_DISCOVERY_DATA' }])
    }

    const response = harmonizeResponse(final, validated, benefitAnchors, discoveryMethod, fallbackUsed, warnings)
    return res.json([response])

  } catch (err) {
    console.error('Phase 1 error:', err)
    return res.status(500).json([{ status: 'error', error: err.message }])
  }
})

export default router
