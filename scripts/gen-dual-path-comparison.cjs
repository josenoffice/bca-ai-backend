'use strict';
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, LevelFormat
} = require('docx');
const fs = require('fs');
const path = require('path');

// ─── Colors ───────────────────────────────────────────────────────────────────
const NAVY   = '1B3A5C';
const TEAL   = '0D6B8C';
const AMBER  = 'FFF3CD';
const GREEN  = 'D4EDDA';
const BLUE   = 'D0E8F5';
const LBLUE  = 'EBF5FB';
const LGRAY  = 'F5F6F8';
const MGRAY  = 'E8EAED';
const WHITE  = 'FFFFFF';
const BLACK  = '1A1A2E';
const DKGRAY = '4A4A6A';

// ─── Borders ──────────────────────────────────────────────────────────────────
function border(color) {
  return { style: BorderStyle.SINGLE, size: 1, color: color || 'CCCCCC' };
}
function noBorder() {
  return { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
}
function allBorders(color) {
  const b = border(color);
  return { top: b, bottom: b, left: b, right: b };
}
function noBorders() {
  const n = noBorder();
  return { top: n, bottom: n, left: n, right: n };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function para(text, opts) {
  opts = opts || {};
  return new Paragraph({
    spacing: { before: opts.before || 0, after: opts.after || 60 },
    alignment: opts.align || AlignmentType.LEFT,
    children: [new TextRun({
      text: text,
      bold: opts.bold || false,
      size: opts.size || 20,
      color: opts.color || BLACK,
      font: 'Arial',
      italics: opts.italic || false,
    })]
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

// ─── Full-width single-cell row ────────────────────────────────────────────────
function fullRow(children, fill, borders) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 9360, type: WidthType.DXA },
        shading: { fill: fill || WHITE, type: ShadingType.CLEAR },
        borders: borders || noBorders(),
        margins: { top: 120, bottom: 120, left: 160, right: 160 },
        children: Array.isArray(children) ? children : [children],
      })
    ]
  });
}

function fullTable(rows) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: rows,
  });
}

function sp(n) {
  return new Paragraph({ spacing: { before: 0, after: n }, children: [] });
}

// ─── Section header banner ─────────────────────────────────────────────────────
function sectionBanner(label, title, subtitle) {
  const rows = [
    fullRow([
      para(label, { bold: true, size: 16, color: 'AACCEE' }),
      para(title, { bold: true, size: 28, color: WHITE }),
      subtitle ? para(subtitle, { size: 18, color: 'AACCEE', italic: true }) : sp(4),
    ], NAVY, noBorders())
  ];
  return fullTable(rows);
}

// ─── Compare card: CONV left, TRAD right ──────────────────────────────────────
function compareCard(topic, convLines, tradLines, winner) {
  const W_LABEL = 2000;
  const W_CONV  = 3680;
  const W_TRAD  = 3680;

  // header row
  const hdrRow = new TableRow({
    children: [
      new TableCell({
        width: { size: W_LABEL, type: WidthType.DXA },
        shading: { fill: NAVY, type: ShadingType.CLEAR },
        borders: allBorders('336699'),
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [para(topic, { bold: true, size: 18, color: WHITE })]
      }),
      new TableCell({
        width: { size: W_CONV, type: WidthType.DXA },
        shading: { fill: TEAL, type: ShadingType.CLEAR },
        borders: allBorders('336699'),
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [para('💬 Conversational Intake', { bold: true, size: 18, color: WHITE })]
      }),
      new TableCell({
        width: { size: W_TRAD, type: WidthType.DXA },
        shading: { fill: '2E6DA4', type: ShadingType.CLEAR },
        borders: allBorders('336699'),
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [para('📋 Traditional Form', { bold: true, size: 18, color: WHITE })]
      }),
    ]
  });

  // content row
  const contentRow = new TableRow({
    children: [
      new TableCell({
        width: { size: W_LABEL, type: WidthType.DXA },
        shading: { fill: LGRAY, type: ShadingType.CLEAR },
        borders: allBorders('CCCCCC'),
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: winner
          ? [para(winner, { bold: true, size: 18, color: winner.includes('Both') ? NAVY : TEAL })]
          : [para('—', { size: 18, color: DKGRAY })]
      }),
      new TableCell({
        width: { size: W_CONV, type: WidthType.DXA },
        shading: { fill: LBLUE, type: ShadingType.CLEAR },
        borders: allBorders('CCCCCC'),
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: convLines.map(l => para(l.startsWith('✓') ? l : (l.startsWith('•') ? l : l), { size: 18, color: BLACK }))
      }),
      new TableCell({
        width: { size: W_TRAD, type: WidthType.DXA },
        shading: { fill: LGRAY, type: ShadingType.CLEAR },
        borders: allBorders('CCCCCC'),
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: tradLines.map(l => para(l, { size: 18, color: BLACK }))
      }),
    ]
  });

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [W_LABEL, W_CONV, W_TRAD],
    rows: [hdrRow, contentRow],
  });
}

