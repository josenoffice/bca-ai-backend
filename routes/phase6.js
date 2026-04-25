// ═══════════════════════════════════════════════════════════════════
// BCA.AI — Phase 6: BRD Generation
// 3 parallel tracks: AI Narrative + AI Requirements + JS Assembly
// Endpoints: POST /phase6, POST /phase6/rewrite, POST /phase6/download
// ═══════════════════════════════════════════════════════════════════
import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import crypto from 'crypto'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType,
  PageNumber, Header, Footer, BorderStyle, ShadingType,
  TableOfContents, NumberFormat
} from 'docx'

const router = Router()
const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

// ─── Constants ─────────────────────────────────────────────────────
const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 4096

const SYSTEM_PROMPT = `You are a senior business analyst writing formal sections of a Business Requirements Document (BRD). Write in clear, professional, third-person business English. Respond with valid JSON only — no markdown, no explanation.`

// ─── Helpers ───────────────────────────────────────────────────────

function generateTrackingId() {
  return `req_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`
}

function num(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function fmt(v) {
  return Math.round(num(v)).toLocaleString('en-US')
}

/**
 * Call Claude and parse JSON response with one retry on parse failure.
 */
async function callClaudeJSON(userPrompt) {
  let lastError = null

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }]
    })

    const text = response.content[0].text
    try {
      const clean = text.replace(/```json\s*|\s*```/g, '').trim()
      return JSON.parse(clean)
    } catch (err) {
      lastError = err
      // Retry once
    }
  }

  throw new Error(`Failed to parse Claude JSON after 2 attempts: ${lastError.message}`)
}

// ═══════════════════════════════════════════════════════════════════
// Track A — AI Call 1: Narrative (Business Justification, Objectives, Risk)
// ═══════════════════════════════════════════════════════════════════
async function trackA_Narrative(data) {
  const wizard = data.validatedData || data.raw?.validatedData || {}
  const financialsP4 = data.financialsP4 || {}
  const recommendation = data.recommendation || {}
  const ranking = recommendation.ranking || []
  const sensitivity = data.sensitivity || []
  const benefitSens = data.benefitSensitivity || []

  const rankingTable = ranking.length > 0
    ? ranking.map(r =>
        `  #${r.rank} ${r.name}: Score=${r.score} | NPV=$${Math.round((r.npv || 0) / 1000)}K | ROI=${Math.round(r.roiPct || 0)}% | Risk=${r.riskLevel} | Confidence=${r.confidenceScore}% | Payback=${r.paybackMonths ? r.paybackMonths + 'mo' : 'N/A'} | Vendor=${r.vendorName || 'N/A'} | VendorFit=${r.vendorFitScore != null ? r.vendorFitScore : 'N/A'}\n  Rationale: ${r.rationale || ''}`
      ).join('\n\n')
    : 'Ranking data not available.'

  const sensitivitySummary = sensitivity.length > 0
    ? sensitivity.map(s => `  Rate ${Math.round((s.discountRate || 0) * 100)}%: Portfolio PV = $${Math.round((s.portfolioPVBenefit || 0) / 1000)}K`).join('\n')
    : 'Not available.'

  const benefitScenarios = benefitSens.length > 0
    ? benefitSens.map(s => `  ${s.label} (${Math.round((s.multiplier || 1) * 100)}% of estimate): Portfolio PV = $${Math.round((s.portfolioPV || 0) / 1000)}K | ROI = ${s.portfolioROI || 0}%`).join('\n')
    : 'Not available.'

  const prompt = `Given the following business context, generate a formal BRD narrative. Reference specific financial metrics, composite scores, and sensitivity results where relevant.

BUSINESS CONTEXT:
- Current State: ${wizard.currentState || 'Not specified'}
- Business Impact: ${wizard.businessImpact || 'Not specified'}
- Current Pain Points: ${JSON.stringify(wizard.currentPainPoints || [])}

FINANCIAL SUMMARY:
- Total Portfolio NPV (${financialsP4.horizonYears || 3}Y): $${fmt(financialsP4.totalPVBenefit3y || 0)}
- Total Investment: $${fmt(financialsP4.totalCost || 0)}
- Average Portfolio ROI: ${financialsP4.avgROIPct || 0}%
- Discount Rate (industry-adjusted): ${Math.round((financialsP4.discountRate || 0.12) * 100)}%
- Applied Benefit Multiplier: ${financialsP4.appliedBenefitMult || 1.0}
- Applied Risk Penalty: ${financialsP4.appliedRiskPenalty || 0.08}

SOLUTION RANKING (Composite Score = NPV×35% + ROI×20% + Confidence×15% + (1−Risk)×15% + VendorFit×15%):
${rankingTable}

DISCOUNT RATE SENSITIVITY (±4% range):
${sensitivitySummary}

BENEFIT SCENARIOS (pessimistic/base/optimistic):
${benefitScenarios}

RECOMMENDED SOLUTION:
- Name: ${recommendation.recommendedSolutionName || recommendation.recommendedSolutionId || 'N/A'}
- Is User Override: ${recommendation.isOverride ? 'Yes — user overrode AI recommendation' : 'No'}

Respond with a JSON object containing exactly these keys:
{
  "businessJustification": "3-4 paragraphs of formal business justification prose — explicitly reference the composite score, NPV, ROI, and payback period of the recommended solution. Mention the scoring methodology weights to demonstrate analytical rigour. Cite sensitivity scenarios to show range of outcomes.",
  "projectObjectives": ["SMART objective 1", "SMART objective 2", ... (4-6 objectives)],
  "riskAssessment": [
    {"risk": "description", "impact": "High|Medium|Low", "likelihood": "High|Medium|Low", "mitigation": "strategy"},
    ...
  ]
}`

  return callClaudeJSON(prompt)
}

