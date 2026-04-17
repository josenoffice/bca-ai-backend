# Phase 5 — HTML Report Template Structure

## CSS (inject in `<style>` tag in `<head>`)

```css
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
```

## Document structure

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{projectTitle}</title>
  <style>/* CSS above */</style>
</head>
<body>

  <h1>{projectTitle}</h1>

  <!-- Ceiling breach banner (when withinCeiling === false) -->
  {ceilingBannerHtml}

  <!-- Override notice (when isOverride === true) -->
  {overrideBannerHtml}

  <!-- Recommendation banner -->
  <div class="banner">
    <strong>📊 {Recommendation|Selected (User Override)}: {recRow.name}</strong><br>
    <span>{executiveSummary.rationale}</span>
  </div>

  <!-- Quality warnings (when qualityWarnings.length > 0) -->
  <div class="warning-box">
    <strong>Quality Indicators:</strong>
    <ul>{qualityWarnings.map(w => <li>w</li>)}</ul>
  </div>

  <!-- Executive Summary -->
  <h2>Executive Summary</h2>
  <p>{executiveSummary.blurb}</p>

  <!-- KPI metric cards -->
  <div>
    <div class="metric-card">
      <strong>${formatNumber(financialsP4.totalPVBenefit3y)}</strong>
      <span>Portfolio PV (3Y)</span>
    </div>
    <div class="metric-card">
      <strong>{financialsP4.avgROIPct}%</strong>
      <span>Average ROI</span>
    </div>
    <div class="metric-card">
      <strong>{traceabilityCoverage.coveragePct}%</strong>
      <span>Traceability</span>
    </div>
    <div class="metric-card">
      <strong>{recommendation.ranking[0].vendorName || '—'}</strong>
      <span>Recommended Vendor</span>
    </div>
  </div>

  <!-- Phase breadcrumb -->
  <p class="note">Pipeline: {phaseResults.map(p => Phase p.phase p.ok?'✓':'✗').join(' → ')}</p>

  <!-- Portfolio Overview table -->
  <h2>Portfolio Overview</h2>
  <table>
    <thead><tr><th>Solution</th><th>Cost</th><th>Vendor</th><th>Fit</th><th>Risk</th><th>Phase</th></tr></thead>
    <tbody>
      {solutions.map(s => <tr>
        <td>{s.name}</td>
        <td>${formatNumber(s.totalCost)}</td>
        <td>{s.vendorName || '—'}</td>
        <td>{s.vendorFitScore != null ? s.vendorFitScore+'/100' : '—'}</td>
        <td>{s.riskLevel}</td>
        <td>{s.deliveryPhase}</td>
      </tr>)}
    </tbody>
  </table>

  <!-- CBA Summary (from cbaSummary.html) -->
  {sanitiseCbaHtml(cbaSummary.html)}

  <!-- Ranking Table -->
  <h2>Solution Ranking</h2>
  <table>
    <thead><tr><th>#</th><th>Solution</th><th>Score</th><th>PV(3Y)</th><th>ROI</th>
      <th>Risk</th><th>Vendor</th><th>Fit</th><th>Payback</th></tr></thead>
    <tbody>
      {ranking.map((r, i) => <tr style="{r.solutionId===recId ? 'background:#e8f5e9;font-weight:600' : ''}">
        <td>{i+1}</td>
        <td>{r.name} {r.solutionId===recId ? (isOverride ? '👤 USER SELECTED' : '⭐ RECOMMENDED') : ''}</td>
        <td>{r.score}</td>
        <td>${formatNumber(r.npv)}</td>
        <td>{r.roiPct}%</td>
        <td>{r.riskLevel}</td>
        <td>{r.vendorName || '—'}</td>
        <td>{r.vendorFitScore != null ? r.vendorFitScore+'/100' : '—'}</td>
        <td>{r.paybackMonths != null ? r.paybackMonths+'mo' : '—'}</td>
      </tr>)}
    </tbody>
  </table>

  <!-- Vendor Summary -->
  <h2>Vendor Summary</h2>
  <table>
    <thead><tr><th>Solution</th><th>Vendor</th><th>Fit Score</th><th>Cost Range</th>
      <th>Compliance</th><th>Gaps</th></tr></thead>
    <tbody>
      {solutions.map(s => {
        const vc = vendorComplianceById[s.id]
        return <tr>
          <td>{s.name}</td>
          <td>{s.vendorName || '—'}</td>
          <td>{s.vendorFitScore != null ? s.vendorFitScore+'/100' : '—'}</td>
          <td>{s.vendorCostLow && s.vendorCostHigh
            ? '$'+formatNumber(s.vendorCostLow)+' – $'+formatNumber(s.vendorCostHigh) : '—'}</td>
          <td>{s.selectedVendor?.complianceCoverage?.join(', ') || '—'}</td>
          <td>{vc?.gaps?.length ? vc.gaps.join(', ') : '✓ None'}</td>
        </tr>
      })}
    </tbody>
  </table>

  <!-- Recommended Solution Delivery Timeline (when available) -->
  {recDelivery ? <section>
    <h3>Delivery Timeline: {recRow.name}</h3>
    <table>
      <thead><tr><th>Phase</th><th>Duration</th></tr></thead>
      <tbody>{recDelivery.phases.map(p =>
        <tr><td>{p.name}</td><td>{p.months} months</td></tr>
      )}</tbody>
    </table>
  </section> : ''}

  <!-- Benefits Summary -->
  <h2>Benefits Summary</h2>
  <table>
    <thead><tr><th>ID</th><th>Category</th><th>Description</th>
      <th>Annual Value</th><th>Confidence</th><th>Source</th></tr></thead>
    <tbody>
      {benefits.map(b => <tr>
        <td>{b.id}</td>
        <td>{b.category}</td>
        <td>{b.description}</td>
        <td>${formatNumber(b.annualizedValue || b.riskAdjustedValue)}</td>
        <td>{Math.round((b.confidence <= 1 ? b.confidence * 100 : b.confidence))}%</td>
        <td>{b.valueBasis || '—'}</td>
      </tr>)}
    </tbody>
  </table>

  <!-- Budget Analysis -->
  <h2>Budget Analysis</h2>
  <table>
    <thead><tr><th>Metric</th><th>Value</th></tr></thead>
    <tbody>
      <tr><td>Total Initial Investment</td><td>${formatNumber(budgetAnalysis.totalRecommendedCost)}</td></tr>
      <tr><td>Total Budget</td><td>${formatNumber(budgetAnalysis.budget)}</td></tr>
      <tr><td>Budget Utilisation</td><td>{budgetAnalysis.budgetUtilizationPct}%</td></tr>
      <tr><td>Within Budget</td><td>{budgetAnalysis.withinBudget ? '✓ Yes' : '✗ No'}</td></tr>
      <tr><td>Within 85% Ceiling</td><td>{budgetAnalysis.withinCeiling ? '✓ Yes' : '✗ BREACHED'}</td></tr>
    </tbody>
  </table>

  <!-- Discount Rate Sensitivity -->
  <h2>Sensitivity Analysis — Discount Rate</h2>
  <table>
    <thead><tr><th>Discount Rate</th><th>Portfolio PV (3Y)</th></tr></thead>
    <tbody>
      {sensitivity.map(s => <tr style="{s.discountRate === discountRate ? 'font-weight:600;background:#e3f2fd' : ''}">
        <td>{Math.round(s.discountRate*100)}%{s.discountRate===discountRate ? ' (base)' : ''}</td>
        <td>${formatNumber(s.portfolioPVBenefit)}</td>
      </tr>)}
    </tbody>
  </table>

  <!-- Benefit Scenarios -->
  <h2>Sensitivity Analysis — Benefit Scenarios</h2>
  <table>
    <thead><tr><th>Scenario</th><th>Portfolio PV</th><th>Portfolio ROI</th></tr></thead>
    <tbody>
      {benefitSensitivity.map(s => <tr>
        <td>{s.label} ({s.description})</td>
        <td>${formatNumber(s.portfolioPV)}</td>
        <td>{s.portfolioROI}%</td>
      </tr>)}
    </tbody>
  </table>

  <!-- Methodology Note -->
  <h2>Methodology</h2>
  <p class="note">
    Scoring weights: NPV 35% | ROI 20% | Confidence 15% | Risk 15% | Vendor Fit 15%
    Discount rate: {Math.round(discountRate*100)}% | Horizon: {horizonYears} years
    Discovery method: {discoveryMethod} | Quality score: {qualityScore?.overallScore ?? '—'}/100
    Tracking ID: {trackingId}
  </p>

  <!-- Footer -->
  <hr>
  <p class="note" style="text-align:center">
    © Nidhish Jose — BCA.AI Business Case Automation. All rights reserved.<br>
    Generated: {new Date().toLocaleDateString()} | Tracking: {trackingId}
  </p>

</body>
</html>
```
