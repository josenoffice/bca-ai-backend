#!/usr/bin/env node
// BCA_AI_Screenshot_Guide.docx generator
'use strict';
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, HeadingLevel, AlignmentType, BorderStyle, WidthType,
  ShadingType, PageNumber, LevelFormat, PageBreak, VerticalAlign
} = require('docx');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'BCA_AI_Screenshot_Guide.docx');

// ── Tokens ────────────────────────────────────────────────────────────────────
const NAVY  = '1B3A5C';
const BLUE  = '2E75B6';
const LIGHT = 'D5E8F0';
const AMBER = 'FFF3CD';
const GREEN = 'D4EDDA';
const RED   = 'F8D7DA';
const WHITE = 'FFFFFF';
const DGRAY = '666666';
const MGRAY = 'F5F5F5';

// ── Helpers ───────────────────────────────────────────────────────────────────
const b  = (text, opts = {}) => new TextRun({ text, bold: true, ...opts });
const t  = (text, opts = {}) => new TextRun({ text, ...opts });
const p  = (children, opts = {}) => new Paragraph({ children: Array.isArray(children) ? children : [t(children)], ...opts });

const pageBreak = () => new Paragraph({ children: [new PageBreak()] });
const spacer    = (before = 120, after = 120) => p('', { spacing: { before, after } });

const h1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  children: [new TextRun({ text, bold: true, color: NAVY })],
  spacing: { before: 360, after: 180 },
});
const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  children: [new TextRun({ text, bold: true, color: BLUE })],
  spacing: { before: 240, after: 120 },
});
const h3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  children: [new TextRun({ text, bold: true })],
  spacing: { before: 180, after: 80 },
});

const bullet = (runs, level = 0) => new Paragraph({
  numbering: { reference: 'bullets', level },
  children: Array.isArray(runs) ? runs : [t(runs)],
});
const num = (runs) => new Paragraph({
  numbering: { reference: 'numbers', level: 0 },
  children: Array.isArray(runs) ? runs : [t(runs)],
});

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders    = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const margins    = { top: 80, bottom: 80, left: 120, right: 120 };

const hdrCell = (text, fill = NAVY, width = 2340) => new TableCell({
  borders, margins,
  width: { size: width, type: WidthType.DXA },
  shading: { fill, type: ShadingType.CLEAR },
  verticalAlign: VerticalAlign.CENTER,
  children: [p([b(text, { color: WHITE, size: 20 })])],
});

const dataCell = (children, fill = WHITE, width = 2340) => new TableCell({
  borders, margins,
  width: { size: width, type: WidthType.DXA },
  shading: { fill, type: ShadingType.CLEAR },
  children: [p(Array.isArray(children) ? children : [t(children, { size: 20 })])],
});

const callout = (fill, labelRun, bodyLines) => new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [9360],
  rows: [new TableRow({ children: [new TableCell({
    borders,
    margins: { top: 120, bottom: 120, left: 180, right: 180 },
    width: { size: 9360, type: WidthType.DXA },
    shading: { fill, type: ShadingType.CLEAR },
    children: [
      p([labelRun]),
      ...bodyLines.map(line => p([t(line, { size: 20 })])),
    ],
  })] })],
});

// Shot card: coloured header with shot# and title, then details rows
const shotCard = (number, title, url, navSteps, capture, filename, tip = '') => {
  const hColor = NAVY;
  const rows = [
    // Header row
    new TableRow({ children: [
      new TableCell({
        borders,
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        width: { size: 9360, type: WidthType.DXA },
        shading: { fill: hColor, type: ShadingType.CLEAR },
        columnSpan: 1,
        children: [p([
          b(`SHOT ${String(number).padStart(2,'0')}  `, { color: 'BDD7EE', size: 20 }),
          b(title, { color: WHITE, size: 22 }),
        ])],
      }),
    ]}),
    // URL row
    new TableRow({ children: [
      new TableCell({
        borders, margins,
        width: { size: 9360, type: WidthType.DXA },
        shading: { fill: MGRAY, type: ShadingType.CLEAR },
        children: [p([b('URL:  ', { size: 20 }), t(url, { size: 20, font: 'Courier New' })])],
      }),
    ]}),
    // Nav steps
    new TableRow({ children: [
      new TableCell({
        borders, margins: { top: 100, bottom: 100, left: 180, right: 180 },
        width: { size: 9360, type: WidthType.DXA },
        shading: { fill: WHITE, type: ShadingType.CLEAR },
        children: [
          p([b('Steps to reach this state:', { size: 20 })]),
          ...navSteps.map((s, i) => new Paragraph({
            numbering: { reference: 'numbers', level: 0 },
            children: [t(s, { size: 20 })],
          })),
        ],
      }),
    ]}),
    // What to capture
    new TableRow({ children: [
      new TableCell({
        borders, margins: { top: 100, bottom: 100, left: 180, right: 180 },
        width: { size: 9360, type: WidthType.DXA },
        shading: { fill: LIGHT, type: ShadingType.CLEAR },
        children: [
          p([b('What to capture in the screenshot:', { size: 20 })]),
          ...capture.map(c => new Paragraph({
            numbering: { reference: 'bullets', level: 0 },
            children: [t(c, { size: 20 })],
          })),
        ],
      }),
    ]}),
    // Filename + tip
    new TableRow({ children: [
      new TableCell({
        borders, margins,
        width: { size: 9360, type: WidthType.DXA },
        shading: { fill: tip ? AMBER : GREEN, type: ShadingType.CLEAR },
        children: [
          p([b('Save as:  ', { size: 20 }), t(filename, { size: 20, font: 'Courier New' })]),
          ...(tip ? [p([b('Tip:  ', { size: 18 }), t(tip, { size: 18, italics: true })])] : []),
        ],
      }),
    ]}),
  ];

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows,
  });
};

