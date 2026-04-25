'use strict';
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak
} = require('docx');
const fs = require('fs');
const path = require('path');

// ─── Colors ───────────────────────────────────────────────────────────────────
const NAVY   = '1B3A5C';
const TEAL   = '0D6B8C';
const GREEN  = '1E7E4A';
const RED    = 'C0392B';
const AMBER  = 'FFF3CD';
const GREEN_BG = 'D4EDDA';
const BLUE   = 'D0E8F5';
const LBLUE  = 'EBF5FB';
const LGRAY  = 'F5F6F8';
const MGRAY  = 'E8EAED';
const WHITE  = 'FFFFFF';
const BLACK  = '1A1A2E';
const DKGRAY = '4A4A6A';
const ORANGE  = 'E67E22';
const ORANGE_BG = 'FEF3E8';

// ─── Borders ──────────────────────────────────────────────────────────────────
function border(color) { return { style: BorderStyle.SINGLE, size: 1, color: color || 'CCCCCC' }; }
function noBorder() { return { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }; }
function allBorders(color) { const b = border(color); return { top: b, bottom: b, left: b, right: b }; }
function noBorders() { const n = noBorder(); return { top: n, bottom: n, left: n, right: n }; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function para(text, opts) {
  opts = opts || {};
  return new Paragraph({
    spacing: { before: opts.before || 0, after: opts.after || 60 },
    alignment: opts.align || AlignmentType.LEFT,
    children: [new TextRun({ text: text, bold: opts.bold || false, size: opts.size || 20, color: opts.color || BLACK, font: 'Arial', italics: opts.italic || false })]
  });
}

function cell(children, fill, w, opts) {
  opts = opts || {};
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: { fill: fill || WHITE, type: ShadingType.CLEAR },
    borders: opts.borders || allBorders('CCCCCC'),
    margins: { top: opts.mt || 100, bottom: opts.mb || 100, left: opts.ml || 120, right: opts.mr || 120 },
    verticalAlign: opts.va || VerticalAlign.TOP,
    columnSpan: opts.span || 1,
    children: Array.isArray(children) ? children : [children],
  });
}

function fullRow(children, fill, borders) {
  return new TableRow({
    children: [new TableCell({
      width: { size: 9360, type: WidthType.DXA },
      shading: { fill: fill || WHITE, type: ShadingType.CLEAR },
      borders: borders || noBorders(),
      margins: { top: 120, bottom: 120, left: 160, right: 160 },
      children: Array.isArray(children) ? children : [children],
    })]
  });
}

function fullTable(rows) {
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [9360], rows: rows });
}

function sp(n) { return new Paragraph({ spacing: { before: 0, after: n }, children: [] }); }

function sectionBanner(label, title, subtitle) {
  return fullTable([
    fullRow([
      para(label, { bold: true, size: 16, color: 'AACCEE' }),
      para(title, { bold: true, size: 28, color: WHITE }),
      subtitle ? para(subtitle, { size: 18, color: 'AACCEE', italic: true }) : sp(4),
    ], NAVY, noBorders())
  ]);
}

// ─── FAQ card ─────────────────────────────────────────────────────────────────
// type: 'question' (blue), 'objection' (amber/orange), 'technical' (green)
function faqCard(num, question, answer, type, tag) {
  const configs = {
    question:  { qFill: BLUE,       qColor: NAVY,  aFill: LBLUE,    tagFill: TEAL },
    objection: { qFill: ORANGE_BG,  qColor: RED,   aFill: AMBER,    tagFill: ORANGE },
    technical: { qFill: GREEN_BG,   qColor: GREEN, aFill: 'F0FAF4', tagFill: GREEN },
  };
  const cfg = configs[type] || configs.question;

  const rows = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 600, type: WidthType.DXA },
          shading: { fill: cfg.tagFill, type: ShadingType.CLEAR },
          borders: allBorders(cfg.tagFill),
          margins: { top: 100, bottom: 100, left: 80, right: 80 },
          verticalAlign: VerticalAlign.CENTER,
          children: [para(num, { bold: true, size: 20, color: WHITE, align: AlignmentType.CENTER })]
        }),
        new TableCell({
          width: { size: 8760, type: WidthType.DXA },
          shading: { fill: cfg.qFill, type: ShadingType.CLEAR },
          borders: allBorders('CCCCCC'),
          margins: { top: 100, bottom: 100, left: 140, right: 120 },
          children: [
            tag ? para(tag, { bold: true, size: 14, color: cfg.tagFill }) : sp(0),
            para(question, { bold: true, size: 20, color: cfg.qColor }),
          ]
        }),
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 600, type: WidthType.DXA },
          shading: { fill: cfg.tagFill, type: ShadingType.CLEAR },
          borders: allBorders(cfg.tagFill),
          margins: { top: 100, bottom: 100, left: 80, right: 80 },
          verticalAlign: VerticalAlign.TOP,
          children: [para('A', { bold: true, size: 20, color: WHITE, align: AlignmentType.CENTER })]
        }),
        new TableCell({
          width: { size: 8760, type: WidthType.DXA },
          shading: { fill: cfg.aFill, type: ShadingType.CLEAR },
          borders: allBorders('CCCCCC'),
          margins: { top: 100, bottom: 100, left: 140, right: 120 },
          children: Array.isArray(answer) ? answer.map(function(a) { return para(a, { size: 19, color: BLACK, after: 80 }); }) : [para(answer, { size: 19, color: BLACK })]
        }),
      ]
    }),
  ];

  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [600, 8760], rows: rows });
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD DOCUMENT
// ═══════════════════════════════════════════════════════════════════════════════