// ═══════════════════════════════════════════════════════════════════
// Track B — AI Call 2: Requirements Expansion
// ═══════════════════════════════════════════════════════════════════
async function trackB_Requirements(data) {
  const requirements = data.requirements || []
  const complianceRequirements = data.validatedData?.complianceRequirements ||
    data.raw?.validatedData?.complianceRequirements || []
  const technicalStack = data.validatedData?.technicalStack ||
    data.raw?.validatedData?.technicalStack || []

  const prompt = `Given the following requirements from Phase 1, expand them into formal BRD-quality functional and non-functional requirements.

PHASE 1 REQUIREMENTS:
${JSON.stringify(requirements, null, 2)}

COMPLIANCE REQUIREMENTS: ${JSON.stringify(complianceRequirements)}
TECHNICAL STACK: ${JSON.stringify(technicalStack)}

For each requirement, generate 3-5 detailed sub-requirements. Also generate Non-Functional Requirements across Compliance, Performance, Security, and Availability categories.

Respond with a JSON object containing exactly these keys:
{
  "functionalRequirements": [
    {
      "id": "REQ-001",
      "title": "requirement title",
      "priority": "Must Have|Should Have|Could Have",
      "linkedSolutions": ["SOL-001"],
      "subRequirements": [
        {"id": "REQ-001.1", "description": "detailed sub-requirement"},
        {"id": "REQ-001.2", "description": "detailed sub-requirement"}
      ]
    }
  ],
  "nonFunctionalRequirements": [
    {
      "category": "Compliance",
      "items": [{"id": "NFR-C01", "description": "description", "priority": "Must Have"}]
    },
    {
      "category": "Performance",
      "items": [{"id": "NFR-P01", "description": "description", "priority": "Must Have"}]
    },
    {
      "category": "Security",
      "items": [{"id": "NFR-S01", "description": "description", "priority": "Must Have"}]
    },
    {
      "category": "Availability",
      "items": [{"id": "NFR-A01", "description": "description", "priority": "Should Have"}]
    }
  ]
}`

  return callClaudeJSON(prompt)
}

