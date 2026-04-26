// ═══════════════════════════════════════════════════════════════════
// BCA.AI — Phase C: Plain English Summary View
// POST /api/plain-english
// Accepts: { phase, phaseData }
// Returns: { headline, what_it_means, key_numbers[], recommendation, confidence }
// ═══════════════════════════════════════════════════════════════════
import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'

const router = Router()
const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

// ─── System prompt ────────────────────────────────────────────────
const SYSTEM = `You are a business writing expert translating technical BCA analysis into plain English for senior executives.

Rules:
- Always reference actual numbers from the data (never say "strong" without giving the number)
- Write as if briefing a CEO who is intelligent but doesn't know DCF modelling
- Be direct — no hedging phrases like "it appears" or "it seems"
- key_numbers: exactly 3–5 items, each a complete plain-English sentence about one metric
- Maximum 100 words per text field

Respond ONLY with valid JSON — no markdown, no code fences:
{
  "headline": "One sentence: the single most important finding",
  "what_it_means": "2 sentences: what this means for the business decision",
  "key_numbers": ["Plain English sentence about each key metric"],
  "recommendation": "One clear sentence: what should happen next",
  "confidence": "One sentence: how reliable this analysis is and why"
}`

// ─── Phase-specific prompt builders ──────────────────────────────
function buildPrompt(phase, d) {
  const intro = 'Translate this BCA.AI analysis into plain English.\n\n'
  const fmt = v => Number(v || 0).toLocaleString('en-US')

  switch (phase) {
    case 'phase1':
      return intro + `PHASE 1 — DISCOVERY
Industry: ${d.industry || 'not specified'} | Company size: ${d.companySize || 'not specified'}
Budget: $${fmt(d.budget)}
Solutions identified: ${d.solutions?.length || 0} — ${(d.solutions || []).map(s => s.name).join(', ')}
Benefits quantified: ${d.benefitCount || 0} (total annual value ~$${fmt(d.totalBenefitValue)})
Budget utilisation: ${d.budgetUtil}% of approved budget
Quality score: ${d.qualityScore}/100
Gate status: ${d.verdict?.toUpperCase() || 'UNKNOWN'} — ${d.readyForPhase2 ? 'READY for financial analysis' : 'NOT READY — issues must be resolved'}
Reflection summary: "${d.reflectionSummary}"`

    case 'phase15':
      return intro + `PHASE 1.5 — COST ESTIMATION
Industry: ${d.industry || 'not specified'} | Budget: $${fmt(d.budget)}
Total cost of solutions: $${fmt(d.totalCost)}
Budget utilisation: ${d.budgetUtil}%
NPV of total cost of ownership: $${fmt(d.tcoNPV)} (discounted at ${Math.round((d.discountRate || 0.1) * 100)}%/yr)
Simple TCO (undiscounted): $${fmt(d.simpleTCO)}
Within budget: ${d.withinBudget ? 'YES' : 'NO'} | Budget ceiling breached: ${d.ceilingBreached ? 'YES' : 'NO'}
Solutions priced: ${(d.solutions || []).map(s => `${s.name} ($${fmt(s.cost)})`).join(', ')}`

    case 'phase16':
      return intro + `PHASE 1.6 — VENDOR ASSESSMENT for: ${d.solutionName}
Industry: ${d.industry || 'not specified'}
Vendors assessed: ${(d.vendors || []).length}
Rankings:
${(d.vendors || []).map(v => `  #${v.rank} ${v.name}: fit score ${v.fitScore}/100 (${v.fitLabel}), cost $${fmt(v.costLow)}–$${fmt(v.costHigh)}\n  Why recommended: ${v.whyRecommended}`).join('\n')}
Selected vendor: ${d.selectedVendor || 'not yet selected'}
Compliance gaps: ${(d.complianceGaps || []).join(', ') || 'none'}
Integration gaps: ${(d.integrationGaps || []).join(', ') || 'none'}`

    case 'reflection':
      return intro + `PHASE 1 REFLECTION — QUALITY REVIEW
Quality score: ${d.score}/100
Verdict: ${d.verdict?.toUpperCase() || 'UNKNOWN'}
Ready for Phase 2: ${d.readyForPhase2 ? 'YES' : 'NO'}
Critical issues: ${d.criticalIssues?.length || 0} — ${(d.criticalIssues || []).join('; ') || 'none'}
Warnings: ${d.warnings?.length || 0} — ${(d.warnings || []).join('; ') || 'none'}
Strengths: ${(d.strengths || []).join('; ') || 'none noted'}
Summary: "${d.summary}"`

    case 'phase2':
      return intro + `PHASE 2 — FINANCIAL ANALYSIS
Industry: ${d.industry || 'not specified'} | Benchmark context: ${d.benchmark}
Portfolio NPV: $${fmt(d.totalNPV)} ${d.totalNPV >= 0 ? '(positive — value-creating)' : '(negative — destroys value)'}
Average ROI: ${d.averageROI}% vs ${d.benchmarkROI}% industry benchmark
Portfolio IRR: ${d.portfolioIRR != null ? d.portfolioIRR + '%' : 'N/A'}
Payback period: ${d.paybackMonths != null ? d.paybackMonths + ' months' : 'N/A'}
Total TCO: $${fmt(d.totalTCO)}
Quality score: ${d.qualityScore}/100
Checks passing: ${d.checksPass} of 4
Solution-level: ${(d.solutions || []).map(s => `${s.name} NPV $${fmt(s.npv)}, ROI ${s.roi}%`).join(' | ')}`

    case 'phase3':
      return intro + `PHASE 3 — TRACEABILITY VALIDATION
Industry: ${d.industry || 'not specified'}
Traceability health score: ${d.healthScore}/100 (${d.healthLabel})
Requirement-solution coverage: ${d.coveredPairs} of ${d.theoreticalPairs} pairs covered
Average confidence in benefit estimates: ${d.avgConfidence}%
Ready for Phase 4 ranking: ${d.p4Ready ? 'YES' : 'NO'}
Estimated delivery: ${d.totalDurationWeeks} weeks, $${fmt(d.totalCost)}
Checks passing: ${d.checksPass} of 4`

    case 'phase4':
      return intro + `PHASE 4 — SOLUTION RANKING
Industry: ${d.industry || 'not specified'} | Benchmark ROI: ${d.benchmarkROI}%
WINNER: ${d.winner} — composite score ${d.winnerScore}/100, ROI ${d.winnerROI}%, NPV $${fmt(d.winnerNPV)}, risk: ${d.winnerRisk}
Phase 5 gate: ${d.gateOk ? 'PASSED' : 'FAILED'}
Full ranking:
${(d.ranked || []).map(r => `  #${r.rank} ${r.name}: ${r.score}/100`).join('\n')}`

    case 'phase5':
      return intro + `PHASE 5 — EXECUTIVE REPORT
Industry: ${d.industry || 'not specified'}
Overall health: ${d.overallHealth?.toUpperCase() || 'UNKNOWN'}
Headline: "${d.headline}"
Recommended solution: ${d.recommendedSolution}
Average ROI: ${d.avgROI}%
Portfolio PV (${d.horizonYears}yr): $${fmt(d.totalPV)}
Traceability coverage: ${d.traceabilityPct}%
Quality warnings: ${d.qualityWarnings}`

    default:
      return intro + `Phase: ${phase}\nData: ${JSON.stringify(d).slice(0, 1000)}`
  }
}

// ─── Route ───────────────────────────────────────────────────────
router.post('/plain-english', async (req, res) => {
  try {
    const { phase, phaseData } = req.body || {}

    if (!phase) {
      return res.status(400).json({ error: 'phase is required' })
    }

    const prompt = buildPrompt(phase, phaseData || {})

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }]
    })

    const raw = response.content?.[0]?.text?.trim() || '{}'

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      // Try to extract JSON from the response if it has extra text
      const match = raw.match(/\{[\s\S]*\}/)
      parsed = match ? JSON.parse(match[0]) : { error: 'Could not parse response' }
    }

    return res.json(parsed)

  } catch (err) {
    console.error('[plain-english] error:', err.message)
    return res.status(500).json({ error: 'Failed to generate plain English summary. Please try again.' })
  }
})

export default router
