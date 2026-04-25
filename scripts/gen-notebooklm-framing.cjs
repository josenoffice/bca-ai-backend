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
const PURPLE = '5B2C6F';
const GREEN  = '1E7E4A';
const AMBER  = 'FFF3CD';
const GREEN_BG = 'D4EDDA';
const BLUE   = 'D0E8F5';
const LBLUE  = 'EBF5FB';
const LGRAY  = 'F5F6F8';
const MGRAY  = 'E8EAED';
const WHITE  = 'FFFFFF';
const BLACK  = '1A1A2E';
const DKGRAY = '4A4A6A';
const PURPLE_BG = 'F4ECF7';

// ─── Borders ──────────────────────────────────────────────────────────────────
function border(color) { return { style: BorderStyle.SINGLE, size: 1, color: color || 'CCCCCC' }; }
function noBorder() { return { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }; }
function allBorders(color) { const b = border(color); return { top: b, bottom: b, left: b, right: b }; }
function noBorders() { const n = noBorder(); return { top: n, bottom: n, left: n, right: n }; }

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

// ─── Numbered insight card ────────────────────────────────────────────────────
function insightCard(num, headline, body, fill, numFill) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1000, 8360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 1000, type: WidthType.DXA },
            shading: { fill: numFill || NAVY, type: ShadingType.CLEAR },
            borders: allBorders(numFill || NAVY),
            margins: { top: 120, bottom: 120, left: 80, right: 80 },
            verticalAlign: VerticalAlign.CENTER,
            children: [para(num, { bold: true, size: 32, color: WHITE, align: AlignmentType.CENTER })]
          }),
          new TableCell({
            width: { size: 8360, type: WidthType.DXA },
            shading: { fill: fill || LBLUE, type: ShadingType.CLEAR },
            borders: allBorders('CCCCCC'),
            margins: { top: 120, bottom: 120, left: 140, right: 140 },
            children: [
              para(headline, { bold: true, size: 22, color: NAVY }),
              sp(40),
              para(body, { size: 19, color: BLACK }),
            ]
          }),
        ]
      })
    ]
  });
}

// ─── Audience-specific "wow moment" card ────────────────────────────────────
function audienceCard(icon, audience, wowMoment, keyMessage, suggestedQ) {
  const rows = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 9360, type: WidthType.DXA },
          shading: { fill: NAVY, type: ShadingType.CLEAR },
          borders: allBorders('336699'),
          margins: { top: 100, bottom: 100, left: 140, right: 140 },
          children: [para(icon + '  ' + audience, { bold: true, size: 22, color: WHITE })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 4680, type: WidthType.DXA },
          shading: { fill: LBLUE, type: ShadingType.CLEAR },
          borders: allBorders('CCCCCC'),
          margins: { top: 100, bottom: 100, left: 120, right: 120 },
          children: [
            para('⭐ WOW MOMENT', { bold: true, size: 16, color: TEAL }),
            sp(40),
            para(wowMoment, { size: 18, color: BLACK }),
          ]
        }),
        new TableCell({
          width: { size: 4680, type: WidthType.DXA },
          shading: { fill: LGRAY, type: ShadingType.CLEAR },
          borders: allBorders('CCCCCC'),
          margins: { top: 100, bottom: 100, left: 120, right: 120 },
          children: [
            para('💬 KEY MESSAGE', { bold: true, size: 16, color: NAVY }),
            sp(40),
            para(keyMessage, { size: 18, color: BLACK }),
          ]
        }),
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 9360, type: WidthType.DXA },
          shading: { fill: AMBER, type: ShadingType.CLEAR },
          borders: allBorders('CCCCCC'),
          margins: { top: 100, bottom: 100, left: 120, right: 120 },
          children: [
            para('🎙️ SUGGESTED NOTEBOOKLM QUESTION: "' + suggestedQ + '"', { bold: true, size: 18, color: BLACK, italic: true }),
          ]
        })
      ]
    }),
  ];

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4680, 4680],
    rows: rows,
  });
}