// ═══════════════════════════════════════════════════════════════════
// Track C — JS Assembly: Build template sections from input data
// ═══════════════════════════════════════════════════════════════════
function trackC_Assembly(data) {
  const wizard = data.validatedData || data.raw?.validatedData || {}
  const recommendation = data.recommendation || {}
  const financialsP4 = data.financialsP4 || {}
  const solutions = data.solutions || []
  const timeline = data.timeline || {}
  const report = data.report || data.raw?.report || {}
  const descopedPortfolio = data.descopedPortfolio || data.raw?.descopedPortfolio || []
  const sensitivity = data.sensitivity || []
  const benefitSensitivity = data.benefitSensitivity || []
  const budgetAnalysis = data.budgetAnalysis || {}
  const scoringWeights = recommendation.scoringWeights || { npv: 0.35, roi: 0.20, confidence: 0.15, riskPenalty: 0.15, vendorFit: 0.15 }
  const ranking = recommendation.ranking || []

  // ── Section 1: Executive Summary ──────────────────────────────
  let executiveSummaryContent = ''
  const execSection = report?.sections?.executiveSummary
  if (execSection) {
    executiveSummaryContent = typeof execSection === 'string'
      ? execSection
      : execSection.blurb || execSection.headline || ''
    if (execSection.headline && execSection.blurb) {
      executiveSummaryContent = `${execSection.headline}\n\n${execSection.blurb}`
    }
    if (execSection.rationale) {
      executiveSummaryContent += `\n\n${execSection.rationale}`
    }
  } else {
    const rationale = recommendation.recommendationRationale || ''
    const pvBenefit = financialsP4.totalPVBenefit3y || financialsP4.npv || 0
    const roi = financialsP4.avgROIPct || 0
    executiveSummaryContent = `This Business Requirements Document outlines the justification, scope, and requirements for the proposed technology investment. ` +
      `The recommended solution is ${recommendation.recommendedSolutionName || recommendation.recommendedSolutionId || 'the preferred option'}, ` +
      `which delivers a projected present value of $${fmt(pvBenefit)} over ${financialsP4.horizonYears || 3} years with an estimated ROI of ${roi}%. ` +
      `${rationale}`
  }

  const section1 = {
    id: 1,
    title: 'Executive Summary',
    content: executiveSummaryContent,
    source: 'phase5',
    editable: true
  }

  // ── Section 3: Problem Statement ──────────────────────────────
  const painPoints = wizard.currentPainPoints || []
  const painBullets = painPoints.length > 0
    ? '\n\nKey Pain Points:\n' + painPoints.map(p => `  - ${typeof p === 'string' ? p : p.description || p.text || JSON.stringify(p)}`).join('\n')
    : ''
  const section3 = {
    id: 3,
    title: 'Problem Statement',
    content: (wizard.currentState || 'Current state not provided.') + painBullets,
    source: 'wizard',
    editable: true
  }

  // ── Section 5: Scope ──────────────────────────────────────────
  const inScope = solutions.map(s => ({
    id: s.id,
    name: s.name,
    phase: s.deliveryPhase || 1
  }))

  const outOfScope = descopedPortfolio.length > 0
    ? descopedPortfolio.map(d => d.name || d.description || JSON.stringify(d))
    : [
        'Organisational change management beyond immediate project scope',
        'Legacy system decommissioning (separate initiative)',
        'Third-party vendor contract renegotiation',
        'Non-critical integrations identified during discovery'
      ]

  const section5 = {
    id: 5,
    title: 'Scope',
    inScope,
    outOfScope,
    source: 'phase1',
    editable: true
  }

  // ── Section 8: Stakeholders & RACI ────────────────────────────
  const raci = [
    { role: 'Project Sponsor',   r: false, a: true,  c: true,  i: true  },
    { role: 'Project Manager',   r: true,  a: true,  c: true,  i: true  },
    { role: 'Business Analyst',  r: true,  a: false, c: true,  i: true  },
    { role: 'IT SME',            r: true,  a: false, c: true,  i: true  },
    { role: 'Vendor',            r: true,  a: false, c: false, i: true  },
    { role: 'End Users',         r: false, a: false, c: true,  i: true  }
  ]

  const section8 = {
    id: 8,
    title: 'Stakeholders & RACI',
    raci,
    source: 'template',
    editable: true
  }

  // ── Section 9: Implementation Timeline ────────────────────────
  const timelinePhases = timeline.phases || []
  const projectTimeline = timeline.projectTimeline || {}

  const section9 = {
    id: 9,
    title: 'Implementation Timeline',
    timeline: {
      totalWeeks: projectTimeline.totalDurationWeeks || timelinePhases.reduce((max, p) => Math.max(max, p.endWeek || 0), 0),
      startDate: projectTimeline.projectStartDate || wizard.projectStartDate || new Date().toISOString().split('T')[0],
      phases: timelinePhases.map(p => ({
        name: p.name,
        startWeek: p.startWeek,
        endWeek: p.endWeek
      }))
    },
    source: 'phase3',
    editable: true
  }

  // ── Section 11: Assumptions & Constraints ─────────────────────
  const discountRate = financialsP4.discountRate || 0.12
  const horizonYears = financialsP4.horizonYears || 3
  const budget = wizard.budget || financialsP4.budget || 0

  const assumptions = [
    `A discount rate of ${Math.round(discountRate * 100)}% has been applied for present value calculations.`,
    `The financial analysis covers a ${horizonYears}-year time horizon.`,
    budget > 0 ? `The approved budget envelope is $${fmt(budget)}.` : 'Budget figures are indicative and subject to formal approval.',
    `Benefit estimates are based on ${wizard.companySize || 'current'} organisational scale and operational metrics.`,
    `Benefit values have been anchored to auditable financial baselines where available.`,
    'Vendor pricing is based on current market rates and may be subject to negotiation.',
    'Resource availability aligns with projected delivery timelines.'
  ]

  const complianceReqs = wizard.complianceRequirements || []
  const techStack = wizard.technicalStack || []

  const constraints = [
    'Total implementation cost must not exceed 85% of the approved budget ceiling.',
    complianceReqs.length > 0
      ? `All deliverables must comply with: ${complianceReqs.join(', ')}.`
      : 'All deliverables must comply with applicable regulatory and industry standards.',
    techStack.length > 0
      ? `Solution must be compatible with the existing technology stack: ${techStack.join(', ')}.`
      : 'Solution must integrate with existing enterprise systems and architecture.',
    'Delivery must align with the approved project timeline and milestone schedule.',
    'Data migration and system integration must not disrupt existing business operations.',
    'All changes must pass security review and penetration testing before go-live.'
  ]

  const section11 = {
    id: 11,
    title: 'Assumptions & Constraints',
    assumptions,
    constraints,
    source: 'template',
    editable: true
  }

  // ── Section 12: Approval & Sign-off ───────────────────────────
  const signatories = [
    { role: 'Project Sponsor',      name: '', title: '', date: '' },
    { role: 'Finance Approver',     name: '', title: '', date: '' },
    { role: 'IT Approver',          name: '', title: '', date: '' },
    { role: 'Procurement Approver', name: '', title: '', date: '' }
  ]

  // ── Section 12: Financial Analysis & Scoring Methodology ──────────
  const section12 = {
    id: 12,
    title: 'Financial Analysis & Scoring Methodology',
    scoringMethodology: {
      weights: scoringWeights,
      formula: 'Composite Score = (NPV_norm × 35%) + (ROI_norm × 20%) + (Confidence_norm × 15%) + ((1 − Risk_norm) × 15%) + (VendorFit_norm × 15%)',
      note: 'Each dimension is normalised to 0–1 across all evaluated solutions before weighting. Risk penalty is inverted so lower risk yields a higher score.'
    },
    ranking,
    sensitivity,
    benefitSensitivity,
    budgetSummary: {
      totalCost: financialsP4.totalCost || 0,
      budget: budgetAnalysis.budget || 0,
      utilizationPct: budgetAnalysis.budgetUtilizationPct ?? null,
      withinBudget: budgetAnalysis.withinBudget ?? null,
      withinCeiling: budgetAnalysis.withinCeiling ?? null,
      pvBenefit3y: financialsP4.totalPVBenefit3y || 0,
      avgROIPct: financialsP4.avgROIPct || 0,
      discountRate: financialsP4.discountRate || 0.12,
      horizonYears: financialsP4.horizonYears || 3,
      appliedBenefitMult: financialsP4.appliedBenefitMult || 1.0,
      appliedRiskPenalty: financialsP4.appliedRiskPenalty || 0.08
    },
    source: 'phase4',
    editable: true
  }

  // ── Section 13: Approval & Sign-off ───────────────────────────
  const section13 = {
    id: 13,
    title: 'Approval & Sign-off',
    signatories,
    source: 'template',
    editable: true
  }

  return { section1, section3, section5, section8, section9, section11, section12, section13 }
}