// ─── Persona card ──────────────────────────────────────────────────────────────
function personaCard(icon, title, role, desc, recommendation, convOrTrad) {
  const W_ICON = 900;
  const W_CONTENT = 8460;
  const fill = convOrTrad === 'conv' ? LBLUE : LGRAY;
  const tag  = convOrTrad === 'conv' ? '💬 USE CONVERSATIONAL' : '📋 USE TRADITIONAL';
  const tagColor = convOrTrad === 'conv' ? TEAL : '2E6DA4';

  const iconRow = new TableRow({
    children: [
      new TableCell({
        width: { size: W_ICON, type: WidthType.DXA },
        shading: { fill: fill, type: ShadingType.CLEAR },
        borders: allBorders('CCCCCC'),
        margins: { top: 120, bottom: 120, left: 120, right: 60 },
        verticalAlign: VerticalAlign.TOP,
        children: [para(icon, { bold: true, size: 36 })]
      }),
      new TableCell({
        width: { size: W_CONTENT, type: WidthType.DXA },
        shading: { fill: fill, type: ShadingType.CLEAR },
        borders: allBorders('CCCCCC'),
        margins: { top: 120, bottom: 80, left: 120, right: 120 },
        children: [
          para(title, { bold: true, size: 22, color: BLACK }),
          para(role, { size: 18, color: DKGRAY, italic: true }),
          sp(40),
          para(desc, { size: 18, color: BLACK }),
          sp(40),
          para('→ ' + recommendation, { size: 18, color: BLACK, italic: true }),
          sp(40),
          para(tag, { bold: true, size: 16, color: WHITE }),
        ]
      }),
    ]
  });

  // Override last cell's tag to show colored background properly
  const tagRow = new TableRow({
    children: [
      new TableCell({
        width: { size: 9360, type: WidthType.DXA },
        columnSpan: 2,
        shading: { fill: tagColor, type: ShadingType.CLEAR },
        borders: allBorders(tagColor),
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [para(tag, { bold: true, size: 18, color: WHITE })]
      })
    ]
  });

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [W_ICON, W_CONTENT],
    rows: [iconRow],
  });
}

// ─── Field mapping table ───────────────────────────────────────────────────────
function fieldMapTable(rows_data) {
  const W1 = 3000, W2 = 3180, W3 = 3180;

  const hdr = new TableRow({
    children: [
      new TableCell({ width: { size: W1, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, borders: allBorders('336699'), margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para('📊 Data Point', { bold: true, size: 18, color: WHITE })] }),
      new TableCell({ width: { size: W2, type: WidthType.DXA }, shading: { fill: TEAL, type: ShadingType.CLEAR }, borders: allBorders('336699'), margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para('💬 Conversational Question', { bold: true, size: 18, color: WHITE })] }),
      new TableCell({ width: { size: W3, type: WidthType.DXA }, shading: { fill: '2E6DA4', type: ShadingType.CLEAR }, borders: allBorders('336699'), margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para('📋 Traditional Section / Field', { bold: true, size: 18, color: WHITE })] }),
    ]
  });

  const tableRows = [hdr];
  rows_data.forEach(function(r, i) {
    tableRows.push(new TableRow({
      children: [
        new TableCell({ width: { size: W1, type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? WHITE : LGRAY, type: ShadingType.CLEAR }, borders: allBorders('CCCCCC'), margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para(r[0], { bold: true, size: 18, color: BLACK })] }),
        new TableCell({ width: { size: W2, type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? LBLUE : 'D5EEF8', type: ShadingType.CLEAR }, borders: allBorders('CCCCCC'), margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para(r[1], { size: 18, color: BLACK })] }),
        new TableCell({ width: { size: W3, type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? LGRAY : MGRAY, type: ShadingType.CLEAR }, borders: allBorders('CCCCCC'), margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para(r[2], { size: 18, color: BLACK })] }),
      ]
    }));
  });

  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [W1, W2, W3], rows: tableRows });
}

