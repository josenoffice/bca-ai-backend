// BCA_AI_PRD.docx v2 — Updated with user feedback + all new screenshots
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageNumber, PageBreak,
  TableOfContents
} = require('docx');
const fs = require('fs');
const path = require('path');

const SS  = '/Users/njose/Documents/App/BCA/bca-ai-backend/screenshots';
const OUT = '/Users/njose/Documents/App/BCA/bca-ai-backend/BCA_AI_PRD_v3.docx';

// ── Helpers ────────────────────────────────────────────────────────────────
function img(filename, w, h) {
  const fp = path.join(SS, filename);
  if (!fs.existsSync(fp)) { console.warn('MISSING:', filename); return new Paragraph({ children: [new TextRun(`[image: ${filename}]`)] }); }
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 120 },
    children: [new ImageRun({ type: 'png', data: fs.readFileSync(fp),
      transformation: { width: w, height: h },
      altText: { title: filename, description: filename, name: filename } })]
  });
}
function imgPair(f1, f2, ew, eh) {
  const [p1, p2] = [f1, f2].map(f => path.join(SS, f));
  const nb = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const bds = { top: nb, bottom: nb, left: nb, right: nb };
  const cell = (fp, side) => new TableCell({ borders: bds, width: { size: 4680, type: WidthType.DXA },
    margins: { top: 0, bottom: 0, left: side === 'L' ? 0 : 180, right: side === 'L' ? 180 : 0 },
    children: [fs.existsSync(fp)
      ? new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'png', data: fs.readFileSync(fp),
          transformation: { width: ew, height: eh }, altText: { title: fp, description: fp, name: fp } })] })
      : new Paragraph({ children: [new TextRun('')] })]
  });
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [4680, 4680],
    rows: [new TableRow({ children: [cell(p1,'L'), cell(p2,'R')] })] });
}
function cap(t)   { return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 240 }, children: [new TextRun({ text: t, italics: true, size: 18, color: '666666', font: 'Arial' })] }); }
function h1(t)    { return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t, font: 'Arial', bold: true })] }); }
function h2(t)    { return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t, font: 'Arial', bold: true })] }); }
function h3(t)    { return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: t, font: 'Arial', bold: true })] }); }
function p(t, o={}) { return new Paragraph({ spacing: { before: 60, after: 120 }, children: [new TextRun({ text: t, font: 'Arial', size: 22, ...o })] }); }
function b(t, bold=false) { return new Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: { before: 40, after: 40 }, children: [new TextRun({ text: t, font: 'Arial', size: 22, bold })] }); }
function b2(t)   { return new Paragraph({ numbering: { reference: 'bullets2', level: 0 }, spacing: { before: 30, after: 30 }, children: [new TextRun({ text: t, font: 'Arial', size: 20, color: '444444' })] }); }
function sp()    { return new Paragraph({ spacing: { before: 0, after: 120 }, children: [new TextRun('')] }); }
function pb()    { return new Paragraph({ children: [new PageBreak()] }); }
function hr()    { return new Paragraph({ spacing: { before: 120, after: 120 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD', space: 1 } }, children: [new TextRun('')] }); }

function callout(text, bg='EBF5FB', bc='2196F3') {
  const bd = { style: BorderStyle.SINGLE, size: 4, color: bc };
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: { top: bd, bottom: bd, left: bd, right: bd },
      shading: { fill: bg, type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 200, right: 200 }, width: { size: 9360, type: WidthType.DXA },
      children: text.split('\n').map(line => new Paragraph({ spacing: { before: 20, after: 20 }, children: [new TextRun({ text: line, font: 'Arial', size: 21 })] }))
    })] })] });
}

function twoCol(rows, w1=3800, w2=5560, hdr=null, hdrBg='1A237E') {
  const nb = { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' };
  const hb = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const tableRows = [];
  if (hdr) tableRows.push(new TableRow({ children: hdr.map((h, ci) => new TableCell({
    shading: { fill: hdrBg, type: ShadingType.CLEAR },
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    width: { size: [w1, w2][ci], type: WidthType.DXA },
    borders: { top: hb, bottom: hb, left: hb, right: hb },
    children: [new Paragraph({ children: [new TextRun({ text: h, font: 'Arial', bold: true, size: 21, color: 'FFFFFF' })] })]
  })) }));
  rows.forEach(([c1, c2], i) => tableRows.push(new TableRow({ children: [
    new TableCell({ shading: { fill: i%2===0 ? 'F5F5F5' : 'FFFFFF', type: ShadingType.CLEAR }, borders: { top: nb, bottom: nb, left: nb, right: nb }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, width: { size: w1, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: c1, font: 'Arial', size: 20, bold: true })] })] }),
    new TableCell({ shading: { fill: i%2===0 ? 'F5F5F5' : 'FFFFFF', type: ShadingType.CLEAR }, borders: { top: nb, bottom: nb, left: nb, right: nb }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, width: { size: w2, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: c2, font: 'Arial', size: 20 })] })] })
  ]})));
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [w1, w2], rows: tableRows });
}

function threeCol(rows, ws=[3000,2000,4360], hdr=null, hdrBg='1A237E') {
  const nb = { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' };
  const hb = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const tableRows = [];
  if (hdr) tableRows.push(new TableRow({ children: hdr.map((h, ci) => new TableCell({
    shading: { fill: hdrBg, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 120, right: 120 },
    width: { size: ws[ci], type: WidthType.DXA }, borders: { top: hb, bottom: hb, left: hb, right: hb },
    children: [new Paragraph({ children: [new TextRun({ text: h, font: 'Arial', bold: true, size: 21, color: 'FFFFFF' })] })]
  })) }));
  rows.forEach(([c1,c2,c3], i) => tableRows.push(new TableRow({ children: [c1,c2,c3].map((c,ci) => new TableCell({
    shading: { fill: i%2===0 ? 'F5F5F5' : 'FFFFFF', type: ShadingType.CLEAR },
    borders: { top: nb, bottom: nb, left: nb, right: nb }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
    width: { size: ws[ci], type: WidthType.DXA },
    children: [new Paragraph({ children: [new TextRun({ text: c, font: 'Arial', size: 20, bold: ci===0 })] })]
  })) })));
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: ws, rows: tableRows });
}

// Image size constants
const WW=6240, WH=Math.round(6240*900/1280);    // wide  1280×900
const NW=5040, NH=Math.round(5040*900/1280);    // narrow 1280×900
const PW=4320, PH=Math.round(4320*900/1280);    // pair  1280×900

// ── CONTENT ────────────────────────────────────────────────────────────────
const children = [];