// ─── Question card ────────────────────────────────────────────────────────────
function questionCard(category, questions, fill, headerFill) {
  const qRows = questions.map(function(q, i) {
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 600, type: WidthType.DXA },
          shading: { fill: headerFill || TEAL, type: ShadingType.CLEAR },
          borders: allBorders('CCCCCC'),
          margins: { top: 80, bottom: 80, left: 80, right: 80 },
          verticalAlign: VerticalAlign.CENTER,
          children: [para(String(i + 1), { bold: true, size: 18, color: WHITE, align: AlignmentType.CENTER })]
        }),
        new TableCell({
          width: { size: 8760, type: WidthType.DXA },
          shading: { fill: fill || LBLUE, type: ShadingType.CLEAR },
          borders: allBorders('CCCCCC'),
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [para(q, { size: 19, color: BLACK, italic: true })]
        }),
      ]
    });
  });

  const headerRow = new TableRow({
    children: [
      new TableCell({
        width: { size: 9360, type: WidthType.DXA },
        columnSpan: 2,
        shading: { fill: headerFill || TEAL, type: ShadingType.CLEAR },
        borders: allBorders(headerFill || TEAL),
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [para(category, { bold: true, size: 18, color: WHITE })]
      })
    ]
  });

  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [600, 8760], rows: [headerRow].concat(qRows) });
}

// ─── Do / Don't table ─────────────────────────────────────────────────────────
function dosDontsTable(dos, donts) {
  const W1 = 4680, W2 = 4680;
  const maxRows = Math.max(dos.length, donts.length);
  const hdr = new TableRow({
    children: [
      new TableCell({ width: { size: W1, type: WidthType.DXA }, shading: { fill: GREEN, type: ShadingType.CLEAR }, borders: allBorders(GREEN), margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para('✅ DO SAY / DO SHOW', { bold: true, size: 18, color: WHITE })] }),
      new TableCell({ width: { size: W2, type: WidthType.DXA }, shading: { fill: 'C0392B', type: ShadingType.CLEAR }, borders: allBorders('C0392B'), margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para('❌ AVOID / DON\'T SAY', { bold: true, size: 18, color: WHITE })] }),
    ]
  });
  const dataRows = Array.from({ length: maxRows }, function(_, i) {
    return new TableRow({
      children: [
        new TableCell({ width: { size: W1, type: WidthType.DXA }, shading: { fill: GREEN_BG, type: ShadingType.CLEAR }, borders: allBorders('CCCCCC'), margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para(dos[i] || '', { size: 18, color: BLACK })] }),
        new TableCell({ width: { size: W2, type: WidthType.DXA }, shading: { fill: 'FADBD8', type: ShadingType.CLEAR }, borders: allBorders('CCCCCC'), margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para(donts[i] || '', { size: 18, color: BLACK })] }),
      ]
    });
  });
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [W1, W2], rows: [hdr].concat(dataRows) });
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
    para('NotebookLM', { bold: true, size: 52, color: WHITE, align: AlignmentType.CENTER }),
    para('Framing Guide', { bold: true, size: 52, color: WHITE, align: AlignmentType.CENTER }),
    sp(20),
    para('Narrative angle · Key claims · Audio overview questions · Emotional arc · Wow moments by audience', { size: 20, color: 'AACCEE', italic: true, align: AlignmentType.CENTER }),
    sp(60),
    para('Use this document as a NotebookLM source to guide AI-generated audio overviews and video scripts', { size: 18, color: 'AACCEE', align: AlignmentType.CENTER }),
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
        cell([para('Format', { bold: true, size: 16, color: DKGRAY }), para('NotebookLM Source Doc', { bold: true, size: 20, color: BLACK })], WHITE, 2340, { borders: allBorders('CCCCCC') }),
        cell([para('Use', { bold: true, size: 16, color: DKGRAY }), para('Upload to NotebookLM', { bold: true, size: 20, color: BLACK })], LGRAY, 2340, { borders: allBorders('CCCCCC') }),
      ]
    })
  ]
}));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ─── SECTION 1: PURPOSE ────────────────────────────────────────────────────────
children.push(sectionBanner('SECTION 1', 'How to Use This Document', 'Instructions for the NotebookLM operator'));
children.push(sp(100));