// ─── UX flow card ─────────────────────────────────────────────────────────────
function uxCard(step, conv, trad) {
  const W1 = 1440, W2 = 3960, W3 = 3960;
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [W1, W2, W3],
    rows: [
      new TableRow({
        children: [
          new TableCell({ width: { size: W1, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, borders: allBorders('336699'), margins: { top: 80, bottom: 80, left: 80, right: 80 }, verticalAlign: VerticalAlign.CENTER, children: [para(step, { bold: true, size: 20, color: WHITE, align: AlignmentType.CENTER })] }),
          new TableCell({ width: { size: W2, type: WidthType.DXA }, shading: { fill: LBLUE, type: ShadingType.CLEAR }, borders: allBorders('CCCCCC'), margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: conv.map(function(l) { return para(l, { size: 18, color: BLACK }); }) }),
          new TableCell({ width: { size: W3, type: WidthType.DXA }, shading: { fill: LGRAY, type: ShadingType.CLEAR }, borders: allBorders('CCCCCC'), margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: trad.map(function(l) { return para(l, { size: 18, color: BLACK }); }) }),
        ]
      })
    ]
  });
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
    para('Dual Input Path', { bold: true, size: 52, color: WHITE, align: AlignmentType.CENTER }),
    para('Comparison Guide', { bold: true, size: 52, color: WHITE, align: AlignmentType.CENTER }),
    sp(20),
    para('Conversational Intake vs. Traditional Structured Form', { size: 22, color: 'AACCEE', italic: true, align: AlignmentType.CENTER }),
    sp(60),
    para('When to use each path · User personas · Field mapping · UX differences', { size: 18, color: 'AACCEE', align: AlignmentType.CENTER }),
    sp(40),
  ], NAVY, noBorders())
]));

children.push(sp(200));

// Cover meta table
children.push(new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [2340, 2340, 2340, 2340],
  rows: [
    new TableRow({
      children: [
        cell([para('Version', { bold: true, size: 16, color: DKGRAY }), para('v1.0', { bold: true, size: 20, color: BLACK })], WHITE, 2340, { borders: allBorders('CCCCCC') }),
        cell([para('Date', { bold: true, size: 16, color: DKGRAY }), para('April 2026', { bold: true, size: 20, color: BLACK })], LGRAY, 2340, { borders: allBorders('CCCCCC') }),
        cell([para('Audience', { bold: true, size: 16, color: DKGRAY }), para('NotebookLM / Video Prep', { bold: true, size: 20, color: BLACK })], WHITE, 2340, { borders: allBorders('CCCCCC') }),
        cell([para('Status', { bold: true, size: 16, color: DKGRAY }), para('Reference Doc', { bold: true, size: 20, color: BLACK })], LGRAY, 2340, { borders: allBorders('CCCCCC') }),
      ]
    })
  ]
}));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ─── SECTION 1: Overview ──────────────────────────────────────────────────────
children.push(sectionBanner('SECTION 1', 'Overview', 'BCA.AI offers two distinct paths to capture business case data'));
children.push(sp(100));

children.push(fullTable([
  fullRow([
    para('BCA.AI supports two completely independent user input paths. Both paths feed the same 6-phase AI analysis engine and produce identical analytical outputs — the difference is entirely in the user experience. Choosing the right path depends on the user\'s familiarity with the domain, available time, and organizational context.', { size: 20, color: BLACK }),
  ], WHITE, noBorders())
]));

children.push(sp(100));

