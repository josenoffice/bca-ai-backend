#!/usr/bin/env node
'use strict';
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, HeadingLevel, AlignmentType, BorderStyle, WidthType,
  ShadingType, PageNumber, LevelFormat, PageBreak, VerticalAlign } = require('docx');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '..', 'BCA_AI_Infographic_Brief.docx');

const NAVY='1B3A5C', BLUE='2E75B6', LIGHT='D5E8F0', AMBER='FFF3CD', GREEN='D4EDDA';
const WHITE='FFFFFF', DGRAY='666666', MGRAY='F5F5F5', RED='FFD6D6';
const b  = (t, o={}) => new TextRun({ text: t, bold: true, ...o });
const tx = (t, o={}) => new TextRun({ text: t, ...o });
const p  = (c, o={}) => new Paragraph({ children: Array.isArray(c) ? c : [tx(c)], spacing: { before: 80, after: 80 }, ...o });
const pb = () => new Paragraph({ children: [new PageBreak()] });
const sp = (before=120, after=120) => new Paragraph({ children: [], spacing: { before, after } });
const bdr = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const brs = { top: bdr, bottom: bdr, left: bdr, right: bdr };
const mg  = { top: 80, bottom: 80, left: 120, right: 120 };
const mgW = { top: 120, bottom: 120, left: 180, right: 180 };

const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1,
  children: [new TextRun({ text: t, bold: true, color: NAVY })], spacing: { before: 360, after: 180 } });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2,
  children: [new TextRun({ text: t, bold: true, color: BLUE })], spacing: { before: 240, after: 120 } });
const h3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3,
  children: [new TextRun({ text: t, bold: true })], spacing: { before: 180, after: 90 } });

const bullet = (t, lv=0) => new Paragraph({
  numbering: { reference: 'bullets', level: lv },
  children: [tx(t, { size: 21 })], spacing: { before: 40, after: 40 }
});

const hdrCell = (t, fill=NAVY, w=2340) => new TableCell({
  borders: brs, margins: mg,
  width: { size: w, type: WidthType.DXA },
  shading: { fill, type: ShadingType.CLEAR },
  verticalAlign: VerticalAlign.CENTER,
  children: [p([b(t, { color: WHITE, size: 20 })])],
});
const datCell = (t, fill=WHITE, w=2340, bo=false) => new TableCell({
  borders: brs, margins: mg,
  width: { size: w, type: WidthType.DXA },
  shading: { fill, type: ShadingType.CLEAR },
  children: [p(bo ? [b(t, { size: 20 })] : [tx(t, { size: 20 })])],
});

const fullRow = (children, fill=NAVY) => new TableRow({ children: [
  new TableCell({
    borders: brs, margins: mgW,
    width: { size: 9360, type: WidthType.DXA },
    shading: { fill, type: ShadingType.CLEAR },
    children,
  }),
]});

const fullTable = (rows) => new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [9360],
  rows,
});

const twoColTable = (rows) => new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [4680, 4680],
  rows,
});

const sixColTable = (rows) => new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [1560, 1560, 1560, 1560, 1560, 1560],
  rows,
});

const fiveColTable = (rows) => new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [1872, 1872, 1872, 1872, 1872],
  rows,
});

const callout = (fill, label, lines) => fullTable([
  fullRow([
    p([label]),
    ...lines.map(l => p([tx(l, { size: 20 })])),
  ], fill),
]);

const zoneHeader = (fill, text, sub='') => fullTable([
  fullRow([
    p([b(text, { size: 24, color: fill === NAVY ? WHITE : NAVY })]),
    ...(sub ? [p([tx(sub, { size: 18, italics: true, color: fill === NAVY ? 'BDD7EE' : DGRAY })])] : []),
  ], fill),
]);

const statCell = (stat, label, fill=LIGHT) => new TableCell({
  borders: brs, margins: { top: 160, bottom: 160, left: 60, right: 60 },
  width: { size: 1560, type: WidthType.DXA },
  shading: { fill, type: ShadingType.CLEAR },
  verticalAlign: VerticalAlign.CENTER,
  children: [
    new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: stat, bold: true, size: 48, color: NAVY, font: 'Arial' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: label, size: 18, color: DGRAY, font: 'Arial' })] }),
  ],
});