children.push(fullTable([
  fullRow([
    para('📋 PURPOSE OF THIS DOCUMENT', { bold: true, size: 18, color: NAVY }),
    sp(40),
    para('This is a meta-framing guide. Upload it to NotebookLM alongside the other BCA.AI source documents (PRD, Intake Spec, Slide Deck, Video Script, Audio Script, FAQ, Screenshot Guide) to give NotebookLM explicit direction on:',  { size: 20, color: BLACK }),
    sp(40),
    para('• What narrative angle to take when generating audio overviews', { size: 19, color: BLACK }),
    para('• Which claims to emphasize and which to downplay', { size: 19, color: BLACK }),
    para('• What the "wow moments" are for each audience type', { size: 19, color: BLACK }),
    para('• What questions to suggest to the user of the NotebookLM notebook', { size: 19, color: BLACK }),
    para('• What emotional arc the content should follow', { size: 19, color: BLACK }),
    para('• What NOT to say — claims to avoid, framings that will backfire', { size: 19, color: BLACK }),
    sp(40),
    para('Without this guide, NotebookLM will produce a technically accurate but tonally generic overview. With this guide, the audio overview will be framed to persuade, surprise, and inspire — not just summarize.', { size: 20, color: BLACK, italic: true }),
  ], WHITE, noBorders())
]));

children.push(sp(80));

children.push(fullTable([
  fullRow([
    para('🗂️ SOURCE DOCUMENTS TO UPLOAD (in this order):', { bold: true, size: 18, color: NAVY }),
    sp(40),
    para('1. BCA_AI_PRD.docx — Platform overview, 6 phases, architecture', { size: 19, color: BLACK }),
    para('2. BCA_AI_Complete_Intake_AAFES.docx — Full AAFES demo Q&A walkthrough', { size: 19, color: BLACK }),
    para('3. BCA_AI_Traditional_Intake_Spec.docx — Traditional form 11-section spec', { size: 19, color: BLACK }),
    para('4. BCA_AI_Dual_Path_Comparison.docx — Conversational vs Traditional comparison', { size: 19, color: BLACK }),
    para('5. BCA_AI_Screenshot_Guide.docx — 24 screen shots with navigation steps', { size: 19, color: BLACK }),
    para('6. BCA_AI_Video_Script.docx — 15-minute explainer narration script', { size: 19, color: BLACK }),
    para('7. BCA_AI_Audio_Script.docx — Podcast dialogue (Sarah Chen + Marcus Webb)', { size: 19, color: BLACK }),
    para('8. BCA_AI_Slide_Deck_Outline.docx — 22-slide deck with speaker notes', { size: 19, color: BLACK }),
    para('9. BCA_AI_Infographic_Brief.docx — 6-zone infographic design spec', { size: 19, color: BLACK }),
    para('10. BCA_AI_FAQ_Objections.docx — 25 FAQs + 5 hard objection rebuttals', { size: 19, color: BLACK }),
    para('11. BCA_AI_NotebookLM_Framing_Guide.docx — THIS DOCUMENT (upload last)', { size: 19, color: BLACK, bold: true }),
  ], AMBER, noBorders())
]));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ─── SECTION 2: NARRATIVE ANGLE ───────────────────────────────────────────────
children.push(sectionBanner('SECTION 2', 'The Narrative Angle', 'How to frame BCA.AI for maximum impact'));
children.push(sp(100));

children.push(fullTable([
  fullRow([
    para('THE CORE NARRATIVE (use this framing in ALL content)', { bold: true, size: 22, color: NAVY }),
    sp(60),
    para('"Enterprise technology decisions costing millions of dollars are routinely made on gut feel, partial information, and PowerPoint slides produced under deadline pressure. BCA.AI is the first platform that applies structured financial analysis, multi-factor solution scoring, and compliance gap checking to this problem — in under an hour, for less than a dollar in compute costs."', { size: 22, color: NAVY, italic: true }),
    sp(60),
    para('This is not a story about AI replacing humans. It is a story about giving humans the analytical rigor they never had time to do themselves.', { size: 20, color: BLACK }),
  ], LBLUE, noBorders())
]));