// Two path summary cards
children.push(new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [4680, 4680],
  rows: [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 4680, type: WidthType.DXA },
          shading: { fill: TEAL, type: ShadingType.CLEAR },
          borders: allBorders(TEAL),
          margins: { top: 160, bottom: 160, left: 180, right: 180 },
          children: [
            para('💬 PATH A', { bold: true, size: 18, color: 'AADDFF' }),
            para('Conversational Intake', { bold: true, size: 28, color: WHITE }),
            sp(40),
            para('Route: /conversational-intake', { size: 16, color: 'AADDFF', italic: true }),
            sp(60),
            para('14 guided questions · One at a time · AI follows up · ~20-30 min', { size: 18, color: WHITE }),
            sp(40),
            para('Best for: Exploratory, narrative-first users who want guidance', { size: 18, color: WHITE, italic: true }),
          ]
        }),
        new TableCell({
          width: { size: 4680, type: WidthType.DXA },
          shading: { fill: '2E6DA4', type: ShadingType.CLEAR },
          borders: allBorders('2E6DA4'),
          margins: { top: 160, bottom: 160, left: 180, right: 180 },
          children: [
            para('📋 PATH B', { bold: true, size: 18, color: 'AADDFF' }),
            para('Traditional Form', { bold: true, size: 28, color: WHITE }),
            sp(40),
            para('Route: /BCA_Intake_App.html', { size: 16, color: 'AADDFF', italic: true }),
            sp(60),
            para('11 sections · All fields visible · AI assistant available · ~30-45 min', { size: 18, color: WHITE }),
            sp(40),
            para('Best for: Structured thinkers who want to see the full scope upfront', { size: 18, color: WHITE, italic: true }),
          ]
        }),
      ]
    })
  ]
}));

children.push(sp(120));

// Key insight callout
children.push(fullTable([
  fullRow([
    para('⚡ KEY INSIGHT', { bold: true, size: 18, color: NAVY }),
    para('Both paths produce the same analytical output. The AI analysis engine (Phases 1-6) does not know or care which input path was used. The business case quality depends entirely on the richness of data provided — not on which form was used to collect it.', { size: 20, color: BLACK }),
  ], AMBER, noBorders())
]));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ─── SECTION 2: Feature Comparison ───────────────────────────────────────────
children.push(sectionBanner('SECTION 2', 'Feature-by-Feature Comparison', '14 dimensions compared side by side'));
children.push(sp(100));

const comparisons = [
  {
    topic: 'Access URL',
    conv: ['/conversational-intake', '(dedicated chat interface)'],
    trad: ['/BCA_Intake_App.html', '(standalone HTML app)'],
    winner: null
  },
  {
    topic: 'Interface Style',
    conv: ['Chat / conversational', 'One question at a time', 'AI-driven flow'],
    trad: ['Tabbed form', 'All 11 sections visible', 'User-driven flow'],
    winner: null
  },
  {
    topic: 'Number of Steps',
    conv: ['14 questions total', 'Presented sequentially', 'Progress tracked by AI'],
    trad: ['11 sections total', '50+ individual fields', 'Progress dots per section'],
    winner: null
  },
  {
    topic: 'Completion Time',
    conv: ['~20-30 minutes', 'Pace set by conversation'],
    trad: ['~30-45 minutes', 'User controls pace'],
    winner: '💬 Faster'
  },
  {
    topic: 'AI Assistance',
    conv: ['AI asks each question', 'AI interprets vague answers', 'AI follows up for clarity'],
    trad: ['Slide-out AI Assistant panel', 'Field-level suggestions', 'Suggestion chips per field'],
    winner: 'Both ✓'
  },
  {
    topic: 'Data Visibility',
    conv: ['See one question at a time', 'Can\'t preview full scope', 'Must complete to review'],
    trad: ['See all fields upfront', 'Jump to any section', 'Edit any field at any time'],
    winner: '📋 Better'
  },
  {
    topic: 'Cost Entry',
    conv: ['Single budget figure', 'Q7: simple range input'],
    trad: ['Three-point estimates', 'Low / Mid / High per item', 'More granular costing'],
    winner: '📋 Better'
  },
  {
    topic: 'IT Validation',
    conv: ['Not included', 'No email feature'],
    trad: ['Section 5: IT Stack', 'Email draft to IT team', 'Automated field pre-fill'],
    winner: '📋 Unique'
  },
  {
    topic: 'Section Navigation',
    conv: ['Linear progression only', 'Can\'t skip ahead'],
    trad: ['Tab navigation', 'Jump to any section', 'Non-linear editing'],
    winner: '📋 Better'
  },
  {
    topic: 'Resume / Save',
    conv: ['Session-based', 'No save between sessions'],
    trad: ['Section-by-section', 'Can pause mid-form'],
    winner: '📋 Better'
  },
  {
    topic: 'Compliance Fields',
    conv: ['Q10: compliance reqs text', 'Q12: pain points summary'],
    trad: ['Dedicated compliance section', 'Checkbox list + free text', 'More structured capture'],
    winner: '📋 Better'
  },
  {
    topic: 'Alternatives Input',
    conv: ['Not explicit', 'Captured in solutions question'],
    trad: ['Section 10: Alternatives', 'Structured field with rationale', 'Explicit rejection reasons'],
    winner: '📋 Better'
  },
  {
    topic: 'Onboarding Ease',
    conv: ['No learning curve', 'Just answer questions', 'Ideal for first-time users'],
    trad: ['Requires domain familiarity', 'Section overview helps', 'Better for repeat users'],
    winner: '💬 Easier'
  },
  {
    topic: 'Mobile Friendly',
    conv: ['Chat = mobile-natural', 'Works on any screen size'],
    trad: ['Tabbed form = desktop', 'Better on larger screens'],
    winner: '💬 Better'
  },
];