// ── Zone 1 Hero preview table ─────────────────────────────────────────────────
const zone1HeroPreview = () => fullTable([
  fullRow([
    new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'BCA.AI', bold: true, size: 64, color: WHITE, font: 'Arial' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Business Cases at the Speed of Business', size: 28, color: 'BDD7EE', font: 'Arial' })] }),
    sp(40, 40),
    new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'From question to board-ready document in 10 minutes.', size: 22, color: WHITE, italics: true, font: 'Arial' })] }),
  ], NAVY),
]);

// ── Zone 2 comparison table ───────────────────────────────────────────────────
const zone2CompareTable = () => twoColTable([
  new TableRow({ children: [
    new TableCell({ borders: brs, margins: mgW, width: { size: 4680, type: WidthType.DXA },
      shading: { fill: RED, type: ShadingType.CLEAR },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [b('THE OLD WAY', { size: 24, color: 'C0392B' })] })] }),
    new TableCell({ borders: brs, margins: mgW, width: { size: 4680, type: WidthType.DXA },
      shading: { fill: GREEN, type: ShadingType.CLEAR },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [b('BCA.AI', { size: 24, color: '276221' })] })] }),
  ]}),
  new TableRow({ children: [
    new TableCell({ borders: brs, margins: { top: 80, bottom: 120, left: 180, right: 180 },
      width: { size: 4680, type: WidthType.DXA },
      shading: { fill: RED, type: ShadingType.CLEAR },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '6–8 WEEKS', bold: true, size: 52, color: 'C0392B' })] }),
        new Paragraph({ alignment: AlignmentType.CENTER,
          children: [tx('elapsed time', { size: 18, color: DGRAY })] }),
        sp(60, 60),
        new Paragraph({ alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '$25K–$100K', bold: true, size: 40, color: 'C0392B' })] }),
        new Paragraph({ alignment: AlignmentType.CENTER,
          children: [tx('consulting fees', { size: 18, color: DGRAY })] }),
        sp(60, 60),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [tx('No standard format', { size: 20, color: 'C0392B' })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [tx('No financial model included', { size: 20, color: 'C0392B' })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [tx('Often arrives too late', { size: 20, color: 'C0392B' })] }),
      ] }),
    new TableCell({ borders: brs, margins: { top: 80, bottom: 120, left: 180, right: 180 },
      width: { size: 4680, type: WidthType.DXA },
      shading: { fill: GREEN, type: ShadingType.CLEAR },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '10 MIN', bold: true, size: 52, color: '276221' })] }),
        new Paragraph({ alignment: AlignmentType.CENTER,
          children: [tx('end-to-end', { size: 18, color: DGRAY })] }),
        sp(60, 60),
        new Paragraph({ alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '$0.08', bold: true, size: 40, color: '276221' })] }),
        new Paragraph({ alignment: AlignmentType.CENTER,
          children: [tx('total AI API cost', { size: 18, color: DGRAY })] }),
        sp(60, 60),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [tx('12-section Word BRD', { size: 20, color: '276221' })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [tx('Investment-grade DCF model', { size: 20, color: '276221' })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [tx('Ready in minutes', { size: 20, color: '276221' })] }),
      ] }),
  ]}),
]);