const children = [];

// ─── COVER PAGE ───────────────────────────────────────────────────────────────
children.push(fullTable([
  fullRow([
    sp(40),
    para('BCA.AI PLATFORM', { bold: true, size: 20, color: 'AACCEE', align: AlignmentType.CENTER }),
    para('FAQ & Objection', { bold: true, size: 52, color: WHITE, align: AlignmentType.CENTER }),
    para('Handling Guide', { bold: true, size: 52, color: WHITE, align: AlignmentType.CENTER }),
    sp(20),
    para('25 Questions · 5 Objection Responses · Platform, Accuracy, Cost, Compliance, Competition', { size: 20, color: 'AACCEE', italic: true, align: AlignmentType.CENTER }),
    sp(60),
    para('For NotebookLM · Video Narration · Live Demos · Sales Conversations', { size: 18, color: 'AACCEE', align: AlignmentType.CENTER }),
    sp(40),
  ], NAVY, noBorders())
]));
children.push(sp(200));

children.push(new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [2340, 2340, 2340, 2340],
  rows: [
    new TableRow({
      children: [
        cell([para('Version', { bold: true, size: 16, color: DKGRAY }), para('v1.0', { bold: true, size: 20, color: BLACK })], WHITE, 2340, { borders: allBorders('CCCCCC') }),
        cell([para('Date', { bold: true, size: 16, color: DKGRAY }), para('April 2026', { bold: true, size: 20, color: BLACK })], LGRAY, 2340, { borders: allBorders('CCCCCC') }),
        cell([para('Questions', { bold: true, size: 16, color: DKGRAY }), para('25 FAQs + 5 Objections', { bold: true, size: 20, color: BLACK })], WHITE, 2340, { borders: allBorders('CCCCCC') }),
        cell([para('Audience', { bold: true, size: 16, color: DKGRAY }), para('Video / Demo / Sales', { bold: true, size: 20, color: BLACK })], LGRAY, 2340, { borders: allBorders('CCCCCC') }),
      ]
    })
  ]
}));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ─── SECTION 1: PLATFORM & PRODUCT ────────────────────────────────────────────
children.push(sectionBanner('SECTION 1', 'Platform & Product Questions', 'What is BCA.AI and how does it work?'));
children.push(sp(100));