comparisons.forEach(function(c, i) {
  children.push(compareCard(c.topic, c.conv, c.trad, c.winner));
  children.push(sp(60));
});

children.push(new Paragraph({ children: [new PageBreak()] }));

// ─── SECTION 3: User Personas ─────────────────────────────────────────────────
children.push(sectionBanner('SECTION 3', 'User Personas', 'Which input path fits which user?'));
children.push(sp(100));

const personas = [
  {
    icon: '🧑‍💼',
    title: 'The First-Time Business Case Author',
    role: 'Mid-level Manager | First submission | No template experience',
    desc: 'Has a problem to solve but doesn\'t know the structured vocabulary. Needs hand-holding through each concept. Gets overwhelmed when seeing 50 form fields.',
    rec: 'Conversational flow guides them naturally without exposing the full complexity upfront.',
    path: 'conv'
  },
  {
    icon: '👩‍💻',
    title: 'The IT Project Manager',
    role: 'Senior PM | Repeat user | Has a pre-built requirements list',
    desc: 'Already knows the project scope, has a vendor shortlist, and has cost estimates from procurement. Wants to enter data efficiently without being walked through basics.',
    rec: 'Traditional form lets them paste in known data, skip sections, and use three-point cost estimates.',
    path: 'trad'
  },
  {
    icon: '📱',
    title: 'The Executive on the Go',
    role: 'VP / Director | Mobile user | Limited time',
    desc: 'Has 20 minutes between meetings. Wants to quickly sketch out a business case concept to validate an idea before committing team resources to a full analysis.',
    rec: 'Conversational intake on mobile — just answer 14 questions, get an instant first-pass analysis.',
    path: 'conv'
  },
  {
    icon: '🏛️',
    title: 'The Government Procurement Officer',
    role: 'Federal/DOD buyer | Strict documentation requirements | Audit trail needed',
    desc: 'Needs to document each data point with source and rationale. Compliance requirements are specific and must be captured in a structured, auditable format.',
    rec: 'Traditional form\'s dedicated compliance section and structured fields provide the documentation rigor required.',
    path: 'trad'
  },
  {
    icon: '🎯',
    title: 'The Strategy Consultant',
    role: 'External consultant | Working with a new client | Discovery phase',
    desc: 'Running a discovery session with a client stakeholder. Needs to guide a conversation and capture structured data simultaneously during the meeting.',
    rec: 'Conversational intake works like an interview guide — consultant reads questions, types client answers.',
    path: 'conv'
  },
  {
    icon: '💰',
    title: 'The CFO / Finance Director',
    role: 'Financial decision-maker | ROI-focused | Detailed cost models needed',
    desc: 'Needs to provide detailed cost breakdowns with confidence ranges for each cost component. Wants to see what data is required before committing to fill it in.',
    rec: 'Traditional form with three-point cost estimates (low/mid/high) per line item — matches finance modeling standards.',
    path: 'trad'
  },
];

