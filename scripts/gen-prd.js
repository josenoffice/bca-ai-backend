#!/usr/bin/env node
// BCA_AI_PRD.docx generator
'use strict';
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, HeadingLevel, AlignmentType, BorderStyle, WidthType,
  ShadingType, PageNumber, TableOfContents, LevelFormat, PageBreak,
  VerticalAlign
} = require('docx');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'BCA_AI_PRD.docx');

// ── helpers ──────────────────────────────────────────────────────────────────
const NAVY  = '1B3A5C';
const BLUE  = '2E75B6';
const LIGHT = 'D5E8F0';
const AMBER = 'FFF3CD';
const GREEN = 'D4EDDA';
const WHITE = 'FFFFFF';
const DGRAY = '666666';

const b = (text, opts = {}) => new TextRun({ text, bold: true, ...opts });
const t = (text, opts = {}) => new TextRun({ text, ...opts });

const hr = () => new Paragraph({
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 4 } },
  spacing: { before: 80, after: 80 },
  children: []
});

const p = (children, opts = {}) => new Paragraph({ children: Array.isArray(children) ? children : [t(children)], ...opts });
const bp = (text, opts = {}) => p([b(text)], opts);
const sp = (before = 120, after = 120) => ({ spacing: { before, after } });

const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

const h1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  children: [new TextRun({ text, bold: true, color: NAVY })],
  spacing: { before: 360, after: 180 }
});

const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  children: [new TextRun({ text, bold: true, color: BLUE })],
  spacing: { before: 240, after: 120 }
});

const h3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  children: [new TextRun({ text, bold: true })],
  spacing: { before: 180, after: 90 }
});

const bullet = (text, opts = {}) => new Paragraph({
  numbering: { reference: 'bullets', level: 0 },
  children: [t(text)],
  ...opts
});

const bullet2 = (text) => new Paragraph({
  numbering: { reference: 'bullets', level: 1 },
  children: [t(text)],
});

const num = (text) => new Paragraph({
  numbering: { reference: 'numbers', level: 0 },
  children: [t(text)],
});

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const margins = { top: 80, bottom: 80, left: 120, right: 120 };

const hdrCell = (text, fill = NAVY, width = 2340) => new TableCell({
  borders, margins,
  width: { size: width, type: WidthType.DXA },
  shading: { fill, type: ShadingType.CLEAR },
  verticalAlign: VerticalAlign.CENTER,
  children: [p([b(text, { color: WHITE, size: 20 })])],
});

const dataCell = (text, fill = WHITE, width = 2340, bold = false) => new TableCell({
  borders, margins,
  width: { size: width, type: WidthType.DXA },
  shading: { fill, type: ShadingType.CLEAR },
  children: [p(bold ? [b(text, { size: 20 })] : [t(text, { size: 20 })])],
});

const callout = (text, fill = LIGHT) => new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [9360],
  rows: [new TableRow({ children: [new TableCell({
    borders,
    margins: { top: 120, bottom: 120, left: 180, right: 180 },
    width: { size: 9360, type: WidthType.DXA },
    shading: { fill, type: ShadingType.CLEAR },
    children: [p([t(text, { size: 20, italics: true })])],
  })] })],
});