children.push(sp(100));

const narrativeInsights = [
  {
    num: '1',
    headline: 'Lead with the problem, not the solution',
    body: 'Before showing BCA.AI, establish the pain: "Your organization is about to spend $4 million. The analysis backing that decision is a 12-slide deck and a gut feeling." The platform\'s value is only visible once the problem is felt. Spend the first 20% of any content on the problem.',
    fill: LBLUE,
    numFill: NAVY
  },
  {
    num: '2',
    headline: 'The AAFES scenario is the proof — use it completely',
    body: 'The AAFES Exchange Card Modernization scenario is not just a demo. It is a complete, realistic, high-stakes procurement decision: $4.2M investment, 14 million military customers, PCI-DSS 4.0 deadline, 23% OCONUS transaction decline. Every number is specific. Use specifics — they create credibility that generic examples destroy.',
    fill: LBLUE,
    numFill: NAVY
  },
  {
    num: '3',
    headline: 'The Cloud-Native twist is the narrative climax',
    body: 'The most surprising moment in the AAFES demo: the solution with the highest NPV does NOT win. Cloud-Native Mobile ($11.2M 5-year NPV) loses to Military Star Overhaul ($8.4M NPV) because it fails the 12-month PCI-DSS compliance deadline. This is the moment that proves BCA.AI is doing real analysis, not just maximizing one number. Build to this reveal.',
    fill: PURPLE_BG,
    numFill: PURPLE
  },
  {
    num: '4',
    headline: 'The CFO moment is the emotional anchor',
    body: '"She asked which consulting firm produced it." This line from the audio script (Marcus Webb\'s CFO story) is the emotional anchor of the entire narrative. It should appear in every content format — video narration, podcast, slide speaker notes, FAQ. It encapsulates the value proposition in a human story.',
    fill: GREEN_BG,
    numFill: GREEN
  },
  {
    num: '5',
    headline: 'End with access, not hype',
    body: 'Do not end with "BCA.AI is the future of enterprise decision-making." End with something actionable: "You can run your own analysis at [URL]. Your first business case takes about 45 minutes." Give the audience a next step, not a tagline.',
    fill: LBLUE,
    numFill: NAVY
  },
];

narrativeInsights.forEach(function(n) {
  children.push(insightCard(n.num, n.headline, n.body, n.fill, n.numFill));
  children.push(sp(80));
});

children.push(new Paragraph({ children: [new PageBreak()] }));

// ─── SECTION 3: AUDIENCE WOW MOMENTS ─────────────────────────────────────────
children.push(sectionBanner('SECTION 3', 'Audience-Specific Wow Moments', 'What lands with each viewer type'));
children.push(sp(100));