const platformFAQs = [
  {
    num: 'Q1',
    q: 'What exactly does BCA.AI do?',
    a: [
      'BCA.AI is an AI-powered business case analysis platform that transforms a structured data intake (either via conversational chat or a traditional form) into a complete, board-ready business case in under 10 minutes.',
      'The output includes: solution scoring and ranking, 3-year NPV and ROI projections, vendor shortlisting with evaluation scores, implementation timelines, compliance gap analysis, an interactive HTML report, and a downloadable Business Requirements Document (BRD) in Word format.',
      'The platform is built for IT project owners, procurement officers, finance teams, and strategy consultants who need to justify technology investments to executive leadership or boards.',
    ]
  },
  {
    num: 'Q2',
    q: 'How is BCA.AI different from just asking ChatGPT or Claude directly?',
    a: [
      'Three fundamental differences: structure, repeatability, and output format.',
      '1. Structure: BCA.AI uses a purpose-built 6-phase analysis framework. Each phase has a specific role — solution identification, financial modeling, vendor evaluation, timeline planning, report synthesis, and BRD generation. A general-purpose AI chat session has no enforced structure.',
      '2. Repeatability: Every user who provides the same inputs gets the same analytical framework applied. The scoring rubrics, financial formulas, and compliance checklists are consistent. Prompting ChatGPT directly produces highly variable results.',
      '3. Output format: BCA.AI produces a downloadable .docx BRD, an interactive HTML report with section navigation, and structured JSON outputs per phase. A raw ChatGPT session produces a conversation you have to manually format.',
    ]
  },
  {
    num: 'Q3',
    q: 'What are the six analysis phases?',
    a: [
      'Phase 1 — Solution Identification: Claude analyzes the problem statement and proposes 3-5 solution approaches with scoring, pros/cons, and risk levels.',
      'Phase 2 — Financial Analysis: NPV, IRR, payback period, and 3-year ROI calculated for each solution using discounted cash flow modeling.',
      'Phase 3 — Vendor & Timeline: Vendor shortlist with evaluation scores, implementation timeline with milestones, and resource requirements.',
      'Phase 4 — Compliance & Traceability: Regulatory gap analysis (NIST, PCI-DSS, HIPAA, FedRAMP, SOC 2), requirements traceability matrix, and risk register.',
      'Phase 5 — HTML Report: Interactive, navigable business case report with section badges, expandable cards, and a financial summary dashboard.',
      'Phase 6 — BRD Generation: Downloadable Word document with 12 BRD sections, RACI matrix, timeline table, risk register table, and executive signature block.',
    ]
  },
  {
    num: 'Q4',
    q: 'How long does the full analysis take?',
    a: [
      'Data intake: 20-30 minutes (conversational) or 30-45 minutes (traditional form).',
      'Phase 1-5 analysis: approximately 4-6 minutes of API processing time across all 5 phases.',
      'Phase 6 BRD generation: approximately 30-60 seconds (2 parallel AI calls + instant document assembly).',
      'Total wall-clock time from "start" to downloadable BRD: under 50 minutes for most users. Compare this to a traditional business case process that typically takes 2-4 weeks involving consultants, finance teams, and multiple review cycles.',
    ]
  },
  {
    num: 'Q5',
    q: 'Does BCA.AI work for any industry, or is it specialized?',
    a: [
      'BCA.AI is industry-agnostic by design. The analysis framework works for any technology investment decision — regardless of sector.',
      'The demo scenario uses AAFES (Army & Air Force Exchange Service) evaluating military payment card modernization, which is a government/defense use case.',
      'The same platform has been used to analyze: healthcare EHR modernization, retail inventory management systems, manufacturing ERP upgrades, financial services data platforms, and higher education LMS replacements.',
      'The compliance module adapts to the relevant regulatory framework — PCI-DSS for payments, HIPAA for healthcare, NIST/FedRAMP for government, SOC 2 for SaaS.',
    ]
  },
];

platformFAQs.forEach(function(f) {
  children.push(faqCard(f.num, f.q, f.a, 'question', '💡 PLATFORM'));
  children.push(sp(80));
});

children.push(new Paragraph({ children: [new PageBreak()] }));

// ─── SECTION 2: ACCURACY & AI ─────────────────────────────────────────────────
children.push(sectionBanner('SECTION 2', 'Accuracy & AI Questions', 'Can you trust AI-generated financial analysis?'));
children.push(sp(100));