// ── Zone 3 process flow table ─────────────────────────────────────────────────
const zone3StepBoxes = () => new Table({
  width: { size: 9360, type: WidthType.DXA }, columnWidths: [3120, 3120, 3120],
  rows: [new TableRow({ children: [
    new TableCell({ borders: brs, margins: mgW, width: { size: 3120, type: WidthType.DXA },
      shading: { fill: NAVY, type: ShadingType.CLEAR }, children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [b('STEP 1', { color: WHITE, size: 20 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Answer 14 Questions', bold: true, size: 24, color: WHITE })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [tx('Conversational intake. Industry-aware. 8-12 minutes.', { size: 19, color: 'BDD7EE' })] }),
      ] }),
    new TableCell({ borders: brs, margins: mgW, width: { size: 3120, type: WidthType.DXA },
      shading: { fill: BLUE, type: ShadingType.CLEAR }, children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [b('STEP 2', { color: WHITE, size: 20 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '6 Phases Run', bold: true, size: 24, color: WHITE })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [tx('AI + JavaScript. NPV, IRR, ranking, vendor scores.', { size: 19, color: 'D5E8F0' })] }),
      ] }),
    new TableCell({ borders: brs, margins: mgW, width: { size: 3120, type: WidthType.DXA },
      shading: { fill: '276221', type: ShadingType.CLEAR }, children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [b('STEP 3', { color: WHITE, size: 20 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Download BRD', bold: true, size: 24, color: WHITE })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [tx('12-section Word document. Board-ready.', { size: 19, color: 'D4EDDA' })] }),
      ] }),
  ]})] });

const zone3PhaseRow = () => sixColTable([
  new TableRow({ children: [
    new TableCell({ borders: brs, margins: { top: 80, bottom: 80, left: 60, right: 60 }, width: { size: 1560, type: WidthType.DXA }, shading: { fill: BLUE, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [b('P1', { color: WHITE, size: 22 })] }), new Paragraph({ alignment: AlignmentType.CENTER, children: [tx('AI Solutions', { size: 16, color: 'D5E8F0' })] })] }),
    new TableCell({ borders: brs, margins: { top: 80, bottom: 80, left: 60, right: 60 }, width: { size: 1560, type: WidthType.DXA }, shading: { fill: GREEN, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [b('P2', { color: NAVY, size: 22 })] }), new Paragraph({ alignment: AlignmentType.CENTER, children: [tx('Financials', { size: 16, color: NAVY })] })] }),
    new TableCell({ borders: brs, margins: { top: 80, bottom: 80, left: 60, right: 60 }, width: { size: 1560, type: WidthType.DXA }, shading: { fill: GREEN, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [b('P3', { color: NAVY, size: 22 })] }), new Paragraph({ alignment: AlignmentType.CENTER, children: [tx('Traceability', { size: 16, color: NAVY })] })] }),
    new TableCell({ borders: brs, margins: { top: 80, bottom: 80, left: 60, right: 60 }, width: { size: 1560, type: WidthType.DXA }, shading: { fill: GREEN, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [b('P4', { color: NAVY, size: 22 })] }), new Paragraph({ alignment: AlignmentType.CENTER, children: [tx('Ranking', { size: 16, color: NAVY })] })] }),
    new TableCell({ borders: brs, margins: { top: 80, bottom: 80, left: 60, right: 60 }, width: { size: 1560, type: WidthType.DXA }, shading: { fill: GREEN, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [b('P5', { color: NAVY, size: 22 })] }), new Paragraph({ alignment: AlignmentType.CENTER, children: [tx('Report', { size: 16, color: NAVY })] })] }),
    new TableCell({ borders: brs, margins: { top: 80, bottom: 80, left: 60, right: 60 }, width: { size: 1560, type: WidthType.DXA }, shading: { fill: BLUE, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [b('P6', { color: WHITE, size: 22 })] }), new Paragraph({ alignment: AlignmentType.CENTER, children: [tx('BRD .docx', { size: 16, color: 'D5E8F0' })] })] }),
  ]}),
  new TableRow({ children: [
    new TableCell({ borders: brs, margins: { top: 40, bottom: 40, left: 60, right: 60 }, width: { size: 1560, type: WidthType.DXA }, shading: { fill: 'E8F4FD', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [tx('~$0.06 AI', { size: 15, color: DGRAY })] })] }),
    new TableCell({ borders: brs, margins: { top: 40, bottom: 40, left: 60, right: 60 }, width: { size: 1560, type: WidthType.DXA }, shading: { fill: WHITE, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [tx('FREE (JS)', { size: 15, color: '276221' })] })] }),
    new TableCell({ borders: brs, margins: { top: 40, bottom: 40, left: 60, right: 60 }, width: { size: 1560, type: WidthType.DXA }, shading: { fill: WHITE, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [tx('FREE (JS)', { size: 15, color: '276221' })] })] }),
    new TableCell({ borders: brs, margins: { top: 40, bottom: 40, left: 60, right: 60 }, width: { size: 1560, type: WidthType.DXA }, shading: { fill: WHITE, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [tx('FREE (JS)', { size: 15, color: '276221' })] })] }),
    new TableCell({ borders: brs, margins: { top: 40, bottom: 40, left: 60, right: 60 }, width: { size: 1560, type: WidthType.DXA }, shading: { fill: WHITE, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [tx('FREE (JS)', { size: 15, color: '276221' })] })] }),
    new TableCell({ borders: brs, margins: { top: 40, bottom: 40, left: 60, right: 60 }, width: { size: 1560, type: WidthType.DXA }, shading: { fill: 'E8F4FD', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [tx('~$0.02 AI', { size: 15, color: DGRAY })] })] }),
  ]}),
]);