const audiences = [
  {
    icon: '💼',
    audience: 'CFO / Finance Director',
    wow: 'The NPV analysis includes DCF methodology with a configurable discount rate and time horizon. Every financial assumption is documented and traceable. The analysis is auditable.',
    key: 'This is not an AI that makes up numbers. It is a DCF calculator with AI-quality narrative framing. The model is transparent.',
    q: 'How does BCA.AI ensure the financial projections are defensible in a board presentation?'
  },
  {
    icon: '🏛️',
    audience: 'Government / DOD Procurement Officer',
    wow: 'The AAFES demo is a DOD non-appropriated fund instrumentality making a PCI-DSS 4.0 compliant procurement decision. The BRD output includes a requirements traceability matrix and an approval sign-off block.',
    key: 'BCA.AI produces the documentation structure required to initiate a government ATO or procurement approval process in under an hour.',
    q: 'What compliance frameworks does BCA.AI check in Phase 4, and how does it handle PCI-DSS 4.0 requirements for federal payment systems?'
  },
  {
    icon: '👩‍💻',
    audience: 'IT Project Manager / Solution Architect',
    wow: 'The platform evaluates solutions across 6 dimensions: strategic alignment, financial viability, technical feasibility, risk level, compliance readiness, and timeline. A solutions with a better NPV can lose if it fails a constraint.',
    key: 'BCA.AI catches the mistake that pure NPV maximization misses. The compliance timeline constraint analysis in Phase 4 is what a senior architect does manually — now automated.',
    q: 'How does BCA.AI handle competing solution constraints like timeline, compliance deadlines, and NPV in the scoring algorithm?'
  },
  {
    icon: '🎙️',
    audience: 'NotebookLM Podcast / Audio Overview',
    wow: 'The plot twist: a $4M government IT decision, where the AI recommends the solution with the LOWER NPV — and it\'s the right call. This is what makes the audio compelling.',
    key: 'Structure the audio overview as a narrative: problem → solution → surprising insight (NPV loser wins) → human proof point (CFO story) → call to action.',
    q: 'Walk me through the AAFES case study from problem identification to final BRD — and explain why the highest-NPV solution didn\'t win.'
  },
  {
    icon: '🎬',
    audience: 'Video / YouTube Viewer',
    wow: 'Showing the BRD .docx download in the final 30 seconds — a professional Word document with cover page, table of contents, and 12 sections — produced entirely by AI from a 45-minute intake session.',
    key: 'The download moment is the payoff. Build toward it. Frame everything before it as "and this is what produces that document you just saw."',
    q: 'What does the final Business Requirements Document look like, and how long does it take to generate from a completed intake?'
  },
  {
    icon: '🧑‍💼',
    audience: 'First-Time User / Business Analyst',
    wow: 'The conversational intake asks 14 plain-language questions. No business case expertise required. A first-time user can produce an analysis that would take a senior analyst 40-80 hours to do manually.',
    key: 'BCA.AI democratizes the business case. You don\'t need to know what DCF means to get a DCF analysis. You just need to know your project.',
    q: 'Can someone with no financial modeling background produce a credible business case using BCA.AI? What do they actually have to know?'
  },
];

audiences.forEach(function(a) {
  children.push(audienceCard(a.icon, a.audience, a.wow, a.key, a.q));
  children.push(sp(100));
});

children.push(new Paragraph({ children: [new PageBreak()] }));

// ─── SECTION 4: SUGGESTED NOTEBOOKLM QUESTIONS ───────────────────────────────
children.push(sectionBanner('SECTION 4', 'Suggested NotebookLM Questions', 'Questions to ask the notebook to generate the best audio overview content'));
children.push(sp(100));

children.push(fullTable([
  fullRow([
    para('These questions are designed to elicit specific content from the NotebookLM audio overview. Ask them in the order shown to build a coherent narrative arc. Each question is crafted to surface a specific insight from the source documents.', { size: 20, color: BLACK, italic: true }),
  ], WHITE, noBorders())
]));
children.push(sp(80));

children.push(questionCard('🎬 OPENING — Hook the Audience', [
  '"Describe the typical IT business case process before BCA.AI — what is painful about it and how long does it take?"',
  '"What is the AAFES Exchange Card Modernization project and why is it a high-stakes decision?"',
  '"What happens to organizations that make major IT investment decisions without structured financial analysis?"',
], LBLUE, TEAL));
children.push(sp(60));

children.push(questionCard('🔍 DEEP DIVE — The Analysis Engine', [
  '"Walk me through all six phases of the BCA.AI analysis — what happens in each phase and what does it produce?"',
  '"Why did Military Star Platform Overhaul win the recommendation over Cloud-Native Mobile, even though Cloud-Native had a higher 5-year NPV?"',
  '"How does BCA.AI calculate NPV and IRR? Where do the numbers come from — user input or AI estimation?"',
  '"What is the Phase 4 compliance gap analysis? How does it handle PCI-DSS 4.0 for the AAFES scenario?"',
], LGRAY, NAVY));
children.push(sp(60));