// ═══════════════════════════════════════════════════════════════════
// Merge all tracks into ordered sections array
// ═══════════════════════════════════════════════════════════════════
function mergeSections(trackAResult, trackBResult, trackCResult) {
  const sections = [
    // 1. Executive Summary (Track C)
    trackCResult.section1,

    // 2. Business Justification (Track A)
    {
      id: 2,
      title: 'Business Justification',
      content: trackAResult.businessJustification || '',
      source: 'ai',
      editable: true
    },

    // 3. Problem Statement (Track C)
    trackCResult.section3,

    // 4. Project Objectives (Track A)
    {
      id: 4,
      title: 'Project Objectives',
      objectives: (trackAResult.projectObjectives || []).map(o => ({
        text: typeof o === 'string' ? o : o.text || o.description || String(o)
      })),
      source: 'ai',
      editable: true
    },

    // 5. Scope (Track C)
    trackCResult.section5,

    // 6. Functional Requirements (Track B)
    {
      id: 6,
      title: 'Functional Requirements',
      requirements: trackBResult.functionalRequirements || [],
      source: 'ai',
      editable: true
    },

    // 7. Non-Functional Requirements (Track B)
    {
      id: 7,
      title: 'Non-Functional Requirements',
      categories: trackBResult.nonFunctionalRequirements || [],
      source: 'ai',
      editable: true
    },

    // 8. Stakeholders & RACI (Track C)
    trackCResult.section8,

    // 9. Implementation Timeline (Track C)
    trackCResult.section9,

    // 10. Risk Assessment (Track A)
    {
      id: 10,
      title: 'Risk Assessment',
      risks: trackAResult.riskAssessment || [],
      source: 'ai',
      editable: true
    },

    // 11. Assumptions & Constraints (Track C)
    trackCResult.section11,

    // 12. Financial Analysis & Scoring Methodology (Track C)
    trackCResult.section12,

    // 13. Approval & Sign-off (Track C)
    trackCResult.section13
  ]

  return sections
}

// ═══════════════════════════════════════════════════════════════════
// POST /phase6 — Generate BRD Sections
// ═══════════════════════════════════════════════════════════════════
router.post('/phase6', async (req, res) => {
  try {
    const raw = req.body
    const trackingId = generateTrackingId()

    // Normalise input references
    const data = {
      raw,
      validatedData: raw.validatedData || raw,
      solutions: raw.solutions || [],
      requirements: raw.requirements || [],
      recommendation: raw.recommendation || {},
      financialsP4: raw.financialsP4 || {},
      sensitivity: raw.sensitivity || [],
      benefitSensitivity: raw.benefitSensitivity || [],
      budgetAnalysis: raw.budgetAnalysis || {},
      traceabilityCoverage: raw.traceabilityCoverage || {},
      timeline: raw.timeline || {},
      report: raw.report || {},
      descopedPortfolio: raw.descopedPortfolio || []
    }

    // Run 3 tracks in parallel
    const [trackAResult, trackBResult, trackCResult] = await Promise.all([
      trackA_Narrative(data),
      trackB_Requirements(data),
      Promise.resolve(trackC_Assembly(data))
    ])

    // Merge into ordered sections
    const sections = mergeSections(trackAResult, trackBResult, trackCResult)

    // Build metadata
    const wizard = data.validatedData
    const financialsP4 = data.financialsP4
    const recommendation = data.recommendation

    const metadata = {
      projectTitle: wizard.projectTitle || wizard.project?.title || 'BCA Report',
      businessUnit: wizard.businessUnit || '',
      industry: wizard.industry || 'technology',
      generatedAt: new Date().toISOString(),
      totalCost: financialsP4.totalRecommendedCost || financialsP4.totalCost || 0,
      totalBenefit3y: financialsP4.totalPVBenefit3y || 0,
      recommendedSolution: recommendation.recommendedSolutionName || recommendation.recommendedSolutionId || ''
    }

    return res.json([{
      status: 'success',
      phase: '6',
      trackingId,
      timestamp: new Date().toISOString(),
      sections,
      metadata
    }])
  } catch (err) {
    console.error('Phase 6 error:', err)
    return res.status(500).json([{
      status: 'error',
      phase: 6,
      errorMessage: err.message
    }])
  }
})

