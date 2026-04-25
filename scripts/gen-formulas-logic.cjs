'use strict';
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak
} = require('docx');
const fs = require('fs');
const path = require('path');

const NAVY='1B3A5C',TEAL='0D6B8C',GREEN='1A5C2E',PURPLE='5B2C6F',
      AMBER='FFF3CD',GREEN_BG='D4EDDA',LBLUE='EBF5FB',PURPLE_BG='F4ECF7',
      RED_BG='FADBD8',LGRAY='F5F6F8',MGRAY='E8EAED',WHITE='FFFFFF',
      BLACK='1A1A2E',DKGRAY='4A4A6A',CODE_BG='F0F0F5',ORANGE_BG='FEF3E8';

function b(c){return{style:BorderStyle.SINGLE,size:1,color:c||'CCCCCC'};}
function nb(){return{style:BorderStyle.NONE,size:0,color:'FFFFFF'};}
function ab(c){const x=b(c);return{top:x,bottom:x,left:x,right:x};}
function nbs(){const x=nb();return{top:x,bottom:x,left:x,right:x};}

function para(text,opts){
  opts=opts||{};
  return new Paragraph({spacing:{before:opts.before||0,after:opts.after||60},alignment:opts.align||AlignmentType.LEFT,
    children:[new TextRun({text:text,bold:opts.bold||false,size:opts.size||20,color:opts.color||BLACK,
      font:opts.mono?'Courier New':'Arial',italics:opts.italic||false})]});
}
function code(text){return new Paragraph({spacing:{before:0,after:40},
  children:[new TextRun({text:text,size:18,color:'2E4057',font:'Courier New'})]});}
function sp(n){return new Paragraph({spacing:{before:0,after:n},children:[]});}

function cell(children,fill,w,opts){
  opts=opts||{};
  return new TableCell({width:{size:w,type:WidthType.DXA},shading:{fill:fill||WHITE,type:ShadingType.CLEAR},
    borders:opts.borders||ab('CCCCCC'),margins:{top:opts.mt||80,bottom:opts.mb||80,left:opts.ml||100,right:opts.mr||100},
    verticalAlign:opts.va||VerticalAlign.TOP,columnSpan:opts.span||1,
    children:Array.isArray(children)?children:[children]});
}

function fullRow(children,fill,borders){
  return new TableRow({children:[new TableCell({width:{size:9360,type:WidthType.DXA},
    shading:{fill:fill||WHITE,type:ShadingType.CLEAR},borders:borders||nbs(),
    margins:{top:100,bottom:100,left:140,right:140},
    children:Array.isArray(children)?children:[children]})]});
}
function fullTable(rows){return new Table({width:{size:9360,type:WidthType.DXA},columnWidths:[9360],rows:rows});}

function banner(label,title,subtitle,fill){
  return fullTable([fullRow([
    para(label,{bold:true,size:16,color:'AACCEE'}),
    para(title,{bold:true,size:26,color:WHITE}),
    subtitle?para(subtitle,{size:18,color:'AACCEE',italic:true}):sp(4),
  ],fill||NAVY,nbs())]);
}

function formulaBox(label,lines){
  return fullTable([
    fullRow([para(label,{bold:true,size:17,color:NAVY})],LGRAY,nbs()),
    fullRow(lines.map(l=>code(l)),CODE_BG,nbs())
  ]);
}

function callout(icon,title,bodyLines,fill){
  return fullTable([fullRow(
    [para(icon+'  '+title,{bold:true,size:18,color:NAVY})].concat(
      bodyLines.map(l=>para(l,{size:19,color:BLACK}))),fill||AMBER,nbs())]);
}

function headerRow(widths,labels,fills){
  return new TableRow({children:labels.map((h,i)=>new TableCell({
    width:{size:widths[i],type:WidthType.DXA},
    shading:{fill:fills&&fills[i]?fills[i]:NAVY,type:ShadingType.CLEAR},
    borders:ab('336699'),margins:{top:80,bottom:80,left:100,right:100},
    children:[para(h,{bold:true,size:17,color:WHITE})]}))});
}

function dataRow(widths,vals,rowBg){
  const fills=rowBg?[LGRAY,LBLUE,WHITE,GREEN_BG,PURPLE_BG,AMBER,ORANGE_BG]
                   :[MGRAY,'D5EEF8',LGRAY,'C7E5CC','E8D8F0','F5E8C0','FDE8D0'];
  return new TableRow({children:vals.map((v,i)=>new TableCell({
    width:{size:widths[i],type:WidthType.DXA},
    shading:{fill:fills[i%fills.length],type:ShadingType.CLEAR},
    borders:ab('CCCCCC'),margins:{top:80,bottom:80,left:100,right:100},
    children:[para(v,{size:17,color:BLACK})]}))});
}

function mtable(widths,hdrs,hdrFills,rows){
  return new Table({width:{size:9360,type:WidthType.DXA},columnWidths:widths,
    rows:[headerRow(widths,hdrs,hdrFills)].concat(rows.map((r,i)=>dataRow(widths,r,i%2===0)))});
}

// ═══ DOCUMENT ═══════════════════════════════════════════════════════
const C=[];

// COVER
C.push(fullTable([fullRow([
  sp(40),
  para('BCA.AI — COMPLETE TECHNICAL REFERENCE',{bold:true,size:18,color:'AACCEE',align:AlignmentType.CENTER}),
  para('Formulas, Scoring Logic',{bold:true,size:48,color:WHITE,align:AlignmentType.CENTER}),
  para('& Recommendation Engine',{bold:true,size:48,color:WHITE,align:AlignmentType.CENTER}),
  sp(20),
  para('Every algorithm, weight, constant, threshold, and decision rule — extracted directly from all 9 route files',{size:20,color:'AACCEE',italic:true,align:AlignmentType.CENTER}),
  sp(40),
  para('SOURCE FILES: phase1.js · phase1-reflection.js · phase15.js · phase16.js · phase2.js · phase3.js · phase4.js · phase5.js · phase6.js',{size:16,color:'AACCEE',align:AlignmentType.CENTER}),
  sp(40),
],NAVY,nbs())]));
C.push(sp(120));
C.push(mtable([2340,2340,2340,2340],['Version','Date','Total Lines','Coverage'],null,[['v1.1','April 2026','7,191 lines','100% of formulas']]));
C.push(new Paragraph({children:[new PageBreak()]}));

// ══════════════════════════════════════════════════════════════
// PHASE 1 — SOLUTION DISCOVERY
// ══════════════════════════════════════════════════════════════
C.push(banner('PHASE 1','Solution Discovery Engine','routes/phase1.js  ·  Claude Haiku (max_tokens 8192) + JS template fallback  ·  NO pure-JS path uses API'));
C.push(sp(80));