children.push(questionCard('💼 BUSINESS CASE — For Decision Makers', [
  '"What is the cost of running a full BCA.AI analysis from intake to BRD download?"',
  '"How does BCA.AI compare to hiring a consulting firm for a business case analysis?"',
  '"What would a CFO or procurement board need to see to accept BCA.AI output as credible analysis?"',
  '"Can BCA.AI handle government and DOD procurement requirements — compliance, documentation, traceability?"',
], LBLUE, TEAL));
children.push(sp(60));

children.push(questionCard('🎙️ AUDIO OVERVIEW SCRIPT PROMPTS', [
  '"Generate a 10-minute audio overview of BCA.AI that starts with the pain of IT decision-making and ends with the CFO story. Include the Cloud-Native vs Military Star twist as the narrative climax."',
  '"Create a podcast dialogue between a skeptical enterprise technology host and an IT strategy expert, walking through the AAFES case study. The host should push back on AI accuracy. The expert should cite specific numbers."',
  '"Generate a 2-minute elevator pitch for BCA.AI targeting a CFO who has never heard of AI-powered business case analysis."',
], PURPLE_BG, PURPLE));
children.push(sp(60));

children.push(questionCard('⚠️ OBJECTION HANDLING — Anticipated Pushback', [
  '"What are the strongest objections to AI-generated financial analysis, and how should they be addressed?"',
  '"Can BCA.AI hallucinate vendor names or fabricate financial data? How is this risk managed?"',
  '"What can BCA.AI NOT do that organizations should still use human analysts or consultants for?"',
], AMBER, '856404'));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ─── SECTION 5: EMOTIONAL ARC ──────────────────────────────────────────────────
children.push(sectionBanner('SECTION 5', 'Emotional Arc', 'The feeling the audience should have at each stage'));
children.push(sp(100));

const arcStages = [
  {
    stage: 'FRUSTRATION (0-15%)',
    emotion: '😤',
    fill: 'FADBD8',
    numFill: 'C0392B',
    desc: 'Establish the pain. The audience should feel the inefficiency of the status quo. "Four million dollars. Six weeks. Twelve slides. Two consultants. And still no clear answer on whether this is the right investment." This is where empathy is built.',
    triggers: ['Stories of late-night spreadsheet sessions', 'The "gut feel" investment that went wrong', 'The consulting firm invoice that arrived after the decision was already made'],
  },
  {
    stage: 'CURIOSITY (15-30%)',
    emotion: '🤔',
    fill: AMBER,
    numFill: 'E67E22',
    desc: 'Introduce BCA.AI. The audience should be intrigued, not yet convinced. Show the intake — "14 questions, 25 minutes." Show the loading animation — "analyzing 5 solution approaches." Don\'t reveal the output yet. Let curiosity build.',
    triggers: ['The AI "thinking" animation', 'The 6-phase progress indicator', 'The first glimpse of a scored solution list'],
  },
  {
    stage: 'SURPRISE (30-60%)',
    emotion: '😮',
    fill: LBLUE,
    numFill: TEAL,
    desc: 'The twist: Cloud-Native has a higher NPV but loses. The audience expects AI to just pick the highest number. Instead, BCA.AI reasons through constraints. This is the moment that separates BCA.AI from a spreadsheet. Let this moment breathe.',
    triggers: ['The NPV comparison table (Cloud-Native: $11.2M vs Military Star: $8.4M)', 'The compliance timeline flag: "30 months vs 12-month deadline"', 'The recommendation card: Military Star wins despite lower NPV'],
  },
  {
    stage: 'CREDIBILITY (60-80%)',
    emotion: '🤝',
    fill: GREEN_BG,
    numFill: GREEN,
    desc: 'Build trust with detail. Show the traceability matrix, the compliance gap analysis, the BRD section structure. The audience should feel: "This is real. This is rigorous. This is not a toy." Cite specific numbers — every one is traceable.',
    triggers: ['The requirements traceability matrix in Phase 4', 'The 12-section BRD structure in Phase 6', 'The editable sections with source badges (AI Generated / From Phase Data)'],
  },
  {
    stage: 'INSPIRATION (80-100%)',
    emotion: '✨',
    fill: PURPLE_BG,
    numFill: PURPLE,
    desc: 'End with possibility. "She asked which consulting firm produced it." The CFO story lands here. The audience should feel: "I could use this. My organization needs this. This changes something." Provide a clear next step.',
    triggers: ['The CFO quote', 'The .docx download moment', 'The cost comparison: $0.15 vs $150,000', 'The URL: try it yourself'],
  },
];