// ═══════════════════════════════════════════════════════════════════
// POST /phase6/rewrite — AI Rewrite Single Section
// ═══════════════════════════════════════════════════════════════════
router.post('/phase6/rewrite', async (req, res) => {
  try {
    const { sectionId, sectionTitle, currentContent, instruction } = req.body

    if (!sectionId || !instruction) {
      return res.status(400).json([{
        status: 'error',
        phase: 6,
        errorMessage: 'Missing required fields: sectionId, instruction'
      }])
    }

    const prompt = `You are rewriting a section of a Business Requirements Document (BRD).

SECTION: ${sectionTitle || `Section ${sectionId}`}

CURRENT CONTENT:
${typeof currentContent === 'string' ? currentContent : JSON.stringify(currentContent, null, 2)}

USER INSTRUCTION:
${instruction}

Rewrite the section according to the user's instruction. Maintain professional BRD tone and formatting. Return a JSON object with exactly one key:
{
  "rewrittenContent": "the rewritten section content"
}`

    const result = await callClaudeJSON(prompt)

    return res.json([{
      rewrittenContent: result.rewrittenContent || ''
    }])
  } catch (err) {
    console.error('Phase 6 rewrite error:', err)
    return res.status(500).json([{
      status: 'error',
      phase: 6,
      errorMessage: err.message
    }])
  }
})

// ═══════════════════════════════════════════════════════════════════
// POST /phase6/download — Generate .docx
// ═══════════════════════════════════════════════════════════════════

// ─── DOCX Helpers ──────────────────────────────────────────────────

const BORDER_STYLE = {
  top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
}

const HEADER_SHADING = { type: ShadingType.SOLID, color: '1976D2' }

function headerCell(text) {
  return new TableCell({
    borders: BORDER_STYLE,
    shading: HEADER_SHADING,
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, color: 'FFFFFF', font: 'Calibri', size: 20 })]
    })]
  })
}

function bodyCell(text) {
  return new TableCell({
    borders: BORDER_STYLE,
    children: [new Paragraph({
      children: [new TextRun({ text: String(text || ''), font: 'Calibri', size: 20 })]
    })]
  })
}

function sectionHeading(number, title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({
      text: `${number}. ${title}`,
      bold: true,
      font: 'Calibri',
      size: 28,
      color: '1976D2'
    })]
  })
}

function bodyParagraph(text) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({
      text: String(text || ''),
      font: 'Calibri',
      size: 22
    })]
  })
}

function numberedItem(index, text) {
  return new Paragraph({
    spacing: { after: 80 },
    indent: { left: 360 },
    children: [new TextRun({
      text: `${index + 1}. ${text}`,
      font: 'Calibri',
      size: 22
    })]
  })
}

function bulletItem(text) {
  return new Paragraph({
    spacing: { after: 80 },
    indent: { left: 360 },
    children: [new TextRun({
      text: `\u2022  ${text}`,
      font: 'Calibri',
      size: 22
    })]
  })
}