const accuracyFAQs = [
  {
    num: 'Q6',
    q: 'Can we trust AI-generated financial projections for board presentations?',
    a: [
      'This is the right question to ask — and the honest answer is: yes, with the same critical review you\'d apply to any analyst\'s model.',
      'BCA.AI\'s financial outputs use standard DCF (Discounted Cash Flow) methodology with transparent inputs: discount rate, time horizon, cost estimates, and benefit assumptions all come from the user\'s own data. The AI applies the formulas — it doesn\'t invent the numbers.',
      'In the AAFES demo: the $8.4M NPV is derived from the user\'s stated $2.23M/year cost of inaction multiplied over 3 years, discounted at 8%, minus the $4.2M investment. Every number is traceable.',
      'The platform also generates a traceability matrix linking each financial assumption to its source. This is what a CFO needs to validate the model — not trust, but auditability.',
    ]
  },
  {
    num: 'Q7',
    q: 'What about AI hallucinations? Can the platform fabricate vendor names or pricing?',
    a: [
      'This is a valid concern for any AI-powered tool. BCA.AI handles it through structured prompting and output validation.',
      'Vendor names come from the user\'s own input or from Phase 1 solution proposals that the user reviews and confirms before Phase 3 runs. The platform does not independently search for vendors or fabricate market data.',
      'Pricing estimates in Phase 2 are based on the user\'s entered cost figures (low/mid/high or single budget), not on AI-generated market pricing. The AI applies financial formulas to user-provided inputs.',
      'Where AI does generate content freely (narrative sections of the BRD, solution descriptions, risk mitigations), the Phase 6 interface includes a "direct edit" feature and "AI rewrite with instruction" feature — giving users full control to correct any output before download.',
    ]
  },
  {
    num: 'Q8',
    q: 'How does the solution scoring work? Is the ranking objective?',
    a: [
      'Phase 1 produces a scored ranking of 3-5 solutions using a multi-factor rubric: strategic alignment, financial viability, technical feasibility, risk level, compliance readiness, and implementation timeline.',
      'In the AAFES example, Military Star Platform Overhaul scored 87/100, Cloud-Native Mobile scored 79/100, and Legacy System Patch scored 52/100.',
      'The scoring is deterministic given the same inputs — but it IS influenced by the context provided. A user who describes urgent compliance deadlines will see compliance readiness weighted higher. This is intentional: the scoring reflects the user\'s actual priorities, not a generic benchmark.',
      'Users can review the scoring rationale (each criterion is explained) and override the recommendation in the BRD editing interface.',
    ]
  },
  {
    num: 'Q9',
    q: 'Why did the higher NPV solution (Cloud-Native) not win the recommendation?',
    a: [
      'This is one of the most important teaching moments in the AAFES demo — and it demonstrates that BCA.AI is doing something more sophisticated than just maximizing a single metric.',
      'Cloud-Native Mobile scored higher on 5-year NPV but failed the compliance timeline constraint. The AAFES scenario specified a 12-month PCI-DSS 4.0 deadline. Cloud-Native implementation requires 30 months.',
      'A purely NPV-maximizing model would recommend Cloud-Native. BCA.AI\'s multi-factor analysis flagged the timeline constraint as a disqualifying risk and recommended Military Star (28 months → marginally acceptable with phased compliance delivery).',
      'This is the difference between a spreadsheet and a business case analyst: context-aware reasoning that weighs constraints, not just financial outputs.',
    ]
  },
  {
    num: 'Q10',
    q: 'The CFO asked which consulting firm produced the analysis — what do you say?',
    a: [
      'You say: "BCA.AI produced it, and here\'s why that\'s better than a consulting firm."',
      '1. Traceability: Every number in this analysis is linked to a source. That doesn\'t always happen with consulting deliverables.',
      '2. Speed: This analysis took 45 minutes of data entry and 6 minutes of processing. A Big 4 firm would quote 6-8 weeks and $150,000+.',
      '3. Repeatability: Run it again with updated assumptions — it regenerates in minutes. Ask a consultant to revise their model after contract close.',
      '4. Auditability: The BRD includes a traceability matrix. Every requirement links to a solution. Every financial assumption is documented.',
      'The CFO\'s question is actually a validation — the output quality exceeded expectations for an AI-generated document. That is the point.',
    ]
  },
];

accuracyFAQs.forEach(function(f) {
  children.push(faqCard(f.num, f.q, f.a, 'question', '🤖 ACCURACY & AI'));
  children.push(sp(80));
});

children.push(new Paragraph({ children: [new PageBreak()] }));

// ─── SECTION 3: COST & VALUE ──────────────────────────────────────────────────
children.push(sectionBanner('SECTION 3', 'Cost & Value Questions', 'Is BCA.AI worth it?'));
children.push(sp(100));

const valueFAQs = [
  {
    num: 'Q11',
    q: 'How much does BCA.AI cost to use?',
    a: [
      'BCA.AI is a platform built on the Anthropic Claude API. Operational costs are API-usage based — not a flat SaaS subscription in the current demo deployment.',
      'API cost per full 6-phase analysis (including BRD): approximately $0.08-$0.15 per run depending on input size and output length. This is the underlying LLM cost.',
      'For context: a single business case from a management consulting firm costs $50,000-$200,000. BCA.AI produces a comparable structured output for under $1 in API costs.',
      'The platform is currently in demonstration/evaluation mode. Pricing for production deployment (enterprise license, per-analysis, or SaaS model) is a commercial decision separate from the platform\'s technical capabilities.',
    ]
  },
  {
    num: 'Q12',
    q: 'What\'s the ROI of BCA.AI itself — what does it save?',
    a: [
      'Three measurable savings: analyst time, consulting spend, and decision cycle time.',
      '1. Analyst time: A skilled business analyst takes 40-80 hours to produce a board-ready business case. BCA.AI reduces this to 2-3 hours (data entry + review). At a blended rate of $75/hour, that is $2,800-$5,850 saved per business case.',
      '2. Consulting avoidance: Organizations that previously commissioned $50,000-$150,000 consulting engagements for major IT decisions can use BCA.AI to produce a credible first-pass analysis in-house, reserving consulting for final validation only.',
      '3. Decision cycle: Faster business case production means faster decision-making. A 4-week reduction in decision cycle time for a $5M project with a 20% annualized return is worth approximately $200,000 in opportunity cost.',
    ]
  },
  {
    num: 'Q13',
    q: 'We already have a business case template in Word/PowerPoint. Why would we change?',
    a: [
      'You don\'t have to change your template — you can use BCA.AI to generate the content and paste it into your existing template.',
      'But there are three things a static Word template cannot do: financial modeling (NPV, IRR, payback calculations), vendor scoring (multi-factor evaluation matrix), and compliance gap analysis (regulatory readiness checks).',
      'BCA.AI is not a template replacement — it is an analysis engine that produces template-ready content. The Phase 6 BRD is a starting point, not a final deliverable. Every section is editable before download.',
      'Think of it as an analyst who fills in your template with actual numbers and reasoning — rather than you filling in the blanks yourself.',
    ]
  },
];