// ── Zone 4 AAFES case study ───────────────────────────────────────────────────
const zone4CaseStudy = () => twoColTable([new TableRow({ children: [
  new TableCell({ borders: brs, margins: mgW, width: { size: 4680, type: WidthType.DXA },
    shading: { fill: AMBER, type: ShadingType.CLEAR }, children: [
      p([b('THE PROBLEM:', { size: 20, color: NAVY })]),
      bullet('$9.5B retail operation — 14M military customers'),
      bullet('Payment infrastructure from 2008'),
      bullet('23% OCONUS transaction decline rate'),
      bullet('PCI-DSS 4.0 deadline: 12 months'),
      bullet('Cost of inaction: $2,230,000/year'),
    ] }),
  new TableCell({ borders: brs, margins: mgW, width: { size: 4680, type: WidthType.DXA },
    shading: { fill: GREEN, type: ShadingType.CLEAR }, children: [
      p([b('BCA.AI RESULTS:', { size: 20, color: '276221' })]),
      bullet('5 alternatives analyzed in 10 minutes'),
      bullet('Recommended: Military Star Platform Overhaul'),
      bullet('Score: 87/100 — High Confidence'),
      bullet('Portfolio NPV: $8,400,000'),
      bullet('IRR: 34.2%  |  Payback: 28 months  |  ROI: 312%'),
    ] }),
]})]);

// ── Zone 5 stats row ──────────────────────────────────────────────────────────
const zone5Stats = () => sixColTable([new TableRow({ children: [
  statCell('14',   'Questions',    LIGHT),
  statCell('6',    'Phases',       LIGHT),
  statCell('12',   'BRD Sections', LIGHT),
  statCell('$0.08','Per Analysis', GREEN),
  statCell('10',   'Minutes',      GREEN),
  statCell('6s',   'BRD Gen',      GREEN),
]})]);

// ── Zone 6 compliance + footer ────────────────────────────────────────────────
const zone6Compliance = () => fiveColTable([new TableRow({ children: [
  new TableCell({ borders: brs, margins: { top: 100, bottom: 100, left: 60, right: 60 }, width: { size: 1872, type: WidthType.DXA }, shading: { fill: 'C0392B', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [b('PCI-DSS 4.0', { color: WHITE, size: 18 })] })] }),
  new TableCell({ borders: brs, margins: { top: 100, bottom: 100, left: 60, right: 60 }, width: { size: 1872, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [b('ITAR', { color: WHITE, size: 18 })] })] }),
  new TableCell({ borders: brs, margins: { top: 100, bottom: 100, left: 60, right: 60 }, width: { size: 1872, type: WidthType.DXA }, shading: { fill: BLUE, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [b('Section 508', { color: WHITE, size: 18 })] })] }),
  new TableCell({ borders: brs, margins: { top: 100, bottom: 100, left: 60, right: 60 }, width: { size: 1872, type: WidthType.DXA }, shading: { fill: '276221', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [b('ATO / FedRAMP', { color: WHITE, size: 18 })] })] }),
  new TableCell({ borders: brs, margins: { top: 100, bottom: 100, left: 60, right: 60 }, width: { size: 1872, type: WidthType.DXA }, shading: { fill: '8B4513', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [b('DFARS', { color: WHITE, size: 18 })] })] }),
]})]);