// ── Document ──────────────────────────────────────────────────────────────────
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
    default: { document: { run: { font: 'Arial', size: 22 } } },
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
    // ── Cover ───────────────────────────────────────────────────────────────
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
      },
      children: [
        spacer(2000),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'BCA.AI', bold: true, size: 72, color: NAVY, font: 'Arial' })],
          spacing: { before: 0, after: 120 },
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'NotebookLM Video — Screenshot Capture Guide', size: 36, color: BLUE, font: 'Arial' })],
          spacing: { before: 0, after: 480 },
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 4 } },
          children: [new TextRun({ text: '24 screenshots  |  6 phases  |  AAFES Exchange Card Demo', bold: true, size: 26 })],
          spacing: { before: 240, after: 240 },
        }),
        spacer(240),
        callout(LIGHT,
          b('Before you start — 4 things to do:', { size: 22 }),
          [
            '1.  Start the BCA.AI backend:  cd /Users/njose/Documents/App/BCA/bca-ai-backend  &&  node index.js',
            '2.  Open Chrome and navigate to:  http://localhost:3001/conversational-intake?demo=true',
            '3.  Set your browser window to exactly 1440 x 900 px  (use DevTools or a resize extension)',
            '4.  Use  Cmd+Shift+4  (Mac) or  Win+Shift+S  (Windows) for partial-screen captures',
          ]
        ),
        spacer(480),
        // Summary table
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [700, 4200, 1800, 2660],
          rows: [
            new TableRow({ children: [
              hdrCell('Shots', NAVY, 700),
              hdrCell('Section', NAVY, 4200),
              hdrCell('Time to setup', NAVY, 1800),
              hdrCell('Difficulty', NAVY, 2660),
            ]}),
            ...[
              ['01–08', 'Conversational Intake — 8 key questions', '5 min (use demo mode)', 'Easy'],
              ['09',    'Phase 1 — AI Solution Analysis (overview)', '3 min (wait for AI)', 'Easy'],
              ['10',    'Phase 1 — Requirements tab', '0 min (already loaded)', 'Easy'],
              ['11',    'Phase 1.5 — Cost Estimation', '1 min (run phase)', 'Easy'],
              ['12',    'Phase 1.6 — Vendor Analysis', '1 min (run phase)', 'Easy'],
              ['13',    'Phase 1-Reflection — Quality Score', '1 min (run phase)', 'Easy'],
              ['14–15', 'Phase 2 — Financial Modeling (2 shots)', '1 min (run phase)', 'Easy'],
              ['16–17', 'Phase 3 — Traceability + Timeline (2 shots)', '1 min (run phase)', 'Easy'],
              ['18–19', 'Phase 4 — Ranking + Recommendation (2 shots)', '1 min (run phase)', 'Easy'],
              ['20–21', 'Phase 5 — Executive Report (2 shots)', '1 min (run phase)', 'Easy'],
              ['22–24', 'Phase 6 — BRD Generation + Download (3 shots)', '6 min (2 AI calls)', 'Medium'],
            ].map(([shots, section, time, diff]) => new TableRow({ children: [
              dataCell(shots, LIGHT, 700),
              dataCell(section, WHITE, 4200),
              dataCell(time, WHITE, 1800),
              dataCell(diff, diff === 'Medium' ? AMBER : WHITE, 2660),
            ]})),
          ],
        }),
        spacer(600),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'Estimated total time: 20-30 minutes end-to-end', size: 22, italics: true, color: DGRAY })],
        }),
        pageBreak(),
      ],
    },
    // ── Main content ─────────────────────────────────────────────────────────
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
      },
      headers: {
        default: new Header({ children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 4 } },
          children: [
            new TextRun({ text: 'BCA.AI  —  Screenshot Capture Guide  |  NotebookLM Video Prep', bold: true, font: 'Arial', size: 18, color: NAVY }),
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

        // ── SETUP ────────────────────────────────────────────────────────────
        h1('Setup — Before Capturing Any Screenshots'),
        callout(GREEN,
          b('One-time setup (do this first):', { size: 22 }),
          [
            'Terminal:  node index.js   (from /Users/njose/Documents/App/BCA/bca-ai-backend)',
            'Chrome:    Verify you see a page at http://localhost:3001/conversational-intake',
            'Window:    Set Chrome to exactly 1440 x 900 px for consistent sizing',
            'Zoom:      Set Chrome zoom to 100%  (Cmd+0)',
            'DevTools:  Close DevTools panel if open — you want clean screenshots',
          ]
        ),
        spacer(120),
        callout(AMBER,
          b('Demo mode — the fastest way to fill all 14 questions:', { size: 22 }),
          [
            'Add ?demo=true to the URL:  http://localhost:3001/conversational-intake?demo=true',
            'Click the "Demo Mode" button that appears at the top of the page',
            'Watch all 14 questions auto-fill with AAFES Exchange Card data',
            'You can pause at any question by clicking "Pause Demo" — useful for mid-question screenshots',
            'After demo completes, each question shows its filled state ready to screenshot',
          ]
        ),
        spacer(180),

        // ── SECTION 1: Intake ────────────────────────────────────────────────
        h1('Section 1 — Conversational Intake (Shots 01–08)'),
        p('Run demo mode first. After all 14 questions are filled, navigate back to each question using the breadcrumb trail to capture the specific state described below.'),
        spacer(120),

        shotCard(1, 'Intake — Welcome / Q1 Project Identity',
          'http://localhost:3001/conversational-intake?demo=true',
          [
            'Navigate to the URL above — the intake form loads at Q1',
            'If demo mode has already run, click the step indicator "1" in the breadcrumb to go back to Q1',
            'You should see: project title "Exchange Card Modernization Initiative", role "IT Director", business unit "HQ IT — Payment Systems", industry "government-retail" selected',
          ],
          [
            'The full page from top header to the Q1 question card',
            'All 4 fields filled with AAFES data',
            'The navy header with BCA.AI logo',
            'The step progress indicator showing step 1 of 14',
          ],
          '01_intake_q1_project_identity.png',
          'If fields are blank, click "Fill Demo" or use ?demo=true URL parameter.'
        ),
        spacer(120),

        shotCard(2, 'Intake — Q2 Pain Points (Symptom Cards)',
          'http://localhost:3001/conversational-intake?demo=true',
          [
            'Navigate to Q2 using the breadcrumb / step indicator',
            '3 symptom cards should be highlighted/selected: "Legacy payment infrastructure", "Inventory visibility gaps", "No omnichannel integration"',
            'If not selected, demo mode should have pre-selected them',
          ],
          [
            'The symptom card grid — show all 15 cards',
            'Clearly visible: 3 selected cards (highlighted in blue/navy) vs unselected',
            'The "Guide Me" button at the top of the question (shows it exists even if panel is closed)',
          ],
          '02_intake_q2_symptom_cards.png',
          'Scroll up so the full card grid is visible. Capture at least 2 rows of cards plus the question title.'
        ),
        spacer(120),

        shotCard(3, 'Intake — Q4 Narrative with Prompt Scaffold',
          'http://localhost:3001/conversational-intake?demo=true',
          [
            'Navigate to Q4 (Tell me more about the problem)',
            'The textarea should be filled with the AAFES narrative about Military Star card',
            'Click the "Guide Me" button to open the guide panel — leave it open for the screenshot',
            'The 6 sentence-starter chips ("Our current system fails when...", etc.) should be visible above the textarea',
          ],
          [
            'The expanded Guide Me panel at the top (navy background, example text)',
            'The 6 prompt scaffold chips in a row (dashed border chips)',
            'The filled textarea with the AAFES narrative (Military Star card, 23% OCONUS decline)',
            'All three elements in one frame if possible — scroll to frame them',
          ],
          '03_intake_q4_narrative_scaffold.png',
          'This is one of the richest UI screenshots. Show the guide panel AND the scaffold chips AND the filled textarea all in one frame.'
        ),
        spacer(120),

        shotCard(4, 'Intake — Q6 KPI Tiles with Descriptions',
          'http://localhost:3001/conversational-intake?demo=true',
          [
            'Navigate to Q6 (Key Performance Indicators)',
            '4 KPI tiles should be selected: Transaction Approval Rate, Customer Satisfaction, System Uptime, Processing Speed',
            'Each selected tile shows its description text and a target value input',
            'Ensure the "How to use this section" callout header is visible at the top',
          ],
          [
            'The "How to use this section" amber callout at the top',
            'At least 4 selected KPI tiles showing their descriptions',
            'The target value fields filled in (99.5%, 4.5/5, 99.9%, 2 seconds)',
            'The tile grid showing both selected and unselected tiles for contrast',
          ],
          '04_intake_q6_kpi_tiles.png',
          'KPI tiles are card-style with descriptions. Make sure the target value fields are visible — these are key for the demo.'
        ),
        spacer(120),

        shotCard(5, 'Intake — Q7 Alternatives + Cost-of-Inaction Calculator',
          'http://localhost:3001/conversational-intake?demo=true',
          [
            'Navigate to Q7 (alternatives)',
            'All 5 alternatives should be selected (multi-select); Alternative 1 should show the ★ PREFERRED marker',
            'Click "Open Cost-of-Inaction Calculator" on the Status Quo card (Alternative 0) to expand it',
            'The 5 COI input fields should be visible with values: 150 incidents, $8,000/incident, $500K compliance, $300K revenue, $180K staff, $50K CX — and the total showing $2,230,000',
          ],
          [
            'The Status Quo card with the COI calculator expanded and showing $2,230,000 total',
            'Alternative 1 card with the ★ PREFERRED badge visible',
            'Multiple alternatives visibly selected (blue/checked state)',
            'The "Use This Total" button on the calculator',
          ],
          '05_intake_q7_alternatives_coi.png',
          'This may require two screenshots if the page is long: one for the COI calculator on Status Quo, one for the preferred alternative card. Name them 05a and 05b if needed.'
        ),
        spacer(120),

        shotCard(6, 'Intake — Q8 Stakeholders (Grouped Chips)',
          'http://localhost:3001/conversational-intake?demo=true',
          [
            'Navigate to Q8 (Who else is affected?)',
            'Multiple stakeholder chips should be selected: CIO, CFO, HQ IT Payment Systems, Military Star/ECP, DFAS, DCMA',
            'The chips are organized into 5 labeled groups: HQ Leadership, HQ Directorates, Business Divisions, Regional Commands, External Oversight',
          ],
          [
            'All 5 group labels with their chip sections visible',
            'Selected chips clearly highlighted vs unselected',
            'The group structure — this shows the AAFES-specific org knowledge built into the platform',
            'Scroll to show at least 3 groups in one frame',
          ],
          '06_intake_q8_stakeholders.png',
          'The group structure is the key story here — capture enough to show the AAFES-specific grouping (HQ Leadership, Directorates, Business Divisions, Regional Commands, External Oversight).'
        ),
        spacer(120),

        shotCard(7, 'Intake — Q11 Financials with Help Icons',
          'http://localhost:3001/conversational-intake?demo=true',
          [
            'Navigate to Q11 (Financials)',
            'All 6 fields should be filled: $4,200,000 budget, 250 headcount, $9,500,000,000 revenue, 5 years, 8% discount rate, High urgency',
            'Click the (i) help icon next to the "Discount Rate" field to show its tooltip panel',
            'The tooltip should say something about the 8% DoD NAF standard',
          ],
          [
            'All 6 fields filled with AAFES financial data',
            'The discount rate field help tooltip expanded and visible',
            'The (i) icons visible on all field labels',
            'The "8% (DoD NAF standard)" option selected in the dropdown',
          ],
          '07_intake_q11_financials.png',
          'Open exactly ONE help tooltip (discount rate is the best one — it explains the DoD NAF standard) while all other fields remain visible.'
        ),
        spacer(120),

        shotCard(8, 'Intake — Q14 Confirmation Screen',
          'http://localhost:3001/conversational-intake?demo=true',
          [
            'Navigate to Q14 (Confirm Your Understanding)',
            'The confirmation screen shows a summary of all 13 previous answers',
            'You should see: project name, all pain points, KPIs, alternatives, financials, compliance flags',
            'The "Launch BCA.AI Analysis" button should be prominently visible',
          ],
          [
            'The full summary confirmation card',
            'The "Launch BCA.AI Analysis" button (this is the call-to-action)',
            'All key data points visible: project name, KPIs, budget, alternatives count',
            'The overall progress indicator showing 14/14 complete',
          ],
          '08_intake_q14_confirmation.png',
          'This is the final intake step before AI analysis begins. It\'s a powerful "moment of launch" screenshot for the NotebookLM narrative.'
        ),
        spacer(180),
        pageBreak(),

        // ── SECTION 2: Phase 1 ───────────────────────────────────────────────
        h1('Section 2 — Phase 1: AI Solution Analysis (Shots 09–10)'),
        callout(AMBER,
          b('Important: Phase 1 requires the AI API call to complete first.', { size: 20 }),
          [
            'After clicking "Launch BCA.AI Analysis" on the confirmation screen (Q14),',
            'the viewer page loads and Phase 1 begins running automatically.',
            'Wait for the loading spinner to disappear and Phase 1 results to render.',
            'This takes approximately 15-30 seconds depending on Anthropic API latency.',
            'URL after Phase 1: http://localhost:3001/phase1-viewer.html  (or wherever the viewer is served)',
          ]
        ),
        spacer(120),

        shotCard(9, 'Phase 1 — Solutions Overview',
          'http://localhost:3001/phase1-viewer.html',
          [
            'Phase 1 should already be complete after the intake form launched it',
            'You are on the Phase 1 tab of the results viewer',
            'Scroll to see the solutions list: 5 solution cards each with name, description, benefits, risk level, and AI confidence score',
          ],
          [
            'The Phase 1 tab header with "AI Solution Analysis" title',
            'At least 2-3 solution cards fully visible showing: solution name, brief description, benefit bullets, risk level badge (Low/Medium/High), AI confidence percentage',
            'The preferred solution (Military Star Card Platform Overhaul) card highlighted or marked',
          ],
          '09_phase1_solutions_overview.png',
          'Scroll to position the view so you see the first 2 solution cards fully. The key story: AI generated 5 investment-grade solutions from the intake answers.'
        ),
        spacer(120),

        shotCard(10, 'Phase 1 — Requirements (REQ-001 to REQ-005)',
          'http://localhost:3001/phase1-viewer.html',
          [
            'Still on Phase 1 results, click the "Requirements" sub-tab or scroll down to the requirements section',
            'You should see REQ-001 through REQ-005, each with: ID, title, priority (Must Have / Should Have / Nice to Have), category, and linked solutions',
          ],
          [
            'The requirements list/table showing all 5 requirements',
            'Priority badges clearly visible (Must Have in red/orange, Should Have in yellow)',
            'At least REQ-001 and REQ-002 with their full descriptions visible',
          ],
          '10_phase1_requirements.png',
          'The requirements have IDs like REQ-001, REQ-002. These are the structured, traceable requirements the AI generated — key proof of investment-grade output.'
        ),
        spacer(120),

        shotCard(11, 'Phase 1.5 — Cost Estimation',
          'http://localhost:3001/phase1-viewer.html',
          [
            'Click the "Phase 1.5" tab or "Cost Estimation" tab in the results viewer',
            'If Phase 1.5 hasn\'t run yet, click the "Run Phase 1.5" button and wait ~15 seconds',
            'You should see a cost breakdown table for each solution: implementation cost, annual operating cost, timeline estimate',
          ],
          [
            'The Phase 1.5 tab or section header',
            'Cost table with all 5 solutions and their estimated costs',
            'Implementation vs operating cost columns',
            'Timeline estimates per solution (months)',
          ],
          '11_phase1_5_cost_estimation.png',
          'Look for the preferred solution (Military Star Platform Overhaul) row — it should show ~$4.2M implementation cost, confirming alignment with what the user entered.'
        ),
        spacer(120),

        shotCard(12, 'Phase 1.6 — Vendor Analysis',
          'http://localhost:3001/phase1-viewer.html',
          [
            'Click the "Phase 1.6" or "Vendor Analysis" tab',
            'Run Phase 1.6 if needed — click the run button and wait ~20 seconds',
            'You should see 3 vendors per solution with scoring columns: compatibility, price, compliance, support, references',
          ],
          [
            'Vendor scoring table for at least one solution',
            'All 5 scoring dimensions visible with scores',
            'Vendor names, composite score, recommendation indicator',
            'The "Top Vendor" badge or similar recommendation marker',
          ],
          '12_phase1_6_vendor_analysis.png',
          'Scroll to the preferred solution\'s vendors. For Military Star Platform Overhaul, you might see vendors like Fiserv, FIS, or Visa as top scorers on payment platform compliance.'
        ),
        spacer(120),

        shotCard(13, 'Phase 1-Reflection — Quality Score',
          'http://localhost:3001/phase1-viewer.html',
          [
            'Click the "Reflection" or "Quality Score" tab',
            'Run Phase 1-Reflection if needed',
            'You should see overall quality score (0-100), per-section scores, and any flags or improvement notes from the AI reviewer',
          ],
          [
            'The overall quality score prominently displayed (number + gauge/bar)',
            'Per-section scores: Solutions Quality, Requirements Quality, Vendor Analysis Quality',
            'Any flagged items or suggestions the AI identified',
            'The "Reviewed by AI" or reflection badge',
          ],
          '13_phase1_reflection_quality.png',
          'The reflection score is a unique feature — AI reviewing its own output. Aim for a frame where the overall score is clearly readable.'
        ),
        spacer(180),
        pageBreak(),

        // ── SECTION 3: Phase 2 ───────────────────────────────────────────────
        h1('Section 3 — Phase 2: Financial Modeling (Shots 14–15)'),
        p('Phase 2 is pure JavaScript — it runs instantly when you click "Run Phase 2". No AI call needed.'),
        spacer(120),

        shotCard(14, 'Phase 2 — NPV / IRR / ROI Summary Table',
          'http://localhost:3001/phase1-viewer.html  →  Phase 2 tab',
          [
            'Click the "Phase 2" tab in the results viewer',
            'Click "Run Phase 2" if it hasn\'t run yet — it completes in under 1 second',
            'Locate the main financial comparison table showing all 5 alternatives',
          ],
          [
            'The financial comparison table with columns: Alternative, NPV, IRR, ROI%, Payback Period, 3-Year Benefit',
            'Status Quo row showing negative NPV (cost of inaction)',
            'Preferred solution row (Military Star Platform Overhaul) showing highest NPV and strong IRR',
            'Portfolio summary row at the bottom if visible',
          ],
          '14_phase2_financial_table.png',
          'The key story: the AI-generated solutions show positive NPV against the Status Quo\'s negative NPV (cost of inaction). This is the financial heart of the business case.'
        ),
        spacer(120),

        shotCard(15, 'Phase 2 — Break-Even / Cash Flow Chart',
          'http://localhost:3001/phase1-viewer.html  →  Phase 2 tab',
          [
            'Still on Phase 2, scroll down to the break-even analysis or cash flow chart section',
            'This shows cumulative cash flow over 5 years per solution',
            'The preferred solution line should cross zero (break-even) around month 28',
          ],
          [
            'The break-even chart or cumulative cash flow visualization',
            'Multiple solution lines visible for comparison',
            'The break-even point clearly indicated (where lines cross zero)',
            'The 5-year time axis and dollar axis labels',
          ],
          '15_phase2_breakeven_chart.png',
          'If Phase 2 renders a table instead of a chart for break-even, capture the break-even analysis rows with the payback period highlighted.'
        ),
        spacer(180),
        pageBreak(),

        // ── SECTION 4: Phase 3 ───────────────────────────────────────────────
        h1('Section 4 — Phase 3: Traceability & Timeline (Shots 16–17)'),
        p('Phase 3 is pure JavaScript — runs instantly. Shows the connections between KPIs, solutions, and requirements, plus the implementation roadmap.'),
        spacer(120),

        shotCard(16, 'Phase 3 — Traceability Matrix',
          'http://localhost:3001/phase1-viewer.html  →  Phase 3 tab',
          [
            'Click the "Phase 3" tab and run it if needed (instant)',
            'Navigate to the Traceability Matrix section (usually the first section of Phase 3)',
            'The matrix shows: KPIs in rows, Solutions/Requirements in columns, with checkmarks or scores showing connections',
          ],
          [
            'The full traceability matrix — KPIs on left, solutions across top',
            'Checkmarks or scores showing which solutions address which KPIs',
            'KPI names visible: Transaction Approval Rate, Customer Satisfaction, System Uptime, Processing Speed',
            'The color coding or score values in each cell',
          ],
          '16_phase3_traceability_matrix.png',
          'Scroll/zoom so the full matrix is visible. This shows the analytical rigor — every KPI is traced to specific solutions and requirements.'
        ),
        spacer(120),

        shotCard(17, 'Phase 3 — Implementation Timeline / Gantt',
          'http://localhost:3001/phase1-viewer.html  →  Phase 3 tab',
          [
            'Still on Phase 3, scroll to the Implementation Timeline section',
            'You should see a 4-phase timeline: Foundation (months 1-4), Pilot (months 5-8), OCONUS Rollout (months 9-14), Optimization (months 15-18)',
            'Key milestones should be visible on the timeline',
          ],
          [
            'The 4-phase timeline bar chart or Gantt-style visualization',
            'Phase labels: Foundation & Vendor Selection, Pilot Deployment CONUS, OCONUS Rollout, Optimization & Go-Live',
            'Month markers on the horizontal axis',
            'Key milestone indicators (vendor selection, pilot launch, full deployment)',
          ],
          '17_phase3_timeline.png',
          'The 12-18 month timeline is a key deliverable of the business case. Make sure the full timeline fits in one frame horizontally.'
        ),
        spacer(180),
        pageBreak(),

        // ── SECTION 5: Phase 4 ───────────────────────────────────────────────
        h1('Section 5 — Phase 4: Ranking & Recommendation (Shots 18–19)'),
        p('Phase 4 applies weighted multi-criteria scoring across all alternatives. Pure JavaScript, instant results.'),
        spacer(120),

        shotCard(18, 'Phase 4 — Ranked Alternatives Table',
          'http://localhost:3001/phase1-viewer.html  →  Phase 4 tab',
          [
            'Click "Phase 4" tab and run it (instant)',
            'The main view shows all alternatives ranked by composite score',
            'Scoring dimensions: Financial (30%), Strategic Fit (25%), Risk (20%), Implementation (15%), Compliance (10%)',
          ],
          [
            'The ranked alternatives table showing all 5 alternatives in order',
            'Composite score for each (out of 100) — Military Star Platform Overhaul should be highest (~87)',
            'Individual dimension scores visible (Financial, Strategic, Risk, Implementation, Compliance)',
            'The #1 rank / recommended badge on the top alternative',
          ],
          '18_phase4_ranking_table.png',
          'The scoring weights and composite scores are the analytical story. Make sure the scoring dimension columns are visible.'
        ),
        spacer(120),

        shotCard(19, 'Phase 4 — Recommendation Narrative',
          'http://localhost:3001/phase1-viewer.html  →  Phase 4 tab',
          [
            'Still on Phase 4, scroll to the recommendation narrative section below the table',
            'This is a paragraph of text explaining why the top-ranked solution is recommended',
            'It should reference: the score, the financial metrics, the compliance advantages, and the urgency',
          ],
          [
            'The recommendation narrative text block (the full paragraph)',
            'The "Recommended Solution" header or badge',
            'The confidence level indicator (High / Medium / Low confidence)',
            'Any risk caveat or conditions noted in the recommendation',
          ],
          '19_phase4_recommendation.png',
          'The recommendation narrative is written by the JS engine using the Phase 1 + Phase 2 + Phase 3 data. It is the "conclusion" of the analysis — a key screenshot for NotebookLM.'
        ),
        spacer(180),
        pageBreak(),

        // ── SECTION 6: Phase 5 ───────────────────────────────────────────────
        h1('Section 6 — Phase 5: Executive Report (Shots 20–21)'),
        p('Phase 5 generates a full branded HTML report. Instant JavaScript. Best captured in print preview mode for clean presentation.'),
        spacer(120),

        shotCard(20, 'Phase 5 — Executive Report Header / Cover',
          'http://localhost:3001/phase1-viewer.html  →  Phase 5 tab',
          [
            'Click "Phase 5" and run it (instant)',
            'The report renders as a styled HTML document inside the viewer pane',
            'Scroll to the top of the report — you should see the report header: BCA.AI logo, project title, date, business unit',
            'Below that: Executive Summary section with the recommendation highlighted',
          ],
          [
            'The report header: BCA.AI branding, project title "Exchange Card Modernization Initiative"',
            'The Executive Summary section with 2-3 bullet points',
            'The key recommendation callout box (highlighted in blue/green)',
            'The financial headline: Portfolio NPV, IRR, Payback Period',
          ],
          '20_phase5_report_header.png',
          'The Phase 5 report is the "polished" output. Capture from the top of the report so the header and executive summary are both visible.'
        ),
        spacer(120),

        shotCard(21, 'Phase 5 — Alternatives Comparison Section',
          'http://localhost:3001/phase1-viewer.html  →  Phase 5 tab',
          [
            'Still in Phase 5 report, scroll to the "Alternatives Comparison" section',
            'This shows all 5 alternatives in a comparison table or card grid',
            'Each alternative shows: cost, timeline, NPV, risk level, recommendation status',
          ],
          [
            'The alternatives comparison section with all 5 alternatives',
            'The recommended alternative clearly marked (checkmark, star, or green highlight)',
            'Cost and NPV visible for comparison across alternatives',
            'Risk level badges (Low/Medium/High) per alternative',
          ],
          '21_phase5_alternatives_comparison.png',
          'This is the "side-by-side" view that executives need. Make sure all 5 alternatives are visible in one frame.'
        ),
        spacer(180),
        pageBreak(),

        // ── SECTION 7: Phase 6 ───────────────────────────────────────────────
        h1('Section 7 — Phase 6: BRD Generation (Shots 22–24)'),
        callout(AMBER,
          b('Phase 6 uses 2 AI API calls — allow 6-10 seconds for generation.', { size: 20 }),
          [
            'Click "Phase 6" tab, then click "Generate BRD" button.',
            'Loading messages cycle: "Writing executive summary..." → "Expanding requirements..." → "Assembling timeline..." → "Formatting..."',
            'After ~6-10 seconds, 12 section cards render on screen.',
            'Capture the loading state first (Shot 22), then the completed cards (Shot 23), then the download (Shot 24).',
          ]
        ),
        spacer(120),

        shotCard(22, 'Phase 6 — BRD Generation Loading State',
          'http://localhost:3001/phase1-viewer.html  →  Phase 6 tab',
          [
            'Click "Phase 6" tab',
            'Click the "Generate BRD" button immediately',
            'QUICKLY take a screenshot while the loading animation is running',
            'You should see the cycling loading message and a spinner or progress indicator',
          ],
          [
            'The "Generate BRD" button or the loading state that replaces it',
            'The cycling status message (e.g., "Expanding requirements..." or "Assembling timeline...")',
            'The loading spinner or animation',
            'The Phase 6 section header',
          ],
          '22_phase6_brd_loading.png',
          'This is a time-sensitive screenshot — you have ~6 seconds from clicking the button. Have your screenshot shortcut ready before clicking Generate.'
        ),
        spacer(120),

        shotCard(23, 'Phase 6 — 12 BRD Section Cards',
          'http://localhost:3001/phase1-viewer.html  →  Phase 6 tab (after generation)',
          [
            'After BRD generation completes, 12 section cards appear on screen',
            'Each card has: section title, source badge (AI Generated / From Phase Data), edit and rewrite buttons',
            'Scroll to show the first 3-4 cards: Executive Summary, Business Justification, Problem Statement, Project Objectives',
          ],
          [
            'At least 3 section cards fully visible showing the card structure',
            'The source badges: "AI Generated" (blue) and "From Phase Data" (green)',
            'The [Edit] and [AI Rewrite] buttons visible on at least one card',
            'The section titles clearly readable',
            'The "Download .docx" button visible (can be at top or bottom)',
          ],
          '23_phase6_brd_section_cards.png',
          'The source badges (AI Generated vs From Phase Data) tell the cost story — 7 sections are free JS, only 5 use AI. Try to show both badge types in one frame.'
        ),
        spacer(120),

        shotCard(24, 'Phase 6 — Expanded Section + Download Button',
          'http://localhost:3001/phase1-viewer.html  →  Phase 6 tab (after generation)',
          [
            'Click on one of the section cards to expand it — try "Business Justification" (ID 2, AI-generated)',
            'The expanded card shows the full AI-written narrative text',
            'Scroll to show the Download .docx button prominently — this is the final deliverable',
            'Optionally: click [AI Rewrite] on a section to show the instruction input box',
          ],
          [
            'The expanded section card showing the full narrative text (Business Justification or Functional Requirements)',
            'The [Edit] / [AI Rewrite] / [Delete] button bar on the expanded card',
            'The "Download .docx" button (preferably with the project name visible next to it)',
            'The overall section card layout above/below the expanded card',
          ],
          '24_phase6_download_brd.png',
          'The "Download .docx" button is the final money shot — it represents the complete business case in a board-ready Word document. Make it prominent in the frame.'
        ),
        spacer(180),
        pageBreak(),

        // ── File naming convention ────────────────────────────────────────────
        h1('File Naming & Organization'),
        p('Save all screenshots to one folder. Suggested structure:'),
        spacer(60),
        callout(MGRAY,
          b('Suggested folder: ~/Desktop/BCA_AI_Screenshots/', { size: 20, font: 'Courier New' }),
          [
            '01_intake_q1_project_identity.png',
            '02_intake_q2_symptom_cards.png',
            '03_intake_q4_narrative_scaffold.png',
            '04_intake_q6_kpi_tiles.png',
            '05_intake_q7_alternatives_coi.png',
            '06_intake_q8_stakeholders.png',
            '07_intake_q11_financials.png',
            '08_intake_q14_confirmation.png',
            '09_phase1_solutions_overview.png',
            '10_phase1_requirements.png',
            '11_phase1_5_cost_estimation.png',
            '12_phase1_6_vendor_analysis.png',
            '13_phase1_reflection_quality.png',
            '14_phase2_financial_table.png',
            '15_phase2_breakeven_chart.png',
            '16_phase3_traceability_matrix.png',
            '17_phase3_timeline.png',
            '18_phase4_ranking_table.png',
            '19_phase4_recommendation.png',
            '20_phase5_report_header.png',
            '21_phase5_alternatives_comparison.png',
            '22_phase6_brd_loading.png',
            '23_phase6_brd_section_cards.png',
            '24_phase6_download_brd.png',
          ]
        ),
        spacer(120),

        h1('NotebookLM Upload Checklist'),
        p('Once you have all 24 screenshots, upload these 3 files to NotebookLM as Sources:'),
        spacer(60),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [560, 4500, 4300],
          rows: [
            new TableRow({ children: [hdrCell('', NAVY, 560), hdrCell('File', NAVY, 4500), hdrCell('Purpose', NAVY, 4300)] }),
            new TableRow({ children: [
              dataCell('[ ]', LIGHT, 560),
              dataCell('BCA_AI_PRD.docx', WHITE, 4500),
              dataCell('Full platform spec — 10 sections covering all phases and design decisions', WHITE, 4300),
            ]}),
            new TableRow({ children: [
              dataCell('[ ]', LIGHT, 560),
              dataCell('BCA_AI_Complete_Intake_AAFES.docx', WHITE, 4500),
              dataCell('All 14 intake Q&As with AAFES answers — the "what goes in" story', WHITE, 4300),
            ]}),
            new TableRow({ children: [
              dataCell('[ ]', LIGHT, 560),
              dataCell('All 24 screenshots (zip or individual)', WHITE, 4500),
              dataCell('Visual walkthrough of every phase — the "what comes out" story', WHITE, 4300),
            ]}),
          ],
        }),
        spacer(120),
        callout(GREEN,
          b('Suggested NotebookLM video flow:', { size: 22 }),
          [
            '1. Problem (2 min) — Why business cases take months. The cost. The pain.',
            '2. Intake form demo (3 min) — Screenshots 01-08. Show the guided, question-by-question approach.',
            '3. AI analysis (4 min) — Screenshots 09-13. Phase 1 solutions, requirements, vendor scores, quality reflection.',
            '4. Financial outputs (2 min) — Screenshots 14-15. NPV/IRR table, break-even.',
            '5. Traceability + ranking (2 min) — Screenshots 16-19. Matrix, timeline, ranked table, recommendation.',
            '6. Executive report + BRD (3 min) — Screenshots 20-24. Report, BRD cards, download.',
            '7. Wrap (1 min) — Cost ($0.08), time (10 min), output (board-ready Word doc).',
          ]
        ),
        spacer(180),
        p([t('BCA.AI  |  Screenshot Capture Guide  |  NotebookLM Video Prep  |  April 2026', { size: 18, color: DGRAY, italics: true })],
          { alignment: AlignmentType.CENTER }),
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