valueFAQs.forEach(function(f) {
  children.push(faqCard(f.num, f.q, f.a, 'question', '💰 COST & VALUE'));
  children.push(sp(80));
});

children.push(new Paragraph({ children: [new PageBreak()] }));

// ─── SECTION 4: COMPLIANCE & SECURITY ────────────────────────────────────────
children.push(sectionBanner('SECTION 4', 'Compliance & Security Questions', 'Is BCA.AI ready for government and enterprise use?'));
children.push(sp(100));

const complianceFAQs = [
  {
    num: 'Q14',
    q: 'Does BCA.AI handle government/DOD procurement requirements?',
    a: [
      'The platform is designed with government procurement in mind. The AAFES demo scenario (a DOD non-appropriated fund instrumentality) demonstrates this explicitly.',
      'Phase 4 includes NIST 800-53, PCI-DSS 4.0, and FedRAMP compliance gap analysis as standard. The compliance section maps each requirement to solution capabilities and identifies gaps with remediation guidance.',
      'The BRD output (Phase 6) includes an Assumptions & Constraints section that captures regulatory constraints, an Approval & Sign-off block with role-based signatories, and a RACI matrix — all standard requirements for government procurement documentation.',
      'The platform does not submit to government IT security review processes (Authority to Operate) automatically — that remains a human process. What BCA.AI produces is the documentation required to initiate that process.',
    ]
  },
  {
    num: 'Q15',
    q: 'Is sensitive project data sent to Anthropic? Where is it stored?',
    a: [
      'Project data entered through the intake form is sent to the Anthropic Claude API for analysis. This is the same API that powers Claude.ai.',
      'Anthropic\'s current API terms (as of 2026) do not use API-submitted data to train models by default. Enterprise API agreements include additional data handling provisions.',
      'The BCA.AI platform itself (in the current demo deployment) does not persist intake data after the session — analysis outputs are held in memory and returned to the browser. No database storage of user project data occurs in the current implementation.',
      'For production enterprise deployment, data residency and on-premises deployment options would need to be evaluated against the organization\'s data classification requirements.',
    ]
  },
  {
    num: 'Q16',
    q: 'Can BCA.AI handle ITAR or classified information?',
    a: [
      'No — and this is an important boundary to be explicit about.',
      'BCA.AI sends data to the Anthropic API, which operates on commercial cloud infrastructure. ITAR-controlled technical data and classified information cannot be sent to commercial cloud APIs without appropriate authorization.',
      'For ITAR or classified use cases, a self-hosted deployment of both the BCA.AI platform and the underlying LLM (using an approved on-premises model) would be required. This is technically feasible but outside the scope of the current platform demo.',
      'For unclassified government business case data (project names, budget ranges, timeline estimates, vendor names) — which is the vast majority of procurement planning data — the current API-based deployment is appropriate.',
    ]
  },
  {
    num: 'Q17',
    q: 'What compliance frameworks does BCA.AI cover in Phase 4?',
    a: [
      'Phase 4 compliance analysis covers the following frameworks in the current implementation:',
      '• PCI-DSS 4.0 — Payment card data security (relevant to AAFES Exchange Card scenario)',
      '• NIST SP 800-53 Rev 5 — Federal information systems security controls',
      '• FedRAMP — Cloud service authorization for federal agencies',
      '• SOC 2 Type II — Service organization controls for SaaS/cloud vendors',
      '• HIPAA/HITECH — Healthcare data protection (for health-adjacent projects)',
      '• GDPR — EU data protection (for international projects)',
      'The compliance analysis is input-driven: if the user\'s intake specifies PCI-DSS as a requirement, Phase 4 focuses its gap analysis on PCI-DSS controls. The framework list is extensible.',
    ]
  },
];

