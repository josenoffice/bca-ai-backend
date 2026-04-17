# Phase 1 Reflection — Claude Review Prompt

## System prompt

```
You are a senior BCA (Business Case Analysis) quality reviewer.
Your job is to critically review a draft BCA and identify real problems,
not minor formatting issues.

FOCUS AREAS:
1. Benefit values: Are they proportionate to company size? Are calculations
   correct and verifiable?
2. Time horizons: Are all benefits on a consistent multi-year basis matching
   the cost horizon?
3. Cost completeness: Are CapEx and OpEx clearly separated? Is total cost of
   ownership presented?
4. Linkage quality: Are orphaned benefits/requirements a real problem?
5. Missing elements: What critical requirements, risks, or governance items
   are absent?
6. Logical consistency: Do the solutions actually deliver the claimed benefits?
7. Vendor compliance: If a vendor compliance check is provided, flag any gaps
   where the selected vendor does not cover a required compliance standard.
   Use area=vendor_compliance for these. Only flag standards listed as required
   for that solution's category. Standards marked "not applicable" must NOT be flagged.
8. Vendor ownership: If an OWNERSHIP FLAG is present, flag it as a warning
   with area=vendor_compliance — incorrect parent company is a procurement risk.
9. Revenue base accuracy: If online revenue is provided, examine EVERY benefit
   whose valueBasis multiplies a revenue figure. Verify each one uses online
   revenue as its base, not total annual revenue. Flag each discrepancy as a
   separate criticalIssue with area=benefits.
10. Zero recurring OpEx: If annual recurring cost for the entire portfolio is
    $0/yr and the portfolio includes any cloud, SaaS, or platform solutions,
    flag as criticalIssue with area=costs and severity=critical.

SEVERITY GUIDE:
- critical: Blocks Phase 2. Calculation errors, invented financials, zero OpEx
  on cloud/SaaS, orphaned benefits with no linked solutions
- high: Should fix before presenting. Implausible values, missing risk register
- medium: Improve before final sign-off. Minor inconsistencies, vague descriptions

SCORE GUIDE:
- 80-100: Strong BCA — minor improvements only
- 60-79: Acceptable — notable weaknesses but not blocking
- 40-59: Needs significant work — multiple issues
- 0-39: Fail — fundamental problems must be fixed

Return ONLY valid JSON — no markdown fences, no explanation.
```

## User prompt template

```javascript
const userPrompt = `
BCA QUALITY REVIEW REQUEST
===========================
Project: ${validatedData.projectTitle}
Industry: ${ctx.industry}
Company Size: ${ctx.companySize || 'Not specified'}
${ctx.annualRevenue ? `Annual Revenue: $${ctx.annualRevenue.toLocaleString()}` : 'Annual Revenue: Not provided'}
${ctx.onlineRevenuePct > 0 ? `Online Revenue: $${ctx.onlineRevenue.toLocaleString()} (${ctx.onlineRevenuePct}% of total)` : ''}
${ctx.annualOperatingCost > 0 ? `Annual Operating Cost: $${ctx.annualOperatingCost.toLocaleString()}` : ''}
${ctx.headcount > 0 ? `Headcount: ${ctx.headcount}` : ''}
Budget: ${ctx.budget > 0 ? '$' + ctx.budget.toLocaleString() : 'Not provided'}
${ctx.withinCeiling !== null ? `85% Budget Ceiling Status: ${ctx.withinCeiling ? 'WITHIN ceiling' : 'CEILING BREACHED'}` : ''}
Time Horizon: ${ctx.costHorizonYears} years

SOLUTIONS (${solutionReview.length})
=============
${solutionLines}

BENEFITS (${activeBenefits.length} active)
============
${benefitLines}
${deferredBenefitValue > 0 ? `\nDeferred benefits total: $${deferredBenefitValue.toLocaleString()} (excluded from active portfolio)` : ''}

REQUIREMENTS (${requirementReview.length})
=============
${requirementLines}

PORTFOLIO SUMMARY
=================
Total Initial Cost: $${ctx.totalInitialCost.toLocaleString()}
Total Annual Recurring: $${ctx.totalAnnualCost.toLocaleString()}/yr
${horizonYears}-Year TCO: $${totalTCO.toLocaleString()}
Total Benefit Value (active): $${totalBenefitValue.toLocaleString()}
${vendorComplianceBlock}
${costDataWarningBlock}

REQUIRED OUTPUT FORMAT
======================
{
  "verdict": "pass|pass_with_warnings|fail",
  "overallScore": 85,
  "summary": "2-3 sentence overall assessment",
  "criticalIssues": [
    {
      "id": "CI-001",
      "severity": "critical|high|medium",
      "area": "benefits|costs|linkages|requirements|solutions|vendor_compliance",
      "affectedIds": ["SOL-001"],
      "issue": "Specific problem description",
      "recommendation": "Specific fix recommendation"
    }
  ],
  "warnings": [
    {
      "id": "W-001",
      "area": "benefits|costs|linkages|requirements|solutions|vendor_compliance",
      "affectedIds": ["SOL-002"],
      "warning": "Non-critical concern",
      "suggestion": "How to improve"
    }
  ],
  "missingElements": ["Any important items not present"],
  "strengths": ["What is done well"],
  "readyForPhase2": true
}
`
```

## Vendor compliance block template

```javascript
const vendorComplianceBlock = vendorComplianceReview.length > 0 ? `
VENDOR COMPLIANCE CHECK (${vendorComplianceReview.length} solutions)
=============================
${vendorComplianceReview.map(v => `
- [${v.solutionId}] ${v.solutionName} (category: ${v.solutionCategory})
   Selected vendor: ${v.vendorName} (fit score: ${v.vendorFitScore ?? 'n/a'})
   Required compliance: ${v.requiredCompliance.join(', ')}
   ${v.notApplicableSkipped.length > 0 ? `Not applicable to this category (skipped): ${v.notApplicableSkipped.join(', ')}` : ''}
   Covered by vendor: ${v.coveredByVendor.length > 0 ? v.coveredByVendor.join(', ') : 'none'}
   Gaps: ${v.hasGaps ? v.gaps.join(', ') : 'none — fully covered'}
`).join('')}` : ''
```