arcStages.forEach(function(s) {
  children.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [800, 8560],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 800, type: WidthType.DXA },
            shading: { fill: s.numFill, type: ShadingType.CLEAR },
            borders: allBorders(s.numFill),
            margins: { top: 120, bottom: 120, left: 80, right: 80 },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              para(s.emotion, { bold: true, size: 32, align: AlignmentType.CENTER }),
            ]
          }),
          new TableCell({
            width: { size: 8560, type: WidthType.DXA },
            shading: { fill: s.numFill, type: ShadingType.CLEAR },
            borders: allBorders(s.numFill),
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            children: [para(s.stage, { bold: true, size: 22, color: WHITE })]
          }),
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 9360, type: WidthType.DXA },
            columnSpan: 2,
            shading: { fill: s.fill, type: ShadingType.CLEAR },
            borders: allBorders('CCCCCC'),
            margins: { top: 120, bottom: 80, left: 140, right: 140 },
            children: [
              para(s.desc, { size: 19, color: BLACK }),
              sp(60),
              para('TRIGGERS:', { bold: true, size: 17, color: DKGRAY }),
            ].concat(s.triggers.map(function(t) { return para('• ' + t, { size: 18, color: BLACK }); }))
          })
        ]
      }),
    ]
  }));
  children.push(sp(100));
});

children.push(new Paragraph({ children: [new PageBreak()] }));

// ─── SECTION 6: DO'S AND DON'TS ───────────────────────────────────────────────
children.push(sectionBanner('SECTION 6', "Do's and Don'ts", "What to say and what to avoid in all BCA.AI content"));
children.push(sp(100));

children.push(dosDontsTable(
  [
    '✅ Say: "BCA.AI applies financial modeling to your data"',
    '✅ Say: "Every number is traceable to a user input or formula"',
    '✅ Say: "The analysis takes 45 minutes from intake to BRD"',
    '✅ Say: "The CFO asked which consulting firm produced it"',
    '✅ Say: "Cloud-Native had a higher NPV — but lost on compliance"',
    '✅ Say: "Both input paths produce the same analysis output"',
    '✅ Say: "Phase 6 generates a downloadable Word document"',
    '✅ Say: "Every BRD section is editable before download"',
    '✅ Acknowledge: "AI narrative sections can be edited"',
    '✅ Say: "The analysis costs approximately $0.10-$0.15 to run"',
  ],
  [
    '❌ Don\'t say: "AI generates the financial projections"',
    '❌ Don\'t say: "BCA.AI knows market pricing for vendors"',
    '❌ Don\'t say: "This replaces your finance team or consultants"',
    '❌ Don\'t say: "AI-guaranteed accuracy" (no such thing)',
    '❌ Don\'t say: "Just trust the AI output" (always verify)',
    '❌ Don\'t say: "This works for ITAR or classified projects"',
    '❌ Don\'t say: "Multi-user collaboration is supported" (not yet)',
    '❌ Don\'t say: "Scenario comparison is built in" (not yet)',
    '❌ Don\'t say: "The platform is production-ready for enterprise"',
    '❌ Don\'t imply BCA.AI independently sources vendor pricing data',
  ]
));

children.push(sp(120));

// ─── SECTION 7: KEY STATS ──────────────────────────────────────────────────────
children.push(sectionBanner('SECTION 7', 'Key Statistics for Narration', 'Numbers to memorize for video, podcast, and live demo'));
children.push(sp(100));