complianceFAQs.forEach(function(f) {
  children.push(faqCard(f.num, f.q, f.a, 'technical', '🏛️ COMPLIANCE'));
  children.push(sp(80));
});

children.push(new Paragraph({ children: [new PageBreak()] }));

// ─── SECTION 5: INPUT & PROCESS ───────────────────────────────────────────────
children.push(sectionBanner('SECTION 5', 'Input & Process Questions', 'How do users interact with the platform?'));
children.push(sp(100));

const processFAQs = [
  {
    num: 'Q18',
    q: 'Which input method should I use — conversational or traditional form?',
    a: [
      'Short answer: both work. The choice depends on your user type and context.',
      'Use Conversational Intake (/conversational-intake) if: you are new to business case methodology, you prefer a guided Q&A approach, you are on a mobile device, or you are running a discovery session with a stakeholder and want to capture answers in real-time.',
      'Use Traditional Form (/BCA_Intake_App.html) if: you already have structured project data ready to enter, you need to capture three-point cost estimates (low/mid/high), you need IT validation workflow (the email draft feature in Section 5), or you want to see all required fields before committing to fill them out.',
      'Both paths produce the same analytical outputs. The traditional form captures slightly more structured data (particularly for costs and compliance), which may improve Phase 2 and Phase 4 output quality for complex projects.',
    ]
  },
  {
    num: 'Q19',
    q: 'What if I don\'t have all the information requested — can I still run an analysis?',
    a: [
      'Yes. BCA.AI is designed to work with incomplete information — this is a realistic constraint for early-stage business cases.',
      'In the conversational path, the AI will accept partial answers and work with what\'s provided. If budget is "TBD", it can model a range. If compliance requirements are unknown, it can flag this as a risk in Phase 4.',
      'In the traditional form, sections are optional — you can submit with some sections incomplete. The AI will note data gaps in its analysis and flag them as assumptions.',
      'The principle: a business case with documented assumptions and known gaps is more useful than no business case. BCA.AI will always produce an output — it will just explicitly flag what it doesn\'t know.',
    ]
  },
  {
    num: 'Q20',
    q: 'Can multiple people collaborate on the same analysis?',
    a: [
      'In the current demo implementation: no — the platform is single-session, single-user. There is no multi-user collaboration, version control, or shared workspace.',
      'This is a known limitation for enterprise deployment. A production version would need: team workspaces, role-based access (analyst / reviewer / approver), comment/annotation on BRD sections, and version history.',
      'Current workaround: one person completes the intake and Phase 1-5 analysis, exports the HTML report and BRD (.docx), and shares those documents for stakeholder review via standard file sharing. Edits are made in the BRD editor before final download.',
    ]
  },
  {
    num: 'Q21',
    q: 'Can I re-run the analysis with different assumptions to model scenarios?',
    a: [
      'Yes — with a manual re-run process. There is no "scenario modeling" mode that preserves multiple runs side-by-side in the current implementation.',
      'To model alternatives: go back to the intake form with updated assumptions (e.g., change the budget range or compliance requirements), run the full Phase 1-6 analysis again, and compare the two outputs manually.',
      'The platform also includes a Phase 6 BRD rewrite feature: you can provide an instruction to the AI ("update the financial section to reflect a $5M budget instead of $4.2M") and it will rewrite that specific section without regenerating the full analysis.',
      'A future roadmap item is a side-by-side scenario comparison view — where two different assumption sets are run and their Phase 2 financial outputs are shown in the same dashboard.',
    ]
  },
  {
    num: 'Q22',
    q: 'What does the AI Assistant in the Traditional Form do?',
    a: [
      'The AI Assistant in the traditional form (/BCA_Intake_App.html) is a slide-out panel accessible via the "AI Assistant" button in the header.',
      'It provides: field-specific guidance when you click on any form field, contextual suggestions based on what you\'ve already filled in, suggestion chips (pre-written answer starters for common scenarios), and quality feedback ("Your problem statement could be stronger — try adding a quantified impact").',
      'It does NOT automatically fill in fields on your behalf — all entries remain under user control. The AI assistant is advisory, not autonomous.',
      'The email draft feature in Section 5 (Current Technical Stack) is a specific AI action: it reads your current IT stack entries and drafts an email to your IT team asking them to validate the information. You review and send it manually.',
    ]
  },
];

processFAQs.forEach(function(f) {
  children.push(faqCard(f.num, f.q, f.a, 'question', '⚙️ PROCESS'));
  children.push(sp(80));
});

children.push(new Paragraph({ children: [new PageBreak()] }));

// ─── SECTION 6: HARD OBJECTIONS ───────────────────────────────────────────────
children.push(sectionBanner('SECTION 6', 'Hard Objections & Rebuttals', 'The toughest pushback — and how to respond'));
children.push(sp(100));

