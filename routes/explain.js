// ═══════════════════════════════════════════════════════════════════
// BCA.AI — Phase B: Contextual AI Explanations
// POST /api/explain
// Accepts: { phase, metric, projectContext, metricValue, additionalContext }
// Returns: { explanation: "3-4 sentence plain-language explanation" }
// ═══════════════════════════════════════════════════════════════════
import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'

const router = Router()
const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

// ─── Prompt builders ─────────────────────────────────────────────
const SYSTEM = `You are a plain-language business advisor explaining BCA.AI analysis results to non-technical stakeholders.
Your explanations are always:
- Exactly 3 sentences long
- Written in plain English — no jargon
- Specific to the actual numbers provided (never generic)
- Focused on what the numbers mean for the business, not how they were calculated
- Actionable where possible: "This means you should…" or "This suggests…"
Do not use bullet points. Do not start with "I". Write in flowing prose.`

function buildPrompt(phase, metric, ctx) {
  const industry = ctx.projectContext?.industry || 'your industry'
  const budget   = ctx.projectContext?.budget ? `$${Number(ctx.projectContext.budget).toLocaleString()} budget` : ''
  const extra    = ctx.additionalContext || {}
  const val      = ctx.metricValue

  switch (phase) {
    case 'phase1':
      return `Explain the Phase 1 Discovery results for a ${industry} business case${budget ? ' with a ' + budget : ''}.
Quality score: ${val}/100. Solutions identified: ${extra.solutions || 0}. Benefits quantified: ${extra.benefits || 0}. Budget utilisation: ${extra.budgetUtil || 0}%.
Status: ${extra.verdict || 'complete'}.
Explain what these results mean for the business case in 3 sentences.`

    case 'phase1_5':
      return `Explain the Cost Estimation results for a ${industry} business case.
Total cost: $${Number(val).toLocaleString()}. Budget utilisation: ${extra.utilisation || 0}%. NPV of TCO: $${Number(extra.tcoNPV || 0).toLocaleString()}. Solutions priced: ${extra.solutions || 0}.
Status: ${extra.verdict || 'complete'}.
Explain what these cost figures mean for the business in 3 sentences.`

    case 'phase1_6':
      return `Explain the vendor selection results for a ${industry} business case.
The top-ranked vendor is ${extra.topVendor || 'unknown'} with a fit score of ${val}/100. The selected vendor is ${extra.selectedVendor || extra.topVendor || 'unknown'}. There are ${extra.vendorCount || 0} vendors assessed for: ${extra.solutionName || 'this solution'}.
Explain what this vendor recommendation means for the business in 3 sentences.`

    case 'quality_review':
      return `Explain the Quality Review results for a ${industry} business case.
Overall score: ${val}/100. Verdict: ${extra.verdict || 'unknown'}. Critical issues: ${extra.criticals || 0}. Warnings: ${extra.warnings || 0}. Strengths: ${extra.strengths || 0}. Missing elements: ${extra.missing || 0}.
Summary: ${String(extra.summary || '').slice(0, 200)}.
Explain what this quality gate result means for proceeding in 3 sentences.`

    case 'phase2':
      return `Explain the financial analysis results for a ${industry} business case.
Portfolio NPV: $${Number(val).toLocaleString()}. Average ROI: ${extra.avgROI || 0}% (${extra.benchmarkLabel || 'industry'} benchmark). Payback: ${extra.paybackMonths || '—'} months. Portfolio IRR: ${extra.portfolioIRR || '—'}%. Quality score: ${extra.qualityScore || 0}/100. Checks passing: ${extra.checksPass || 0} of 4.
Explain what these financial metrics mean for the investment decision in 3 sentences.`

    case 'phase3':
      return `Explain the Traceability analysis results for a ${industry} business case.
Traceability health score: ${val}/100 (${extra.healthLabel || 'unknown'}). Average confidence: ${extra.avgConf || 0}%. Coverage: ${extra.covPct || 0}%. Phase 4 gate: ${extra.p4Ready ? 'passed' : 'not passed'}. Checks passing: ${extra.tracePass || 0} of 4.
Explain what this traceability result means for the strength of the business case in 3 sentences.`

    case 'phase4':
      return `Explain the solution ranking results for a ${industry} business case.
Winning solution: ${extra.winner || 'unknown'} with composite score ${val}/100 and ROI of ${extra.winnerROI || 0}%. Benchmark ROI: ${extra.benchmarkROI || 0}%. Solutions ranked: ${extra.ranked || 0}. Phase 5 gate: ${extra.gateOk ? 'passed' : 'failed'}.
Status: ${extra.verdict || 'complete'}.
Explain what this ranking outcome means for the recommendation in 3 sentences.`

    case 'phase5':
      return `Explain the Executive Report results for a ${industry} business case.
Overall health: ${extra.overallStatus || 'unknown'}. Recommended solution: ${extra.recommendedSolution || 'unknown'}. Average ROI: ${val}%. Traceability coverage: ${extra.traceabilityPct || 0}%. Quality warnings: ${extra.qualityWarnings || 0}.
Headline: ${String(extra.headline || '').slice(0, 150)}.
Explain what this executive summary means for the final approval decision in 3 sentences.`

    default:
      return `Explain this BCA.AI result: phase=${phase}, metric=${metric}, value=${val}. Context: ${JSON.stringify(extra).slice(0, 300)}. Write 3 plain-English sentences explaining what this means for the business.`
  }
}

// ─── Route ───────────────────────────────────────────────────────
router.post('/explain', async (req, res) => {
  try {
    const { phase, metric, projectContext, metricValue, additionalContext } = req.body || {}

    if (!phase || !metric) {
      return res.status(400).json({ error: 'phase and metric are required' })
    }

    const ctx = { projectContext: projectContext || {}, metricValue, additionalContext: additionalContext || {} }
    const prompt = buildPrompt(phase, metric, ctx)

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }]
    })

    const explanation = response.content?.[0]?.text?.trim() || ''
    return res.json({ explanation })

  } catch (err) {
    console.error('[explain] error:', err.message)
    return res.status(500).json({ error: 'Failed to generate explanation. Please try again.' })
  }
})

export default router