// ── document ─────────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      { reference: 'bullets', levels: [
        { level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: LevelFormat.BULLET, text: '\u25E6', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
      ]},
      { reference: 'numbers', levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      ]},
    ],
  },
  styles: {
    default: {
      document: { run: { font: 'Arial', size: 22 } },
    },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Arial', color: NAVY },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: BLUE },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial' },
        paragraph: { spacing: { before: 180, after: 90 }, outlineLevel: 2 } },
    ],
  },
  sections: [
    // ── Cover page ─────────────────────────────────────────────────────────
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
      },
      children: [
        p('', { spacing: { before: 2000 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 120 },
          children: [new TextRun({ text: 'BCA.AI', bold: true, size: 72, color: NAVY, font: 'Arial' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 600 },
          children: [new TextRun({ text: 'Business Case Analysis Platform', size: 36, color: BLUE, font: 'Arial' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 120 },
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 4 } },
          children: [new TextRun({ text: 'Product Requirements Document', bold: true, size: 40, font: 'Arial' })],
        }),
        p('', { spacing: { before: 60 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'Version 1.0  |  April 2026  |  Status: Draft', size: 22, color: DGRAY, font: 'Arial' })],
        }),
        p('', { spacing: { before: 480 } }),
        new Table({
          width: { size: 6000, type: WidthType.DXA },
          columnWidths: [2400, 3600],
          rows: [
            new TableRow({ children: [
              new TableCell({ borders, margins, width: { size: 2400, type: WidthType.DXA },
                shading: { fill: NAVY, type: ShadingType.CLEAR },
                children: [p([b('Author', { color: WHITE, size: 20 })])] }),
              new TableCell({ borders, margins, width: { size: 3600, type: WidthType.DXA },
                children: [p([t('BCA.AI Product Team', { size: 20 })])] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders, margins, width: { size: 2400, type: WidthType.DXA },
                shading: { fill: NAVY, type: ShadingType.CLEAR },
                children: [p([b('Date', { color: WHITE, size: 20 })])] }),
              new TableCell({ borders, margins, width: { size: 3600, type: WidthType.DXA },
                children: [p([t('April 20, 2026', { size: 20 })])] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders, margins, width: { size: 2400, type: WidthType.DXA },
                shading: { fill: NAVY, type: ShadingType.CLEAR },
                children: [p([b('Audience', { color: WHITE, size: 20 })])] }),
              new TableCell({ borders, margins, width: { size: 3600, type: WidthType.DXA },
                children: [p([t('Product, Engineering, Stakeholders', { size: 20 })])] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders, margins, width: { size: 2400, type: WidthType.DXA },
                shading: { fill: NAVY, type: ShadingType.CLEAR },
                children: [p([b('Classification', { color: WHITE, size: 20 })])] }),
              new TableCell({ borders, margins, width: { size: 3600, type: WidthType.DXA },
                children: [p([t('Internal / Confidential', { size: 20 })])] }),
            ]}),
          ],
        }),
        p('', { spacing: { before: 2400 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC', space: 4 } },
          children: [new TextRun({ text: 'BCA.AI is an AI-powered business case analysis platform that guides decision-makers through a structured intake process and produces investment-grade financial analysis, vendor comparisons, and a downloadable Business Requirements Document.', size: 20, italics: true, color: DGRAY })],
        }),
        pageBreak(),
      ],
    },
    // ── Main content ───────────────────────────────────────────────────────
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
      },
      headers: {
        default: new Header({ children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 4 } },
          children: [
            new TextRun({ text: 'BCA.AI  —  Product Requirements Document', bold: true, font: 'Arial', size: 18, color: NAVY }),
            new TextRun({ text: '    |    v1.0    |    Confidential', font: 'Arial', size: 18, color: DGRAY }),
          ],
        })] }),
      },
      footers: {
        default: new Footer({ children: [new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC', space: 4 } },
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'Page ', font: 'Arial', size: 18, color: DGRAY }),
            new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: DGRAY }),
            new TextRun({ text: ' of ', font: 'Arial', size: 18, color: DGRAY }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Arial', size: 18, color: DGRAY }),
          ],
        })] }),
      },
      children: [
        // ── TOC ────────────────────────────────────────────────────────────
        new TableOfContents('Table of Contents', {
          hyperlink: true,
          headingStyleRange: '1-3',
        }),
        pageBreak(),

        // ── 1. Executive Summary ───────────────────────────────────────────
        h1('1. Executive Summary'),
        p('BCA.AI is an AI-powered Business Case Analysis platform built to eliminate the months of manual analysis, spreadsheet work, and consultant engagement traditionally required to produce an investment-grade business case. By guiding decision-makers through a structured 14-question conversational intake and applying six sequential analytical phases, BCA.AI delivers a complete, board-ready business case in under 10 minutes.'),
        p('', sp(60)),
        p('The platform is purpose-built for government-retail and commercial-retail environments, with deep support for AAFES (Army & Air Force Exchange Service) organizational structures, compliance requirements, and financial frameworks including DoD NAF (Non-Appropriated Fund) standards.'),
        p('', sp(60)),
        callout('BCA.AI transforms a 6-week consulting engagement into a 10-minute AI-assisted workflow — producing the same deliverables at a fraction of the cost and time.', LIGHT),
        p('', sp(120)),

        h2('1.1 Platform Goals'),
        bullet('Democratize business case creation for mid-level managers and directors who lack financial analysis expertise'),
        bullet('Produce investment-grade outputs: NPV, IRR, ROI, payback period, risk-adjusted financials'),
        bullet('Generate a downloadable Business Requirements Document (.docx) suitable for board/procurement approval'),
        bullet('Support AAFES-specific terminology, org structures, compliance requirements (SARBANES-OXLEY, PCI-DSS, ITAR, Section 508)'),
        bullet('Minimize cost: ~$0.08 per complete business case analysis (Phases 1-6)'),
        p('', sp(60)),

        h2('1.2 Target Users'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2340, 2340, 2340, 2340],
          rows: [
            new TableRow({ children: [
              hdrCell('User Type', NAVY, 2340),
              hdrCell('Role Examples', NAVY, 2340),
              hdrCell('Pain Today', NAVY, 2340),
              hdrCell('BCA.AI Value', NAVY, 2340),
            ]}),
            new TableRow({ children: [
              dataCell('Business Analyst', LIGHT, 2340, true),
              dataCell('Senior BA, IT Business Partner', WHITE, 2340),
              dataCell('Weeks building spreadsheets', WHITE, 2340),
              dataCell('10-min structured output', WHITE, 2340),
            ]}),
            new TableRow({ children: [
              dataCell('Director / VP', LIGHT, 2340, true),
              dataCell('IT Director, VP Operations', WHITE, 2340),
              dataCell('Consultants cost $50K+', WHITE, 2340),
              dataCell('Same quality, $0.08 cost', WHITE, 2340),
            ]}),
            new TableRow({ children: [
              dataCell('Program Manager', LIGHT, 2340, true),
              dataCell('PM, Portfolio Manager', WHITE, 2340),
              dataCell('No standard format', WHITE, 2340),
              dataCell('Board-ready .docx BRD', WHITE, 2340),
            ]}),
            new TableRow({ children: [
              dataCell('Finance Lead', LIGHT, 2340, true),
              dataCell('CFO, Controller, Budget Analyst', WHITE, 2340),
              dataCell('NPV/IRR computed manually', WHITE, 2340),
              dataCell('Auto-computed with DoD NAF rate', WHITE, 2340),
            ]}),
          ],
        }),
        p('', sp(120)),
        pageBreak(),

        // ── 2. Problem Statement ────────────────────────────────────────────
        h1('2. Problem Statement'),
        p('Organizations investing in technology face a consistent set of problems when building business cases:'),
        p('', sp(60)),
        bullet('Business case creation requires skills across finance (NPV/IRR), project management (timelines), risk analysis, and procurement — rarely found in a single person'),
        bullet('The process typically takes 4–8 weeks and costs $25K–$100K when external consultants are engaged'),
        bullet('Outputs are inconsistent — each team uses different templates, assumptions, and financial models'),
        bullet('Approval processes stall because executives cannot compare alternatives on a level playing field'),
        bullet('For AAFES and similar government-retail organizations, compliance requirements (ITAR, Section 508, ATO, FedRAMP) add additional complexity that generic tools ignore'),
        p('', sp(60)),
        callout('The AAFES Exchange Card Modernization initiative — the platform\'s flagship demo scenario — illustrates this: a critical payment infrastructure upgrade affecting 14M military customers, requiring analysis across 5 vendor alternatives, with DoD NAF financial standards that no commercial tool supports out-of-the-box.', AMBER),
        p('', sp(120)),

        // ── 3. Solution Overview ────────────────────────────────────────────
        h1('3. Solution Overview'),
        p('BCA.AI is a Node.js/Express web application with a React-like single-page frontend. It consists of:'),
        p('', sp(60)),
        bullet('A conversational intake form (14 guided questions) that collects project context'),
        bullet('Six backend analysis phases executed sequentially by the AI orchestration engine'),
        bullet('A rich results viewer with tabbed sections for each phase output'),
        bullet('Phase 6: Business Requirements Document generation and download (.docx)'),
        p('', sp(60)),

        h2('3.1 Architecture Overview'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2340, 3500, 3520],
          rows: [
            new TableRow({ children: [
              hdrCell('Layer', NAVY, 2340),
              hdrCell('Technology', NAVY, 3500),
              hdrCell('Notes', NAVY, 3520),
            ]}),
            new TableRow({ children: [
              dataCell('Frontend', LIGHT, 2340, true),
              dataCell('Vanilla JS + CSS Custom Properties', WHITE, 3500),
              dataCell('No framework dependency; SPA pattern', WHITE, 3520),
            ]}),
            new TableRow({ children: [
              dataCell('Backend', LIGHT, 2340, true),
              dataCell('Node.js 25 + Express', WHITE, 3500),
              dataCell('ES Modules; port 3001', WHITE, 3520),
            ]}),
            new TableRow({ children: [
              dataCell('AI Engine', LIGHT, 2340, true),
              dataCell('Anthropic Claude 3.5 Sonnet', WHITE, 3500),
              dataCell('claude-3-5-sonnet-20241022', WHITE, 3520),
            ]}),
            new TableRow({ children: [
              dataCell('Document Gen', LIGHT, 2340, true),
              dataCell('docx npm package v9', WHITE, 3500),
              dataCell('Phase 6 .docx generation', WHITE, 3520),
            ]}),
            new TableRow({ children: [
              dataCell('Serving', LIGHT, 2340, true),
              dataCell('Express static + serve npm', WHITE, 3500),
              dataCell('Ports 3000 (viewer) & 3001 (API)', WHITE, 3520),
            ]}),
          ],
        }),
        p('', sp(120)),
        pageBreak(),

        // ── 4. Conversational Intake ────────────────────────────────────────
        h1('4. Conversational Intake Form'),
        p('The conversational intake is a standalone HTML SPA (conversational-intake.html) served at /conversational-intake. It guides users through 14 questions using a chat-like step-by-step interface, collecting all data needed to run all 6 analysis phases.'),
        p('', sp(60)),

        h2('4.1 Intake Question Catalog'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [560, 1680, 1800, 1800, 1800, 1720],
          rows: [
            new TableRow({ children: [
              hdrCell('#', NAVY, 560),
              hdrCell('Question', NAVY, 1680),
              hdrCell('Input Type', NAVY, 1800),
              hdrCell('Key Fields Collected', NAVY, 1800),
              hdrCell('Validation', NAVY, 1800),
              hdrCell('AAFES Example', NAVY, 1720),
            ]}),
            ...[
              ['Q1', 'Project Identity', 'Text fields (2)', 'projectTitle, role, businessUnit, industry', 'Required fields', 'Exchange Card Modernization / IT Director / HQ IT'],
              ['Q2', 'Problem Area', 'Symptom cards (15)', 'currentPainPoints[]', 'Min 1 selected', 'Legacy payment infrastructure, Inventory visibility'],
              ['Q3', 'Current State', 'Radio buttons (4)', 'currentState (as-is level)', 'Required', 'Manual/semi-automated processes'],
              ['Q4', 'Narrative Detail', 'Guided textarea', 'problemNarrative', 'Min 50 chars', 'Military Star card declined 23% of OCONUS transactions...'],
              ['Q5', 'What Tried', 'Chips (18)', 'triedApproaches[]', 'Optional', 'Vendor demos, RFI issued, Pilot program run'],
              ['Q6', 'KPIs', 'Tile cards (18) + targets', 'kpis[] with targetValue', 'Min 1 KPI + target', 'Transaction Approval Rate target 99.5%'],
              ['Q7', 'Alternatives', 'Cards + multi-select + COI', 'alternatives[], preferredAlternative, costOfInaction', 'Min 2 alternatives', '5 alternatives; Status Quo COI $2.23M/yr'],
              ['Q8', 'Stakeholders', 'Grouped chips (46+)', 'stakeholders[]', 'Min 3', 'CIO, CFO, Exchange Card Program, DFAS, DCMA'],
              ['Q9', 'Compliance', 'Chips (12)', 'complianceRequirements[]', 'Optional', 'PCI-DSS, ITAR, Section 508, ATO/FedRAMP'],
              ['Q10', 'Tech Stack', 'Grouped chips (55)', 'technicalStack[]', 'Optional', 'NCR Counterpoint, Military Star/ECP, AWS GovCloud'],
              ['Q11', 'Financials', 'Number fields (6) + help', 'budget, headcount, revenue, timeHorizon, discountRate, urgency', 'Numeric + required', '$4.2M budget, 8% DoD NAF rate, 5-yr horizon'],
              ['Q12', 'Timeline', 'Radio buttons (4)', 'timeline', 'Required', '12-18 months'],
              ['Q13', 'Risk Tolerance', 'Radio buttons (4)', 'riskTolerance', 'Required', 'Moderate'],
              ['Q14', 'Confirmation', 'Review screen', 'All fields confirmed', 'User proceeds', 'Full summary before Phase 1 launch'],
            ].map(([num, q, type, fields, val, ex]) => new TableRow({ children: [
              dataCell(num, LIGHT, 560, true),
              dataCell(q, WHITE, 1680, true),
              dataCell(type, WHITE, 1800),
              dataCell(fields, WHITE, 1800),
              dataCell(val, WHITE, 1800),
              dataCell(ex, WHITE, 1720),
            ]})),
          ],
        }),
        p('', sp(120)),

        h2('4.2 UX Features'),
        h3('4.2.1 Guide Me — Inline Contextual Help'),
        p('Every data entry question includes a "Guide Me" button that expands an inline help panel. The panel contains:'),
        bullet('Plain-language explanation of what the question is asking'),
        bullet('Why this data matters to the analysis'),
        bullet('A concrete AAFES-specific example'),
        p('', sp(60)),

        h3('4.2.2 Prompt Scaffold — Sentence Starters'),
        p('Question 4 (Narrative Detail) includes 6 clickable sentence-starter chips that inject context-appropriate prompts at the cursor position:'),
        bullet('"Our current system fails when..."'),
        bullet('"This impacts the business because..."'),
        bullet('"We have already tried..."'),
        bullet('"Success would look like..."'),
        bullet('"The urgency is driven by..."'),
        bullet('"Key stakeholders are concerned about..."'),
        p('', sp(60)),

        h3('4.2.3 Multi-Select Alternatives with Preferred'),
        p('Question 7 allows selection of multiple alternatives simultaneously. Users can mark one as the "preferred" option using a star (★) button. The preferred alternative is highlighted differently and carries through to Phase 4 recommendation output.'),
        p('', sp(60)),

        h3('4.2.4 Cost-of-Inaction Calculator'),
        p('The Status Quo alternative (Alternative 0) includes a collapsible calculator with 5 inputs:'),
        bullet('Estimated incidents per year and average cost per incident'),
        bullet('Annual compliance risk exposure ($)'),
        bullet('Annual revenue at risk ($)'),
        bullet('Annual staff cost of workarounds ($)'),
        bullet('Annual customer experience impact ($)'),
        p('The calculator sums all inputs and allows the user to "Use This Total" which pre-fills the Status Quo cost field (editable/overridable).'),
        p('', sp(60)),

        h3('4.2.5 Field-Level Help Icons'),
        p('Question 11 (Financials) includes contextual help icons (i) on each of 6 financial fields. Clicking reveals a tooltip explaining the field and how to find/estimate the value, with AAFES-specific guidance (e.g., "Use DoD NAF standard of 8% for discount rate").'),
        p('', sp(60)),

        h3('4.2.6 Demo Mode'),
        p('The intake form includes a built-in demo mode (_demoMode flag) that auto-fills all 14 questions with the AAFES Exchange Card Modernization scenario. Demo mode can be activated by appending ?demo=true to the URL. Each question animates in with realistic typing delays to simulate a live user session.'),
        p('', sp(120)),
        pageBreak(),

        // ── 5. Analysis Phases ──────────────────────────────────────────────
        h1('5. Analysis Phases'),
        p('BCA.AI executes six sequential phases after the intake form is submitted. Phases 2–5 are pure JavaScript (no AI cost); Phases 1 and 6 use Claude API calls.'),
        p('', sp(60)),

        callout('Total API cost per complete business case: ~$0.08 (Phase 1: ~$0.06 + Phase 6: ~$0.02). All other phases are free computation.', GREEN),
        p('', sp(120)),

        h2('5.1 Phase 1 — AI Solution Analysis'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2200, 7160],
          rows: [
            new TableRow({ children: [hdrCell('Attribute', NAVY, 2200), hdrCell('Detail', NAVY, 7160)] }),
            new TableRow({ children: [dataCell('Endpoint', LIGHT, 2200, true), dataCell('POST /api/phase1', WHITE, 7160)] }),
            new TableRow({ children: [dataCell('AI Calls', LIGHT, 2200, true), dataCell('2 parallel: Solution Generation + Requirements Generation', WHITE, 7160)] }),
            new TableRow({ children: [dataCell('Input', LIGHT, 2200, true), dataCell('Full intake payload (projectTitle, industry, alternatives, kpis, complianceRequirements, technicalStack, budget, etc.)', WHITE, 7160)] }),
            new TableRow({ children: [dataCell('Key Outputs', LIGHT, 2200, true), dataCell('solutions[] (name, description, benefits[], risks[], effort, riskLevel, aiConfidence), requirements[] (REQ-001..005 with priority, category), descopedPortfolio[], complianceGaps[]', WHITE, 7160)] }),
            new TableRow({ children: [dataCell('AAFES Example', LIGHT, 2200, true), dataCell('Solution: "Military Star Card Platform Overhaul" — Modernize payment processing infrastructure; REQ-001: Real-time transaction processing across all OCONUS locations', WHITE, 7160)] }),
          ],
        }),
        p('', sp(60)),

        h3('5.1.1 Phase 1 Sub-phases'),
        bullet('Phase 1.5 — Cost Estimation: AI generates implementation cost, operating cost, and timeline for each solution'),
        bullet('Phase 1.6 — Vendor Analysis: AI researches and scores 3 vendors per solution (compatibility, price, compliance, support, references)'),
        bullet('Phase 1-Reflection — Quality Scoring: AI reviews all Phase 1 outputs and assigns quality scores (0-100) with flags for weak logic'),
        p('', sp(120)),

        h2('5.2 Phase 2 — Financial Modeling (JS)'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2200, 7160],
          rows: [
            new TableRow({ children: [hdrCell('Attribute', NAVY, 2200), hdrCell('Detail', NAVY, 7160)] }),
            new TableRow({ children: [dataCell('Endpoint', LIGHT, 2200, true), dataCell('POST /api/phase2', WHITE, 7160)] }),
            new TableRow({ children: [dataCell('AI Calls', LIGHT, 2200, true), dataCell('Zero — pure JavaScript computation', WHITE, 7160)] }),
            new TableRow({ children: [dataCell('Financial Metrics', LIGHT, 2200, true), dataCell('NPV (per solution), IRR, Payback Period, ROI%, Portfolio NPV, Portfolio IRR, Break-even Analysis', WHITE, 7160)] }),
            new TableRow({ children: [dataCell('Methodology', LIGHT, 2200, true), dataCell('DCF (Discounted Cash Flow) using user-provided discount rate (default 8% DoD NAF standard)', WHITE, 7160)] }),
            new TableRow({ children: [dataCell('AAFES Example', LIGHT, 2200, true), dataCell('Portfolio NPV: $8.4M; Best Solution IRR: 34.2%; Payback: 28 months; 3-Year ROI: 312%', WHITE, 7160)] }),
          ],
        }),
        p('', sp(120)),

        h2('5.3 Phase 3 — Traceability & Timeline (JS)'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2200, 7160],
          rows: [
            new TableRow({ children: [hdrCell('Attribute', NAVY, 2200), hdrCell('Detail', NAVY, 7160)] }),
            new TableRow({ children: [dataCell('Endpoint', LIGHT, 2200, true), dataCell('POST /api/phase3', WHITE, 7160)] }),
            new TableRow({ children: [dataCell('AI Calls', LIGHT, 2200, true), dataCell('Zero — pure JavaScript computation', WHITE, 7160)] }),
            new TableRow({ children: [dataCell('Key Outputs', LIGHT, 2200, true), dataCell('Traceability matrix (KPIs → Solutions → Requirements), Implementation timeline with phases and milestones, Risk register', WHITE, 7160)] }),
            new TableRow({ children: [dataCell('AAFES Example', LIGHT, 2200, true), dataCell('Phase 1: Foundation & Vendor Selection (months 1-4), Phase 2: Pilot Deployment CONUS (months 5-8), Phase 3: OCONUS Rollout (months 9-14), Phase 4: Optimization (months 15-18)', WHITE, 7160)] }),
          ],
        }),
        p('', sp(120)),

        h2('5.4 Phase 4 — Ranking & Recommendation (JS)'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2200, 7160],
          rows: [
            new TableRow({ children: [hdrCell('Attribute', NAVY, 2200), hdrCell('Detail', NAVY, 7160)] }),
            new TableRow({ children: [dataCell('Endpoint', LIGHT, 2200, true), dataCell('POST /api/phase4', WHITE, 7160)] }),
            new TableRow({ children: [dataCell('AI Calls', LIGHT, 2200, true), dataCell('Zero — pure JavaScript computation', WHITE, 7160)] }),
            new TableRow({ children: [dataCell('Scoring', LIGHT, 2200, true), dataCell('Weighted multi-criteria: Financial (30%), Strategic Fit (25%), Risk (20%), Implementation (15%), Compliance (10%)', WHITE, 7160)] }),
            new TableRow({ children: [dataCell('Key Outputs', LIGHT, 2200, true), dataCell('Ranked alternatives table, composite score per solution, recommendation narrative, confidence level', WHITE, 7160)] }),
            new TableRow({ children: [dataCell('AAFES Example', LIGHT, 2200, true), dataCell('Recommended: Military Star Card Platform Overhaul (Score: 87/100, Confidence: High); Runner-up: Hybrid Omnichannel Modernization (82/100)', WHITE, 7160)] }),
          ],
        }),
        p('', sp(120)),

        h2('5.5 Phase 5 — Executive Report (JS)'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2200, 7160],
          rows: [
            new TableRow({ children: [hdrCell('Attribute', NAVY, 2200), hdrCell('Detail', NAVY, 7160)] }),
            new TableRow({ children: [dataCell('Endpoint', LIGHT, 2200, true), dataCell('POST /api/phase5', WHITE, 7160)] }),
            new TableRow({ children: [dataCell('AI Calls', LIGHT, 2200, true), dataCell('Zero — pure JavaScript computation', WHITE, 7160)] }),
            new TableRow({ children: [dataCell('Output Format', LIGHT, 2200, true), dataCell('Full HTML report with branded styling; all sections in-browser; printable', WHITE, 7160)] }),
            new TableRow({ children: [dataCell('Report Sections', LIGHT, 2200, true), dataCell('Executive Summary, Problem Statement, Alternatives Comparison, Financial Analysis, Risk Matrix, Implementation Roadmap, Vendor Summary, Recommendation', WHITE, 7160)] }),
          ],
        }),
        p('', sp(120)),
        pageBreak(),

        h2('5.6 Phase 6 — BRD Generation (AI + JS)'),
        p('Phase 6 generates a formal Business Requirements Document (.docx) for board/procurement approval. It uses 2 parallel AI calls plus 7 JavaScript-assembled sections.'),
        p('', sp(60)),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2200, 7160],
          rows: [
            new TableRow({ children: [hdrCell('Attribute', NAVY, 2200), hdrCell('Detail', NAVY, 7160)] }),
            new TableRow({ children: [dataCell('Endpoints', LIGHT, 2200, true), dataCell('POST /api/phase6 (generate), POST /api/phase6/download (docx), POST /api/phase6/rewrite (AI rewrite section)', WHITE, 7160)] }),
            new TableRow({ children: [dataCell('AI Calls', LIGHT, 2200, true), dataCell('2 parallel: (1) Narrative — Business Justification, Project Objectives, Risk Assessment; (2) Requirements — Functional Requirements with sub-requirements, Non-Functional Requirements', WHITE, 7160)] }),
            new TableRow({ children: [dataCell('JS Sections', LIGHT, 2200, true), dataCell('Executive Summary, Problem Statement, Scope, RACI Matrix, Implementation Timeline, Assumptions & Constraints, Approval & Sign-off', WHITE, 7160)] }),
            new TableRow({ children: [dataCell('BRD Sections', LIGHT, 2200, true), dataCell('12 sections: Executive Summary, Business Justification, Problem Statement, Project Objectives, Scope, Functional Requirements, Non-Functional Requirements, Stakeholders & RACI, Implementation Timeline, Risk Assessment, Assumptions & Constraints, Approval & Sign-off', WHITE, 7160)] }),
            new TableRow({ children: [dataCell('Edit Features', LIGHT, 2200, true), dataCell('Direct textarea edit + AI Rewrite (user provides instruction, Claude rewrites section) + Add Custom Section + Delete Section', WHITE, 7160)] }),
          ],
        }),
        p('', sp(60)),
        callout('Phase 6 costs ~$0.02 per BRD. The 7 JS-assembled sections are free. The 2 AI calls cost approximately $0.01 each and run in parallel (~6 second total generation time).', GREEN),
        p('', sp(120)),
        pageBreak(),

        // ── 6. API Route Catalog ────────────────────────────────────────────
        h1('6. API Route Catalog'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1400, 2200, 1600, 4160],
          rows: [
            new TableRow({ children: [
              hdrCell('Method', NAVY, 1400),
              hdrCell('Route', NAVY, 2200),
              hdrCell('File', NAVY, 1600),
              hdrCell('Description', NAVY, 4160),
            ]}),
            ...[
              ['POST', '/api/phase1', 'routes/phase1.js', 'AI solution + requirements generation (2 parallel calls)'],
              ['POST', '/api/phase1.5', 'routes/phase1-5.js', 'AI cost estimation for each solution'],
              ['POST', '/api/phase1.6', 'routes/phase1-6.js', 'AI vendor analysis (3 vendors × N solutions)'],
              ['POST', '/api/phase1-reflection', 'routes/phase1-reflection.js', 'AI quality scoring and critique of Phase 1'],
              ['POST', '/api/phase2', 'routes/phase2.js', 'JS financial modeling (NPV, IRR, ROI, payback)'],
              ['POST', '/api/phase3', 'routes/phase3.js', 'JS traceability matrix + timeline + risk register'],
              ['POST', '/api/phase4', 'routes/phase4.js', 'JS ranking and weighted scoring + recommendation'],
              ['POST', '/api/phase5', 'routes/phase5.js', 'JS executive report HTML generation'],
              ['POST', '/api/phase6', 'routes/phase6.js', 'AI + JS BRD generation (12 sections)'],
              ['POST', '/api/phase6/download', 'routes/phase6.js', 'Converts 12 sections to .docx binary'],
              ['POST', '/api/phase6/rewrite', 'routes/phase6.js', 'AI rewrites a single BRD section per instruction'],
              ['GET', '/conversational-intake', 'index.js', 'Serves the intake form SPA'],
              ['GET', '/phase1-viewer.html', 'index.js (static)', 'Serves the results viewer SPA'],
              ['GET', '/health', 'index.js', 'Health check endpoint'],
            ].map(([method, route, file, desc]) => new TableRow({ children: [
              dataCell(method, LIGHT, 1400, true),
              dataCell(route, WHITE, 2200),
              dataCell(file, WHITE, 1600),
              dataCell(desc, WHITE, 4160),
            ]})),
          ],
        }),
        p('', sp(120)),
        pageBreak(),

        // ── 7. Key Design Principles ────────────────────────────────────────
        h1('7. Key Design Principles'),

        h2('7.1 AI Minimalism'),
        p('Only Phase 1 and Phase 6 make AI API calls. All intermediate phases (2, 3, 4, 5) are pure JavaScript computation. This design keeps the cost per analysis to ~$0.08 while still producing investment-grade outputs. AI is used where structured reasoning is needed (generating creative solutions, expanding requirements, writing persuasive narrative) and avoided where deterministic computation suffices (financial math, scoring algorithms, report assembly).'),
        p('', sp(60)),

        h2('7.2 Data Reuse First'),
        p('Every downstream phase reuses upstream data rather than making additional AI calls. Phase 6 BRD sections directly extract from Phase 1 requirements, Phase 2 financials, Phase 3 timeline, Phase 4 recommendation, and Phase 5 executive summary. This "waterfall of structured data" means 7 of 12 BRD sections are assembled instantly from existing analysis.'),
        p('', sp(60)),

        h2('7.3 Industry-Aware UX'),
        p('The intake form detects the selected industry (government-retail, commercial-retail, etc.) and adapts its content accordingly. Symptom cards, KPI tiles, stakeholder groups, tech stack chips, tried approaches, and financial field labels all change based on industry selection. This prevents users from seeing irrelevant options and ensures AAFES-specific terminology is surfaced automatically.'),
        p('', sp(60)),

        h2('7.4 Progressive Disclosure'),
        p('Complex features are hidden behind optional triggers: Guide Me panels expand on demand; Cost-of-Inaction calculator collapses by default; Field help icons open on click; Prompt scaffold chips appear only on the narrative question. Users who know what they are doing can proceed directly; users who need help have rich assistance available.'),
        p('', sp(60)),

        h2('7.5 Editability Throughout'),
        p('Phase 6 BRD sections are all editable after generation. Users can: (1) edit content directly via textarea, (2) request an AI rewrite with a specific instruction, (3) add custom sections, (4) delete sections, (5) reorder sections. The final downloaded .docx reflects all user edits.'),
        p('', sp(120)),
        pageBreak(),

        // ── 8. AAFES Demo Scenario ──────────────────────────────────────────
        h1('8. AAFES Demo Scenario — Exchange Card Modernization'),
        p('The platform ships with a built-in demo scenario based on a realistic AAFES initiative. This scenario is used for all product demonstrations, NotebookLM video content, and onboarding training.'),
        p('', sp(60)),

        h2('8.1 Scenario Data'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2600, 6760],
          rows: [
            new TableRow({ children: [hdrCell('Field', NAVY, 2600), hdrCell('AAFES Value', NAVY, 6760)] }),
            new TableRow({ children: [dataCell('Project Title', LIGHT, 2600, true), dataCell('Exchange Card Modernization Initiative', WHITE, 6760)] }),
            new TableRow({ children: [dataCell('Role', LIGHT, 2600, true), dataCell('IT Director', WHITE, 6760)] }),
            new TableRow({ children: [dataCell('Business Unit', LIGHT, 2600, true), dataCell('HQ IT — Payment Systems', WHITE, 6760)] }),
            new TableRow({ children: [dataCell('Industry', LIGHT, 2600, true), dataCell('government-retail', WHITE, 6760)] }),
            new TableRow({ children: [dataCell('Pain Points', LIGHT, 2600, true), dataCell('Legacy payment infrastructure, Inventory visibility gaps, No omnichannel integration', WHITE, 6760)] }),
            new TableRow({ children: [dataCell('Current State', LIGHT, 2600, true), dataCell('Manual/semi-automated processes', WHITE, 6760)] }),
            new TableRow({ children: [dataCell('Problem Narrative', LIGHT, 2600, true), dataCell('Our Military Star card payment system is running on infrastructure from 2008. During the last 6 months, we\'ve seen 23% of OCONUS transactions declined due to connectivity issues. This is affecting 14 million military members and their families who depend on us for basic goods.', WHITE, 6760)] }),
            new TableRow({ children: [dataCell('What Was Tried', LIGHT, 2600, true), dataCell('Vendor demos, RFI process, Pilot program', WHITE, 6760)] }),
            new TableRow({ children: [dataCell('KPIs', LIGHT, 2600, true), dataCell('Transaction Approval Rate (target: 99.5%), Customer Satisfaction (target: 4.5/5), System Uptime (target: 99.9%), Processing Speed (target: 2 seconds)', WHITE, 6760)] }),
            new TableRow({ children: [dataCell('Alternatives', LIGHT, 2600, true), dataCell('(0) Status Quo, (1) Military Star Card Platform Overhaul [PREFERRED★], (2) Hybrid Omnichannel Modernization, (3) Cloud-Native Retail Platform, (4) AI-Powered Analytics Layer', WHITE, 6760)] }),
            new TableRow({ children: [dataCell('Cost of Inaction', LIGHT, 2600, true), dataCell('$2,230,000 per year (incidents + compliance risk + revenue loss + staff workarounds)', WHITE, 6760)] }),
            new TableRow({ children: [dataCell('Preferred Alt Cost', LIGHT, 2600, true), dataCell('$4,200,000 implementation', WHITE, 6760)] }),
            new TableRow({ children: [dataCell('Compliance', LIGHT, 2600, true), dataCell('PCI-DSS, ITAR, Section 508, ATO/FedRAMP, DFARS', WHITE, 6760)] }),
            new TableRow({ children: [dataCell('Tech Stack', LIGHT, 2600, true), dataCell('NCR Counterpoint, Military Star/ECP, AWS GovCloud, Azure Government, CAC/PIV Authentication', WHITE, 6760)] }),
            new TableRow({ children: [dataCell('Budget', LIGHT, 2600, true), dataCell('$4,200,000', WHITE, 6760)] }),
            new TableRow({ children: [dataCell('Headcount Impact', LIGHT, 2600, true), dataCell('250 FTE affected', WHITE, 6760)] }),
            new TableRow({ children: [dataCell('Annual Revenue', LIGHT, 2600, true), dataCell('$9,500,000,000 (AAFES total)', WHITE, 6760)] }),
            new TableRow({ children: [dataCell('Discount Rate', LIGHT, 2600, true), dataCell('8% (DoD NAF standard)', WHITE, 6760)] }),
            new TableRow({ children: [dataCell('Time Horizon', LIGHT, 2600, true), dataCell('5 years', WHITE, 6760)] }),
            new TableRow({ children: [dataCell('Urgency', LIGHT, 2600, true), dataCell('High — compliance deadline within 12 months', WHITE, 6760)] }),
            new TableRow({ children: [dataCell('Timeline', LIGHT, 2600, true), dataCell('12-18 months', WHITE, 6760)] }),
            new TableRow({ children: [dataCell('Risk Tolerance', LIGHT, 2600, true), dataCell('Moderate', WHITE, 6760)] }),
          ],
        }),
        p('', sp(120)),
        pageBreak(),

        // ── 9. Success Metrics ──────────────────────────────────────────────
        h1('9. Success Metrics'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2800, 2280, 2280, 2000],
          rows: [
            new TableRow({ children: [
              hdrCell('Metric', NAVY, 2800),
              hdrCell('Current Baseline', NAVY, 2280),
              hdrCell('Target', NAVY, 2280),
              hdrCell('Measurement', NAVY, 2000),
            ]}),
            new TableRow({ children: [
              dataCell('Business case creation time', LIGHT, 2800, true),
              dataCell('4-8 weeks', WHITE, 2280),
              dataCell('< 15 minutes', WHITE, 2280),
              dataCell('End-to-end timing', WHITE, 2000),
            ]}),
            new TableRow({ children: [
              dataCell('Cost per analysis', LIGHT, 2800, true),
              dataCell('$25K-$100K (consulting)', WHITE, 2280),
              dataCell('< $0.10', WHITE, 2280),
              dataCell('API cost tracking', WHITE, 2000),
            ]}),
            new TableRow({ children: [
              dataCell('Intake completion rate', LIGHT, 2800, true),
              dataCell('N/A', WHITE, 2280),
              dataCell('> 85%', WHITE, 2280),
              dataCell('Sessions with Phase 1 call', WHITE, 2000),
            ]}),
            new TableRow({ children: [
              dataCell('BRD download rate', LIGHT, 2800, true),
              dataCell('N/A', WHITE, 2280),
              dataCell('> 60% of Phase 6 completions', WHITE, 2280),
              dataCell('Download events', WHITE, 2000),
            ]}),
            new TableRow({ children: [
              dataCell('User satisfaction (NPS)', LIGHT, 2800, true),
              dataCell('N/A', WHITE, 2280),
              dataCell('> 70 NPS', WHITE, 2280),
              dataCell('Post-session survey', WHITE, 2000),
            ]}),
            new TableRow({ children: [
              dataCell('Financial accuracy', LIGHT, 2800, true),
              dataCell('Manual spreadsheet', WHITE, 2280),
              dataCell('±5% vs expert model', WHITE, 2280),
              dataCell('Spot-check vs CPA model', WHITE, 2000),
            ]}),
            new TableRow({ children: [
              dataCell('Phase 6 generation time', LIGHT, 2800, true),
              dataCell('Manual: days/weeks', WHITE, 2280),
              dataCell('< 10 seconds', WHITE, 2280),
              dataCell('API response time', WHITE, 2000),
            ]}),
          ],
        }),
        p('', sp(120)),

        // ── 10. Roadmap ─────────────────────────────────────────────────────
        h1('10. Future Roadmap'),
        h2('Phase 1 (Current — v1.0)'),
        bullet('All 6 analysis phases'),
        bullet('14-question conversational intake with AAFES support'),
        bullet('Phase 6 BRD download (.docx)'),
        bullet('Demo mode with AAFES Exchange Card scenario'),
        p('', sp(60)),

        h2('Phase 2 (Q3 2026)'),
        bullet('Multi-scenario comparison (run intake for 2 projects, compare side-by-side)'),
        bullet('Cost-Benefit Analysis table in Phase 6 BRD'),
        bullet('Vendor Recommendations table in Phase 6 BRD'),
        bullet('User accounts with saved analyses'),
        p('', sp(60)),

        h2('Phase 3 (Q4 2026)'),
        bullet('PowerPoint export (Phase 5 slides)'),
        bullet('API integrations: pull data from Jira, ServiceNow, SAP'),
        bullet('Enterprise SSO (CAC/PIV for government customers)'),
        bullet('Custom AI model fine-tuning on organization-specific data'),
        p('', sp(180)),

        p([
          t('BCA.AI Product Requirements Document  |  v1.0  |  April 2026  |  Internal / Confidential', { size: 18, color: DGRAY, italics: true })
        ], { alignment: AlignmentType.CENTER }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUT, buf);
  console.log('✅ Created:', OUT, '(' + Math.round(buf.length / 1024) + ' KB)');
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