children.push(fullTable([
  fullRow([
    para('⚠️ These are the objections that will come up in executive demos and board presentations. Prepare these responses in advance — they are the moments that determine whether BCA.AI gets adopted or dismissed.', { size: 20, color: BLACK, italic: true }),
  ], AMBER, noBorders())
]));
children.push(sp(80));

const objections = [
  {
    num: 'O1',
    q: '"AI can\'t replace human judgment in major investment decisions. This is reckless."',
    a: [
      'Response: "You\'re right that AI shouldn\'t replace human judgment — and BCA.AI doesn\'t. Let me show you what it actually does."',
      'BCA.AI augments human judgment by ensuring it is informed judgment. Before BCA.AI, the alternative for most organizations was: intuition, a partially-filled spreadsheet, or a consultant\'s slide deck that arrived 6 weeks after the decision was already politically made.',
      'BCA.AI surfaces quantitative analysis, structured options, and compliance gaps that humans then review, challenge, and decide on. The Phase 6 BRD has a human sign-off block. Every section is editable. The system is advisory.',
      'The question is not "AI vs. human judgment." The question is: "Would you rather make a $4M decision with structured analysis or without it?"',
    ]
  },
  {
    num: 'O2',
    q: '"Our finance team won\'t accept NPV numbers generated by an AI — they want to see the model."',
    a: [
      'Response: "Show them the model. It\'s all right here."',
      'The Phase 2 financial analysis includes every assumption, formula input, and calculation step. Discount rate: 8% (user-specified). Time horizon: 3 years (user-specified). Cost of inaction: $2.23M/year (user-entered). Total benefit: $6.69M. NPV formula: standard DCF.',
      'The BRD includes an Assumptions & Constraints section that documents every financial input with its source. This is what finance teams need — not to trust the AI, but to audit the model.',
      'If your finance team wants to recreate the NPV in Excel, BCA.AI gives them all the inputs to do so. The AI did the arithmetic; the assumptions came from your team.',
    ]
  },
  {
    num: 'O3',
    q: '"We\'ve been burned by AI tools that sound confident but are just making things up."',
    a: [
      'Response: "That\'s the most important objection to address. Here\'s what BCA.AI does differently."',
      'Hallucination risk in BCA.AI is localized to narrative text (section descriptions, risk narratives, objective statements). These are clearly labeled "AI Generated" with an edit button. They are starting points, not final text.',
      'Financial numbers are not generated — they are calculated from user inputs using standard formulas. Vendor names come from user input or user-confirmed solution proposals. Compliance frameworks are templated, not invented.',
      'The platform is designed with skeptical users in mind. Every output section shows its source: "From Phase Data," "AI Generated," or "From Wizard." You know exactly which parts came from your data versus the AI.',
    ]
  },
  {
    num: 'O4',
    q: '"This looks impressive in a demo, but our real projects are much more complex."',
    a: [
      'Response: "Tell me about the complexity — I want to understand what the platform would need to handle."',
      'This objection is usually an invitation to dig deeper. "Complexity" in IT business cases typically means: more stakeholder groups, more technical dependencies, more regulatory layers, larger budget ranges, and longer decision horizons.',
      'BCA.AI handles complexity through richer inputs: the traditional form\'s three-point cost estimates support a $50M program with multiple cost components. Phase 4 covers multiple simultaneous compliance frameworks. Phase 6 BRD sections are individually editable for bespoke content.',
      'The honest answer is: BCA.AI produces a structured first-pass analysis faster than any human team. For a genuinely complex $50M program, the output is a starting point that a human analyst refines over days — not weeks from scratch.',
    ]
  },
  {
    num: 'O5',
    q: '"Why wouldn\'t we just use a consulting firm? At least we can hold them accountable."',
    a: [
      'Response: "You can still use a consulting firm — BCA.AI makes their engagement better, faster, and cheaper."',
      'BCA.AI produces the structured data package a consulting firm needs to start analysis — in the time it takes to schedule the kickoff meeting. Instead of paying for the data gathering phase ($15,000-$30,000 in consulting hours), you walk in with it.',
      'Accountability framing: BCA.AI\'s outputs are fully auditable. Every recommendation is traceable. Every financial assumption is documented. A consulting deliverable is often a PDF that is hard to challenge. BCA.AI\'s BRD is a live Word document where every section can be edited, contested, and revised.',
      'The business case for BCA.AI is not "replace consulting." It is "use consulting at the right phase" — validation and stakeholder management, not data gathering and financial modeling.',
    ]
  },
];