C.push(para('1.1  Dual-Path Architecture',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(mtable([2200,3580,3580],['','💬 AI Path (Claude Haiku)','📋 Template Path (JS)'],[NAVY,TEAL,'2E6DA4'],[
  ['Trigger','discoverWithAI=true (default: true)','Always runs in parallel as safety net'],
  ['Model','claude-haiku-4-5-20251001  max_tokens:8192','Pure JS — zero API cost'],
  ['Attempts','Up to 2 retries on validation failure','1 attempt, always succeeds'],
  ['Result used','AI path if passes ALL validation checks','Fallback if AI fails or invalid'],
  ['Status field','discoveryMethod: "ai_generated"','discoveryMethod: "template_based"'],
]));
C.push(sp(80));

C.push(para('1.2  Budget Ceiling Rule  (CEILING_PCT = 0.85)',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('routes/phase1.js  —  CEILING_PCT constant',[
  'usable_ceiling = budget × 0.85        // 85% of user budget → max allowable solution spend',
  'protected_reserve = budget × 0.15     // 15% contingency — never allocated to solutions',
  '',
  'IF sum(solution costs) > usable_ceiling:',
  '  budgetCeilingBreached = true',
  '  status = "warning"  (not error — analysis still runs)',
  '  recommendation.push("Review scope to fit within 85% ceiling")',
]));
C.push(sp(80));

C.push(para('1.3  Cost Split by Solution Category  (COST_SPLITS constant)',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(para('Applied to both template-generated and AI-generated solutions. Breakdown must sum to totalCost.',{size:19,color:BLACK}));C.push(sp(60));
C.push(mtable([2100,1100,1000,1100,1000,1060,1000],
  ['Category','Labour','Licensing','Infrastr.','Testing','Training','Contingency'],
  [NAVY,TEAL,TEAL,TEAL,TEAL,TEAL,TEAL],[
  ['security_compliance','45%','20%','10%','12%','8%','5%'],
  ['frontend_modernization','55%','10%','12%','12%','7%','4%'],
  ['backend_infrastructure','50%','15%','18%','10%','4%','3%'],
  ['ecommerce_optimization','52%','12%','14%','12%','6%','4%'],
  ['cloud_modernization','40%','8%','30%','10%','7%','5%'],
  ['process_optimization','55%','8%','10%','12%','10%','5%'],
  ['general_modernization','50%','12%','15%','12%','7%','4%'],
]));
C.push(sp(80));

C.push(para('1.4  Benefit Value Anchors — 3 Tiers',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('Anchor pre-calculations (sent as context in AI prompt)',[
  'onlineRevenue      = annualRevenue × (onlineRevenuePct / 100)',
  'revenueUplift1pct  = onlineRevenue × 0.01',
  'revenueUplift2pct  = onlineRevenue × 0.02',
  'opCostSaving3pct   = annualOperatingCost × 0.03',
  'opCostSaving5pct   = annualOperatingCost × 0.05',
  'costPerEmployee    = annualOperatingCost / headcount',
]));
C.push(sp(60));
C.push(mtable([1500,2000,4060,1800],['Tier','Condition','Benefit Values Used','Confidence'],[NAVY,NAVY,NAVY,NAVY],[
  ['Tier 1 — Financials','annualRevenue OR annualOperatingCost provided','Revenue: 2%×onlineRev · Efficiency: 5%×opCost · Risk: 15%×budget · Perf: 3%×opCost · CX: 1%×onlineRev','0.65–0.85'],
  ['Tier 2 — Budget','Budget > 0, no financials','Revenue: 40%×budget · Efficiency: 30%×budget · Risk: 25%×budget · Perf: 25%×budget · CX: 30%×budget','0.60'],
  ['Tier 3 — Benchmark','No financials, no budget','Revenue: $50K · Efficiency: $40K · Risk: $35K · Perf: $30K · CX: $45K (all /yr)','0.50'],
]));
C.push(sp(80));

C.push(para('1.5  Jaccard Similarity — Cross-Reference Auto-Repair',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('linkageValidator() in routes/phase1.js',[
  '// Tokenizer: lowercase → strip non-alphanumeric → split on spaces',
  'tokens(text) = text.toLowerCase().replace(/[^a-z0-9]+/g," ").split(" ").filter(Boolean)',
  '',
  '// Jaccard similarity between solution and benefit/requirement text',
  'intersection = |tokens(A) ∩ tokens(B)|',
  'union        = |tokens(A)| + |tokens(B)| - intersection',
  'jaccardScore = intersection / union',
  '',
  '// Link is created ONLY IF BOTH conditions are true:',
  'LINK if: jaccardScore >= 0.30  AND  sharedTokens.length >= 2',
  '',
  '// Applied when: solution.linkedBenefits.length < 2  OR  solution.linkedRequirements.length < 2',
  '',
  '// Linking confidence stored per solution:',
  'benefitConfidence  = average(jaccard(solution, each linked benefit))',
  'reqConfidence      = average(jaccard(solution, each linked requirement))',
]));
C.push(sp(80));

C.push(para('1.6  Mandatory AI Prompt Rules',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(mtable([2600,6760],['Rule','Detail'],[NAVY,NAVY],[
  ['5+5+5 structure','Exactly 5 solutions · 5 benefits · 5 requirements. Never fewer.'],
  ['Requirements split','3 must_have + 2 should_have (non-negotiable)'],
  ['Cross-ref minimum','Each solution: ≥3 linkedBenefits AND ≥3 linkedRequirements. Each benefit/req: ≥1 linkedSolution.'],
  ['Compliance mandate','IF complianceRequirements.length > 0: MUST have exactly 1 solution with category="security_compliance", deliveryPhase=1'],
  ['Delivery phases','Phase 1: Foundation (security, data). Phase 2: Core capability. Phase 3: Optimisation. Sequential dependency enforced.'],
  ['Budget ceiling','AI told: total costs ≤ budget×0.85. Must note 15% contingency reserve.'],
  ['Risk Mitigation','Required benefit. Must link to every solution handling payment/personal/regulated data.'],
  ['Strategic Value','Phase 3 solutions ONLY — never assign to Phase 1 or 2 deliveries.'],
  ['No invented figures','When no financials provided: AI must NOT fabricate revenue, headcount, or customer counts. Flagged by inventedPattern regex check.'],
  ['Benefit caps (no financials)','Revenue: max 40%×budget/yr · Efficiency: 30% · Risk: 25% · Strategic: 30%'],
]));
C.push(sp(80));

C.push(para('1.7  Template Solution Costs  (fallback path only)',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('buildSolutionTemplates() — template fallback only',[
  'perSolution = round(ceiling / 5)     // evenly split 85% budget across 5 solutions',
  'cost[i]     = round(perSolution × (0.8 + Math.random() × 0.4))',
  '              // random variance ±20% around per-solution share',
  '',
  'costEstimate.low  = round(cost × 0.8)',
  'costEstimate.high = round(cost × 1.3)',
]));
C.push(new Paragraph({children:[new PageBreak()]}));

// ══════════════════════════════════════════════════════════════
// PHASE 1 REFLECTION
// ══════════════════════════════════════════════════════════════
C.push(banner('PHASE 1 REFLECTION','Quality Gate & BCA Review','routes/phase1-reflection.js  ·  Claude Haiku (max_tokens 4096)  ·  2 attempts','5B2C6F'));
C.push(sp(80));

C.push(callout('🎯','This is a QUALITY REVIEW, not a formula',[
  'Claude Haiku reads the full BCA output (solutions, benefits, requirements, costs, vendor data)',
  'and returns a structured JSON verdict. The review is contextual — it reasons about proportionality,',
  'completeness, and logical consistency. The 10 focus areas are the review instructions sent to the AI.',
],PURPLE_BG));
C.push(sp(80));

C.push(para('2.1  Score Guide (sent to Claude in SYSTEM_PROMPT)',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(mtable([1800,2760,4800],['Score Range','Verdict','Meaning'],[NAVY,NAVY,NAVY],[
  ['80–100','pass / pass_with_warnings','Strong BCA — minor improvements only. readyForPhase2=true'],
  ['60–79','pass_with_warnings','Acceptable — notable weaknesses but not blocking. readyForPhase2=true'],
  ['40–59','pass_with_warnings','Needs significant work — multiple issues. readyForPhase2=true unless critical'],
  ['0–39','fail','Fundamental problems must be fixed. readyForPhase2=FORCED false'],
]));
C.push(sp(80));

C.push(para('2.2  10 Focus Areas Reviewed by Claude',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(mtable([400,2400,6560],['#','Area','What Claude Checks'],[NAVY,NAVY,NAVY],[
  ['1','Benefit proportionality','Are benefit values proportionate to company size? Calculations correct and verifiable?'],
  ['2','Time horizons','Are all benefits on a consistent multi-year basis matching the cost horizon?'],
  ['3','Cost completeness','Are CapEx and OpEx clearly separated? Is TCO presented?'],
  ['4','Linkage quality','Are orphaned benefits/requirements a real problem?'],
  ['5','Missing elements','What critical requirements, risks, or governance items are absent?'],
  ['6','Logical consistency','Do the solutions actually deliver the claimed benefits?'],
  ['7','Vendor compliance gaps','For each solution: does selected vendor cover required compliance standards? (Uses COMPLIANCE_EXCLUSIONS — see below)'],
  ['8','Vendor ownership','If OWNERSHIP FLAG present: flag vendor parent company mismatch as procurement risk'],
  ['9','Revenue base accuracy','Examine EVERY benefit whose valueBasis multiplies revenue. Must use onlineRevenue NOT total annualRevenue.'],
  ['10','Zero recurring OpEx','If totalAnnualRecurring=$0 AND portfolio includes cloud/SaaS solutions → flag as CRITICAL'],
]));
C.push(sp(80));

C.push(para('2.3  COMPLIANCE_EXCLUSIONS  (hardcoded constant)',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(para('These solution categories are exempt from PCI-DSS compliance checks — enforced per-solution before Claude is called:',{size:19,color:BLACK}));C.push(sp(60));
C.push(mtable([3600,5760],['Solution Category','PCI-DSS Required?'],[NAVY,NAVY],[
  ['ecommerce_optimization','YES — [] means no exclusions, all compliance checked'],
  ['backend_infrastructure','YES — [] means no exclusions'],
  ['security_compliance','YES — [] means no exclusions'],
  ['cloud_modernization','YES — [] means no exclusions'],
  ['frontend_modernization','NO — PCI-DSS excluded: ["PCI-DSS"]'],
  ['process_optimization','NO — PCI-DSS excluded: ["PCI-DSS"]'],
  ['general_modernization','NO — PCI-DSS excluded: ["PCI-DSS"]'],
]));
C.push(sp(80));

C.push(para('2.4  Severity Rules & Gate Logic',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('parseReviewResponse() — post-processing rules',[
  '// Severity levels: critical | high | medium',
  '// critical → blocks Phase 2:',
  '//   - Calculation errors, invented financials',
  '//   - Zero OpEx on cloud/SaaS portfolio',
  '//   - Orphaned benefits with no linked solutions',
  '',
  '// Force readyForPhase2 = false if ANY critical issue exists:',
  'criticalCount = criticalIssues.filter(i => i.severity === "critical").length',
  'if (criticalCount > 0) review.readyForPhase2 = false',
  '',
  '// Auto-vendor warnings — injected AFTER Claude response:',
  '// If vendor compliance gaps exist AND Claude did not already flag them:',
  '// autoAddVendorWarnings() appends W-AUTO-VC-N warnings automatically',
  '',
  '// 3-year TCO per solution (sent to Claude for review):',
  'threeYearTCO = capEx + (recurringAnnualCost × horizonYears)',
]));
C.push(sp(80));

C.push(para('2.5  Online Revenue Calculation  (for revenue base accuracy check)',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('buildReviewContext() — onlineRevenue sent to Claude',[
  'onlineRevenue = round(annualRevenue × onlineRevenuePct / 100)',
  '// Claude checks: does each benefit use onlineRevenue as base, not annualRevenue?',
  '// Benefits using total revenue instead of online revenue are flagged as criticalIssue area=benefits',
]));
C.push(new Paragraph({children:[new PageBreak()]}));

// ══════════════════════════════════════════════════════════════
// PHASE 1.5 — COST ESTIMATION
// ══════════════════════════════════════════════════════════════
C.push(banner('PHASE 1.5','Cost Estimation Engine','routes/phase15.js  ·  Claude Haiku (max_tokens 8192)  ·  Market-rate cost refinement + TCO'));
C.push(sp(80));

C.push(para('3.1  What Phase 1.5 Does',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(mtable([2400,6960],['Item','Detail'],[NAVY,NAVY],[
  ['Input','Phase 1 solutions with initial cost estimates. Active solutions only (deferred excluded).'],
  ['Process','Claude Haiku reviews tech stack, integrations, compliance, and vendor anchor prices → returns refined 3-point estimates'],
  ['recurringAnnualCost','MANDATORY for every solution. Must be realistic non-zero for cloud/SaaS/hosted. Includes licences, hosting, support.'],
  ['descopedPortfolio','Returned ONLY when sum(mid) > budget×0.85. Actions: keep_full_scope | reduce_scope | defer'],
  ['Fallback (breakdown=0)','If AI breakdown sums to 0: default = 50% labour, 12% licensing, 15% infra, 12% testing, 7% training, 4% contingency'],
  ['2 attempts','Retries once if first AI response returns empty estimates'],
]));
C.push(sp(80));

C.push(para('3.2  TCO Formulas  (Phase 1.5)',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('harmonizeResponse() — two TCO variants',[
  '// Simple TCO (undiscounted)',
  'simpleTCO = totalImplementationCost + (totalAnnualRecurring × horizonYears)',
  '',
  '// NPV TCO (discounted recurring costs only)',
  'npvRecurring = Σ [ totalAnnualRecurring / (1 + discountRate)^t ]   for t=1..horizonYears',
  'npvTCO       = totalImplementationCost + npvRecurring',
  '',
  '// discountRate source:',
  'if (discountRatePct provided): discountRate = discountRatePct / 100',
  'else: discountRate = 0.08  (default 8%)   discountRateSource = "default_8pct"',
  '',
  '// Vendor cost mismatch warning (auto-generated):',
  'if (AI estimate.mid > vendorCostHigh × 1.3): warn "vendor_cost_mismatch"',
  '',
  '// Cost range defaults if AI omits them:',
  'low  = mid × 0.80',
  'high = mid × 1.30',
]));
C.push(sp(80));

C.push(para('3.3  Rescoping Logic  (when ceiling breached)',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('Budget ceiling breach → rescopingRecommendation',[
  '// Triggered when: sum(costEstimate.mid) > budget × 0.85',
  '// AI returns descopedPortfolio with action per solution:',
  '//   keep_full_scope | reduce_scope | defer',
  '',
  'descopedTotal = sum(adjustedMid for non-deferred solutions)',
  'fitsWithinCeiling = descopedTotal <= budget × 0.85',
  '',
  '// Budget status labels:',
  '"within_ceiling" = totalMid <= budget × 0.85',
  '"exceeds_ceiling" = totalMid > budget × 0.85  OR  totalMid > budget',
]));
C.push(new Paragraph({children:[new PageBreak()]}));

// ══════════════════════════════════════════════════════════════
// PHASE 1.6 — VENDOR SCORING
// ══════════════════════════════════════════════════════════════
C.push(banner('PHASE 1.6','Vendor Selection Engine','routes/phase16.js  ·  Claude Haiku recommends 3-5 vendors per solution with fitScore'));
C.push(sp(80));

C.push(para('4.1  Vendor Fit Score Scale',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(mtable([1200,2000,6160],['Score','Label','Meaning  (from SYSTEM_PROMPT)'],[NAVY,NAVY,NAVY],[
  ['90–100','Excellent Fit','Near-perfect fit. Built for this industry/use case. Budget aligned. All compliance covered.'],
  ['75–89','Strong Fit','Strong match with minor gaps. Recommended for most scenarios.'],
  ['60–74','Good Fit','Reasonable fit with some customization needed. Consider as alternate.'],
  ['< 60','EXCLUDED','Vendors scoring below 60 are filtered OUT automatically. Never shown.'],
]));
C.push(sp(80));

C.push(para('4.2  Ranking, Selection & User Override',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('Vendor selection algorithm',[
  '1. AI proposes 3-5 vendors per solution with fitScore',
  '2. vendors.filter(v => v.fitScore >= 60)   // exclude below-threshold',
  '3. vendors.sort((a,b) => b.fitScore - a.fitScore)  // descending',
  '4. vendors.map((v,i) => ({ ...v, rank: i+1 }))    // re-rank 1..N',
  '5. selectedVendor = rank 1  (unless userSelectedVendorName override provided)',
  '6. selectionMethod = "auto_rank1" | "user_override"',
]));
C.push(sp(80));

C.push(para('4.3  Implementation Timeline Phase Weights',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(mtable([2800,1480,1480,1800,1800],['Category','Discovery %','Setup/Build %','Integration/Test %','Go-Live %'],[NAVY,TEAL,TEAL,TEAL,TEAL],[
  ['security_compliance','15%','30%','20% + Testing 25%','10%'],
  ['All other categories (DEFAULT_WEIGHTS)','15%','55%','25%','5%'],
  ['Vendor custom phases (if provided)','phase[0]/total×100','phase[1]/total×100','phase[2]/total×100','phase[3]/total×100'],
]));
C.push(sp(80));

C.push(para('4.4  Compliance Gap Detection',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('Vendor compliance check per solution',[
  '// Normalize standard names: strip hyphens/underscores/spaces → uppercase',
  'normStd = c => c.replace(/[-_\\s]+/g,"").toUpperCase()',
  '',
  'globalCompliance = user.complianceRequirements.map(normStd)',
  'vendorCoverage   = vendor.complianceCoverage.map(normStd)',
  '',
  '// Per-solution compliance score:',
  'coveredStandards     = globalCompliance.filter(s => vendorCoverage.includes(s))',
  'gaps                 = globalCompliance.filter(s => !vendorCoverage.includes(s))',
  'vendorComplianceScore = coveredStandards.length / globalCompliance.length × 100',
  '',
  '// Overall portfolio compliance:',
  'allCovered = all vendors flattened complianceCoverage (normalized)',
  'complianceGaps = globalCompliance.filter(s => !allCovered.has(s))',
]));
C.push(new Paragraph({children:[new PageBreak()]}));

// ══════════════════════════════════════════════════════════════
// PHASE 2 — FINANCIAL ANALYSIS
// ══════════════════════════════════════════════════════════════
C.push(banner('PHASE 2','Financial Analysis Engine','routes/phase2.js  ·  Pure JavaScript mathematics  ·  ZERO Claude API calls  ·  11 sequential steps'));
C.push(sp(80));
C.push(callout('⚡','Phase 2 makes NO API calls',['Every number is deterministic mathematics. All projections are fully auditable and reproducible.'],GREEN_BG));
C.push(sp(80));

C.push(para('5.1  Industry Configuration Table  (INDUSTRY_CONFIGS)',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(para('User-supplied discountRatePct ALWAYS overrides the industry default:',{size:19,color:BLACK}));C.push(sp(60));
C.push(mtable([1900,1200,1300,1200,1560,1700,1500],['Industry','Discount Rate','Benefit Mult.','Risk Penalty','Benchmark ROI','Payback (mo)','Notes'],[NAVY,TEAL,TEAL,TEAL,TEAL,TEAL,TEAL],[
  ['retail','12%','1.00×','0.08','200%','15',''],
  ['ecommerce','14%','1.05×','0.09','220%','12',''],
  ['technology','10%','1.10×','0.07','250%','10',''],
  ['finance / financial_services / banking','9%','0.95×','0.06','180%','18','3 aliases same config'],
  ['healthcare','11%','0.90×','0.10','150%','24',''],
  ['manufacturing','11%','0.95×','0.08','160%','20',''],
  ['logistics','12%','0.95×','0.09','155%','18',''],
  ['government','7%','0.85×','0.07','120%','30','AAFES uses this'],
  ['education','8%','0.88×','0.07','130%','28',''],
  ['insurance','10%','0.92×','0.08','170%','20',''],
  ['energy','10%','0.93×','0.09','165%','22',''],
  ['default','12%','1.00×','0.08','150%','18','Fallback if unknown'],
]));
C.push(sp(80));

C.push(para('5.2  Requirement Cost Estimation',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('requirementEstimator()  —  CATEGORY_COSTS and COMPLEXITY_MULTIPLIER',[
  'REQ_BASE = $15,000',
  '',
  'CATEGORY_COSTS (flat overrides — used if category matches):',
  '  integration:       $60,000',
  '  compliance:        $70,000',
  '  security:          $50,000',
  '  performance:       $30,000',
  '  mobile:            $35,000',
  '  user_experience:   $15,000',
  '  change_management: $20,000',
  '',
  'COMPLEXITY_MULTIPLIER: { 1→0.5, 2→0.8, 3→1.0, 4→1.5, 5→2.0 }',
  '',
  'If category NOT in CATEGORY_COSTS:',
  '  estimatedCost = REQ_BASE × complexity × COMPLEXITY_MULTIPLIER[complexity]',
  '  Example: complexity=4 → $15,000 × 4 × 1.5 = $90,000',
]));
C.push(sp(80));

C.push(para('5.3  Benefit Annualization',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('benefitCalculator()',[
  '// Industry multiplier applied once (phase2Adjusted flag prevents double-applying)',
  'lifetimeValue  = baseValue × config.benefitMultiplier  (if not already adjusted)',
  '',
  '// riskAdjustedValue from Phase 1 is a LIFETIME total → annualize it',
  'annualizedValue = round(lifetimeValue / horizonYears)',
  '',
  '// Confidence normalization:',
  'if (confidence > 1 && confidence <= 100): confidence = confidence / 100  // convert 0-100 to 0-1',
  'confidence = clamp(confidence, 0, 1)',
]));
C.push(sp(80));

C.push(para('5.4  Core Financial Formulas',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('NPV  —  Net Present Value',[
  'NPV = -cost + Σ [ annualBenefit / (1 + discountRate)^y ]   for y = 1 to horizonYears',
  '',
  'AAFES example: cost=$4.2M · annualBenefit=$2.8M (linked benefits sum) · rate=7% · years=3',
  '  = -4,200,000 + 2,800,000/1.07 + 2,800,000/1.07² + 2,800,000/1.07³',
  '  ≈ $3.15M base  →  $8.4M after industry benefitMultiplier and linked benefit aggregation',
]));
C.push(sp(60));
C.push(formulaBox('ROI  —  Return on Investment',[
  'ROI = ((annualBenefit × horizonYears) - cost) / cost × 100',
  '// Output: integer (e.g. 312 = 312%)',
]));
C.push(sp(60));
C.push(formulaBox('IRR  —  Internal Rate of Return  (Bisection method)',[
  '// Find rate r such that NPV(r) = 0',
  '// Binary search with up to 60 iterations per bound attempt',
  '// Upper bounds tried in order: 2.0 (200%), 10.0 (1000%), 50.0 (5000%)',
  '// Convergence threshold: |NPV(mid)| < $0.01',
  '// Result: integer percentage (e.g. 34 means IRR ≈ 34%)',
  '',
  'IRR = null if: annualBenefit <= 0 OR cost <= 0',
  'irrExceedsCapacity = true if: NPV > 0 even at 5000% rate',
]));
C.push(sp(60));
C.push(formulaBox('Payback Period',[
  'paybackMonths = round((cost / annualBenefit) × 12)',
  '// Phase 2 version: no cap',
  '// Phase 4 version (financialsPVROI): paybackMonths = ceil(cost / (annualNet/12)), capped at 120 months',
]));
C.push(sp(60));
C.push(formulaBox('Discounted Cash Flows per year',[
  'dcf[0] = -cost                                // Year 0: initial investment (negative)',
  'dcf[y] = round(annualBenefit / (1+r)^y)       // Year 1..N: present value of annual benefit',
  'breakEvenYear = first y where cumulative(dcf) >= 0',
]));
C.push(sp(60));
C.push(formulaBox('NPV Range using vendor cost anchors',[
  'npvLow  = NPV(vendorCostLow,  annualBenefit, discountRate, years)   // best case (low cost)',
  'npvHigh = NPV(vendorCostHigh, annualBenefit, discountRate, years)   // worst case (high cost)',
  '// Only computed if vendorCostLow / vendorCostHigh provided by Phase 1.6',
]));
C.push(sp(80));

C.push(para('5.5  Portfolio-Level Calculations',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('portfolioAggregator()',[
  'totalInitialCost     = sum(solution.totalCost for all active solutions)',
  'totalAnnualRecurring = sum(solution.recurringAnnualCost)',
  'totalTCO             = totalInitialCost + (totalAnnualRecurring × horizonYears)',
  'totalBenefit         = sum(solution.annualBenefit)',
  'totalNPV             = sum(solution.npv)',
  'averageROI           = average of positive ROIs only  (negative ROIs excluded)',
  'portfolioIRR         = IRR(totalInitialCost, totalBenefit - totalAnnualRecurring, years)',
  'paybackMonths        = (totalTCO / totalBenefit) × 12  (only if totalBenefit > 0)',
  'budgetUtilizationPct = (totalTCO / budget) × 100',
]));
C.push(sp(80));

C.push(para('5.6  Sensitivity Analysis  (Phase 2)',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('riskAnalyzer() — 3-point discount rate + confidence-modulated benefit bands',[
  '// DISCOUNT RATE SENSITIVITY: 3 scenarios (±2%)',
  'optimistic:   portfolio NPV at (discountRate - 0.02)',
  'base:         portfolio NPV at discountRate',
  'conservative: portfolio NPV at (discountRate + 0.02)',
  '',
  '// BENEFIT SCENARIOS: confidence-modulated (per solution)',
  '// confidence = linking.confidence.benefits (0-1)',
  'worst = sum(annualBenefit[i] × (0.70 + confidence[i] × 0.10))   // e.g. conf=0.8 → 78%',
  'best  = sum(annualBenefit[i] × (1.25 + confidence[i] × 0.15))   // e.g. conf=0.8 → 137%',
  'base  = sum(annualBenefit[i])',
]));
C.push(sp(80));

C.push(para('5.7  Traceability Health Score  (Phase 2)',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('traceabilityHealth() — blended score',[
  '// Structural linkage:',
  'covered          = sum(linkedBenefits.length + linkedRequirements.length per solution)',
  'theoretical      = min(solutions×benefits, solutions×requirements)',
  'rawLinkageScore  = min(100, round(covered / theoretical × 100))',
  '',
  '// Semantic score (Jaccard-based confidence):',
  'semanticScore    = min(100, round(average((benefitConf+reqConf)/2 per solution) × 100))',
  '',
  '// Blended (Phase 2):',
  'healthScore = round(rawLinkageScore × 0.60 + semanticScore × 0.40)',
]));
C.push(sp(80));

C.push(para('5.8  Phase 2 Overall Quality Score',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('responseHarmonizer() — composite quality metric',[
  'traceScore    = traceability.healthScore  (0-100)',
  'budgetScore   = 100  if withinBudget=true',
  '              = max(0, 100 - (budgetUtilizationPct-100) × 3)  if over budget',
  '              = 70   if budget unknown',
  'npvPositive   = % of solutions with NPV > 0  (0-100)',
  'incomingScore = Phase 1 reflection overallScore (0-100), default 50 if unavailable',
  '',
  'phase2Score = round(traceScore×0.30 + budgetScore×0.25 + npvPositive×0.25 + incomingScore×0.20)',
]));
C.push(new Paragraph({children:[new PageBreak()]}));

// ══════════════════════════════════════════════════════════════
// PHASE 3 — TRACEABILITY VALIDATION
// ══════════════════════════════════════════════════════════════
C.push(banner('PHASE 3','Traceability Validation Engine','routes/phase3.js  ·  Pure JavaScript  ·  11 sequential steps  ·  ZERO API calls'));
C.push(sp(80));

C.push(para('6.1  Confidence Scoring  (Step 5)',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('confidenceScoring()',[
  '// Per-solution confidence buckets:',
  'low:  confidenceScore < 60',
  'med:  60 <= confidenceScore < 75',
  'high: confidenceScore >= 75',
  '',
  'avgConfidence = round(sum(confidenceScore per solution) / solutions.length)',
  '',
  '// Flag high-risk low-confidence solutions:',
  'highRiskLowConf = solutions where riskLevel==="High" AND confidenceScore < 65',
]));
C.push(sp(80));

C.push(para('6.2  Fulfillment Score  (Step 6)',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('calculateFulfillment() — per-solution traceability score',[
  '// Requirement coverage (inverse complexity scoring):',
  'reqCoverage[rid] = max(50, 100 - complexity × 10)',
  '  // complexity=1 → 90  · complexity=3 → 70  · complexity=5 → 50',
  'reqOverall = average(reqCoverage across all linked requirements)',
  '',
  '// Benefit contribution:',
  'benContrib[bid] = annualizedValue × (confidenceScore / 100)',
  'benOverall      = average(confidenceScore across all linked benefits)',
  '',
  '// Traceability score (geometric mean):',
  'traceabilityScore = round(sqrt(reqOverall × benOverall))   if BOTH > 0',
  '                  = max(reqOverall, benOverall)              if ONE is 0',
]));
C.push(sp(80));

C.push(para('6.3  Timeline Builder  (Step 7)',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('timelineBuilder() — portfolio timeline with sequential adjustment',[
  '// Per-solution effective timeline:',
  'if (vendorMonths > 0): effectiveWeeks = ceil(vendorMonths × 4)',
  'else:                  effectiveWeeks = timelineWeeks  (from Phase 1)',
  '',
  '// DEFAULT_WEIGHTS: { discovery:15, build:55, test:25, goLive:5 }',
  '// Overridden by vendor.deliveryTimeline.phases if provided',
  '',
  '// Portfolio duration:',
  'maxWeeks = max(solution.timelineWeeks)',
  'totalDuration = maxWeeks  (deliveryModel = "parallel")',
  '',
  '// Sequential adjustment for shared requirements on critical path:',
  'sharedReqCount = count of requirements shared between consecutive CP solutions',
  'IF sharedReqCount > 0:',
  '  overheadPct  = min(0.50, sharedReqCount × 0.20)  // max 50% overhead',
  '  totalDuration = ceil(maxWeeks × (1 + overheadPct))',
  '  deliveryModel = "sequential_adjusted"',
  '',
  '// 4 standard portfolio phases (% of totalDuration):',
  '"Discovery & Design"    : weeks 1 → 15% of total',
  '"Build & Integrate"     : weeks 16% → 70%',
  '"Test & Validate"       : weeks 71% → 95%',
  '"Go-Live & Hypercare"   : weeks 96% → 100%',
]));
C.push(sp(80));

C.push(para('6.4  Traceability Health  (Step 8) — Phase 3 formula is DIFFERENT from Phase 2',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('traceabilityCoverage() — per-solution balance score',[
  '// Per-solution balance:',
  'benCount = (solToBen.get(s.id)).size',
  'reqCount = (solToReq.get(s.id)).size',
  '',
  'if benCount=0 AND reqCount=0: score = 0',
  'if benCount=0 OR  reqCount=0: score = 30  // partial linkage penalty',
  'else: score = round(min(benCount,reqCount) / max(benCount,reqCount) × 100)',
  '',
  'rawLinkageScore = average(perSolutionScores)',
  '',
  '// Blend with Phase 2 vendor compliance scores (if available):',
  'IF phase2VendorCompliance.length > 0:',
  '  avgVendorCompliance = average(vendorComplianceScore per evaluated solution)',
  '  healthScore = round(rawLinkageScore × 0.70 + avgVendorCompliance × 0.30)',
  'ELSE:',
  '  healthScore = rawLinkageScore',
  '',
  '// ⚠️ NOTE: Phase 3 traceability uses balance score (min/max ratio)',
  '// Phase 2 traceability uses structural count + Jaccard semantic blending',
  '// They produce different numbers for the same data',
]));
C.push(sp(80));

C.push(para('6.5  Critical Path Algorithm  (Step 4)',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('dependencyDetection()',[
  '// Score each solution for dependency criticality:',
  'reqToSolCount[rid] = count of solutions that depend on requirement rid',
  '',
  'criticalScore[sol] = sum(reqToSolCount[rid] for each rid in sol.depends_on_requirements) × 2',
  '                   + sol.timelineWeeks',
  '',
  '// Top 3 by criticalScore = critical path',
  'criticalPath = topN(3, solutions, by criticalScore descending)',
]));
C.push(sp(80));

C.push(para('6.6  Executive Health Badge  (Step 9)',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('executiveHealthBadge() — linkage + finance coverage',[
  'fullyLinked      = solutions where delivers_benefits.length > 0 AND depends_on_requirements.length > 0',
  'withFinance      = solutions where (cost > 0) AND (linkedBenefits.length > 0)',
  '',
  'linkageRate      = round(fullyLinked / solutions.length × 100)',
  'financeCoverage  = round(withFinance  / solutions.length × 100)',
  '',
  'status = "green"  if linkageRate >= 90 AND financeCoverage >= 90',
  'status = "amber"  if linkageRate >= 70 AND financeCoverage >= 70',
  'status = "red"    otherwise',
]));
C.push(new Paragraph({children:[new PageBreak()]}));

// ══════════════════════════════════════════════════════════════
// PHASE 4 — RANKING & RECOMMENDATION
// ══════════════════════════════════════════════════════════════
C.push(banner('PHASE 4','Ranking & Recommendation Engine','routes/phase4.js  ·  Pure JavaScript  ·  10 sequential steps  ·  ZERO API calls  ·  THE recommendation formula'));
C.push(sp(80));
C.push(callout('🎯','Phase 4 produces THE recommendation',['compositeScore is the ONLY ranking criterion. NPV alone does NOT determine the winner.',
  'The system re-runs its own financial calculations (Step 2) using Phase 4 industry configs.',
  'Phase 4 industry configs include riskPenalty applied to benefits — different from Phase 2.'],LBLUE));
C.push(sp(80));

C.push(para('7.1  Scoring Weights  (W constant — hardcoded)',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('const W in routes/phase4.js lines 35-41',[
  'W = {',
  '  npv:         0.35,   // 35% — Present value of risk-adjusted benefits',
  '  roi:         0.20,   // 20% — Return on investment %',
  '  confidence:  0.15,   // 15% — Solution confidence/strategic alignment score',
  '  riskPenalty: 0.15,   // 15% — Risk level (inverted: lower risk → higher score)',
  '  vendorFit:   0.15    // 15% — Vendor fit score from Phase 1.6',
  '}',
  '// Total: 0.35 + 0.20 + 0.15 + 0.15 + 0.15 = 1.00 ✓',
]));
C.push(sp(80));

C.push(para('7.2  Phase 4 Financial Re-Calculation  (Step 2 — uses riskPenalty on benefits)',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('financialsPVROI() — risk-adjusted present value',[
  '// Portfolio average benefit as fallback (if solution has no annualBenefit):',
  'portfolioBenefitAvg = sum(annualBenefit) / solutions.length',
  'rawBenefit = s.annualBenefit ?? portfolioBenefitAvg',
  '',
  '// Risk-adjusted annual net:',
  'annualNet = max(0, rawBenefit × benefitMult - cost × riskPenalty)',
  '// benefitMult and riskPenalty from INDUSTRY_CONFIG (same table as Phase 2)',
  '',
  '// Present value of benefits over horizon:',
  'pvBenefit = Σ [ annualNet / (1 + discountRate)^y ]   for y=1..horizonYears',
  '',
  '// ROI with 1 decimal precision:',
  'roiPct = cost > 0 ? round(((annualNet×years - cost) / cost) × 100 × 10) / 10 : 0',
  '',
  '// Payback months (CAPPED at 120 months):',
  'monthly      = annualNet / 12',
  'rawPayback   = monthly > 0 ? ceil(cost / monthly) : null',
  'paybackMonths = rawPayback ? min(rawPayback, 120) : null',
  'paybackCapped = rawPayback > 120   // flag if capped',
]));
C.push(sp(80));

C.push(para('7.3  Sensitivity Analysis  (Phase 4 — 5-POINT rate + 3 benefit scenarios)',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('sensitivity() — 5 discount rate points + Pessimistic/Base/Optimistic',[
  '// DISCOUNT RATE SENSITIVITY: 5 points (Phase 4 is more granular than Phase 2)',
  'rateDeltas = [-0.04, -0.02, 0, +0.02, +0.04]',
  'rate = max(0.01, discountRate + delta)   // floor at 1%',
  'portfolioPV[rate] = Σ solutions: pvBenefit(annualNet, rate, years)',
  '',
  '// BENEFIT SENSITIVITY: 3 scenarios with FIXED multipliers (no confidence modulation)',
  'Pessimistic: multiplier=0.70  "Benefits 30% below estimate"',
  'Base:        multiplier=1.00  "Benefits as estimated"',
  'Optimistic:  multiplier=1.20  "Benefits 20% above estimate"',
  '',
  '// Per scenario, per solution:',
  'adjustedAnnualBenefit = annualNet × multiplier',
  'solPV  = pvBenefit(adjustedAnnualBenefit, discountRate, years)',
  'solROI = (solPV - solCost) / solCost × 100',
  '',
  '// Portfolio-level ROI for each scenario:',
  'portfolioROI = (portfolioPV - totalCost) / totalCost × 100',
]));
C.push(sp(80));

C.push(para('7.4  Min-Max Normalization',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('normalize() — applied to all 5 composite dimensions',[
  'N[i] = (value[i] - min) / (max - min)',
  '// Edge case: if ALL values equal → N[i] = 0.5 for all solutions',
  '',
  'N_npv[i]         = normalize(solutions.map(s => s.phase4.pvBenefit3y))',
  'N_roi[i]         = normalize(solutions.map(s => s.phase4.roiPct))',
  'N_conf[i]        = normalize(solutions.map(s => s.confidenceScore || 70))',
  'N_riskPenalty[i] = riskPenaltyScore(s.riskLevel)   // NOT normalized — direct mapping',
  'N_vendorFit[i]   = normalize(solutions.map(s => s.vendorFitScore ?? 0))',
  '                   // If ALL vendorFitScore=null → N_vendorFit[i] = 0.5 for all',
]));
C.push(sp(80));

C.push(para('7.5  Risk Penalty Score  (direct mapping, not normalized)',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(mtable([2400,2400,4560],['riskLevel','riskPenaltyScore','Effect on composite (W.riskPenalty × (1 - score))'],[NAVY,NAVY,NAVY],[
  ['"Low"','0.0','0.15 × (1-0.0) = 0.15  ← FULL weight (best outcome)'],
  ['"Medium"','0.4','0.15 × (1-0.4) = 0.09'],
  ['"High"','1.0','0.15 × (1-1.0) = 0.00  ← ZERO contribution (worst outcome)'],
]));
C.push(sp(80));

C.push(para('7.6  The Composite Score Formula  — THE RECOMMENDATION',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('rankingAndRecommendation() — compositeScore',[
  'compositeScore[i] =',
  '  W.npv        × N_npv[i]              +   // 35% × normalized PV benefit',
  '  W.roi        × N_roi[i]              +   // 20% × normalized ROI%',
  '  W.confidence × N_conf[i]             +   // 15% × normalized confidence',
  '  W.riskPenalty × (1 - N_riskPenalty[i]) + // 15% × inverted risk penalty',
  '  W.vendorFit  × N_vendorFit[i]            // 15% × normalized vendor fit',
  '',
  '// Stored with 3 decimal precision: round(score × 1000) / 1000',
  '',
  '// Sort descending by compositeScore → ranked[0] = RECOMMENDED',
  'recommendation = ranked[0]',
  '',
  '// User override: user can select different solution via userSelectedSolutionId',
  '// When overridden: isOverride=true, aiRecommendation stored separately',
]));
C.push(sp(80));

C.push(para('7.7  Rationale Generation Logic',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(mtable([1200,8160],['Rank','Auto-Generated Rationale Rule'],[NAVY,NAVY],[
  ['Rank 1','If hasMaxNPV: "Highest NPV ($Xk)" + if ROI>100: "strong ROI (Y%)" + if conf≥75: "high confidence (Z%)" + if risk=low: "low risk profile" + "Best balance of returns and certainty"'],
  ['Rank 2','"Competitive financials (NPV: $Xk, ROI: Y%)" + IF risk=high: "HIGH RISK — risk penalty reduced score despite strong returns" ELSE: "slightly lower confidence or higher risk than top choice"'],
  ['Rank 3+','IF risk=low: "Lowest risk with acceptable returns" ELSE: "Lower composite score — consider as Phase 2 or Phase 3 delivery candidate"'],
]));
C.push(sp(80));

C.push(para('7.8  Executive Health Badges  (Phase 4)',{bold:true,size:22,color:NAVY}));C.push(sp(40));
C.push(formulaBox('harmonizer() — three health dimensions',[
  '// Budget health:',
  'budgetStatus = "green"  if withinBudget=true',
  '             = "red"    if withinBudget=false',
  '             = "amber"  if unknown',
  '',
  '// Traceability health (uses Phase 4 coveragePct):',
  'traceStatus = "green"  if coveragePct >= 60',
  '            = "amber"  if coveragePct >= 40',
  '            = "red"    otherwise',
  '',
  '// Confidence health (overall from Phase 3):',
  'confStatus = "green"  if overallConfidence >= 70',
  '           = "amber"  if overallConfidence >= 50',
  '           = "red"    otherwise',
  '',
  '// Overall status: worst of the three',
  'overallStatus = "red"   if any = red',
  '              = "amber" if any = amber (no red)',
  '              = "green" if all = green',
]));
C.push(new Paragraph({children:[new PageBreak()]}));

// ══════════════════════════════════════════════════════════════
// QUICK REFERENCE TABLE
// ══════════════════════════════════════════════════════════════
C.push(banner('QUICK REFERENCE','All Formulas at a Glance','Complete one-page summary for narration and NotebookLM'));
C.push(sp(80));

C.push(mtable([1200,2600,5560],['Phase','Formula','Expression / Rule'],[NAVY,NAVY,NAVY],[
  ['Ph 1','Budget ceiling','usable = budget × 0.85  |  reserve = budget × 0.15'],
  ['Ph 1','Benefit Tier 1','Revenue: 2%×onlineRev · Efficiency: 5%×opCost · Risk: 15%×budget'],
  ['Ph 1','Benefit Tier 2','Revenue 40%, Efficiency 30%, Risk 25%, CX 30%  (all × budget)'],
  ['Ph 1','Jaccard link','score = intersection/union ≥ 0.30  AND  sharedTokens ≥ 2'],
  ['Ph 1','Template cost','perSolution = ceil/5 · cost = perSol × (0.8 + rand×0.4)'],
  ['Ph 1 Refl','Score gate','80-100=Strong · 60-79=Acceptable · 40-59=Work needed · 0-39=Fail'],
  ['Ph 1 Refl','Critical gate','ANY critical issue → readyForPhase2=false (forced)'],
  ['Ph 1 Refl','TCO per solution','capEx + (recurringAnnual × years)'],
  ['Ph 1 Refl','Online revenue','annualRevenue × onlineRevenuePct/100'],
  ['Ph 1 Refl','PCI-DSS exclusions','frontend_modernization, process_optimization, general_modernization'],
  ['Ph 1.5','NPV TCO','totalImpl + Σ(recurring/(1+r)^t) for t=1..years'],
  ['Ph 1.5','Simple TCO','totalImpl + (recurring × years)'],
  ['Ph 1.5','Cost range','low=mid×0.80 · high=mid×1.30'],
  ['Ph 1.5','Vendor mismatch','warn if AI mid > vendorCostHigh × 1.30'],
  ['Ph 1.6','Vendor excluded','fitScore < 60 → filtered out'],
  ['Ph 1.6','Compliance score','coveredStandards / requiredStandards × 100'],
  ['Ph 2','Benefit mult','lifetimeValue = baseValue × config.benefitMultiplier'],
  ['Ph 2','Annualize','annualizedValue = lifetimeValue / horizonYears'],
  ['Ph 2','NPV','−cost + Σ(benefit/(1+r)^y) for y=1..years'],
  ['Ph 2','ROI','(benefit×years−cost)/cost × 100  (integer)'],
  ['Ph 2','IRR','Bisection: 60 iter · bounds 2.0/10.0/50.0 · threshold $0.01'],
  ['Ph 2','Payback','(cost/annualBenefit)×12 months  (no cap in Ph 2)'],
  ['Ph 2','TCO','initialCost + (recurring × years)'],
  ['Ph 2','Sensitivity (rate)','3-point: base ± 2%'],
  ['Ph 2','Sensitivity (benefit)','worst=(0.70+conf×0.10)×base · best=(1.25+conf×0.15)×base'],
  ['Ph 2','Traceability','rawLinkage×0.60 + semantic×0.40'],
  ['Ph 2','Quality score','trace×0.30 + budget×0.25 + npv+%×0.25 + incoming×0.20'],
  ['Ph 3','Req coverage','max(50, 100 − complexity×10) per requirement'],
  ['Ph 3','Traceability (Ph3)','balance = min(benLinks,reqLinks)/max × 100 · 30 if one=0 · 0 if both=0'],
  ['Ph 3','Traceability blend','rawLinkage×0.70 + avgVendorCompliance×0.30 (if data)'],
  ['Ph 3','Fulfillment','sqrt(reqOverall × benOverall)  geometric mean'],
  ['Ph 3','Critical path score','(sharedReqCount per solution) × 2 + timelineWeeks'],
  ['Ph 3','Sequential overhead','overheadPct = min(0.50, sharedReqCount×0.20)'],
  ['Ph 3','Exec health (green)','linkageRate ≥ 90% AND financeCoverage ≥ 90%'],
  ['Ph 4','annualNet','max(0, benefit×benefitMult − cost×riskPenalty)'],
  ['Ph 4','ROI precision','(annualNet×years−cost)/cost × 100 × 10/10  (1 decimal)'],
  ['Ph 4','Payback (capped)','ceil(cost/(annualNet/12)) · max=120 months'],
  ['Ph 4','Sensitivity (rate)','5-point: ±4%, ±2%, base (more granular than Ph 2)'],
  ['Ph 4','Sensitivity (benefit)','3 fixed: Pessimistic=0.70× · Base=1.00× · Optimistic=1.20×'],
  ['Ph 4','Normalize','(v−min)/(max−min) · 0.5 if all equal'],
  ['Ph 4','Risk score','High=1.0 · Medium=0.4 · Low=0.0'],
  ['Ph 4','Composite','0.35×N_npv + 0.20×N_roi + 0.15×N_conf + 0.15×(1−risk) + 0.15×N_vendor'],
  ['Ph 4','Recommended','compositeScore ranked descending → rank 1 = recommendation'],
  ['Ph 4','Exec green','budget+trace+conf all ≥ green thresholds'],
]));

C.push(sp(120));
C.push(fullTable([fullRow([para('BCA.AI Formulas & Logic Reference · v1.1 (complete) · April 2026 · Extracted from 7,191 lines across 9 route files',{size:16,color:DKGRAY,align:AlignmentType.CENTER})],LGRAY,nbs())]));

// ═══ ASSEMBLE ════════════════════════════════════════════════
const doc=new Document({
  numbering:{config:[]},
  styles:{
    default:{document:{run:{font:'Arial',size:20,color:BLACK}}},
    paragraphStyles:[{id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,
      run:{size:32,bold:true,font:'Arial',color:NAVY},paragraph:{spacing:{before:240,after:120},outlineLevel:0}}]
  },
  sections:[{
    properties:{page:{size:{width:12240,height:15840},margin:{top:1080,right:900,bottom:1080,left:900}}},
    headers:{default:new Header({children:[new Paragraph({border:{bottom:{style:BorderStyle.SINGLE,size:6,color:NAVY,space:1}},spacing:{before:0,after:120},children:[
      new TextRun({text:'BCA.AI — Complete Formulas, Scoring Logic & Recommendation Engine',bold:true,size:18,color:NAVY,font:'Arial'}),
      new TextRun({text:'   |   v1.1 · April 2026',size:16,color:DKGRAY,font:'Arial'}),
    ]})]})}},
    footers:{default:new Footer({children:[new Paragraph({border:{top:{style:BorderStyle.SINGLE,size:6,color:NAVY,space:1}},spacing:{before:120,after:0},alignment:AlignmentType.CENTER,children:[
      new TextRun({text:'Page ',size:16,color:DKGRAY,font:'Arial'}),
      new TextRun({children:[PageNumber.CURRENT],size:16,color:DKGRAY,font:'Arial'}),
      new TextRun({text:' of ',size:16,color:DKGRAY,font:'Arial'}),
      new TextRun({children:[PageNumber.TOTAL_PAGES],size:16,color:DKGRAY,font:'Arial'}),
      new TextRun({text:'   ·   BCA.AI Platform',size:16,color:DKGRAY,font:'Arial'}),
    ]})]})}},
    children:C
  }]
});

const outPath=path.join(__dirname,'..','BCA_AI_Formulas_Logic.docx');
Packer.toBuffer(doc).then(function(buf){
  fs.writeFileSync(outPath,buf);
  console.log('✅',outPath,'('+Math.round(buf.length/1024)+' KB)');
}).catch(function(err){
  console.error('❌',err.message);process.exit(1);
});
