// ═══════════════════════════════════════════════════════════════════
// BCA.AI — Phase 5: Report Generation
// Pure JavaScript template assembly — NO Claude API call
// 6 sequential steps
// ═══════════════════════════════════════════════════════════════════
import { Router } from 'express'

const router = Router()

// ─── Utility ─────────────────────────────────────────────────────
const n = (v, fallback = 0) => {
  const num = Number(v)
  return Number.isFinite(num) ? num : fallback
}

function fmt(v) {
  return Math.round(n(v)).toLocaleString('en-US')
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ═════════════════════════════════════════════════════════════════
// Step 1 — extractAndNormalize
// ═════════════════════════════════════════════════════════════════
function extractAndNormalize(raw) {
  const rawSolutions = raw.solutions || []

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

  const benefits        = raw.benefits        || []
  const requirements    = raw.requirements    || []
  const recommendation  = raw.recommendation  || {}
  const financialsP4    = raw.financialsP4    || {}
  const sensitivity     = raw.sensitivity     || []
  const benefitSens     = raw.benefitSensitivity || []
  const budgetAnalysis  = raw.budgetAnalysis  || {}
  const executiveHealth = raw.executiveHealth || null
  const cbaSummary      = raw.cbaSummary      || { markdown: '', html: '' }
  const qualityScore    = raw.qualityScore    || {}
  const vendorData      = raw.vendorData      || []
  const timeline        = raw.timeline        || {}
  const phase5Contract  = raw.phase5Contract  || {}

  const traceability         = raw.traceability         || null
  const traceabilityCoverage = raw.traceabilityCoverage || raw.traceability || {}

  const financialsP4Missing = !financialsP4?.totalPVBenefit3y
  const withinCeiling = raw.withinCeiling ?? budgetAnalysis.withinCeiling ?? null

  const portfolioMetrics = raw.portfolioMetrics || null

  // User override fields
  const userOverride = {
    isOverride:              raw.isOverride              || recommendation?.isOverride || false,
    userSelectedSolutionId:  raw.userSelectedSolutionId  || recommendation?.userOverride?.userSelectedSolutionId || null,
    overrideReason:          raw.overrideReason          || recommendation?.userOverride?.overrideReason || null,
    aiRecommendedName:       raw.aiRecommendedSolutionId || recommendation?.aiRecommendation?.solutionId || null
  }

  const projectTitle = raw.project?.title || raw.projectMeta?.projectTitle || raw.validatedData?.projectTitle || 'BCA Report'
  const trackingId   = raw.trackingId || `req_${Date.now()}_p5`

  return {
    raw, solutions, benefits, requirements,
    recommendation, financialsP4, sensitivity, benefitSensitivity: benefitSens,
    budgetAnalysis, executiveHealth, cbaSummary, qualityScore,
    vendorData, timeline, phase5Contract, traceability, traceabilityCoverage,
    financialsP4Missing, withinCeiling, userOverride, portfolioMetrics,
    projectTitle, trackingId
  }
}

// ═════════════════════════════════════════════════════════════════
// Step 2 — validateAndSyncFinancials
// ═════════════════════════════════════════════════════════════════
function validateAndSyncFinancials(ctx) {
  const { recommendation, solutions, financialsP4, financialsP4Missing,
          withinCeiling, traceabilityCoverage, vendorData } = ctx

  const errors   = []
  const warnings = []

  // Hard errors
  if (!recommendation?.recommendedSolutionId)
    errors.push('Phase 4 recommendation missing: recommendedSolutionId')
  if (!recommendation?.ranking?.length)
    errors.push('Phase 4 ranking missing or empty')
  if (!solutions?.length)
    errors.push('Solutions array missing or empty')

  // Soft warnings
  if (financialsP4Missing)
    warnings.push('Missing Phase 4 portfolio financials — KPI cards may show blank')
  if (!financialsP4?.avgROIPct)
    warnings.push('Missing Phase 4 average ROI percentage')
  if (withinCeiling === false)
    warnings.push('Budget ceiling breached: total cost exceeds 85% of stated budget')
  if (traceabilityCoverage?.coveragePct < 60)
    warnings.push(`Low traceability coverage: ${traceabilityCoverage.coveragePct}%`)

  const hasVendorData       = Array.isArray(vendorData) && vendorData.length > 0
  const solutionsWithVendor = solutions.filter(s => s.vendorName).length
  if (!hasVendorData && solutionsWithVendor === 0)
    warnings.push('No vendor data — Phase 1.6 may not have run. Vendor fit defaulted to neutral in ranking.')

  const hasAuthoritative = solutions.some(s => s.financials?.npv != null) ||
    ctx.portfolioMetrics?.portfolio?.totalNPV != null

  ctx.validation = {
    ok: errors.length === 0,
    errors,
    warnings,
    financialsP4Missing,
    vendorDataPresent: hasVendorData || solutionsWithVendor > 0
  }
  ctx.hasAuthoritative = hasAuthoritative

  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 3 — buildExecutiveNarrative
// ═════════════════════════════════════════════════════════════════
function buildExecutiveNarrative(ctx) {
  const {
    recommendation, financialsP4, traceabilityCoverage, solutions,
    benefits, requirements, executiveHealth, withinCeiling,
    hasAuthoritative, userOverride, traceability
  } = ctx

  const ranking = recommendation.ranking || []
  const recId   = recommendation.recommendedSolutionId
  const recRow  = ranking.find(r => r.solutionId === recId) || ranking[0]
  const isOverride    = userOverride.isOverride
  const overrideReason = userOverride.overrideReason || 'No reason provided'
  const aiName         = userOverride.aiRecommendedName || null

  const recSol       = solutions.find(s => s.id === recId) || {}
  const recVendorName = recRow?.vendorName || recSol.vendorName || null
  const recFitScore   = recRow?.vendorFitScore ?? recSol.vendorFitScore ?? null
  const recCostLow    = recSol.vendorCostLow ?? null
  const recCostHigh   = recSol.vendorCostHigh ?? null

  const coverage = n(traceabilityCoverage?.coveragePct)

  // Check for compliance gaps on recommended vendor
  const vcList = traceability?.vendorCompliance || traceability?.vendorCompliancePerSolution || []
  const recVC  = vcList.find(v => v.solutionId === recId)
  const gaps   = recVC?.gaps || []
  const hasComplianceGap = gaps.length > 0

  // Quality warnings
  const qualityWarnings = []
  if (coverage < 60)
    qualityWarnings.push(`⚠️ Low traceability coverage (${coverage}%)`)
  if (!hasAuthoritative)
    qualityWarnings.push('⚠️ Missing authoritative Phase 2 financial metrics')
  if (ranking.length < 3)
    qualityWarnings.push(`⚠️ Limited solution comparison (${ranking.length} solutions)`)
  if (!financialsP4?.totalPVBenefit3y)
    qualityWarnings.push('⚠️ Missing portfolio PV benefit calculation')
  if (isOverride && aiName)
    qualityWarnings.push(`ℹ️ User override active — AI recommended "${aiName}". Reason: ${overrideReason}`)
  if (hasComplianceGap)
    qualityWarnings.push(`⚠️ Recommended solution vendor has compliance gaps: ${gaps.join(', ')}`)
  if (withinCeiling === false)
    qualityWarnings.push('⚠️ Budget ceiling breached: costs exceed 85% of stated budget')

  // Headline and blurb
  let headline, blurb

  if (!recRow) {
    headline = 'Recommendation Unavailable'
    blurb    = 'Phase 4 recommendation data not found. See portfolio comparison.'
  } else if (isOverride) {
    headline = `Selected (User Override): ${recRow.name}`
    const vendorPart = recVendorName
      ? ` Delivery partner: ${recVendorName}${recFitScore != null ? ` (fit score: ${recFitScore}/100)` : ''}.`
      : ''
    blurb = `User selected ${recRow.name} as the preferred option, overriding the AI recommendation${aiName ? ` (AI pick: ${aiName})` : ''}.${vendorPart} See override reason in quality indicators.`
  } else {
    headline = `Recommended: ${recRow.name}`
    const vendorPart = recVendorName
      ? ` Delivery partner: ${recVendorName}${recFitScore != null ? ` (fit score: ${recFitScore}/100)` : ''}.`
      : ''
    blurb = `Based on Phase 4 composite ranking, ${recRow.name} emerges as the preferred option.${vendorPart}`
  }

  ctx.executiveSummary = {
    headline,
    blurb,
    rationale: recommendation?.recommendationRationale || recRow?.rationale || '—',
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

  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 4 — cbaSummaryRenderer
// ═════════════════════════════════════════════════════════════════
function cbaSummaryRenderer(ctx) {
  const { cbaSummary } = ctx

  // Simple markdown → HTML for pipe tables
  function mdToSimpleHtml(markdown) {
    if (!markdown) return ''
    const lines = markdown.split('\n')
    let html = ''
    let inTable = false

    for (const line of lines) {
      const trimmed = line.trim()

      // Pipe table detection
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        // Separator row — skip
        if (/^\|[-:\s|]+\|$/.test(trimmed)) continue

        const cells = trimmed.split('|').slice(1, -1).map(c => c.trim())

        if (!inTable) {
          html += '<table><thead><tr>'
          cells.forEach(c => { html += `<th>${esc(c)}</th>` })
          html += '</tr></thead><tbody>'
          inTable = true
        } else {
          html += '<tr>'
          cells.forEach(c => { html += `<td>${esc(c)}</td>` })
          html += '</tr>'
        }
        continue
      }

      if (inTable) {
        html += '</tbody></table>'
        inTable = false
      }

      // Headings
      if (trimmed.startsWith('### '))      { html += `<h3>${esc(trimmed.slice(4))}</h3>`; continue }
      if (trimmed.startsWith('## '))       { html += `<h2>${esc(trimmed.slice(3))}</h2>`; continue }
      if (trimmed.startsWith('# '))        { html += `<h1>${esc(trimmed.slice(2))}</h1>`; continue }

      // Blockquote
      if (trimmed.startsWith('> '))        { html += `<blockquote>${trimmed.slice(2)}</blockquote>`; continue }

      // List items
      if (trimmed.startsWith('- '))        { html += `<li>${trimmed.slice(2)}</li>`; continue }

      // Bold + italic inline
      let processed = trimmed
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>')

      if (processed) html += `<p>${processed}</p>`
    }

    if (inTable) html += '</tbody></table>'
    return html
  }

  // Render markdown to HTML (supplement the Phase 4 html with rendered markdown)
  ctx.renderedCbaHtml = mdToSimpleHtml(cbaSummary.markdown)

  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 5 — exportHtml
// ═════════════════════════════════════════════════════════════════
function exportHtml(ctx) {
  const {
    projectTitle, trackingId, solutions, benefits, requirements,
    recommendation, financialsP4, sensitivity, benefitSensitivity,
    budgetAnalysis, executiveSummary, executiveHealth, cbaSummary,
    traceability, traceabilityCoverage, qualityScore, vendorData,
    timeline, withinCeiling, userOverride
  } = ctx

  const ranking    = recommendation.ranking || []
  const recId      = recommendation.recommendedSolutionId
  const recRow     = ranking.find(r => r.solutionId === recId) || ranking[0]
  const isOverride = userOverride.isOverride
  const aiName     = recommendation.aiRecommendation?.name || userOverride.aiRecommendedName || null
  const overrideReason = userOverride.overrideReason || 'No reason provided'

  const discountRate  = financialsP4.discountRate || 0.12
  const horizonYears  = financialsP4.horizonYears || 3

  // Vendor compliance lookup
  const vcList = traceability?.vendorCompliance || traceability?.vendorCompliancePerSolution || []
  const vcById = {}
  vcList.forEach(vc => { vcById[vc.solutionId] = vc })

  // Sanitise cbaSummary.html
  function sanitiseCbaHtml(html) {
    return String(html || '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '')
      .replace(/javascript:/gi, '')
  }

  // Phase breadcrumb
  const prevPhases = ctx.raw.phaseResults || []
  const breadcrumb = [
    ...prevPhases.filter(p => p.phase !== 5),
    {
      phase: 5, ok: true,
      metrics: {
        solutions: solutions.length,
        traceabilityCoveragePct: n(traceabilityCoverage?.coveragePct),
        exportEnabled: true
      }
    }
  ]
  ctx.breadcrumb = breadcrumb

  const pipelineStr = breadcrumb.map(p => `Phase ${p.phase} ${p.ok ? '✓' : '✗'}`).join(' → ')

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
        👤 <strong>User Override Active:</strong> AI recommended "${esc(aiName)}".
        User selected "${esc(recRow?.name)}". Reason: ${esc(overrideReason)}
       </div>`
    : ''

  // Quality warnings box
  const warningsHtml = executiveSummary.qualityWarnings.length > 0
    ? `<div class="warning-box">
        <strong>Quality Indicators:</strong>
        <ul>${executiveSummary.qualityWarnings.map(w => `<li>${w}</li>`).join('')}</ul>
       </div>`
    : ''

  // KPI cards
  const kpiCards = `
    <div>
      <div class="metric-card">
        <strong>$${fmt(financialsP4.totalPVBenefit3y)}</strong>
        <span>Portfolio PV (${horizonYears}Y)</span>
      </div>
      <div class="metric-card">
        <strong>${financialsP4.avgROIPct ?? '—'}%</strong>
        <span>Average ROI</span>
      </div>
      <div class="metric-card">
        <strong>${traceabilityCoverage?.coveragePct ?? '—'}%</strong>
        <span>Traceability</span>
      </div>
      <div class="metric-card">
        <strong>${esc(recRow?.vendorName || '—')}</strong>
        <span>Recommended Vendor</span>
      </div>
    </div>`

  // Portfolio overview table
  const portfolioRows = solutions.map(s => `
    <tr>
      <td>${esc(s.name)}</td>
      <td>$${fmt(s.totalCost || s.estimatedCostUSD || 0)}</td>
      <td>${esc(s.vendorName || '—')}</td>
      <td>${s.vendorFitScore != null ? s.vendorFitScore + '/100' : '—'}</td>
      <td>${esc(s.riskLevel || '—')}</td>
      <td>${s.deliveryPhase || '—'}</td>
    </tr>`).join('')

  // Ranking table
  const rankingRows = ranking.map(r => {
    const highlight = r.solutionId === recId
    const style = highlight ? ' style="background:#e8f5e9;font-weight:600"' : ''
    const badge = highlight ? (isOverride ? ' 👤 USER SELECTED' : ' ⭐ RECOMMENDED') : ''
    return `
    <tr${style}>
      <td>${r.rank}</td>
      <td>${esc(r.name)}${badge}</td>
      <td>${r.score}</td>
      <td>$${fmt(r.npv)}</td>
      <td>${Math.round(r.roiPct)}%</td>
      <td>${esc(r.riskLevel)}</td>
      <td>${esc(r.vendorName || '—')}</td>
      <td>${r.vendorFitScore != null ? r.vendorFitScore + '/100' : '—'}</td>
      <td>${r.paybackMonths != null ? r.paybackMonths + 'mo' : '—'}</td>
    </tr>`
  }).join('')

  // Vendor summary table
  const vendorRows = solutions.map(s => {
    const vc = vcById[s.id]
    const gapsList = vc?.gaps?.length ? vc.gaps.join(', ') : '✓ None'
    const costRange = (s.vendorCostLow != null && s.vendorCostHigh != null)
      ? `$${fmt(s.vendorCostLow)} – $${fmt(s.vendorCostHigh)}` : '—'
    return `
    <tr>
      <td>${esc(s.name)}</td>
      <td>${esc(s.vendorName || '—')}</td>
      <td>${s.vendorFitScore != null ? s.vendorFitScore + '/100' : '—'}</td>
      <td>${costRange}</td>
      <td>${s.selectedVendor?.complianceCoverage?.join(', ') || '—'}</td>
      <td>${gapsList}</td>
    </tr>`
  }).join('')

  // Benefits summary table
  const benefitRows = benefits.map(b => {
    const conf = b.confidence != null
      ? Math.round(b.confidence <= 1 ? b.confidence * 100 : b.confidence)
      : '—'
    return `
    <tr>
      <td>${esc(b.id)}</td>
      <td>${esc(b.category)}</td>
      <td>${esc(b.description)}</td>
      <td>$${fmt(b.annualizedValue || b.riskAdjustedValue || 0)}</td>
      <td>${conf}%</td>
      <td>${esc(b.valueBasis || '—')}</td>
    </tr>`
  }).join('')

  // Budget analysis table
  const ba = budgetAnalysis
  const budgetRows = `
    <tr><td>Total Initial Investment</td><td>$${fmt(ba.totalRecommendedCost || 0)}</td></tr>
    <tr><td>Total Budget</td><td>$${fmt(ba.budget || 0)}</td></tr>
    <tr><td>Budget Utilisation</td><td>${ba.budgetUtilizationPct ?? '—'}%</td></tr>
    <tr><td>Within Budget</td><td>${ba.withinBudget ? '✓ Yes' : '✗ No'}</td></tr>
    <tr><td>Within 85% Ceiling</td><td>${ba.withinCeiling ? '✓ Yes' : '✗ BREACHED'}</td></tr>`

  // Sensitivity table
  const sensRows = sensitivity.map(s => {
    const isBase = Math.abs(s.discountRate - discountRate) < 0.001
    const style = isBase ? ' style="font-weight:600;background:#e3f2fd"' : ''
    return `
    <tr${style}>
      <td>${Math.round(s.discountRate * 100)}%${isBase ? ' (base)' : ''}</td>
      <td>$${fmt(s.portfolioPVBenefit)}</td>
    </tr>`
  }).join('')

  // Benefit scenarios table
  const benefitScenarioRows = benefitSensitivity.map(s => `
    <tr>
      <td>${esc(s.label)}</td>
      <td>$${fmt(s.portfolioPV)}</td>
      <td>${s.portfolioROI}%</td>
    </tr>`).join('')

  // Timeline section
  const timelinePhases = timeline?.phases || []
  const timelineHtml = timelinePhases.length > 0
    ? `<h2>Project Timeline</h2>
       <table>
         <thead><tr><th>Phase</th><th>Start Week</th><th>End Week</th><th>Duration</th></tr></thead>
         <tbody>${timelinePhases.map(p => `
           <tr>
             <td>${esc(p.name)}</td>
             <td>Week ${p.startWeek}</td>
             <td>Week ${p.endWeek}</td>
             <td>${p.endWeek - p.startWeek + 1} weeks</td>
           </tr>`).join('')}
         </tbody>
       </table>
       <p class="note">Total duration: ${timeline?.projectTimeline?.totalDurationWeeks || '—'} weeks |
          Start: ${timeline?.projectTimeline?.projectStartDate || '—'}</p>`
    : ''

  // Assemble full HTML document
  const htmlDocument = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${esc(projectTitle)}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 24px; line-height: 1.6; color: #333; }
    h1,h2,h3 { margin: 0.6em 0 0.4em; color: #1976d2; }
    h1 { font-size: 28px; border-bottom: 3px solid #1976d2; padding-bottom: 8px; }
    h2 { font-size: 22px; margin-top: 24px; }
    h3 { font-size: 18px; margin-top: 16px; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 14px; }
    th, td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; }
    thead { background: #1976d2; color: white; }
    tbody tr:hover { background: #f5f5f5; }
    .note { color: #666; font-size: 0.9em; font-style: italic; }
    .banner { padding: 16px; background: #1976d2; color: white; border-radius: 8px; margin: 16px 0; }
    .banner strong { font-size: 18px; }
    .metric-card { display: inline-block; margin: 8px 12px 8px 0; padding: 12px 16px;
      background: #f8f9fa; border-left: 4px solid #1976d2; border-radius: 4px; }
    .metric-card strong { display: block; font-size: 24px; color: #1976d2; margin-bottom: 4px; }
    .metric-card span { font-size: 12px; color: #666; text-transform: uppercase; }
    .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px 16px; margin: 8px 0; }
    .info-box { background: #e3f2fd; border-left: 4px solid #1976d2; padding: 12px 16px; margin: 8px 0; }
  </style>
</head>
<body>

  <h1>${esc(projectTitle)}</h1>

  ${ceilingBannerHtml}
  ${overrideBannerHtml}

  <div class="banner">
    <strong>📊 ${isOverride ? 'Selected (User Override)' : 'Recommendation'}: ${esc(recRow?.name || '—')}</strong><br>
    <span>${esc(executiveSummary.rationale)}</span>
  </div>

  ${warningsHtml}

  <h2>Executive Summary</h2>
  <p>${esc(executiveSummary.blurb)}</p>

  ${kpiCards}

  <p class="note">Pipeline: ${pipelineStr}</p>

  <h2>Portfolio Overview</h2>
  <table>
    <thead><tr><th>Solution</th><th>Cost</th><th>Vendor</th><th>Fit</th><th>Risk</th><th>Phase</th></tr></thead>
    <tbody>${portfolioRows}</tbody>
  </table>

  ${sanitiseCbaHtml(cbaSummary.html || '')}

  <h2>Solution Ranking</h2>
  <table>
    <thead><tr><th>#</th><th>Solution</th><th>Score</th><th>PV(${horizonYears}Y)</th><th>ROI</th>
      <th>Risk</th><th>Vendor</th><th>Fit</th><th>Payback</th></tr></thead>
    <tbody>${rankingRows}</tbody>
  </table>

  <h2>Vendor Summary</h2>
  <table>
    <thead><tr><th>Solution</th><th>Vendor</th><th>Fit Score</th><th>Cost Range</th>
      <th>Compliance</th><th>Gaps</th></tr></thead>
    <tbody>${vendorRows}</tbody>
  </table>

  <h2>Benefits Summary</h2>
  <table>
    <thead><tr><th>ID</th><th>Category</th><th>Description</th>
      <th>Annual Value</th><th>Confidence</th><th>Source</th></tr></thead>
    <tbody>${benefitRows}</tbody>
  </table>

  <h2>Budget Analysis</h2>
  <table>
    <thead><tr><th>Metric</th><th>Value</th></tr></thead>
    <tbody>${budgetRows}</tbody>
  </table>

  <h2>Sensitivity Analysis — Discount Rate</h2>
  <table>
    <thead><tr><th>Discount Rate</th><th>Portfolio PV (${horizonYears}Y)</th></tr></thead>
    <tbody>${sensRows}</tbody>
  </table>

  <h2>Sensitivity Analysis — Benefit Scenarios</h2>
  <table>
    <thead><tr><th>Scenario</th><th>Portfolio PV</th><th>Portfolio ROI</th></tr></thead>
    <tbody>${benefitScenarioRows}</tbody>
  </table>

  ${timelineHtml}

  <h2>Methodology</h2>
  <p class="note">
    Scoring weights: NPV 35% | ROI 20% | Confidence 15% | Risk 15% | Vendor Fit 15%<br>
    Discount rate: ${Math.round(discountRate * 100)}% | Horizon: ${horizonYears} years<br>
    Quality score: ${qualityScore?.overallScore ?? '—'}/100<br>
    Tracking ID: ${trackingId}
  </p>

  <hr>
  <p class="note" style="text-align:center">
    © Nidhish Jose — BCA.AI Business Case Automation. All rights reserved.<br>
    Generated: ${new Date().toLocaleDateString()} | Tracking: ${trackingId}
  </p>

</body>
</html>`

  ctx.htmlDocument = htmlDocument
  return ctx
}

// ═════════════════════════════════════════════════════════════════
// Step 6 — harmonizer
// ═════════════════════════════════════════════════════════════════
function harmonizer(ctx) {
  const {
    raw, solutions, benefits, requirements, recommendation,
    executiveSummary, executiveHealth, financialsP4,
    budgetAnalysis, qualityScore, sensitivity, benefitSensitivity,
    traceability, traceabilityCoverage, cbaSummary, vendorData,
    timeline, validation, userOverride, htmlDocument,
    projectTitle, trackingId, breadcrumb, portfolioMetrics
  } = ctx

  return {
    status:     validation.ok ? 'success' : 'warning',
    phase:      5,
    trackingId,
    timestamp:  new Date().toISOString(),

    project: raw.project || { title: projectTitle, industry: raw.projectMeta?.industry || 'default' },
    projectMeta: raw.projectMeta || null,

    solutions,
    benefits,
    requirements,
    timeline,

    recommendation,
    executiveSummary,
    executiveHealth,
    financialsP4,
    financialSummary: raw.financialSummary || null,
    portfolioMetrics: portfolioMetrics || null,
    budgetAnalysis,
    qualityScore,
    sensitivity,
    benefitSensitivity,
    traceability,
    traceabilityCoverage,
    cbaSummary,

    export: {
      enabled: true,
      format:  'html',
      html:    htmlDocument
    },

    validation,
    userOverride: userOverride.isOverride ? userOverride : null,
    vendorData,
    phaseResults: breadcrumb
  }
}

// ═════════════════════════════════════════════════════════════════
// Route
// ═════════════════════════════════════════════════════════════════
router.post('/phase5', async (req, res) => {
  try {
    const raw = req.body

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

export default router