personas.forEach(function(p) {
  const fill = p.path === 'conv' ? LBLUE : LGRAY;
  const tagFill = p.path === 'conv' ? TEAL : '2E6DA4';
  const tag = p.path === 'conv' ? '💬 RECOMMENDED: USE CONVERSATIONAL INTAKE' : '📋 RECOMMENDED: USE TRADITIONAL FORM';

  children.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [900, 8460],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 900, type: WidthType.DXA },
            shading: { fill: fill, type: ShadingType.CLEAR },
            borders: allBorders('CCCCCC'),
            margins: { top: 120, bottom: 120, left: 120, right: 60 },
            verticalAlign: VerticalAlign.TOP,
            children: [para(p.icon, { bold: true, size: 40 })]
          }),
          new TableCell({
            width: { size: 8460, type: WidthType.DXA },
            shading: { fill: fill, type: ShadingType.CLEAR },
            borders: allBorders('CCCCCC'),
            margins: { top: 120, bottom: 80, left: 120, right: 120 },
            children: [
              para(p.title, { bold: true, size: 22, color: BLACK }),
              para(p.role, { size: 18, color: DKGRAY, italic: true }),
              sp(40),
              para(p.desc, { size: 18, color: BLACK }),
              sp(40),
              para('→ ' + p.rec, { size: 18, color: NAVY, italic: true }),
            ]
          }),
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 9360, type: WidthType.DXA },
            columnSpan: 2,
            shading: { fill: tagFill, type: ShadingType.CLEAR },
            borders: allBorders(tagFill),
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [para(tag, { bold: true, size: 18, color: WHITE })]
          })
        ]
      })
    ]
  }));
  children.push(sp(120));
});

children.push(new Paragraph({ children: [new PageBreak()] }));

// ─── SECTION 4: Field Mapping ─────────────────────────────────────────────────
children.push(sectionBanner('SECTION 4', 'Data Field Mapping', 'How the same data point is captured in each path'));
children.push(sp(100));

children.push(fullTable([
  fullRow([
    para('Every data point needed for the AI analysis engine can be provided through either path. This table shows how the same underlying information is collected using each interface.', { size: 20, color: BLACK }),
  ], WHITE, noBorders())
]));
children.push(sp(80));

const fieldMap = [
  ['Project Title', 'Q1: "What is the name of your initiative?"', 'Section 1 → Project Title field'],
  ['Business Unit / Org', 'Q2: "What department or business unit…"', 'Section 1 → Business Unit / Division field'],
  ['Industry / Domain', 'Q2: Inferred from org context', 'Section 1 → Industry dropdown'],
  ['Problem Statement', 'Q4: "Describe the current state…"', 'Section 3 → Problem Statement textarea'],
  ['Root Cause', 'Q4: AI follow-up question', 'Section 3 → Root Cause Analysis field'],
  ['Pain Points', 'Q5: "What are the main pain points…"', 'Section 3 → Key Pain Points bullets'],
  ['Desired Outcomes', 'Q6: "What outcomes are you expecting?"', 'Section 4 → Desired Outcomes field'],
  ['KPIs / Success Metrics', 'Q6: AI expands from outcomes', 'Section 9 → Performance Measures table'],
  ['Budget Range', 'Q7: "What is your estimated budget?"', 'Section 6 → Budget + three-point estimates'],
  ['Timeline', 'Q8: "What is your target timeline?"', 'Section 6 → Timeline fields + milestones'],
  ['Stakeholders', 'Q9: Inferred from role + BU', 'Section 1 → Role + BU (RACI auto-generated)'],
  ['Compliance Requirements', 'Q10: "Any regulatory requirements?"', 'Section 5 + dedicated compliance checkboxes'],
  ['Technical Stack', 'Q11: "What systems are in scope?"', 'Section 5 → Current Tech Stack fields'],
  ['Urgency / Drivers', 'Q12: "What is driving this urgency?"', 'Section 2 → Strategic Alignment + urgency'],
  ['Solution Alternatives', 'Q13: Mentioned in solutions discussion', 'Section 10 → Alternatives Considered table'],
  ['Prior Analysis', 'Q14: "Has any prior work been done?"', 'Section 11 → Prior Research / References'],
  ['IT Validation', '(Not explicitly captured)', 'Section 5 → Email Draft to IT Team feature'],
  ['Cost Breakdown', 'Single budget figure only', 'Section 6 → Itemized low/mid/high estimates'],
];