// ── COVER ─────────────────────────────────────────────────────────────────
children.push(
  new Paragraph({ spacing: { before: 2880 }, children: [new TextRun('')] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 },
    children: [new TextRun({ text: 'BCA.AI', font: 'Arial', size: 72, bold: true, color: '1A237E' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 240 },
    children: [new TextRun({ text: 'Business Case Analysis Platform', font: 'Arial', size: 40, color: '3949AB' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER,
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '3949AB', space: 1 } },
    spacing: { before: 0, after: 480 }, children: [new TextRun('')] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 120 },
    children: [new TextRun({ text: 'User Journey & Platform Guide', font: 'Arial', size: 32, color: '444444' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 480 },
    children: [new TextRun({ text: 'For C-Level Executives and Decision-Makers', font: 'Arial', size: 26, italics: true, color: '666666' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 120 },
    children: [new TextRun({ text: 'Version 3.0  |  May 2026  |  Confidential Draft', font: 'Arial', size: 22, color: '888888' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 },
    children: [new TextRun({ text: 'BCA.AI Product Team', font: 'Arial', size: 22, color: '888888' })] }),
  pb()
);

// ── TOC ───────────────────────────────────────────────────────────────────
children.push(
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: 'Contents', font: 'Arial', bold: true })] }),
  new TableOfContents('Contents', { hyperlink: true, headingStyleRange: '1-2' }),
  pb()
);

// ════════════════════════════════════════════════════════════════════════════
// SECTION 1 — WHAT IS BCA.AI
// ════════════════════════════════════════════════════════════════════════════
children.push(
  h1('1. What Is BCA.AI?'),
  p('BCA.AI is a structured, AI-assisted platform that guides organisations through building a credible, board-ready business case — from initial problem definition through to a fully quantified investment recommendation.'),
  p('A business case that typically takes 4 to 8 weeks of analyst effort can now be completed in a single working session. Every output is traceable, every number has a source, and every decision is documented — so you walk into any approval meeting with confidence.'),
  sp(),
  callout('Define. Discover. Decide. Deliver. Every time.\n\nBCA.AI removes the guesswork from investment decisions by combining structured methodology with AI-generated insights — producing a consistent, defensible business case regardless of the team\'s experience level.', 'E8EAF6', '3949AB'),
  sp(),

  h2('1.1  The Problem It Solves'),
  p('Building a business case today is slow, inconsistent, and resource-intensive:'),
  b('It requires significant upfront research — comparable implementations, vendor shortlists, industry benchmarks, realistic cost ranges — most of which sits in analyst heads or expensive consultancy reports'),
  b('It is heavily dependent on specialist skills — you typically need a financial analyst to model NPV and IRR, a BA to write requirements, and a PMO to estimate timelines'),
  b('Output quality varies with who builds it — a senior analyst produces a very different document than a first-time project sponsor'),
  b('There is no standard traceability — hard to show which problem links to which solution, and which solution links to which measurable benefit'),
  b('Financial estimates often lack credibility — numbers derived from assumptions, not validated benchmarks'),
  sp(),
  p('BCA.AI addresses all of this:'),
  b('Research on steroids — the AI brings in knowledge from hundreds of similar implementations across your industry, so you are not starting from scratch. It knows what a retail e-commerce modernisation typically costs, what vendors exist, what benefits are realistic, and what risks to flag.', true),
  b('Insights from peer organisations — industry-specific benchmarks are embedded (ROI targets, payback benchmarks, discount rates, risk penalties) calibrated by sector — retail, healthcare, manufacturing, government, and more.', true),
  b('Realistic timeline and cost — Phase 1.5 produces Low/Mid/High cost scenarios and Phase 3 generates a phased delivery timeline — giving leadership clearer expectations before a single line of code is written.', true),
  b('Human involvement at every step — you are in the driver\'s seat throughout. The AI generates a starting point; you review, edit, and approve at each phase. Nothing moves forward without your input.', true),
  b('A reliable, structured CBA — the Quality Gate (Reflection) validates completeness before you reach the financial analysis. The result is a business case that can be defended in front of a CFO or board.', true),
  sp(),

  h2('1.2  What You Get at the End'),
  b('A fully structured business case covering Discovery, Financials, Traceability, Ranking, and Report'),
  b('Quantified financial returns — NPV, ROI, IRR, and Payback Period calculated from your inputs against industry benchmarks'),
  b('A ranked shortlist of solutions — covering software, business process changes, training, and hybrid approaches — with objective scoring'),
  b('Full traceability — every requirement linked to a solution, every solution linked to a measurable benefit and vendor'),
  b('A realistic project timeline — phased delivery with week ranges and go-live estimate'),
  b('A one-click exportable executive report — HTML or PDF, ready for board or C-suite review'),
  b('A Business Requirements Document (BRD) — 12-section formal BRD exportable as a Word document'),
  sp(),
  pb()
);

// ════════════════════════════════════════════════════════════════════════════
// SECTION 2 — WHO SHOULD USE IT
// ════════════════════════════════════════════════════════════════════════════
children.push(
  h1('2. Who Should Use BCA.AI?'),
  p('BCA.AI is designed for anyone who needs to justify a technology or operational investment — and needs to do it credibly and quickly. No financial analyst is required to complete the analysis.'),
  sp(),
  twoCol([
    ['CEO / COO', 'Get a clear, structured investment recommendation with financial projections and risk rating — without wading through spreadsheets. The Business View surfaces only what matters for a go/no-go decision.'],
    ['CFO', 'Review NPV, ROI, payback period, and TCO with full calculation transparency. Every number is traceable to its source. Show calculation breakdowns are one click away on every KPI card.'],
    ['CIO / CTO', 'Assess vendor fit, technical risk, and compliance coverage. Phase 3 maps every requirement to a solution and benefit. Integration compatibility is checked against your declared technical stack.'],
    ['Project Sponsor', 'Build a credible business case with limited financial analyst assistance. The platform walks you through every question step by step. The AI handles the research, benchmarking, and financial modelling — you provide the business context.'],
    ['IT / Finance Analyst', 'Use Analyst mode for full sensitivity tables, IRR spread, benefit confidence scores, and the complete decision matrix. All formulas are exposed. Export to BRD for formal handoff.'],
    ['Procurement / PMO', 'Compare solutions side-by-side with objective composite scoring. Phase 4 produces a ranked shortlist with justification for each recommendation — including non-software approaches like process change and training.'],
  ], 2600, 6760, ['Role', 'How BCA.AI Helps']),
  sp(),
  pb()
);

// ════════════════════════════════════════════════════════════════════════════
// SECTION 3 — GUIDE ME
// ════════════════════════════════════════════════════════════════════════════
children.push(
  h1('3. Contextual Help — Always Available'),
  p('BCA.AI includes three layers of embedded help that are available throughout every phase of the platform. You are never left without guidance.'),
  sp(),
  twoCol([
    ['Floating Guide Me Panel', 'A persistent panel (bottom right of every screen) that shows context-specific questions and answers for the section you are currently viewing. Fully searchable in plain English. No AI call required — answers are instant.'],
    ['Inline Guide Me Buttons', 'Every key metric, field, and concept has a small "Guide me" button next to it. Click it to get an immediate explanation of what it means, how it is calculated, and what a good value looks like.'],
    ['Wizard Step Guidance', 'Each step of the intake form includes a "Why this matters" explanation, quality tips, and pre-written examples specific to your industry and business unit. A quality bar scores your answer in real time and tells you how to improve it.'],
  ], 2600, 6760, ['Help Layer', 'What It Does']),
  sp(),
  imgPair('19_guide_me_discovery.png', '36_guide_me_panel_open.png', PW, PH),
  cap('Figure 1: Left — Guide Me button alongside Phase 1 results. Right — Guide Me panel open with section-specific questions and Portfolio Mix visible'),
  sp(),
  callout('No AI is used in the Guide Me panel. All answers come from a built-in knowledge base — so they load instantly, work offline, and require no API key. The Guide Me panel is available in both Business and Analyst modes.', 'FFF8E1', 'F9A825'),
  sp(),
  pb()
);

// ════════════════════════════════════════════════════════════════════════════
// SECTION 4 — GETTING STARTED
// ════════════════════════════════════════════════════════════════════════════
children.push(
  h1('4. Getting Started'),
  p('BCA.AI requires a one-time access registration. Once registered, your session is remembered for 24 hours — simply return to continue where you left off.'),
  sp(),
  img('01_landing_page.png', WW, WH),
  cap('Figure 2: BCA.AI home page — Guided Demo and Conversational Intake entry points with the 11-step wizard below'),
  sp(),

  h2('4.1  Choosing Your Intake Method'),
  p('Once inside, you have two ways to start a new business case:'),
  sp(),
  twoCol([
    ['Guided Form (11 steps)', 'Structured form split into 11 sections. Each section shows inline examples, a quality bar, and an AI draft-writing assistant. Best when you have a clear initiative in mind and want full control.'],
    ['Conversational Intake (11 steps)', 'Chat-style question flow covering the same 11 sections. Previous answers appear as conversation bubbles — easy to review and edit. Best when starting from scratch or when you prefer answering in plain language.'],
  ], 2800, 6560, ['Method', 'Best For']),
  sp(),
  imgPair('03_wizard_prefilled_top.png', '04_wizard_prefilled_bottom.png', PW, PH),
  cap('Figure 3: Guided Form — Section 1 (Strategic Alignment) with industry-specific examples (left) and quality bar with Guide Me tips (right)'),
  sp(),
  img('67_wizard_steps_mid.png', WW, WH),
  cap('Figure 4: Guided Form mid-session — step tabs across the top (Strategic Alignment through Success Measures) showing progress and the budget / compliance section'),
  sp(),

  h2('4.2  What Information Is Captured'),
  p('Both methods collect the same 11 categories of information. This data drives every phase of the analysis — the more specific your answers, the stronger the output.'),
  sp(),
  threeCol([
    ['Step 1 — Business Unit', 'Ecommerce, IT, Store Operations, Finance, Supply Chain, HR, Marketing, etc.', 'Shapes solution patterns, vendor shortlist, and compliance pre-fills'],
    ['Step 2 — Your Role', 'CFO, CTO, Project Manager, Business Analyst, Procurement, Operations Director, etc.', 'Adjusts how results are presented — financial returns first for CFO, delivery timeline first for PM'],
    ['Step 3 — Top 3 Problems', 'Most critical problem + 2 secondary. Include metrics where possible (e.g. "cart abandonment at 68%")', 'Each problem drives a targeted solution. Numbers anchor benefit calculations to your actual business.'],
    ['Step 4 — Organisation Scale', 'Revenue band and headcount (e.g. $45M revenue, 500 staff)', 'Calibrates benefit values — a 1% revenue uplift means something very different at $10M vs $500M'],
    ['Step 5 — Current State', 'What is broken today: systems, age, who is affected, financial impact', 'The single most important field. Every solution and benefit flows from this description.'],
    ['Step 6 — Desired Outcomes', 'What success looks like in 12–24 months. Include target metrics.', 'Anchors Phase 4 recommendation to business goals, not just financial metrics'],
    ['Step 7 — Compliance Requirements', 'PCI-DSS, GDPR, ISO 27001, SOC2, HIPAA, etc.', 'Used in vendor fit scoring and Phase 3 compliance coverage check'],
    ['Step 8 — Business Impact & Urgency', 'Stakeholder groups affected, urgency drivers, regulatory deadlines', 'Feeds risk scoring and delivery sequencing in Phase 3 timeline'],
    ['Step 9 — Budget Parameters', 'Approved budget (or "still building the case"), ceiling %, discount rate preference', 'Sets the financial envelope for all cost and NPV calculations'],
    ['Step 10 — Technical Stack', 'Cloud provider, key platforms, integrations. Three options: I know our systems / I\'ll ask IT / Best guess', 'Checks vendor compatibility. Undeclared systems create hidden integration risk.'],
    ['Step 11 — What Has Been Tried', 'Previous attempts, workarounds, why they failed', 'Avoids recommending solutions that have already been rejected. Strengthens the rationale section.'],
  ], [2400, 4200, 2760], ['Step', 'What You Provide', 'How It Is Used']),
  sp(),

  h2('4.3  Built-In Stakeholder Collaboration'),
  p('BCA.AI recognises that not every person filling in the intake form has all the information. The platform provides built-in tools to bring in other stakeholders without leaving the process.'),
  sp(),
  callout('Example — Step 10 (Technical Stack)\n\nIf you do not know the organisation\'s systems, BCA.AI generates a pre-written email to your IT team — tailored to your business unit and project — that you can copy and send in one click. The email asks for: main platform and version, cloud provider, key integrations, and planned system changes.\n\nThis means the project sponsor can start the business case immediately and loop in technical colleagues exactly where they are needed — without delaying the entire process.', 'E8F5E9', '2E7D32'),
  sp(),

  h2('4.4  Conversational Intake'),
  p('The Conversational Intake presents the same 11 sections as a natural question-and-answer chat flow. Each answer is confirmed as a conversation bubble before the next question appears — making it easy to review and edit inputs at any point.'),
  sp(),
  img('40_conv_intake_step1_welcome.png', NW, NH),
  cap('Figure 5: Conversational Intake — Section 1 (Strategic Alignment) with industry selector and role field'),
  sp(),
  imgPair('41_conv_intake_step1_filled.png', '42_conv_intake_step2.png', PW, PH),
  cap('Figure 6: Left — Step 1 filled in (Business Unit and Role selected). Right — step progression showing previous answer as a chat bubble with the next question below'),
  sp(),
  img('59_conv_intake_switch_float.png', NW, NH),
  cap('Figure 7: Conversational Intake — floating "Switch to Form" button (bottom right) lets users jump to the guided form at any point without losing their answers'),
  sp(),

  h2('4.5  Save and Resume — Project JSON'),
  p('BCA.AI allows you to save your entire project — all wizard inputs and all phase results — as a single JSON file. This gives you a portable snapshot of the analysis that can be resumed at any point, shared with a colleague, or archived for audit purposes.'),
  sp(),
  img('50_save_load_header.png', WW, WH),
  cap('Figure 8: Save and Load buttons (top right header) — available at all times during the analysis'),
  sp(),
  twoCol([
    ['Save Project', 'Exports a JSON file containing: your 11-step wizard inputs, and all phase results (Phase 1 through Phase 5). File is named after your project title with the date. Works like a save game — captures the exact state of your analysis.'],
    ['Load Project', 'Uploads a previously saved JSON file and restores all phase results instantly — no re-running the AI. Every phase is restored exactly as it was when you saved, including vendor cards, financial tables, and report content.'],
  ], 2600, 6760, ['Operation', 'What It Does']),
  sp(),
  callout('No server storage is used — your data stays on your machine. The JSON file is the only copy. To collaborate with a colleague, send them the JSON file and they can load it into their own BCA.AI session.', 'E8F5E9', '2E7D32'),
  sp(),
  pb()
);

// ════════════════════════════════════════════════════════════════════════════
// SECTION 5 — PHASE 1: DISCOVERY
// ════════════════════════════════════════════════════════════════════════════
children.push(
  h1('5. Phase 1 — Discovery (AI-Powered)'),
  p('Once you submit your intake responses, BCA.AI runs its AI analysis engine. Phase 1 takes your problem description and generates a complete set of candidate solutions, quantified benefits, and non-negotiable requirements — in seconds.'),
  sp(),
  callout('AI is used in Phase 1 to generate Solutions, Benefits, and Requirements from your inputs.\n\nThe AI is trained to draw on patterns from real-world implementations in your sector — so rather than generic suggestions, you get solutions that are relevant to your industry, scale, and problem type.', 'E8F5E9', '2E7D32'),
  sp(),

  h2('5.1  What Is a Solution? (Important Clarification)'),
  p('A solution in BCA.AI is NOT limited to software. A solution is any response to a business problem — which may include:'),
  b('A software product or platform (e.g. a new compliance monitoring tool)'),
  b('A business process change (e.g. redesigning the order fulfilment workflow to reduce manual steps)'),
  b('Training and capability building (e.g. upskilling the finance team on data literacy)'),
  b('A hybrid approach (e.g. a new platform combined with a process redesign and change management programme)'),
  p('Each solution is tagged with its approach type: Software (Buy), Hybrid (Buy + Change), or Process Change (Change). The financial analysis and ranking cover all types — so the recommendation reflects the full picture of what it will take to solve the problem, not just the technology component.'),
  sp(),

  h2('5.2  Understanding Solutions, Benefits, and Requirements'),
  sp(),
  twoCol([
    ['Solution', 'A specific, deliverable capability that addresses part of your problem. Each solution has: name, approach type (Software / Process / Hybrid), risk level, delivery phase, and cost range (Low/Mid/High). Up to 5 solutions are generated.'],
    ['Benefit', 'A quantified, measurable outcome that the solutions will produce. Each benefit is expressed in annual dollar value with a confidence percentage (how reliable the estimate is). Examples: $144,000/yr at 85% confidence.'],
    ['Requirement', 'A non-negotiable constraint or capability the solution must satisfy. Tagged as Must Have or Should Have. Each requirement carries a category (integration, compliance, security, performance, mobile, user experience, change management, or general) and a complexity score (1–5). These drive the cost model in Phase 1.5 — a compliance requirement at complexity 4 is costed differently to a change management requirement at complexity 2. Used in Phase 3 to verify that every requirement is covered by at least one solution.'],
  ], 2000, 7360, ['Concept', 'Definition']),
  sp(),

  h2('5.3  Discovery Results'),
  img('04a_phase1_kpis.png', WW, WH),
  cap('Figure 9: Phase 1 results — Discovery at a Glance: 5 solutions identified, 42% budget utilisation, AI Generated method, READY for Phase 2'),
  sp(),
  img('37_phase1_portfolio_mix_solutions.png', NW, NH),
  cap('Figure 10: Solutions list with Portfolio Mix bar — showing the breakdown between Software (80%) and Process Change (20%) solution types'),
  sp(),
  img('04c_phase1_requirements_valuechain.png', WW, WH),
  cap('Figure 11: Value Chain — each solution traced left to right: Requirements it satisfies → Solution details → Benefits it delivers → Vendor recommendation'),
  sp(),
  pb()
);

// ════════════════════════════════════════════════════════════════════════════
// SECTION 6 — PHASE 1.5: COST ESTIMATION
// ════════════════════════════════════════════════════════════════════════════
children.push(
  h1('6. Phase 1.5 — Cost Estimation'),
  p('With solutions defined, Phase 1.5 aggregates and presents the detailed cost estimates for each solution — in Low, Mid, and High scenarios — and combines them into a portfolio budget view.'),
  sp(),

  h2('6.1  How Phase 1.5 Cost Estimation Works'),
  p('Phase 1.5 is AI-powered. It calls the cost estimation model with all available context — solution type, approach, vendor pricing anchor, Process Intervention Builder data, and your organisation\'s scale — and returns a Low/Mid/High estimate for each solution.'),
  p('The cost model selects the correct pricing approach based on the solution\'s approach type:'),
  b('Software (Buy) — uses the standard vendor cost model: implementation consultants ($100–$250/hr), licensing, infrastructure, QA, training, and contingency (5–10%). If a vendor pricing anchor is available from Phase 1.6, it is used as the primary market rate reference.'),
  b('Process Change — uses the people-change cost model: process consultants and change facilitators ($150–$300/day), workshop facilitation, pilot testing, and headcount-based training costs (1–5 training days per affected employee at local FTE day rate). Contingency is higher (10–15%) because change management is less predictable.'),
  b('Hybrid — combines both models in a single estimate. The software stream uses the vendor anchor (licensing + implementation); the process change stream uses PIB headcount and intervention types (consulting + change training + productivity dip). Both streams are sized separately and summed.'),
  p('Requirement category and complexity feed the estimate directly. Requirements are tagged by category (integration, compliance, security, performance, and others) and complexity (1 to 5). A compliance requirement at complexity 4 carries a different base cost to a change management requirement at complexity 2. Company size also scales the estimate — SME, mid-market, and enterprise use different multipliers so the output reflects your actual operating context.'),
  p('If no vendor pricing anchor exists (vendor not yet selected), Phase 1.5 falls back to market-rate benchmarks for the solution category and size. This ensures an estimate is always produced — but vendor-anchored estimates are materially more accurate.'),
  sp(),

  h2('6.2  What "Portfolio Budget View" Means'),
  p('The word portfolio can mean different things depending on your background:'),
  sp(),
  twoCol([
    ['For PMO / Project teams', '"Portfolio" typically means a collection of separate projects managed together under a programme. In BCA.AI, the portfolio is all the solutions in this one business case evaluated together as a single investment — not a collection of separate projects.'],
    ['For Finance teams', '"Portfolio" typically refers to investment portfolio theory. Here it means the same thing as above — the combined investment in all 5 solutions is viewed as one package, with combined NPV, ROI, and risk exposure.'],
    ['For everyone', 'Think of it as: "What is the total we are spending, and what do we get back in total?" The portfolio view prevents the mistake of approving individual solutions in isolation while ignoring the combined cost and return.'],
  ], 2600, 6760, ['Audience', 'What Portfolio Means Here']),
  sp(),
  callout('Portfolio budget view = the total investment across all solutions in this business case, assessed as one combined package. Individual solution costs and returns are also visible in the Financial Summary table in Phase 2.', 'FFF3E0', 'E65100'),
  sp(),

  h2('6.3  What Types of Solutions Are Costed?'),
  p('Phase 1.5 costs ALL solution types — not just software:'),
  b('Software solutions — implementation, licensing, integration, and first-year operating costs'),
  b('Process change solutions — change management, process redesign facilitation, and communication programme costs'),
  b('Training solutions — curriculum design, delivery, materials, and management time'),
  b('Hybrid solutions — priced using a combined model: the software component uses vendor licensing and implementation costs; the process change component uses consultant day rates and PIB headcount-based training costs. Both streams are estimated separately and summed into one total — not averaged or approximated.'),
  sp(),
  img('23_phase15_cost_estimation.png', NW, NH),
  cap('Figure 12: Cost Estimation at a Glance — 5 solutions priced, 42% of $680K budget utilised, within ceiling'),
  sp(),
  img('24_phase15_solution_costs.png', NW, NH),
  cap('Figure 13: Per-solution cost cards — Low/Mid/High scenario for each solution with vendor pricing range alongside'),
  sp(),
  img('70_phase15_cost_breakdown.png', NW, NH),
  cap('Figure 14: Cost Breakdown expanded — per-solution cost components (Discovery, Setup, Training, Go-Live) and the budget ceiling indicator'),
  sp(),

  h2('6.4  Budget Intelligence — AI Suggestion and Gap Warning'),
  p('Phase 1.5 includes two new callouts that surface budget intelligence directly in the cost view:'),
  sp(),
  twoCol([
    ['AI-Suggested Budget', 'If no budget was provided during intake (Step 9), Phase 1 generates a recommended budget based on your industry, business scale, and the solutions produced. Phase 1.5 surfaces this as a blue "No budget provided — AI has suggested" banner at the top of the budget section. The suggested figure is also labelled "AI SUGGESTED" on the budget KPI card so it is clearly distinguished from a user-entered budget.'],
    ['Budget Too Low Warning', 'If the total recommended cost exceeds the declared (or AI-suggested) budget, Phase 1.5 shows an amber warning with three pieces of information: the shortfall in dollar terms, the percentage increase required to fully fund the portfolio, and the name and cost of the lowest-cost solution — giving leadership an immediate decision point (fund the gap, scope down, or proceed with the smallest viable option).'],
  ], 2800, 6560, ['Callout Type', 'What It Shows']),
  sp(),
  img('51_phase1_budget_suggested.png', NW, NH),
  cap('Figure 15: Phase 1 budget section — AI-suggested budget callout shown when no user budget was provided during intake'),
  sp(),
  img('52_phase15_budget_toolow.png', NW, NH),
  cap('Figure 16: Phase 1.5 — budget too low warning showing shortfall, required increase percentage, and minimum viable solution'),
  sp(),
  callout('Budget intelligence is available in both Phase 1 and Phase 1.5. The same suggested budget flows through to Phase 1.6 vendor scoring — vendors are checked against it even when no user-provided budget exists. This prevents the analysis from proceeding with unconstrained vendor recommendations when the organisation has limited investment appetite.', 'FFF3E0', 'E65100'),
  sp(),

  h2('6.5  Data Collection Gate — Before Phase 1.5 Runs'),
  p('Before Phase 1.5 can produce accurate estimates, two types of input are collected through the Data Collection Gate — a structured step between Phase 1.6 and Phase 1.5:'),
  sp(),
  twoCol([
    ['Software (Buy) solutions', 'Select a vendor from the Phase 1.6 shortlist. The vendor\'s pricing range becomes the primary cost anchor. If no vendor is selected, Phase 1.5 falls back to market-rate benchmarks — the estimate is still produced, but less precise.'],
    ['Process Change (Change) solutions', 'Fill in the Process Intervention Builder (PIB) — a short panel capturing: intervention types (SOP updates, staff training, workflow redesign, change champions, etc.), headcount affected, and key processes being changed. This data sizes training and consulting costs in the cost model.'],
    ['Hybrid solutions', 'Requires both: select a vendor for the software stream AND complete the PIB for the process change stream. The card in the picker shows both a vendor-search checkbox and an embedded PIB panel. The cost model combines the vendor pricing anchor with the PIB headcount to produce a dual-stream estimate.'],
  ], 2800, 6560, ['Solution Type', 'What Is Collected']),
  sp(),
  p('Two features reduce friction at this gate:'),
  b('Accept AI Recommendations — a one-click button in the portfolio snapshot (shown after Phase 1.6 completes) that auto-selects the rank-1 vendor for every software and hybrid solution in the portfolio. Users who trust the AI shortlist can bypass manual card-by-card selection in one action.'),
  b('Pre-flight gap check — before Phase 1.5 runs, the platform scans for missing data: buy solutions without a vendor selection, change solutions without PIB data, and hybrid solutions missing either. A gap report lists each issue with its cost-accuracy impact. The user can either go back to fill the gaps or proceed immediately with AI market-rate estimates filling the blanks.'),
  sp(),
  img('62_phase15_preflight_gap.png', WW, WH),
  cap('Figure 17: Pre-flight gap check — amber warning listing solutions with missing vendor or PIB data, with "Go back & fill gaps" and "Proceed with AI estimates" options'),
  sp(),
  callout('The Data Collection Gate does not block progress — it informs. Estimates are always produced. Gap data is surfaced so the user understands which estimates are vendor-anchored (more accurate) and which are market-rate benchmarks (reasonable starting points).', 'E8EAF6', '3949AB'),
  sp(),
  pb()
);

// ════════════════════════════════════════════════════════════════════════════
// SECTION 7 — PHASE 1.6: VENDOR SELECTION
// ════════════════════════════════════════════════════════════════════════════
children.push(
  h1('7. Phase 1.6 — Vendor Selection (AI-Powered)'),
  p('Phase 1.6 matches each software or hybrid solution to the best-fit vendor in the market. Vendors are scored on a Fit Score (0 to 100) based on your compliance requirements, technical stack, and budget constraints. Phase 1.6 runs after Phase 1 results are reviewed — so vendor research targets the solutions the AI has already identified, not a generic shortlist.'),
  sp(),

  h2('7.1  Where Does Budget Constraint Come From?'),
  p('The budget used in vendor scoring comes from what you entered in Step 9 of the intake form. Three scenarios are handled:'),
  b('You entered a specific budget — vendors are scored on whether their pricing fits within your ceiling. Solutions where the vendor cost exceeds the budget ceiling are flagged.'),
  b('You said "still building the case" — the AI suggests a realistic budget based on your business unit, scale, and scope. You can override this suggestion before Phase 1.6 runs.'),
  b('You left budget blank — vendor fit scoring falls back to industry-average pricing ranges. The analysis will note that budget validation was not possible.'),
  sp(),
  callout('If you are unsure of your budget, do not leave it blank. Use the AI suggestion as a starting point — it is derived from comparable implementations in your sector and is more reliable than leaving the field empty. You can always revise the budget before proceeding to Phase 2.', 'FFF8E1', 'F9A825'),
  sp(),

  h2('7.2  Portfolio Snapshot and Vendor Selection UX'),
  p('When Phase 1.6 completes, a Portfolio Snapshot table appears showing the rank-1 vendor for every solution — name, fit score, and estimated cost range — in a single view. Two options are then available:'),
  b('Accept AI Recommendations — a one-click green button in the snapshot header locks in the rank-1 vendor for every solution simultaneously. The vendor pricing range is immediately available to Phase 1.5 as its cost anchor.'),
  b('Manual selection — vendor cards below the snapshot allow individual review. Each card shows: fit score, pricing range, compliance coverage, implementation timeline, and a "Why recommended" summary. Click "Select this Provider" to lock in a specific vendor.'),
  p('For multi-solution portfolios, Path A (Best of Breed — one specialist vendor per solution) and Path B (Single Platform — one vendor covering all solutions) can be compared before selection.'),
  sp(),
  imgPair('25_phase16_vendor_selection_top.png', '26_phase16_vendor_cards.png', PW, PH),
  cap('Figure 18: Left — Vendor Selection at a Glance (top fit score 94/100). Right — Vendor cards with fit score, cost range, and implementation timeline'),
  sp(),
  img('61_phase16_path_a_path_b.png', WW, WH),
  cap('Figure 19: Vendor Strategy — Path A (Best of Breed, one specialist vendor per solution, currently SELECTED) vs Path B (Single Platform, one vendor across all solutions)'),
  sp(),
  img('66_phase16_batch_select.png', WW, WH),
  cap('Figure 20: Batch selection — "1 software solution selected" status bar and "Find Software Solution Providers" button; the Accept AI Recommendations flow locks in all rank-1 vendors simultaneously'),
  sp(),
  callout('All-process-change portfolios: if every solution in the portfolio has a process change approach and no software vendor is needed, Phase 1.6 is automatically skipped. A notice is shown and the user proceeds directly to the Process Intervention Builder and Phase 1.5.', 'E8F5E9', '388E3C'),
  sp(),
  img('65_phase16_allchange_skip.png', WW, WH),
  cap('Figure 21: All-change skip — when all solutions are process change type, Phase 1.6 vendor search is bypassed and the PIB panel is presented directly'),
  sp(),

  h2('7.3  Vendor Selection by Solution Type'),
  sp(),
  twoCol([
    ['Software (Buy)', 'Standard vendor shortlist — up to 3 vendors ranked by fit score. Select the preferred vendor; its pricing range flows into Phase 1.5 as the cost anchor.'],
    ['Hybrid (Buy + Change)', 'A combined card appears in the solution picker: a vendor-search checkbox (for the software stream) AND a Process Intervention Builder panel (for the process change stream). Both must be completed for a full hybrid estimate.'],
    ['Process Change (Change)', 'No software vendor. The Process Intervention Builder collects: intervention types (SOP updates, staff training, workflow redesign, etc.), headcount affected, and key processes. This data sizes the change management cost in Phase 1.5.'],
    ['All-change portfolio', 'Phase 1.6 is skipped entirely. The user fills in PIB panels for each change solution and proceeds directly to Phase 1.5 cost estimation.'],
  ], 2400, 6960, ['Solution Type', 'What Happens in Phase 1.6']),
  sp(),
  img('60_phase16_pib_panel.png', WW, WH),
  cap('Figure 22: Process Intervention Builder (PIB) — intervention type checkboxes (SOP Docs, Staff Training, Policy Update, Workflow Redesign, Change Champions, Communication Plan), headcount field, and key processes field for a process change solution'),
  sp(),
  img('64_phase16_hybrid_card.png', WW, WH),
  cap('Figure 23: Hybrid solution card — combines a vendor-search checkbox (software stream) with a PIB form (process change stream); both must be completed before Phase 1.5 can produce a dual-stream cost estimate'),
  sp(),

  h2('7.4  Vendor Cards and Fit Score'),
  p('Each vendor card shows: fit score (0–100), compliance coverage (which standards the vendor meets), integration compatibility (which systems in your stack it connects to), cost range (Low–High), and implementation timeline in months.'),
  p('Fit Score is calculated from three dimensions: compliance coverage match against your declared requirements, integration compatibility with your technical stack, and pricing fit against your budget ceiling. A score of 85+ indicates an Excellent Fit — the vendor covers your compliance and integration needs without requiring significant customisation.'),
  sp(),
  pb()
);

// ════════════════════════════════════════════════════════════════════════════
// SECTION 8 — QUALITY GATE
// ════════════════════════════════════════════════════════════════════════════
children.push(
  h1('8. Quality Gate — Phase 1 Reflection (AI-Powered)'),
  p('Before progressing to financial analysis, BCA.AI runs an automated quality review across all Phase 1 outputs. This is the Quality Gate — it checks four dimensions and produces a go / no-go verdict with a score out of 100.'),
  sp(),
  img('27_reflection_quality_gate.png', NW, NH),
  cap('Figure 24: Quality Gate — PASS WITH WARNINGS, score 72/100. Four area scores all at 100. Status: READY FOR PHASE 2'),
  sp(),
  threeCol([
    ['Benefits', 'Are all benefits quantified in dollar terms with a confidence rating?', 'Ensures the financial case is built on specific numbers, not vague claims'],
    ['Costs', 'Are all solutions priced with at least a mid-point estimate?', 'Prevents analysis from proceeding with zero-cost solutions that skew NPV'],
    ['Linkages', 'Does every requirement trace to at least one solution? Every solution to at least one benefit?', 'Validates that nothing is orphaned — every problem has a solution, every solution delivers value'],
    ['Vendor Compliance', 'Does the selected vendor for each software solution cover the compliance standards declared?', 'Flags gaps before Phase 2 — a vendor missing PCI-DSS coverage is a critical risk to surface early'],
  ], [2200, 4000, 3160], ['Quality Area', 'What Is Checked', 'Why It Matters']),
  sp(),
  img('28_reflection_area_scorecard.png', NW, NH),
  cap('Figure 25: Reflection scorecard — Phase 2 Readiness Criteria (expandable), strengths list, and Continue to Phase 2 prompt'),
  sp(),
  img('68_reflection_not_ready.png', NW, NH),
  cap('Figure 26: Quality Gate FAIL — score 34/100, BLOCKED — NOT READY badge. Phase 2 is blocked until critical issues are resolved. The Quality Gaps section lists what needs to be fixed.'),
  sp(),
  callout('BLOCKED — NOT READY means at least one critical quality check failed. Typical causes: a solution has no linked benefit (no value case), a benefit has no dollar value (unquantified claim), or a required vendor is missing. The scorecard lists exactly what to fix and links back to the relevant Phase 1 section.', 'FFEBEE', 'C62828'),
  sp(),
  pb()
);

// ════════════════════════════════════════════════════════════════════════════
// SECTION 9 — PHASE 2: FINANCIAL ANALYSIS
// ════════════════════════════════════════════════════════════════════════════
children.push(
  h1('9. Phase 2 — Financial Analysis (No AI Required)'),
  p('Phase 2 is 100% calculation-based — no AI, no API key, no external connection. It takes your solutions, costs, and benefits and computes the full financial case using industry-standard financial modelling.'),
  p('The analysis runs at individual solution level AND at portfolio (combined) level — so you can see which solutions drive the most value, and what the total investment looks like as a package.'),
  sp(),

  h2('9.1  The Financial Metrics — In Plain Language'),
  p('These four metrics appear on every project investment decision. Here is what they mean without the financial jargon:'),
  sp(),
  twoCol([
    ['Net Present Value (NPV)', 'NPV answers: "Is this investment worth it in today\'s money?"\n\nFormula in plain terms: Start with what you spend (a negative). Add back the annual benefit each year — but discount future money because money today is worth more than money tomorrow (at your cost of capital). If the result is positive, you get back more than you spend.\n\nExample: NPV of $637K means the investment returns $637K MORE than it costs, in today\'s money, over 3 years.'],
    ['Return on Investment (ROI)', 'ROI answers: "For every $100 I spend, how much do I get back?"\n\nFormula: (Total benefit over 3 years minus total cost) divided by total cost, expressed as a percentage.\n\nExample: ROI of 356% means every $100 invested returns $456 in total benefit — or a net gain of $356.'],
    ['Internal Rate of Return (IRR)', 'IRR answers: "What interest rate does this investment effectively earn?"\n\nFormula: The discount rate at which NPV equals zero — the break-even rate. If IRR is higher than your cost of capital (hurdle rate), the investment creates value.\n\nExample: IRR of 91% vs a 12% hurdle rate means this investment earns far more than it costs to fund.'],
    ['Payback Period', 'Payback answers: "How long before I get my money back?"\n\nFormula: Total cost divided by annual benefit, expressed in months.\n\nExample: Payback of 19 months means the full investment is recovered within 19 months — at which point everything earned after that is net gain.'],
  ], 2400, 6960, ['Metric', 'What It Means and How It Is Calculated']),
  sp(),

  h2('9.2  Industry Benchmarks'),
  p('Every metric is compared against your sector\'s benchmark — so you know not just the number, but whether it is strong or weak for your industry. These benchmarks are built into the platform:'),
  threeCol([
    ['Retail / E-commerce', 'ROI benchmark: 150–220% | Payback benchmark: 12–15 months | Discount rate: 12–14%', ''],
    ['Financial Services', 'ROI benchmark: 180% | Payback benchmark: 18 months | Discount rate: 9%', ''],
    ['Healthcare', 'ROI benchmark: 150% | Payback benchmark: 24 months | Discount rate: 11%', ''],
    ['Manufacturing', 'ROI benchmark: 160% | Payback benchmark: 20 months | Discount rate: 11%', ''],
    ['Government', 'ROI benchmark: 120% | Payback benchmark: 30 months | Discount rate: 7%', ''],
    ['Technology', 'ROI benchmark: 250% | Payback benchmark: 10 months | Discount rate: 10%', ''],
  ], [2800, 4800, 1760], ['Sector', 'Key Benchmarks', '']),
  sp(),

  h2('9.3  Analysis at Solution Level vs Portfolio Level'),
  p('Both views are available:'),
  b('Portfolio level (shown first) — the combined NPV, ROI, and payback across all 5 solutions treated as one investment package'),
  b('Solution level (Financial Summary table) — individual NPV, ROI, risk, and payback for each solution, covering software, training, and process change solutions equally'),
  p('This matters because some solutions may have excellent individual ROI while others have lower returns but are still necessary (e.g. a compliance solution that avoids fines is mandatory regardless of ROI).'),
  sp(),
  img('05_phase2_kpis_sliders.png', WW, WH),
  cap('Figure 27: Phase 2 Financial KPIs — Portfolio NPV $637K, ROI 356%, IRR 91%, Payback 19 months — all benchmarked against Retail industry targets'),
  sp(),
  img('71_phase2_whatif_sliders.png', WW, WH),
  cap('Figure 28: Phase 2 What-If sensitivity — the same KPI dashboard with expanded plain-English explanations including "EXCEPTIONAL VALUE" and "EXCELLENT RETURN" narratives for each metric'),
  sp(),
  img('06a_phase2_roi_irr_spread.png', WW, WH),
  cap('Figure 29: Phase 2 ROI / IRR spread view — plain-English KPI explanations with Show calculation link on every card for full formula transparency'),
  sp(),
  pb()
);

// ════════════════════════════════════════════════════════════════════════════
// SECTION 10 — PHASE 3: TRACEABILITY & TIMELINE
// ════════════════════════════════════════════════════════════════════════════
children.push(
  h1('10. Phase 3 — Traceability & Timeline (AI-Powered)'),
  p('Phase 3 validates the structural integrity of your business case and generates a phased project timeline. It answers two critical questions that boards and audit committees ask: "Can you show us the logic chain from problem to benefit?" and "What is the delivery plan and when do we see returns?"'),
  sp(),

  h2('10.1  Traceability — The Full Logic Chain'),
  p('Traceability means every element in your business case can be traced back to its origin. The complete chain is:'),
  sp(),
  callout('Business Requirement → Solution → Benefit → Measurable Value → Vendor / Delivery Approach\n\nExample: REQ-001 (PCI-DSS compliance) → SOL-001 (Security & Compliance Foundation) → BEN-003 ($187,500/yr avoided breach costs at 92% confidence) → Vanta (Vendor, Fit Score 94/100)\n\nThis chain means: a non-negotiable compliance requirement is satisfied by a specific solution, which delivers a specific quantified benefit, delivered by a specific vendor who covers the compliance requirement.', 'E3F2FD', '1565C0'),
  sp(),
  p('The Traceability section surfaces gaps immediately — if a requirement is not linked to any solution, or a solution has no measurable benefit, it is flagged before you reach the report stage.'),
  sp(),

  h2('10.2  Project Timeline'),
  p('Phase 3 generates a structured delivery timeline broken into 5 PLC (Project Lifecycle) phases, with estimated durations in weeks. This gives leadership realistic expectations on when they will see returns.'),
  sp(),
  twoCol([
    ['Phase 1: Definition / Discovery (15%)', 'Requirements gathering, stakeholder alignment, vendor finalisation. Typical: weeks 1–4'],
    ['Phase 2: Acquisition (10%)', 'Contract signing, procurement, environment provisioning. Typical: weeks 5–7'],
    ['Phase 3: Planning (15%)', 'Detailed design, integration planning, change management preparation. Typical: weeks 8–12'],
    ['Phase 4: Execution (50%)', 'Build, configure, integrate, test, train, and validate. The largest phase. Typical: weeks 13–26'],
    ['Phase 5: Closing / Go-Live (10%)', 'Deployment, hypercare, lessons learned, benefit tracking setup. Typical: weeks 27–30'],
  ], 3000, 6360, ['PLC Phase', 'What Happens']),
  sp(),
  p('Phase 3 now shows approximate cost per PLC phase — displayed directly under each timeline segment. The calculation applies the standard PLC weighting (15% / 10% / 15% / 50% / 10%) to the total portfolio cost. This gives leadership an immediate cash flow phasing view — how much budget is consumed in each stage — before entering procurement or vendor negotiations.'),
  sp(),
  img('29_phase3_traceability_kpis.png', NW, NH),
  cap('Figure 30: Phase 3 overview — Health Score 78, Linkage Score 73, 30 weeks total duration, $209K cost, 78% average confidence'),
  sp(),
  img('53_phase3_plc_cost_labels.png', NW, NH),
  cap('Figure 31: Project Timeline with PLC phase weights and approximate cost per phase — e.g. Discovery 15% (~$31K), Execution 50% (~$105K), Go-Live 10% (~$21K)'),
  sp(),
  callout('Cost per phase is indicative — it uses the PLC standard weighting, not vendor payment milestones. Actual spend phasing depends on how each vendor structures payments (upfront licence vs milestone-based). Use this view to flag cash flow timing with Finance before the project is approved.', 'FFF3E0', 'E65100'),
  sp(),
  pb()
);

// ════════════════════════════════════════════════════════════════════════════
// SECTION 11 — PHASE 4: RANKING
// ════════════════════════════════════════════════════════════════════════════
children.push(
  h1('11. Phase 4 — Ranking & Recommendation (No AI Required)'),
  p('Phase 4 applies a composite scoring model to all solutions and produces an objective, ranked shortlist with a primary recommendation. The scoring is fully formula-based — the same inputs always produce the same ranking.'),
  sp(),

  h2('11.1  What Is Included in the Ranking'),
  p('Every solution type is included in the ranking — not just software:'),
  b('Software (Buy) solutions — scored on NPV, ROI, vendor fit score, risk, and payback'),
  b('Process Change solutions — scored on NPV, ROI, adoption readiness (how prepared the organisation is for change), risk, and payback'),
  b('Training solutions — treated as a process change investment; adoption readiness replaces vendor fit in the composite score'),
  b('Hybrid solutions — blend of vendor fit and adoption readiness, weighted by the proportion of software vs process component'),
  sp(),
  callout('The composite score weights: NPV (25%) + ROI (20%) + Risk (20%) + Vendor/Approach Fit (15%) + Payback (20%). For process change and hybrid solutions, "Approach Fit" measures organisational adoption readiness — the likelihood the change will actually stick — rather than software vendor compatibility.', 'E8EAF6', '3949AB'),
  sp(),

  h2('11.2  Ranking Table and Recommendation'),
  p('The ranking table shows all solutions ordered by composite score with the primary recommendation highlighted. For each solution: composite score, NPV, ROI, risk level, recommended vendor or delivery approach, fit score, payback period, and Phase 5 gate status.'),
  sp(),
  img('31_phase4_recommendation.png', NW, NH),
  cap('Figure 32: Phase 4 Recommendation — Security & Compliance Foundation ranked #1, composite score 0.843, ROI 237%, Payback 11 months, Phase 5 Gate: PASS'),
  sp(),
  img('32_phase4_solution_ranking.png', NW, NH),
  cap('Figure 33: Full Solution Ranking table — all solutions ranked with Score, NPV, ROI, Risk, Vendor/Approach, Fit, and Payback'),
  sp(),
  img('72_phase4_sensitivity.png', WW, WH),
  cap('Figure 34: Phase 4 sensitivity view — full ranking table alongside the value chain detail panel (Requirements → Benefits → Financial Value → Vendor/Delivery) for the top-ranked solution'),
  sp(),

  h2('11.3  Vendor Recommendation'),
  p('The recommended vendor for each software or hybrid solution is shown in the ranking table alongside the solution. The vendor recommendation is driven by the fit score from Phase 1.6 — the highest-scoring vendor for each solution is the one that appears in the final report.'),
  p('For process change and training solutions, the "vendor" field shows the recommended delivery approach (e.g. Internal Team, External Consultancy, Blended) rather than a software vendor name.'),
  sp(),

  h2('11.4  Pre-Report Checkpoint — Vendor Summary Card'),
  p('Before launching Phase 5, Phase 4 surfaces a vendor summary card for the primary recommended solution. This acts as a final confirmation that the right vendor is attached to the recommendation before it is embedded in the board report.'),
  sp(),
  twoCol([
    ['Software / Hybrid solutions', 'Shows the recommended vendor name, Fit Score (0–100), cost range (Low–High), compliance coverage, and implementation timeline. A teal card confirms the vendor is locked in.'],
    ['Process Change solutions', 'Shows an amber "Process Change — no vendor required" card with delivery path (internal team, consultancy, or blended), adoption readiness score, and indicative facilitation cost. Confirms the correct delivery approach before report generation.'],
  ], 3200, 6160, ['Solution Type', 'What the Card Shows']),
  sp(),
  img('54_phase4_vendor_card.png', NW, NH),
  cap('Figure 35: Phase 4 vendor summary card — recommended vendor (Vanta, Fit Score 94/100) with cost range and compliance coverage before Phase 5 launch'),
  sp(),

  h2('11.5  Pre-Report Checkpoint — Value Chain Detail'),
  p('Below the vendor card, Phase 4 presents a full value chain panel covering every solution in the ranked shortlist. This is the final traceability check before the report is generated — ensuring nothing is orphaned and every investment decision can be defended.'),
  sp(),
  p('For each solution, the panel shows four columns: Requirements Addressed (which REQ IDs the solution satisfies), Benefits Delivered (which BEN IDs it produces), Financial Value (total risk-adjusted value in dollars), and Vendor / Delivery (who delivers it and their fit score).'),
  sp(),
  img('55_phase4_value_chain_panel.png', NW, NH),
  cap('Figure 36: Phase 4 value chain detail panel — per-solution view of Requirements → Benefits → Financial Value → Vendor/Delivery, immediately before Phase 5 launch'),
  sp(),
  callout('This checkpoint was added because of feedback that Phase 5 reports sometimes included solutions whose traceability was unclear. By showing the full chain in Phase 4, the user can identify any gaps and return to Phase 3 before committing to the report — avoiding the need to regenerate Phase 5.', 'E8F5E9', '2E7D32'),
  sp(),
  pb()
);

// ════════════════════════════════════════════════════════════════════════════
// SECTION 12 — PHASE 5: FINAL REPORT
// ════════════════════════════════════════════════════════════════════════════
children.push(
  h1('12. Phase 5 — Final Report (AI-Powered)'),
  p('Phase 5 assembles everything into a complete, board-ready executive report. The AI synthesises outputs from all previous phases into a coherent narrative with a clear recommendation, supporting evidence, and next steps.'),
  sp(),
  img('33_phase5_executive_summary.png', NW, NH),
  cap('Figure 37: Phase 5 Executive at a Glance — Portfolio PV $474K, ROI 171.1%, STRONG RETURN callout, Why This Recommendation panel. Overall Health: GREEN.'),
  sp(),
  img('34_phase5_health_dashboard.png', NW, NH),
  cap('Figure 38: Phase 5 Health Dashboard — Budget, Traceability, and Confidence RAG indicators with full Value Chain traceability map below'),
  sp(),
  p('Phase 5 outputs:'),
  b('Executive Summary — investment rationale in plain language for board-level review, including why this recommendation and what alternatives were considered'),
  b('Portfolio health dashboard — Budget / Traceability / Confidence health indicators (Green / Amber / Red)'),
  b('Full Value Chain — every solution traced from requirement through benefit to measurable value, with vendor coverage confirmed'),
  b('Financial summary table — NPV, ROI, payback, and TCO for each solution in a single comparable view'),
  b('Downloadable report — one-click HTML or PDF export for distribution'),
  sp(),

  h2('12.1  Alternatives Considered'),
  p('Phase 5 now includes an Alternatives Considered section in the report. This draws directly from Step 11 of the intake ("What has already been tried") — capturing previous attempts, failed workarounds, and rejected solutions — and weaves them into the executive narrative.'),
  p('This section matters for two reasons: it strengthens the rationale (demonstrating that the recommendation is not the first attempt to solve this problem), and it pre-empts the most common board question — "Have we tried anything simpler first?"'),
  sp(),
  img('56_phase5_alternatives_considered.png', NW, NH),
  cap('Figure 39: Phase 5 Alternatives Considered — per-solution traceability cards showing Requirements → Solution → Benefits → Vendor chain for every ranked solution'),
  sp(),

  h2('12.2  Training & Adoption Plan'),
  p('For business cases that include process change or hybrid solutions, Phase 5 now generates a Training & Adoption Plan section — a conditional table that only appears when the recommended solution set includes at least one change management or hybrid component.'),
  sp(),
  twoCol([
    ['Solution', 'The solution name and approach type (Hybrid or Process Change)'],
    ['Complexity', 'How complex the change is relative to your organisation\'s size and headcount'],
    ['People Impact', 'Estimated number of staff affected by the change'],
    ['Key Activities', 'The main training or adoption activities required — e.g. change management programme, staff upskilling, process redesign workshops, communication campaign'],
  ], 2600, 6760, ['Column', 'What It Contains']),
  sp(),
  img('57_phase5_training_plan.png', NW, NH),
  cap('Figure 40: Phase 5 Training & Adoption Plan — conditional table covering all process change and hybrid solutions with complexity, people impact, and key activities'),
  sp(),
  callout('This section is intentionally absent for pure software (Buy) solutions with no change management component. If all solutions are software-only, no Training & Adoption Plan is shown — keeping the report clean and relevant.', 'FFF8E1', 'F9A825'),
  sp(),

  h2('12.3  Recommended Next Steps'),
  p('Every Phase 5 report now ends with a Recommended Next Steps section — a prioritised, tailored action plan based on the recommended solution type, vendor, and delivery path. The steps are generated dynamically from the recommendation outputs, not from a generic template.'),
  sp(),
  threeCol([
    ['Step 1', 'Stakeholder sign-off', 'Share this report with the CFO, CTO, and project sponsor for formal sign-off. Specify which approvals are needed before procurement can start.'],
    ['Step 2', 'Vendor engagement', 'Schedule demonstrations and proof-of-concept sessions with the top-ranked vendor (e.g. Vanta). Request formal quotes to replace the AI cost estimates with actuals.'],
    ['Step 3', 'Business case validation', 'Validate the top 3 financial assumptions with the Finance team — particularly the benefit values for risk mitigation and revenue uplift.'],
    ['Step 4', 'Procurement / change kick-off', 'Initiate procurement for software solutions, or engage an internal change sponsor for process change solutions. Set up a project steering committee.'],
    ['Step 5', 'BRD handoff', 'Export the Business Requirements Document (BRD) and hand it off to the delivery team or implementation partner as the formal project brief.'],
  ], [1200, 2400, 5760], ['#', 'Next Step', 'Description']),
  sp(),
  img('58_phase5_next_steps.png', NW, NH),
  cap('Figure 41: Phase 5 Recommended Next Steps — five tailored actions with vendor name, solution type, and BRD export link embedded in the text'),
  sp(),
  pb()
);

// ════════════════════════════════════════════════════════════════════════════
// SECTION 13 — ROLE TOGGLE & GUIDE ME
// ════════════════════════════════════════════════════════════════════════════
children.push(
  h1('13. Business vs Analyst Mode'),
  p('Every phase in BCA.AI has two views. Toggle between them using the Business / Analyst switch at the top right of every screen. The same underlying data is shown — just presented differently.'),
  sp(),
  twoCol([
    ['Business View', 'Analyst View'],
    ['Plain-English KPI cards with explanations', 'Full sensitivity tables and IRR spread'],
    ['Why this recommendation summary', 'Weighted decision matrix with individual scores'],
    ['Phase status checkmarks only', 'All calculation formulas exposed with Show calculation'],
    ['3 navigation tabs (Scope, Executive Summary, Export)', '8 navigation tabs (all phases visible)'],
    ['Guide Me tips for each section', 'Full data completeness indicators'],
  ], 4680, 4680, ['Business View', 'Analyst View'], '283593'),
  sp(),
  img('35_analyst_role_expanded_nav.png', NW, NH),
  cap('Figure 42: Analyst mode — expanded navigation reveals Traceability, Ranking, Report, BRD, and BRD Standalone tabs hidden in Business mode'),
  sp(),
  img('63_analyst_toggle_mode.png', WW, WH),
  cap('Figure 43: Analyst mode — Phase 2 Portfolio Financial KPIs with full plain-English explanations: NPV $637K ("EXCEPTIONAL VALUE"), ROI 356% ("EXCELLENT RETURN"), IRR 91% ("EXCEPTIONAL INTERNAL RETURN"), Payback 19mo ("STRONG PAYBACK PERIOD"), Quality Score 82'),
  sp(),
  pb()
);

// ════════════════════════════════════════════════════════════════════════════
// SECTION 14 — AI vs FORMULA TABLE
// ════════════════════════════════════════════════════════════════════════════
children.push(
  h1('14. Where AI Is Used — and Where It Is Not'),
  p('BCA.AI is transparent about when and how AI is involved. Financial outputs are always deterministic and auditable — AI assists with content generation and research, not with the numbers themselves.'),
  sp(),
  threeCol([
    ['Phase 1 — Discovery', 'AI-Powered', 'Generates solutions, benefits, and requirements from your problem description. Draws on industry knowledge to produce realistic, targeted outputs.'],
    ['Phase 1.5 — Cost Estimation', 'AI-Powered', 'Calls the cost model with solution type, vendor pricing anchor, PIB data, and company size. Produces Low/Mid/High estimates using approach-specific cost models (buy, change, or hybrid).'],
    ['Phase 1.6 — Vendor Selection', 'AI-Powered', 'Shortlists and scores vendors against your compliance, technical stack, and budget. Adoption readiness scored for non-software solutions.'],
    ['Phase 1 Reflection / Quality Gate', 'AI-Powered', 'Reviews linkage quality, benefit credibility, and vendor compliance coverage. Produces a structured verdict (PASS / PASS WITH WARNINGS / FAIL).'],
    ['Phase 2 — Financial Analysis', 'Formula-Based', 'NPV, ROI, IRR, Payback — pure JavaScript financial modelling using standard formulas. Same inputs always produce same outputs.'],
    ['Phase 3 — Traceability & Timeline', 'AI-Powered', 'Validates the logic chain and generates the phased project timeline. Health score is calculated from coverage metrics.'],
    ['Phase 4 — Ranking', 'Formula-Based', 'Composite scoring applied to all solutions — fully deterministic, auditable weighted scoring model.'],
    ['Phase 5 — Final Report', 'AI-Powered', 'Synthesises all phases into a narrative executive summary with recommendation rationale.'],
    ['Guide Me Panel', 'Knowledge Base (No AI)', 'Built-in question-and-answer library. No API call — instant, works offline.'],
    ['Conversational Intake', 'Rule-Based (No AI)', 'Sequential question flow. AI may assist formatting answers — question logic is rule-based.'],
  ], [2800, 2200, 4360], ['Phase', 'Type', 'What It Does']),
  sp(),
  callout('Anti-Hallucination Controls\n\nBCA.AI includes several controls to prevent AI-generated content from inflating the business case:\n•  Benefit values are capped using industry-specific multipliers\n•  Process Addressability % is capped at 30% for compliance-heavy categories and 50% for technical ones\n•  Every AI-generated number is validated against your inputs — if it cannot be justified, it is flagged or removed\n•  The Quality Gate rejects business cases with unsupported benefit claims before they reach Phase 2', 'FFF3E0', 'E65100'),
  sp(),
  pb()
);

// ════════════════════════════════════════════════════════════════════════════
// SECTION 15 — OUTPUT QUALITY & CONFIDENCE
// ════════════════════════════════════════════════════════════════════════════
children.push(
  h1('15. Confidence in the Output'),
  p('A common question from C-level reviewers: "How reliable is this?"'),
  p('BCA.AI is designed to produce a solid working draft — not a final investment decision. Every output includes quality signals so you can assess confidence before escalating:'),
  sp(),
  twoCol([
    ['Quality Score (0 to 100)', 'Composite measure of data completeness across all phases. Shown on Phase 1 KPI dashboard. A score below 60 triggers a warning before Phase 2.'],
    ['Benefit Confidence %', 'Each benefit is tagged with a confidence rating. 90%+ means the estimate is well-anchored. Below 60% flags that the number needs real-world validation.'],
    ['Quality Gate Verdict', 'Pass / Pass with Warnings / Fail. The Reflection phase tells you exactly what is missing before financial analysis runs.'],
    ['Health Indicators (RAG)', 'Phase 5 surfaces Budget, Traceability, and Confidence as Green/Amber/Red at a glance. A Red indicator means a dimension needs attention before board submission.'],
    ['Analyst Mode Transparency', 'Toggle to Analyst mode to see every formula, every sensitivity assumption, and every data source behind the numbers.'],
  ], 2800, 6560, ['Signal', 'What It Tells You']),
  sp(),
  callout('BCA.AI produces a structured, AI-assisted first draft that typically replaces 3 to 5 weeks of manual analysis. The numbers are a strong starting point — final figures should be validated against live vendor quotes and actual operational data before board submission.', 'FFF8E1', 'F57F17'),
  sp(),

  h2('15.1  Quick Reference — All Phases'),
  sp(),
  threeCol([
    ['1 — Discovery', 'AI-Powered', 'Solutions, Benefits, Requirements'],
    ['1.5 — Cost Estimation', 'AI-Powered', 'Low / Mid / High cost range per solution, vendor-anchored or market-rate, TCO'],
    ['1.6 — Vendor Selection', 'AI-Powered', 'Vendor shortlist with Fit Scores; Adoption Readiness for non-software'],
    ['Quality Gate', 'AI-Powered', 'Quality verdict (0–100), go / no-go decision'],
    ['2 — Financial Analysis', 'Formula-Based', 'NPV, ROI, IRR, Payback, TCO — individual and portfolio'],
    ['3 — Traceability & Timeline', 'AI-Powered', 'Linkage score, 5-phase delivery timeline, compliance check'],
    ['4 — Ranking', 'Formula-Based', 'Ranked shortlist covering all solution types, with recommendation'],
    ['5 — Final Report', 'AI-Powered', 'Board-ready executive report with full value chain'],
    ['BRD Export', 'AI-Powered', '12-section Business Requirements Document as Word .docx'],
    ['Save / Resume', 'No AI', 'Full project export as JSON — all wizard inputs and phase results saved locally and restored instantly'],
  ], [2800, 2000, 4560], ['Phase', 'Type', 'Key Output']),
  sp()
);

// ── BUILD ──────────────────────────────────────────────────────────────────
const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Arial', color: '1A237E' },
        paragraph: { spacing: { before: 480, after: 200 }, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '1A237E', space: 2 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: '283593' },
        paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: '3949AB' },
        paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 2 } },
    ]
  },
  numbering: { config: [
    { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    { reference: 'bullets2', levels: [{ level: 0, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 900, hanging: 360 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1A237E', space: 1 } },
      tabStops: [{ type: 'right', position: 9360 }],
      children: [
        new TextRun({ text: 'BCA.AI — Business Case Analysis Platform', font: 'Arial', size: 18, color: '1A237E', bold: true }),
        new TextRun({ text: '\t', font: 'Arial', size: 18 }),
        new TextRun({ text: 'CONFIDENTIAL DRAFT  v3.0', font: 'Arial', size: 18, color: '999999' })
      ]
    })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC', space: 1 } },
      tabStops: [{ type: 'right', position: 9360 }],
      children: [
        new TextRun({ text: 'User Journey & Platform Guide  |  May 2026', font: 'Arial', size: 16, color: '999999' }),
        new TextRun({ text: '\t', font: 'Arial', size: 16 }),
        new TextRun({ text: 'Page ', font: 'Arial', size: 16, color: '999999' }),
        new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: '999999' }),
        new TextRun({ text: ' of ', font: 'Arial', size: 16, color: '999999' }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Arial', size: 16, color: '999999' })
      ]
    })] }) },
    children
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUT, buf);
  console.log('Written:', OUT, `(${(buf.length/1024/1024).toFixed(1)} MB)`);
});