const stats = [
  ['AAFES Budget', '$4.2M', 'Investment decision being analyzed'],
  ['AAFES Customers', '14 million', 'Military personnel affected'],
  ['OCONUS Decline', '23%', 'Transaction failure rate driving urgency'],
  ['Cost of Inaction', '$2.23M/year', 'Annual loss without action'],
  ['PCI-DSS Deadline', '12 months', 'Compliance hard deadline'],
  ['Top Solution', 'Military Star', 'Score: 87/100'],
  ['NPV (winner)', '$8.4M', 'Military Star 3-year NPV'],
  ['IRR (winner)', '34.2%', 'Internal rate of return'],
  ['Payback', '28 months', 'Investment payback period'],
  ['3-Year ROI', '312%', 'Return on investment'],
  ['Why not Cloud-Native', '30-month implementation', 'Fails 12-month compliance deadline'],
  ['Cloud-Native NPV', '$11.2M (5-year)', 'Higher long-term NPV but disqualified'],
  ['Analysis cost', '$0.10-$0.15', 'API cost per full 6-phase run'],
  ['Intake time', '20-45 min', 'Conversational (20-30) vs Traditional (30-45)'],
  ['Processing time', '~6 minutes', 'Phase 1-5 AI analysis pipeline'],
  ['BRD sections', '12', 'Cover through Approval sign-off'],
  ['BRD download', '.docx', 'Microsoft Word format'],
  ['Input paths', '2', 'Conversational (14 Q) + Traditional (11 sections)'],
  ['API model', 'Claude 3.5 Sonnet', 'Anthropic Claude via API'],
];

const W1 = 3000, W2 = 2160, W3 = 4200;
const statHdr = new TableRow({
  children: [
    new TableCell({ width: { size: W1, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, borders: allBorders('336699'), margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para('Metric', { bold: true, size: 18, color: WHITE })] }),
    new TableCell({ width: { size: W2, type: WidthType.DXA }, shading: { fill: TEAL, type: ShadingType.CLEAR }, borders: allBorders('336699'), margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para('Value', { bold: true, size: 18, color: WHITE })] }),
    new TableCell({ width: { size: W3, type: WidthType.DXA }, shading: { fill: '2E6DA4', type: ShadingType.CLEAR }, borders: allBorders('336699'), margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para('Context', { bold: true, size: 18, color: WHITE })] }),
  ]
});
const statRows = stats.map(function(r, i) {
  return new TableRow({
    children: [
      new TableCell({ width: { size: W1, type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? WHITE : LGRAY, type: ShadingType.CLEAR }, borders: allBorders('CCCCCC'), margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para(r[0], { bold: true, size: 18, color: BLACK })] }),
      new TableCell({ width: { size: W2, type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? LBLUE : BLUE, type: ShadingType.CLEAR }, borders: allBorders('CCCCCC'), margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para(r[1], { bold: true, size: 18, color: NAVY })] }),
      new TableCell({ width: { size: W3, type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? LGRAY : MGRAY, type: ShadingType.CLEAR }, borders: allBorders('CCCCCC'), margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para(r[2], { size: 18, color: BLACK })] }),
    ]
  });
});
children.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [W1, W2, W3], rows: [statHdr].concat(statRows) }));

children.push(sp(120));

children.push(fullTable([
  fullRow([
    para('BCA.AI NotebookLM Framing Guide · v1.0 · April 2026 · Upload this document last in your NotebookLM notebook', { size: 16, color: DKGRAY, align: AlignmentType.CENTER }),
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
            new TextRun({ text: 'BCA.AI — NotebookLM Framing Guide', bold: true, size: 18, color: NAVY, font: 'Arial' }),
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

const outPath = path.join(__dirname, '..', 'BCA_AI_NotebookLM_Framing_Guide.docx');
Packer.toBuffer(doc).then(function(buffer) {
  fs.writeFileSync(outPath, buffer);
  console.log('✅', outPath, '(' + Math.round(buffer.length / 1024) + ' KB)');
}).catch(function(err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