router.post('/phase6/download', async (req, res) => {
  try {
    const { sections, metadata } = req.body

    if (!sections || !Array.isArray(sections)) {
      return res.status(400).json([{
        status: 'error',
        phase: 6,
        errorMessage: 'Missing required field: sections (array)'
      }])
    }

    const projectTitle = metadata?.projectTitle || 'BCA Report'
    const businessUnit = metadata?.businessUnit || ''
    const generatedAt = metadata?.generatedAt || new Date().toISOString()
    const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    })

    // ── Build cover page ────────────────────────────────────────
    const coverPage = [
      new Paragraph({ spacing: { before: 2400 }, children: [] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({
          text: 'Business Requirements Document',
          bold: true,
          font: 'Calibri',
          size: 56,
          color: '1976D2'
        })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({
          text: projectTitle,
          font: 'Calibri',
          size: 36,
          color: '333333'
        })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({
          text: businessUnit ? `Business Unit: ${businessUnit}` : '',
          font: 'Calibri',
          size: 24,
          color: '666666'
        })]
      }),
      new Paragraph({ spacing: { before: 600 }, children: [] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [new TextRun({ text: 'Version 1.0', font: 'Calibri', size: 22, color: '666666' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [new TextRun({ text: dateStr, font: 'Calibri', size: 22, color: '666666' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [new TextRun({ text: 'Author: BCA.AI', font: 'Calibri', size: 22, color: '666666' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [new TextRun({ text: 'Status: Draft', font: 'Calibri', size: 22, color: '999999', italics: true })]
      }),
      new Paragraph({
        children: [],
        pageBreakBefore: true
      })
    ]

    // ── Table of Contents ───────────────────────────────────────
    const tocSection = [
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: 'Table of Contents', bold: true, font: 'Calibri', size: 28, color: '1976D2' })]
      }),
      new TableOfContents('Table of Contents', {
        hyperlink: true,
        headingStyleRange: '1-3'
      }),
      new Paragraph({ children: [], pageBreakBefore: true })
    ]

    // ── Build content sections ──────────────────────────────────
    const contentParagraphs = []

    for (const section of sections) {
      const secNum = section.id
      const secTitle = section.title

      contentParagraphs.push(sectionHeading(secNum, secTitle))

      switch (secNum) {
        case 1: // Executive Summary
        case 2: // Business Justification
        case 3: // Problem Statement
        {
          const text = section.content || ''
          const paragraphs = text.split('\n').filter(p => p.trim())
          for (const p of paragraphs) {
            if (p.trim().startsWith('-') || p.trim().startsWith('\u2022')) {
              contentParagraphs.push(bulletItem(p.replace(/^[\s\-\u2022]+/, '').trim()))
            } else {
              contentParagraphs.push(bodyParagraph(p))
            }
          }
          break
        }

        case 4: // Project Objectives
        {
          const objectives = section.objectives || []
          for (let i = 0; i < objectives.length; i++) {
            contentParagraphs.push(numberedItem(i, objectives[i].text || objectives[i]))
          }
          break
        }

        case 5: // Scope
        {
          contentParagraphs.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [new TextRun({ text: 'In Scope', bold: true, font: 'Calibri', size: 24 })]
          }))
          const inScope = section.inScope || []
          for (const item of inScope) {
            contentParagraphs.push(bulletItem(`${item.id}: ${item.name} (Phase ${item.phase})`))
          }

          contentParagraphs.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [new TextRun({ text: 'Out of Scope', bold: true, font: 'Calibri', size: 24 })]
          }))
          const outOfScope = section.outOfScope || []
          for (const item of outOfScope) {
            contentParagraphs.push(bulletItem(typeof item === 'string' ? item : item.name || JSON.stringify(item)))
          }
          break
        }

        case 6: // Functional Requirements — Table
        {
          const reqs = section.requirements || []
          const rows = [
            new TableRow({
              children: [
                headerCell('ID'),
                headerCell('Requirement'),
                headerCell('Priority'),
                headerCell('Linked Solutions')
              ]
            })
          ]

          for (const req of reqs) {
            rows.push(new TableRow({
              children: [
                bodyCell(req.id || ''),
                bodyCell(req.title || ''),
                bodyCell(req.priority || ''),
                bodyCell(Array.isArray(req.linkedSolutions) ? req.linkedSolutions.join(', ') : '')
              ]
            }))

            // Sub-requirements indented
            const subs = req.subRequirements || []
            for (const sub of subs) {
              rows.push(new TableRow({
                children: [
                  bodyCell(`    ${sub.id || ''}`),
                  bodyCell(sub.description || ''),
                  bodyCell(''),
                  bodyCell('')
                ]
              }))
            }
          }

          contentParagraphs.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows
          }))
          break
        }

        case 7: // Non-Functional Requirements — Table grouped by category
        {
          const categories = section.categories || []
          for (const cat of categories) {
            contentParagraphs.push(new Paragraph({
              spacing: { before: 200, after: 100 },
              children: [new TextRun({ text: cat.category, bold: true, font: 'Calibri', size: 24 })]
            }))

            const rows = [
              new TableRow({
                children: [headerCell('ID'), headerCell('Description'), headerCell('Priority')]
              })
            ]

            for (const item of (cat.items || [])) {
              rows.push(new TableRow({
                children: [
                  bodyCell(item.id || ''),
                  bodyCell(item.description || ''),
                  bodyCell(item.priority || '')
                ]
              }))
            }

            contentParagraphs.push(new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows
            }))
          }
          break
        }

        case 8: // RACI Matrix — Table
        {
          const raci = section.raci || []
          const rows = [
            new TableRow({
              children: [
                headerCell('Role'),
                headerCell('R'),
                headerCell('A'),
                headerCell('C'),
                headerCell('I')
              ]
            })
          ]

          for (const row of raci) {
            rows.push(new TableRow({
              children: [
                bodyCell(row.role || ''),
                bodyCell(row.r ? 'R' : ''),
                bodyCell(row.a ? 'A' : ''),
                bodyCell(row.c ? 'C' : ''),
                bodyCell(row.i ? 'I' : '')
              ]
            }))
          }

          contentParagraphs.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows
          }))
          break
        }

        case 9: // Implementation Timeline — Table
        {
          const tl = section.timeline || {}
          const phases = tl.phases || []

          contentParagraphs.push(bodyParagraph(
            `Total Duration: ${tl.totalWeeks || 'N/A'} weeks | Start Date: ${tl.startDate || 'TBD'}`
          ))

          if (phases.length > 0) {
            const rows = [
              new TableRow({
                children: [headerCell('Phase'), headerCell('Start Week'), headerCell('End Week')]
              })
            ]

            for (const p of phases) {
              rows.push(new TableRow({
                children: [
                  bodyCell(p.name || ''),
                  bodyCell(`Week ${p.startWeek}`),
                  bodyCell(`Week ${p.endWeek}`)
                ]
              }))
            }

            contentParagraphs.push(new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows
            }))
          }
          break
        }

        case 10: // Risk Assessment — Table
        {
          const risks = section.risks || []
          const rows = [
            new TableRow({
              children: [
                headerCell('Risk'),
                headerCell('Impact'),
                headerCell('Likelihood'),
                headerCell('Mitigation')
              ]
            })
          ]

          for (const r of risks) {
            rows.push(new TableRow({
              children: [
                bodyCell(r.risk || ''),
                bodyCell(r.impact || ''),
                bodyCell(r.likelihood || ''),
                bodyCell(r.mitigation || '')
              ]
            }))
          }

          contentParagraphs.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows
          }))
          break
        }

        case 11: // Assumptions & Constraints — Numbered lists
        {
          contentParagraphs.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [new TextRun({ text: 'Assumptions', bold: true, font: 'Calibri', size: 24 })]
          }))
          const assumptions = section.assumptions || []
          for (let i = 0; i < assumptions.length; i++) {
            contentParagraphs.push(numberedItem(i, assumptions[i]))
          }

          contentParagraphs.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [new TextRun({ text: 'Constraints', bold: true, font: 'Calibri', size: 24 })]
          }))
          const constraints = section.constraints || []
          for (let i = 0; i < constraints.length; i++) {
            contentParagraphs.push(numberedItem(i, constraints[i]))
          }
          break
        }

        case 12: // Financial Analysis & Scoring Methodology
        {
          const sm = section.scoringMethodology || {}
          const weights = sm.weights || {}
          const sectionRanking = section.ranking || []
          const sectionSensitivity = section.sensitivity || []
          const sectionBenefitSens = section.benefitSensitivity || []
          const budget = section.budgetSummary || {}

          // ─ Scoring Formula ────────────────────────────────────
          contentParagraphs.push(new Paragraph({
            spacing: { before: 200, after: 80 },
            children: [new TextRun({ text: 'Scoring Formula', bold: true, font: 'Calibri', size: 24 })]
          }))
          contentParagraphs.push(bodyParagraph(sm.formula || ''))
          contentParagraphs.push(bodyParagraph(sm.note || ''))

          // Weights table
          if (Object.keys(weights).length > 0) {
            const wRows = [
              new TableRow({ children: [headerCell('Dimension'), headerCell('Weight'), headerCell('Description')] })
            ]
            const wDesc = {
              npv: 'Net Present Value of benefits (discounted)',
              roi: 'Return on Investment over analysis horizon',
              confidence: 'Confidence score from Phase 1 analysis',
              riskPenalty: 'Risk level penalty (inverted — lower risk = higher score)',
              vendorFit: 'Vendor fit score from market assessment'
            }
            for (const [key, val] of Object.entries(weights)) {
              wRows.push(new TableRow({
                children: [
                  bodyCell(key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')),
                  bodyCell(Math.round(val * 100) + '%'),
                  bodyCell(wDesc[key] || '')
                ]
              }))
            }
            contentParagraphs.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: wRows }))
          }

          // ─ Solution Ranking ───────────────────────────────────
          if (sectionRanking.length > 0) {
            contentParagraphs.push(new Paragraph({
              spacing: { before: 280, after: 80 },
              children: [new TextRun({ text: 'Solution Ranking', bold: true, font: 'Calibri', size: 24 })]
            }))
            const rRows = [
              new TableRow({
                children: [
                  headerCell('Rank'), headerCell('Solution'), headerCell('Score'),
                  headerCell('NPV'), headerCell('ROI%'), headerCell('Payback'),
                  headerCell('Risk'), headerCell('Confidence'), headerCell('Vendor Fit')
                ]
              })
            ]
            for (const r of sectionRanking) {
              rRows.push(new TableRow({
                children: [
                  bodyCell(String(r.rank || '')),
                  bodyCell(r.name || ''),
                  bodyCell(String(r.score || '')),
                  bodyCell(r.npv != null ? '$' + Math.round((r.npv || 0) / 1000) + 'K' : '-'),
                  bodyCell(r.roiPct != null ? Math.round(r.roiPct || 0) + '%' : '-'),
                  bodyCell(r.paybackMonths ? r.paybackMonths + ' mo' : 'N/A'),
                  bodyCell(r.riskLevel || '-'),
                  bodyCell(r.confidenceScore != null ? r.confidenceScore + '%' : '-'),
                  bodyCell(r.vendorFitScore != null ? String(r.vendorFitScore) : '-')
                ]
              }))
              // Rationale row spanning all columns via a wide cell
              if (r.rationale) {
                rRows.push(new TableRow({
                  children: [
                    bodyCell(''),
                    new TableCell({
                      borders: BORDER_STYLE,
                      columnSpan: 8,
                      children: [new Paragraph({
                        spacing: { after: 40 },
                        children: [new TextRun({ text: `Rationale: ${r.rationale}`, font: 'Calibri', size: 18, italics: true, color: '555555' })]
                      })]
                    })
                  ]
                }))
              }
            }
            contentParagraphs.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rRows }))
          }

          // ─ Discount Rate Sensitivity ──────────────────────────
          if (sectionSensitivity.length > 0) {
            contentParagraphs.push(new Paragraph({
              spacing: { before: 280, after: 80 },
              children: [new TextRun({ text: 'Discount Rate Sensitivity', bold: true, font: 'Calibri', size: 24 })]
            }))
            const sRows = [
              new TableRow({ children: [headerCell('Discount Rate'), headerCell('Portfolio PV Benefit'), headerCell('Horizon (Years)')] })
            ]
            for (const s of sectionSensitivity) {
              sRows.push(new TableRow({
                children: [
                  bodyCell(Math.round((s.discountRate || 0) * 100) + '%'),
                  bodyCell('$' + Math.round((s.portfolioPVBenefit || 0) / 1000) + 'K'),
                  bodyCell(String(s.horizonYears || '-'))
                ]
              }))
            }
            contentParagraphs.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: sRows }))
          }

          // ─ Benefit Scenarios ──────────────────────────────────
          if (sectionBenefitSens.length > 0) {
            contentParagraphs.push(new Paragraph({
              spacing: { before: 280, after: 80 },
              children: [new TextRun({ text: 'Benefit Scenarios', bold: true, font: 'Calibri', size: 24 })]
            }))
            const bRows = [
              new TableRow({ children: [headerCell('Scenario'), headerCell('Benefit Multiplier'), headerCell('Portfolio PV'), headerCell('Portfolio ROI%')] })
            ]
            for (const b of sectionBenefitSens) {
              bRows.push(new TableRow({
                children: [
                  bodyCell(b.label || ''),
                  bodyCell(Math.round((b.multiplier || 1) * 100) + '%'),
                  bodyCell('$' + Math.round((b.portfolioPV || 0) / 1000) + 'K'),
                  bodyCell((b.portfolioROI || 0) + '%')
                ]
              }))
            }
            contentParagraphs.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: bRows }))
          }

          // ─ Budget Summary ─────────────────────────────────────
          contentParagraphs.push(new Paragraph({
            spacing: { before: 280, after: 80 },
            children: [new TextRun({ text: 'Budget Summary', bold: true, font: 'Calibri', size: 24 })]
          }))
          const budgetRows = [
            new TableRow({ children: [headerCell('Metric'), headerCell('Value')] }),
            new TableRow({ children: [bodyCell('Total Investment'), bodyCell('$' + Math.round(budget.totalCost || 0).toLocaleString())] }),
            new TableRow({ children: [bodyCell('PV Benefit (' + (budget.horizonYears || 3) + 'Y)'), bodyCell('$' + Math.round(budget.pvBenefit3y || 0).toLocaleString())] }),
            new TableRow({ children: [bodyCell('Average ROI'), bodyCell((budget.avgROIPct || 0) + '%')] }),
            new TableRow({ children: [bodyCell('Discount Rate'), bodyCell(Math.round((budget.discountRate || 0.12) * 100) + '%')] }),
            new TableRow({ children: [bodyCell('Applied Benefit Multiplier'), bodyCell(budget.appliedBenefitMult != null ? budget.appliedBenefitMult : 'N/A')] }),
            new TableRow({ children: [bodyCell('Applied Risk Penalty'), bodyCell(budget.appliedRiskPenalty != null ? budget.appliedRiskPenalty : 'N/A')] }),
          ]
          if (budget.budget > 0) {
            budgetRows.push(new TableRow({ children: [bodyCell('Approved Budget'), bodyCell('$' + Math.round(budget.budget || 0).toLocaleString())] }))
            budgetRows.push(new TableRow({ children: [bodyCell('Budget Utilisation'), bodyCell(budget.utilizationPct != null ? budget.utilizationPct + '%' : 'N/A')] }))
            budgetRows.push(new TableRow({ children: [bodyCell('Within Budget'), bodyCell(budget.withinBudget === true ? 'Yes' : budget.withinBudget === false ? 'No — exceeds budget' : 'N/A')] }))
          }
          contentParagraphs.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: budgetRows }))
          break
        }

        case 13: // Approval & Sign-off — Table with blank signature fields
        {
          const signatories = section.signatories || []
          const rows = [
            new TableRow({
              children: [
                headerCell('Role'),
                headerCell('Name'),
                headerCell('Signature'),
                headerCell('Date')
              ]
            })
          ]

          for (const s of signatories) {
            rows.push(new TableRow({
              children: [
                bodyCell(s.role || ''),
                bodyCell(s.name || ''),
                new TableCell({
                  borders: BORDER_STYLE,
                  children: [new Paragraph({
                    children: [new TextRun({
                      text: '________________________',
                      font: 'Calibri',
                      size: 20,
                      color: 'CCCCCC'
                    })]
                  })]
                }),
                bodyCell(s.date || '')
              ]
            }))
          }

          contentParagraphs.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows
          }))
          break
        }

        default:
        {
          // Generic fallback for any extra sections
          const text = section.content || JSON.stringify(section, null, 2)
          contentParagraphs.push(bodyParagraph(text))
          break
        }
      }

      // Add spacing after each section
      contentParagraphs.push(new Paragraph({ spacing: { after: 200 }, children: [] }))
    }

    // ── Assemble Document ───────────────────────────────────────
    const doc = new Document({
      features: {
        updateFields: true
      },
      sections: [
        {
          properties: {
            page: {
              size: { width: 12240, height: 15840 },
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
            }
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({
                    text: `BCA.AI \u2014 ${projectTitle}`,
                    font: 'Calibri',
                    size: 18,
                    color: '999999',
                    italics: true
                  })]
                })
              ]
            })
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: 'Page ', font: 'Calibri', size: 18, color: '999999' }),
                    new TextRun({ children: [PageNumber.CURRENT], font: 'Calibri', size: 18, color: '999999' }),
                    new TextRun({ text: ' of ', font: 'Calibri', size: 18, color: '999999' }),
                    new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Calibri', size: 18, color: '999999' })
                  ]
                })
              ]
            })
          },
          children: [
            ...coverPage,
            ...tocSection,
            ...contentParagraphs
          ]
        }
      ]
    })

    // ── Generate buffer and send ────────────────────────────────
    const buffer = await Packer.toBuffer(doc)

    const safeTitle = projectTitle.replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_')
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_BRD.docx"`)
    res.send(buffer)
  } catch (err) {
    console.error('Phase 6 download error:', err)
    return res.status(500).json([{
      status: 'error',
      phase: 6,
      errorMessage: err.message
    }])
  }
})

export default router