const zone6Footer = () => fullTable([fullRow([
  new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'BCA.AI', bold: true, size: 48, color: WHITE, font: 'Arial' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Business cases at the speed of business.', size: 24, color: 'BDD7EE', font: 'Arial', italics: true })] }),
  sp(60, 60),
  new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: '14 Questions  \u00B7  6 Phases  \u00B7  $0.08  \u00B7  10 Minutes  \u00B7  1 Board-Ready Word Document', size: 18, color: 'BDD7EE', font: 'Arial' })] }),
], NAVY)]);

// ── Document ──────────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: { config: [
    { reference: 'bullets', levels: [
      { level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
    ]},
  ]},
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Arial', color: NAVY }, paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: BLUE }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial' }, paragraph: { spacing: { before: 180, after: 90 }, outlineLevel: 2 } },
    ],
  },
  sections: [
    // Cover page
    {
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children: [
        sp(1800),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 120 },
          children: [new TextRun({ text: 'BCA.AI', bold: true, size: 72, color: NAVY, font: 'Arial' })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 240 },
          children: [new TextRun({ text: 'Infographic Design Brief', size: 36, color: BLUE, font: 'Arial' })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 480 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 4 } },
          children: [new TextRun({ text: 'One-Page Vertical Infographic  |  Designer-Ready Spec  |  All Copy & Numbers Included', bold: true, size: 26, font: 'Arial' })] }),
        callout(LIGHT, b('What this document is:', { size: 22 }), [
          'A complete design brief for a one-page vertical infographic. All copy is written, all numbers are final.',
          'Structured into 6 Zones from top to bottom. Each zone has: fill color, headline, body copy, data, and layout guidance.',
          'A designer can take this brief directly into Canva, Figma, Adobe Illustrator, or PowerPoint.',
          'Final dimensions target: 1080 x 1920 px (Instagram/LinkedIn vertical) or 8.5 x 17 in (print).',
        ]),
        sp(480),
        callout(AMBER, b('Brand Color Guide:', { size: 22 }), [
          'Primary Navy:   #1B3A5C   — headlines, hero text, dark backgrounds',
          'Primary Blue:   #2E75B6   — sub-headlines, accents, icons',
          'Light Blue:     #D5E8F0   — section backgrounds, data boxes',
          'Amber:          #FFF3CD   — callout boxes, COI section',
          'Green:          #D4EDDA   — positive outcomes, savings, free-cost phases',
          'Dark Gray:      #666666   — body text, captions',
          'Fonts: Headlines = Arial Bold or Inter Bold. Body = Arial Regular. No Calibri or Times New Roman.',
        ]),
        pb(),
      ],
    },
    // Main content
    {
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      headers: { default: new Header({ children: [new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 4 } },
        children: [new TextRun({ text: 'BCA.AI  —  Infographic Design Brief  |  6 Zones  |  One-Page Vertical', bold: true, font: 'Arial', size: 18, color: NAVY })],
      })] }) },
      footers: { default: new Footer({ children: [new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC', space: 4 } },
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: 'Page ', font: 'Arial', size: 18, color: DGRAY }),
          new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: DGRAY }),
          new TextRun({ text: ' of ', font: 'Arial', size: 18, color: DGRAY }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Arial', size: 18, color: DGRAY }),
        ],
      })] }) },
      children: [
        h1('Infographic Zones — Top to Bottom'),
        p('The infographic reads top-to-bottom. Each zone flows naturally into the next. Total zones: 6. Total height: ~17 inches or 1920 px.'),
        sp(),

        // Zone 1
        h2('ZONE 1 — Header / Hero  (top 15% of infographic)'),
        callout(NAVY, b('Background: Navy #1B3A5C  |  Text: White', { color: WHITE, size: 20 }), []),
        sp(60),
        p([b('HEADLINE PREVIEW (render as shown below):', { size: 20 })]),
        zone1HeroPreview(),
        sp(80),
        p([b('Layout note:', { size: 18 }), tx(' BCA.AI in white on navy, large. Tagline below in lighter blue (#BDD7EE). One-liner in italics below. Thin horizontal rule separating from Zone 2.', { size: 18 })]),
        sp(120),

        // Zone 2
        h2('ZONE 2 — The Problem vs Solution Comparison  (15-30% of infographic)'),
        callout(RED, b('Background: two-column  |  Left = Red/Problem  |  Right = Green/Solution', { size: 20 }), []),
        sp(60),
        p([b('COMPARISON TABLE PREVIEW:', { size: 20 })]),
        zone2CompareTable(),
        sp(80),
        p([b('Layout note:', { size: 18 }), tx(' Side by side, equal width. Red column = pain. Green column = BCA.AI. Large strike-through effect on the red numbers. Downward arrow from red to green or dividing line with "VS" label.', { size: 18 })]),
        sp(120),

        // Zone 3
        h2('ZONE 3 — The Process Flow  (30-55% of infographic)'),
        callout(LIGHT, b('Background: Light Blue #D5E8F0  |  Two-row layout: step boxes + phase row', { size: 20 }), []),
        sp(60),
        p([b('STEP 1 / 2 / 3 BOXES (top row):', { size: 20 })]),
        zone3StepBoxes(),
        sp(80),
        p([b('6-PHASE DETAIL ROW (below step boxes):', { size: 20 })]),
        zone3PhaseRow(),
        sp(80),
        p([b('Layout note:', { size: 18 }), tx(' P1 and P6 in blue (AI cost). P2-P5 in green (Free). Cost labels in small text under each phase box. This makes the "$0.08 total" intuitive — user sees exactly which phases cost money.', { size: 18 })]),
        sp(120),

        // Zone 4
        h2('ZONE 4 — AAFES Case Study Results  (55-72% of infographic)'),
        callout(AMBER, b('Background: Amber #FFF3CD  |  Split box: Problem left, Results right', { size: 20 }), []),
        sp(60),
        p([b('HEADLINE: ', { size: 20 }), tx('Real Scenario: AAFES Exchange Card Modernization', { size: 20 })]),
        sp(60),
        zone4CaseStudy(),
        sp(80),
        p([b('Layout note:', { size: 18 }), tx(' Amber left (the problem) + green right (the BCA.AI result). Include AAFES name. Key numbers to emphasize: $2.23M cost of inaction (problem) vs $8.4M NPV (result). 10-minute analysis callout in a badge.', { size: 18 })]),
        sp(120),

        // Zone 5
        h2('ZONE 5 — 6 Key Stats  (72-86% of infographic)'),
        callout(NAVY, b('Background: Light Blue #D5E8F0  |  6-stat grid  |  2 rows x 3 cols (or 1 row x 6)', { size: 20 }), []),
        sp(60),
        p([b('HEADLINE: ', { size: 20 }), tx('Everything You Need. One Platform.', { size: 20 })]),
        sp(60),
        zone5Stats(),
        sp(80),
        p([b('Layout note:', { size: 18 }), tx(' 6 stat boxes in a row. Large number (stat) on top in navy bold 72px. Label below in gray 18px. First 3 in light blue (quantify the product). Last 3 in green (quantify the value/savings).', { size: 18 })]),
        sp(120),

        // Zone 6
        h2('ZONE 6 — Compliance Badges + Footer  (86-100% of infographic)'),
        callout(NAVY, b('Background: Navy #1B3A5C  |  Compliance row + closing tagline', { color: WHITE, size: 20 }), []),
        sp(60),
        p([b('COMPLIANCE BADGES ROW:', { size: 20 })]),
        zone6Compliance(),
        sp(80),
        p([b('CLOSING FOOTER:', { size: 20 })]),
        zone6Footer(),
        sp(80),
        p([b('Layout note:', { size: 18 }), tx(' Five compliance badges in colored boxes across full width. Below: dark navy footer with BCA.AI name, italic tagline, and the "5 key numbers" in one line. This is the closing brand statement.', { size: 18 })]),
        sp(180),
        pb(),

        // Production spec
        h1('Production Specification'),
        sp(),
        h2('Dimensions & File Formats'),
        bullet('Primary: 1080 x 1920 px at 150 dpi (Instagram/LinkedIn Story format)'),
        bullet('Secondary: 8.5 x 17 in at 300 dpi (tall print, US Letter x 2)'),
        bullet('Deliver: PNG (web), PDF (print), editable source file (Figma / Canva / Illustrator)'),
        sp(),
        h2('Visual Assets Needed'),
        bullet('BCA.AI wordmark / logo (or style from font if no logo file)'),
        bullet('6 phase icons: brain (P1), calculator (P2), link chain (P3), trophy (P4), document (P5), download arrow (P6)'),
        bullet('5 compliance badge icons: shield shapes in each badge color'),
        bullet('VS divider graphic between Zone 2 columns'),
        bullet('Optional: 200px wide screenshot thumbnail from 23_phase6_brd_section_cards.png or 01_intake_q1_project_identity.png'),
        sp(),
        h2('Typography Hierarchy'),
        new Table({
          width: { size: 9360, type: WidthType.DXA }, columnWidths: [2800, 2280, 2280, 2000],
          rows: [
            new TableRow({ children: [hdrCell('Element',NAVY,2800), hdrCell('Font',NAVY,2280), hdrCell('Weight',NAVY,2280), hdrCell('Size (px)',NAVY,2000)] }),
            ...([
              ['BCA.AI hero name', 'Arial / Inter', 'Black 900', '96px'],
              ['Zone headline', 'Arial / Inter', 'Bold 700', '36px'],
              ['Big stat numbers (10 MIN, $0.08)', 'Arial / Inter', 'Black 900', '72px'],
              ['Stat labels', 'Arial / Inter', 'Regular 400', '16px'],
              ['Body bullets', 'Arial / Inter', 'Regular 400', '18px'],
              ['Captions', 'Arial / Inter', 'Light 300', '14px'],
            ].map(([el,font,wt,sz]) => new TableRow({ children: [datCell(el,LIGHT,2800,true), datCell(font,WHITE,2280), datCell(wt,WHITE,2280), datCell(sz,WHITE,2000)] }))),
          ],
        }),
        sp(),
        h2('Layout Proportions (top to bottom)'),
        new Table({
          width: { size: 9360, type: WidthType.DXA }, columnWidths: [560, 2000, 1800, 5000],
          rows: [
            new TableRow({ children: [hdrCell('Zone',NAVY,560), hdrCell('Title',NAVY,2000), hdrCell('Height %',NAVY,1800), hdrCell('Key Elements',NAVY,5000)] }),
            ...([
              ['1', 'Header / Hero',            '15%', 'Logo, tagline, one-liner on navy background'],
              ['2', 'Problem vs Solution',       '18%', 'Side-by-side red/green, big strike-through numbers'],
              ['3', 'Process Flow',             '25%', '3-step boxes + 6-phase row with cost labels'],
              ['4', 'AAFES Case Study',         '15%', 'Problem vs Result split box, key financial outputs'],
              ['5', '6 Key Stats',              '12%', 'Stat grid: 14 / 6 / 12 / $0.08 / 10min / 6s'],
              ['6', 'Compliance + Footer',      '15%', '5 compliance badge boxes + closing brand tagline'],
            ].map(([z,t,h,k]) => new TableRow({ children: [datCell(z,LIGHT,560,true), datCell(t,WHITE,2000,true), datCell(h,WHITE,1800), datCell(k,WHITE,5000)] }))),
          ],
        }),
        sp(120),
        p([tx('BCA.AI  |  Infographic Design Brief  |  v1.0  |  April 2026', { size: 18, color: DGRAY, italics: true })],
          { alignment: AlignmentType.CENTER }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUT, buf);
  console.log('✅', OUT, '(' + Math.round(buf.length / 1024) + ' KB)');
}).catch(e => {
  console.error('❌', e.message);
  process.exit(1);
});