children.push(fieldMapTable(fieldMap));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ─── SECTION 5: UX Flow Comparison ────────────────────────────────────────────
children.push(sectionBanner('SECTION 5', 'UX Flow Comparison', 'Step-by-step user experience in each path'));
children.push(sp(100));

// UX flow header row
children.push(new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [1440, 3960, 3960],
  rows: [
    new TableRow({
      children: [
        new TableCell({ width: { size: 1440, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, borders: allBorders('336699'), margins: { top: 80, bottom: 80, left: 80, right: 80 }, children: [para('Step', { bold: true, size: 18, color: WHITE, align: AlignmentType.CENTER })] }),
        new TableCell({ width: { size: 3960, type: WidthType.DXA }, shading: { fill: TEAL, type: ShadingType.CLEAR }, borders: allBorders('336699'), margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para('💬 Conversational Intake', { bold: true, size: 18, color: WHITE })] }),
        new TableCell({ width: { size: 3960, type: WidthType.DXA }, shading: { fill: '2E6DA4', type: ShadingType.CLEAR }, borders: allBorders('336699'), margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para('📋 Traditional Form', { bold: true, size: 18, color: WHITE })] }),
      ]
    })
  ]
}));
children.push(sp(4));

const uxSteps = [
  {
    step: '1\nEntry',
    conv: ['Navigate to /conversational-intake', 'Greeted with "Welcome" message', 'Click "Start Analysis"'],
    trad: ['Navigate to /BCA_Intake_App.html', 'See full 11-section tab overview', 'Optional: click AI Assistant button']
  },
  {
    step: '2\nIdentity',
    conv: ['Q1: Enter project name', 'Q2: Enter department/role', 'AI confirms understanding'],
    trad: ['Section 1 fields visible immediately', 'Fill Project Title, BU, Role, Industry', 'Mark section "ready" when done']
  },
  {
    step: '3\nContext',
    conv: ['Q3: Strategic alignment question', 'Q4: Current state / problem description', 'AI may ask 1-2 follow-ups'],
    trad: ['Section 2: Strategic Alignment tab', 'Section 3: Problem Definition tab', 'Free to skip and return later']
  },
  {
    step: '4\nCosts',
    conv: ['Q7: Single budget range', 'AI notes constraints', 'No line-item breakdown'],
    trad: ['Section 6: Timeline & Cost', 'Enter low/mid/high per cost item', 'Drag timeline milestones']
  },
  {
    step: '5\nTech / IT',
    conv: ['Q11: Systems in scope', 'Text description only', 'No IT validation feature'],
    trad: ['Section 5: Current Tech Stack', 'List systems + versions + ownership', 'Click "Draft IT Validation Email"']
  },
  {
    step: '6\nReview',
    conv: ['14 questions complete', 'Click "Generate Analysis"', 'Redirected to Phase 1 results'],
    trad: ['All 11 section dots green', 'Click "Submit for Analysis"', 'Redirected to Phase 1 results']
  },
  {
    step: '7\nOutput',
    conv: ['Same Phase 1-6 analysis', 'Same report quality', 'Same BRD generation (Phase 6)'],
    trad: ['Same Phase 1-6 analysis', 'Same report quality', 'Same BRD generation (Phase 6)']
  },
];

uxSteps.forEach(function(u) {
  children.push(uxCard(u.step, u.conv, u.trad));
  children.push(sp(4));
});

children.push(sp(80));

// Convergence callout
children.push(fullTable([
  fullRow([
    para('🔀 CONVERGENCE POINT — After step 6, both paths are identical', { bold: true, size: 18, color: NAVY }),
    para('Regardless of which input path was used, the system submits the same structured JSON payload to the Phase 1 analysis engine. The AI analysis, financial modeling, vendor scoring, HTML report, and BRD generation are completely identical. The two paths only differ in how the data is collected — never in what is done with it.', { size: 20, color: BLACK }),
  ], AMBER, noBorders())
]));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ─── SECTION 6: For NotebookLM ─────────────────────────────────────────────────
children.push(sectionBanner('SECTION 6', 'NotebookLM Video Framing', 'How to present both paths in the explainer video'));
children.push(sp(100));