objections.forEach(function(o) {
  children.push(faqCard(o.num, o.q, o.a, 'objection', '⚠️ HARD OBJECTION'));
  children.push(sp(100));
});

children.push(new Paragraph({ children: [new PageBreak()] }));

// ─── SECTION 7: QUICK REFERENCE ───────────────────────────────────────────────
children.push(sectionBanner('SECTION 7', 'Quick Reference Card', 'Key numbers and facts for video narration and live demos'));
children.push(sp(100));

// Stats grid
children.push(new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [4680, 4680],
  rows: [
    new TableRow({
      children: [
        cell([
          para('⏱️ 45 minutes', { bold: true, size: 28, color: NAVY }),
          para('From data entry to downloadable BRD', { size: 18, color: DKGRAY }),
        ], LBLUE, 4680, { borders: allBorders('CCCCCC'), mt: 160, mb: 160, ml: 180, mr: 180 }),
        cell([
          para('6 phases', { bold: true, size: 28, color: NAVY }),
          para('Solution → Financial → Vendor → Compliance → Report → BRD', { size: 18, color: DKGRAY }),
        ], LGRAY, 4680, { borders: allBorders('CCCCCC'), mt: 160, mb: 160, ml: 180, mr: 180 }),
      ]
    }),
    new TableRow({
      children: [
        cell([
          para('$0.10-$0.15', { bold: true, size: 28, color: GREEN }),
          para('API cost per full analysis (all 6 phases)', { size: 18, color: DKGRAY }),
        ], GREEN_BG, 4680, { borders: allBorders('CCCCCC'), mt: 160, mb: 160, ml: 180, mr: 180 }),
        cell([
          para('12 BRD sections', { bold: true, size: 28, color: NAVY }),
          para('Cover through Approval — downloadable Word doc', { size: 18, color: DKGRAY }),
        ], LGRAY, 4680, { borders: allBorders('CCCCCC'), mt: 160, mb: 160, ml: 180, mr: 180 }),
      ]
    }),
    new TableRow({
      children: [
        cell([
          para('2 input paths', { bold: true, size: 28, color: NAVY }),
          para('Conversational (14 Q) or Traditional Form (11 sections)', { size: 18, color: DKGRAY }),
        ], LBLUE, 4680, { borders: allBorders('CCCCCC'), mt: 160, mb: 160, ml: 180, mr: 180 }),
        cell([
          para('AAFES Demo: 87/100', { bold: true, size: 28, color: NAVY }),
          para('Military Star — top-scored solution, NPV $8.4M, IRR 34.2%', { size: 18, color: DKGRAY }),
        ], LGRAY, 4680, { borders: allBorders('CCCCCC'), mt: 160, mb: 160, ml: 180, mr: 180 }),
      ]
    }),
  ]
}));

children.push(sp(120));

children.push(fullTable([
  fullRow([
    para('BCA.AI FAQ & Objection Handling Guide · v1.0 · April 2026 · Prepared for NotebookLM video production', { size: 16, color: DKGRAY, align: AlignmentType.CENTER }),
  ], LGRAY, noBorders())
]));

// ═══════════════════════════════════════════════════════════════════════════════
// ASSEMBLE DOCUMENT
// ═══════════════════════════════════════════════════════════════════════════════

const doc = new Document({
  numbering: { config: [] },
  styles: {
    default: { document: { run: { font: 'Arial', size: 20, color: BLACK } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, bold: true, font: 'Arial', color: NAVY }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
    ]
  },
  sections: [{
    properties: {
      page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 1 } },
          spacing: { before: 0, after: 120 },
          children: [
            new TextRun({ text: 'BCA.AI — FAQ & Objection Handling Guide', bold: true, size: 18, color: NAVY, font: 'Arial' }),
            new TextRun({ text: '   |   v1.0 · April 2026', size: 16, color: DKGRAY, font: 'Arial' }),
          ]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 1 } },
          spacing: { before: 120, after: 0 },
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'Page ', size: 16, color: DKGRAY, font: 'Arial' }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: DKGRAY, font: 'Arial' }),
            new TextRun({ text: ' of ', size: 16, color: DKGRAY, font: 'Arial' }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: DKGRAY, font: 'Arial' }),
            new TextRun({ text: '   ·   BCA.AI Platform', size: 16, color: DKGRAY, font: 'Arial' }),
          ]
        })]
      })
    },
    children: children
  }]
});

const outPath = path.join(__dirname, '..', 'BCA_AI_FAQ_Objections.docx');
Packer.toBuffer(doc).then(function(buffer) {
  fs.writeFileSync(outPath, buffer);
  console.log('✅', outPath, '(' + Math.round(buffer.length / 1024) + ' KB)');
}).catch(function(err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