const videoPoints = [
  {
    num: '01',
    heading: 'Lead with the Problem, Not the Form',
    body: 'Don\'t open by showing either input path. Open with the pain: "Your team has a $4M IT decision to make. How do you prove to the board it\'s the right call?" Then reveal that BCA.AI has two ways to guide that process.'
  },
  {
    num: '02',
    heading: 'Conversational First, Traditional Second',
    body: 'Demo the conversational path first — it\'s more visual, more dynamic, and easier to follow on video. Then show the traditional form as the "power user" option for people who already know what they need.'
  },
  {
    num: '03',
    heading: 'Same Output — Show It Once',
    body: 'After showing both input paths, show the Phase 1 results just ONCE and make clear: "Both paths produced this same output." This prevents viewer confusion and reinforces the platform\'s consistency.'
  },
  {
    num: '04',
    heading: 'The IT Email Feature is a Differentiator',
    body: 'The email draft feature in Section 5 of the traditional form is unique. It shows the platform is enterprise-aware — IT sign-off is a real procurement step. This is worth 30 seconds of screen time.'
  },
  {
    num: '05',
    heading: 'Three-Point Cost Estimates = Finance-Grade',
    body: 'The low/mid/high cost estimation in the traditional form signals finance-grade rigor. If your target audience includes CFOs or procurement officers, show this feature explicitly and call it out.'
  },
  {
    num: '06',
    heading: 'Acknowledge the Trade-off Honestly',
    body: 'The best NotebookLM content is honest. You can say: "The conversational path is faster but captures less detail. The traditional form takes longer but gives you more structured data, especially for compliance and costs."'
  },
];

videoPoints.forEach(function(v) {
  children.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1200, 8160],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 1200, type: WidthType.DXA },
            shading: { fill: NAVY, type: ShadingType.CLEAR },
            borders: allBorders('336699'),
            margins: { top: 120, bottom: 120, left: 120, right: 120 },
            verticalAlign: VerticalAlign.CENTER,
            children: [para(v.num, { bold: true, size: 36, color: WHITE, align: AlignmentType.CENTER })]
          }),
          new TableCell({
            width: { size: 8160, type: WidthType.DXA },
            shading: { fill: LBLUE, type: ShadingType.CLEAR },
            borders: allBorders('CCCCCC'),
            margins: { top: 120, bottom: 120, left: 140, right: 140 },
            children: [
              para(v.heading, { bold: true, size: 20, color: NAVY }),
              sp(40),
              para(v.body, { size: 18, color: BLACK }),
            ]
          }),
        ]
      })
    ]
  }));
  children.push(sp(80));
});

// ─── Footer note ──────────────────────────────────────────────────────────────
children.push(sp(120));
children.push(fullTable([
  fullRow([
    para('BCA.AI Dual Path Comparison Guide · v1.0 · April 2026 · Prepared for NotebookLM explainer video production', { size: 16, color: DKGRAY, align: AlignmentType.CENTER }),
  ], LGRAY, noBorders())
]));

// ═══════════════════════════════════════════════════════════════════════════════
// ASSEMBLE DOCUMENT
// ═══════════════════════════════════════════════════════════════════════════════

const doc = new Document({
  numbering: { config: [] },
  styles: {
    default: {
      document: { run: { font: 'Arial', size: 20, color: BLACK } }
    },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Arial', color: NAVY },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 }
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: 'Arial', color: TEAL },
        paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 1 }
      },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 1 } },
          spacing: { before: 0, after: 120 },
          children: [
            new TextRun({ text: 'BCA.AI — Dual Input Path Comparison Guide', bold: true, size: 18, color: NAVY, font: 'Arial' }),
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

const outPath = path.join(__dirname, '..', 'BCA_AI_Dual_Path_Comparison.docx');
Packer.toBuffer(doc).then(function(buffer) {
  fs.writeFileSync(outPath, buffer);
  console.log('✅', outPath, '(' + Math.round(buffer.length / 1024) + ' KB)');
}).catch(function(err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
