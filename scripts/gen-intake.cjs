#!/usr/bin/env node
// BCA_AI_Complete_Intake_AAFES.docx generator
'use strict';
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, HeadingLevel, AlignmentType, BorderStyle, WidthType,
  ShadingType, PageNumber, LevelFormat, PageBreak, VerticalAlign
} = require('docx');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'BCA_AI_Complete_Intake_AAFES.docx');

// ── Design tokens ─────────────────────────────────────────────────────────────
const NAVY  = '1B3A5C';
const BLUE  = '2E75B6';
const LIGHT = 'D5E8F0';
const AMBER = 'FFF3CD';
const GREEN = 'D4EDDA';
const WHITE = 'FFFFFF';
const DGRAY = '666666';
const MGRAY = 'F5F5F5';

// ── Helpers ───────────────────────────────────────────────────────────────────
const b  = (text, opts = {}) => new TextRun({ text, bold: true, ...opts });
const t  = (text, opts = {}) => new TextRun({ text, ...opts });
const p  = (children, opts = {}) => new Paragraph({ children: Array.isArray(children) ? children : [t(children)], ...opts });
const sp = (before = 120, after = 120) => ({ spacing: { before, after } });

const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

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

const bullet = (text) => new Paragraph({
  numbering: { reference: 'bullets', level: 0 },
  children: [t(text)],
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

const dataCell = (text, fill = WHITE, width = 2340, bold = false, wrap = true) => new TableCell({
  borders, margins,
  width: { size: width, type: WidthType.DXA },
  shading: { fill, type: ShadingType.CLEAR },
  children: [p(bold ? [b(text, { size: 20 })] : [t(text, { size: 20 })])],
});

// Q&A card — question in navy header, answer in light body
const qaCard = (qNum, qTitle, questionText, answerLines, notes = '') => {
  const rows = [
    new TableRow({ children: [
      new TableCell({
        borders, margins: { top: 120, bottom: 120, left: 180, right: 180 },
        width: { size: 9360, type: WidthType.DXA },
        columnSpan: 1,
        shading: { fill: NAVY, type: ShadingType.CLEAR },
        children: [
          p([b(`${qNum}  |  ${qTitle}`, { color: WHITE, size: 22 })]),
          p([t(questionText, { color: 'BDD7EE', size: 20, italics: true })]),
        ],
      }),
    ]}),
    new TableRow({ children: [
      new TableCell({
        borders, margins: { top: 120, bottom: 120, left: 180, right: 180 },
        width: { size: 9360, type: WidthType.DXA },
        shading: { fill: LIGHT, type: ShadingType.CLEAR },
        children: answerLines.map(line =>
          line.startsWith('•') ? new Paragraph({
            numbering: { reference: 'bullets', level: 0 },
            children: [t(line.replace(/^•\s*/, ''), { size: 21 })],
          }) :
          line.startsWith('★') ? p([b(line, { color: BLUE, size: 21 })]) :
          p([t(line, { size: 21 })]),
        ),
      }),
    ]}),
    ...(notes ? [new TableRow({ children: [
      new TableCell({
        borders, margins: { top: 80, bottom: 80, left: 180, right: 180 },
        width: { size: 9360, type: WidthType.DXA },
        shading: { fill: AMBER, type: ShadingType.CLEAR },
        children: [p([b('Note: ', { size: 18 }), t(notes, { size: 18, italics: true })])],
      }),
    ]})] : []),
  ];

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows,
  });
};

const spacer = () => p('', { spacing: { before: 120, after: 120 } });

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
        p('', { spacing: { before: 1800 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'BCA.AI', bold: true, size: 72, color: NAVY, font: 'Arial' })],
          spacing: { before: 0, after: 120 },
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'Complete Conversational Intake Session', size: 36, color: BLUE, font: 'Arial' })],
          spacing: { before: 0, after: 120 },
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 4 } },
          children: [new TextRun({ text: 'AAFES — Exchange Card Modernization Initiative', bold: true, size: 30, font: 'Arial' })],
          spacing: { before: 120, after: 240 },
        }),
        p('', { spacing: { before: 120 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'All 14 Questions  |  Complete AAFES Answers  |  Ready for Phase 1 Analysis', size: 22, color: DGRAY, font: 'Arial' })],
        }),
        p('', { spacing: { before: 480 } }),
        new Table({
          width: { size: 6000, type: WidthType.DXA },
          columnWidths: [2400, 3600],
          rows: [
            new TableRow({ children: [
              new TableCell({ borders, margins, width: { size: 2400, type: WidthType.DXA },
                shading: { fill: NAVY, type: ShadingType.CLEAR },
                children: [p([b('Organization', { color: WHITE, size: 20 })])] }),
              new TableCell({ borders, margins, width: { size: 3600, type: WidthType.DXA },
                children: [p([t('Army & Air Force Exchange Service (AAFES)', { size: 20 })])] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders, margins, width: { size: 2400, type: WidthType.DXA },
                shading: { fill: NAVY, type: ShadingType.CLEAR },
                children: [p([b('Initiative', { color: WHITE, size: 20 })])] }),
              new TableCell({ borders, margins, width: { size: 3600, type: WidthType.DXA },
                children: [p([t('Exchange Card Modernization', { size: 20 })])] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders, margins, width: { size: 2400, type: WidthType.DXA },
                shading: { fill: NAVY, type: ShadingType.CLEAR },
                children: [p([b('Submitted By', { color: WHITE, size: 20 })])] }),
              new TableCell({ borders, margins, width: { size: 3600, type: WidthType.DXA },
                children: [p([t('IT Director, HQ IT — Payment Systems', { size: 20 })])] }),
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
                children: [p([b('Industry Profile', { color: WHITE, size: 20 })])] }),
              new TableCell({ borders, margins, width: { size: 3600, type: WidthType.DXA },
                children: [p([t('Government-Retail (AAFES)', { size: 20 })])] }),
            ]}),
          ],
        }),
        p('', { spacing: { before: 600 } }),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [9360],
          rows: [new TableRow({ children: [new TableCell({
            borders,
            margins: { top: 120, bottom: 120, left: 180, right: 180 },
            width: { size: 9360, type: WidthType.DXA },
            shading: { fill: GREEN, type: ShadingType.CLEAR },
            children: [
              p([b('What is this document?', { size: 22 })]),
              p('This document captures the complete 14-question intake session as submitted through the BCA.AI Conversational Intake Form. It represents the full set of inputs that drive all six analysis phases — from AI solution generation through financial modeling, traceability, ranking, executive reporting, and Business Requirements Document generation.', { spacing: { before: 60 } }),
              p('Use this document as a reference for: understanding the analysis inputs, preparing for NotebookLM video demonstrations, and onboarding new users to the platform.', { spacing: { before: 60 } }),
            ],
          })] })],
        }),
        pageBreak(),
      ],
    },
    // ── Q&A Content ─────────────────────────────────────────────────────────
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
      },
      headers: {
        default: new Header({ children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 4 } },
          children: [
            new TextRun({ text: 'BCA.AI  —  Complete Intake Session  |  AAFES Exchange Card Modernization', bold: true, font: 'Arial', size: 18, color: NAVY }),
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
        h1('Complete Intake Session — All 14 Questions'),
        p('The following pages present each of the 14 intake questions exactly as answered in the AAFES Exchange Card Modernization scenario. Each card shows the question prompt, the selected or typed response, and analyst notes where relevant.'),
        p('', sp(120)),

        // Q1
        qaCard('Q1', 'Project Identity',
          'What is the name of your initiative, and who are you?',
          [
            'Project Title:  Exchange Card Modernization Initiative',
            'Your Role:  IT Director',
            'Business Unit:  HQ IT — Payment Systems',
            'Industry:  Government-Retail (AAFES)',
          ],
          'Industry selection automatically activates AAFES-specific content across all subsequent questions.'
        ),
        spacer(),

        // Q2
        qaCard('Q2', 'What is causing the pain?',
          'Select the symptoms that best describe your current situation.',
          [
            '• Legacy payment infrastructure (selected)',
            '• Inventory visibility gaps (selected)',
            '• No omnichannel integration (selected)',
          ],
          'Users can select multiple symptom cards. The 15 available government-retail cards cover OCONUS connectivity, vendor contract risk, reporting gaps, security vulnerabilities, and more.'
        ),
        spacer(),

        // Q3
        qaCard('Q3', 'Where are you today?',
          'Which description best matches your current state?',
          [
            'Selected: Manual/semi-automated processes',
            '',
            'The four options are:',
            '• Fully manual — no automation at all',
            '• Manual/semi-automated processes  [SELECTED]',
            '• Partially integrated systems with gaps',
            '• Modern systems needing enhancement',
          ]
        ),
        spacer(),
        pageBreak(),

        // Q4
        qaCard('Q4', 'Tell me more about the problem',
          'Describe the problem in your own words. Use the sentence-starter chips if you need help getting started.',
          [
            'Our Military Star card payment system is running on infrastructure from 2008. During the last 6 months, we\'ve seen 23% of OCONUS transactions declined due to connectivity issues. This is affecting 14 million military members and their families who depend on us for basic goods and services at fair prices.',
            '',
            'Our current system fails when operating in contested or degraded network environments — exactly the conditions our OCONUS locations face daily. The legacy ECP (Exchange Credit Program) platform cannot process offline transactions, has no mobile payment capability, and lacks real-time fraud detection.',
            '',
            'This impacts the business because Military Star card revenue represents 23% of our total exchange revenue. Every declined transaction is lost sales and a failure of our mission to serve military families.',
            '',
            'The urgency is driven by an upcoming PCI-DSS 4.0 compliance deadline in 12 months. Non-compliance carries a $5,000-$100,000 per month fine plus potential loss of card processing privileges.',
          ],
          'The narrative textarea supports 6 clickable sentence-starter chips ("Our current system fails when...", "This impacts the business because...", etc.) that inject context-appropriate prompts at cursor position.'
        ),
        spacer(),

        // Q5
        qaCard('Q5', 'What have you already tried?',
          'What approaches have you already explored or attempted?',
          [
            '• Vendor demos (attended demonstrations from NCR, Fiserv, and Visa)',
            '• RFI process issued (Request for Information sent to 8 vendors Q3 2025)',
            '• Pilot program (ran 90-day pilot with one vendor at Fort Bliss — limited scope)',
          ],
          '18 chips available for government-retail industry. Selected chips appear highlighted; user can also type free text explaining results of what was tried.'
        ),
        spacer(),
        pageBreak(),

        // Q6
        qaCard('Q6', 'What does success look like? (Key Performance Indicators)',
          'Select the KPIs that matter most for this initiative and set your target values.',
          [
            '★ KPI 1: Transaction Approval Rate',
            '  Description: Percentage of payment attempts that successfully authorize',
            '  Current Baseline: 76% (OCONUS) / 94% (CONUS)',
            '  Target: 99.5%',
            '',
            '★ KPI 2: Customer Satisfaction Score',
            '  Description: Net promoter / CSAT score from post-transaction surveys',
            '  Current Baseline: 3.2 / 5.0',
            '  Target: 4.5 / 5.0',
            '',
            '★ KPI 3: System Uptime',
            '  Description: Platform availability percentage (excluding planned maintenance)',
            '  Current Baseline: 94.2%',
            '  Target: 99.9%',
            '',
            '★ KPI 4: Transaction Processing Speed',
            '  Description: Time from card swipe to authorization response',
            '  Current Baseline: 8.4 seconds average',
            '  Target: Under 2 seconds',
          ],
          '18 KPI tiles available for government-retail, each with a description card. Users set a target value per KPI. This section includes a "How to use this section" callout with guidance on setting realistic SMART targets.'
        ),
        spacer(),

        // Q7
        qaCard('Q7', 'Let\'s map your options',
          'Select or describe the alternatives you are considering. You can select multiple and mark one as preferred.',
          [
            'Alternative 0: Status Quo (Do Nothing)',
            '  Est. Cost: $2,230,000/year (cost of inaction)',
            '  Timeline: Ongoing',
            '  [Cost-of-Inaction Calculator Used]:',
            '    - 150 incidents/yr x $8,000 avg cost = $1,200,000',
            '    - Compliance risk exposure: $500,000',
            '    - Revenue at risk: $300,000',
            '    - Staff workaround cost: $180,000',
            '    - Customer experience impact: $50,000',
            '    = Total annual cost of inaction: $2,230,000',
            '',
            '★ Alternative 1: Military Star Card Platform Overhaul  [PREFERRED]',
            '  Est. Cost: $4,200,000 | Timeline: 12-18 months',
            '  Replace the ECP platform with a modern cloud-native payment infrastructure with offline processing capability for OCONUS locations',
            '',
            'Alternative 2: Hybrid Omnichannel Modernization',
            '  Est. Cost: $2,800,000 | Timeline: 18-24 months',
            '  Integrate existing systems with new middleware layer and add mobile payment capability',
            '',
            'Alternative 3: Cloud-Native Retail Platform',
            '  Est. Cost: $6,500,000 | Timeline: 24-30 months',
            '  Full replacement of POS and payment infrastructure with cloud-native solution',
            '',
            'Alternative 4: AI-Powered Analytics Layer',
            '  Est. Cost: $1,200,000 | Timeline: 6-9 months',
            '  Add AI fraud detection and analytics on top of existing infrastructure without replacing it',
          ],
          'The Status Quo card includes a collapsible Cost-of-Inaction calculator with 5 input fields. The calculated total pre-fills the cost field but remains user-editable. Multiple alternatives can be selected; one can be marked as preferred with the star button.'
        ),
        spacer(),
        pageBreak(),

        // Q8
        qaCard('Q8', 'Who else is affected?',
          'Select all stakeholder groups who have a stake in this initiative.',
          [
            'HQ Leadership:',
            '• Director/General Manager',
            '• Chief Financial Officer (CFO)',
            '• Chief Information Officer (CIO)',
            '• Chief Operating Officer (COO)',
            '',
            'HQ Directorates:',
            '• HQ IT — Exchange Card Program',
            '• HQ IT — Payment Systems',
            '• Finance & Accounting',
            '• Legal & Compliance',
            '• Procurement & Contracting',
            '• Internal Audit',
            '',
            'Business Divisions:',
            '• Main Exchange Operations',
            '• ShopMyExchange.com (eCommerce)',
            '• Military Star / Exchange Credit Program (ECP)',
            '• Franchise Partners (Subway, Burger King, Starbucks)',
            '• AAFES Food Service',
            '',
            'Regional Commands:',
            '• Europe Regional Command (USAREUR)',
            '• Pacific Regional Command (USARPAC)',
            '• CONUS Regional Operations',
            '',
            'External Oversight:',
            '• Defense Finance & Accounting Service (DFAS)',
            '• Defense Contract Management Agency (DCMA)',
            '• Army G-8 (Resource Management)',
            '• DoD Inspector General',
          ],
          '46+ stakeholder chips organized into 5 AAFES-specific groups. Based on actual AAFES organizational structure including all directorates, regional commands, franchise partners, and external oversight bodies.'
        ),
        spacer(),

        // Q9
        qaCard('Q9', 'Compliance & Regulatory Requirements',
          'Select all compliance frameworks or regulations that apply to this project.',
          [
            '• PCI-DSS 4.0 (Payment Card Industry Data Security Standard)',
            '• ITAR (International Traffic in Arms Regulations)',
            '• Section 508 (Accessibility for government systems)',
            '• ATO / FedRAMP (Authority to Operate)',
            '• DFARS (Defense Federal Acquisition Regulation Supplement)',
          ],
          '12 compliance chips available. AAFES-relevant selections highlighted above. Compliance selections flow directly into Phase 1 solution requirements and Phase 1.6 vendor compliance scoring.'
        ),
        spacer(),
        pageBreak(),

        // Q10
        qaCard('Q10', 'What does your current tech stack look like?',
          'Select all technologies currently in use or being considered.',
          [
            'POS / Retail Systems:',
            '• NCR Counterpoint (current POS)',
            '• Toshiba TCx Series terminals',
            '',
            'Payment Processing:',
            '• Military Star / ECP (Exchange Credit Program platform)',
            '',
            'Cloud & Infrastructure:',
            '• AWS GovCloud (approved for ITAR workloads)',
            '• Azure Government (DoD IL5 certified)',
            '',
            'Security & Identity:',
            '• CAC/PIV Authentication (required for all DoD systems)',
            '• NIPRNet (non-classified network)',
          ],
          '55 chips across 11 grouped sections including ERP, CRM, BI/Analytics, Middleware/Integration, Network, AI/ML, Document Management, HRIS, Collaboration. AAFES-specific chips like Blue Yonder, Oracle OTM, DISA MilSuite, SIPRNet are included.'
        ),
        spacer(),

        // Q11
        qaCard('Q11', 'Financial Parameters',
          'Help us understand the financial context for this initiative.',
          [
            'Total Budget Available: $4,200,000',
            '  [Help: Include all costs — software, hardware, implementation, training, change management]',
            '',
            'Team/Headcount Impact: 250 FTE affected',
            '  [Help: Count all users whose daily work changes, even if no FTEs are added/removed]',
            '',
            'Annual Revenue Influenced: $9,500,000,000',
            '  [Help: Total AAFES annual revenue — use this for revenue-at-risk calculations]',
            '',
            'Analysis Time Horizon: 5 years',
            '  [Help: DoD projects typically use 3-5 year horizons; use 5 for capital investments]',
            '',
            'Discount Rate: 8% (DoD NAF standard)',
            '  [Help: AAFES/NEXCOM use 8% as the standard Non-Appropriated Fund discount rate for NPV calculations]',
            '',
            'Initiative Urgency: High — compliance deadline within 12 months',
            '  [Help: PCI-DSS 4.0 deadline drives the urgency; non-compliance = $5K-$100K/month fine]',
          ],
          'All 6 financial fields include inline help icons (i) with AAFES-specific guidance. The discount rate field defaults to 8% for government-retail industry (DoD NAF standard). These values drive all Phase 2 financial calculations (NPV, IRR, ROI, payback period).'
        ),
        spacer(),
        pageBreak(),

        // Q12
        qaCard('Q12', 'Realistic Timeline',
          'What is a realistic implementation timeline for this initiative?',
          [
            'Selected: 12-18 months',
            '',
            'The four options are:',
            '• Less than 6 months (quick win)',
            '• 6-12 months (standard project)',
            '• 12-18 months  [SELECTED]',
            '• 18-36 months (complex transformation)',
          ],
          '12-18 months aligns with the PCI-DSS 4.0 compliance deadline and the complexity of replacing core payment infrastructure across CONUS and OCONUS locations.'
        ),
        spacer(),

        // Q13
        qaCard('Q13', 'Risk Tolerance',
          'How much implementation risk is your organization comfortable accepting?',
          [
            'Selected: Moderate',
            '',
            'The four options are:',
            '• Low — minimal disruption, proven solutions only',
            '• Moderate — balanced approach, some innovation acceptable  [SELECTED]',
            '• High — willing to adopt emerging technology for greater benefit',
            '• Aggressive — first-mover advantage is critical',
          ],
          'Risk tolerance setting flows into Phase 1 solution generation (AI weights solutions accordingly) and Phase 4 ranking algorithm (risk component weighted at 20%).'
        ),
        spacer(),
        pageBreak(),

        // Q14
        qaCard('Q14', 'Confirm Your Understanding',
          'Review all your inputs before launching the AI analysis. This is your last chance to make changes.',
          [
            'Project: Exchange Card Modernization Initiative',
            'Role: IT Director | Business Unit: HQ IT — Payment Systems',
            'Industry: Government-Retail (AAFES)',
            '',
            'Pain Points: Legacy payment infrastructure, Inventory visibility gaps, No omnichannel integration',
            'Current State: Manual/semi-automated processes',
            '',
            'KPIs: Transaction Approval Rate (99.5%), Customer Satisfaction (4.5/5), System Uptime (99.9%), Processing Speed (<2s)',
            '',
            'Alternatives: 5 defined (1 preferred: Military Star Card Platform Overhaul)',
            'Cost of Inaction: $2,230,000/year',
            '',
            'Key Stakeholders: CIO, CFO, HQ IT Payment Systems, Military Star/ECP, DFAS, DCMA',
            'Compliance: PCI-DSS 4.0, ITAR, Section 508, ATO/FedRAMP, DFARS',
            '',
            'Budget: $4.2M | Timeline: 12-18 months | Risk: Moderate',
            'Discount Rate: 8% (DoD NAF) | Time Horizon: 5 years',
            '',
            '[User clicked: Launch BCA.AI Analysis]',
          ],
          'The confirmation screen summarizes all 13 previous answers in a compact review card. Users can navigate back to any question to edit before launching. Once confirmed, all 6 phases run sequentially.'
        ),
        spacer(),
        pageBreak(),

        // Summary table
        h1('Summary — All Inputs at a Glance'),
        p('The table below summarizes all 12 data domains collected during the intake session.'),
        p('', sp(120)),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [560, 2000, 6800],
          rows: [
            new TableRow({ children: [
              hdrCell('#', NAVY, 560),
              hdrCell('Data Domain', NAVY, 2000),
              hdrCell('AAFES Submitted Value', NAVY, 6800),
            ]}),
            ...[
              ['Q1', 'Project Identity', 'Exchange Card Modernization Initiative | IT Director | HQ IT — Payment Systems | Government-Retail'],
              ['Q2', 'Pain Points', 'Legacy payment infrastructure; Inventory visibility gaps; No omnichannel integration'],
              ['Q3', 'Current State', 'Manual/semi-automated processes'],
              ['Q4', 'Problem Narrative', 'Military Star card on 2008 infrastructure; 23% OCONUS decline rate; 14M military members affected; PCI-DSS 4.0 deadline in 12 months'],
              ['Q5', 'What Tried', 'Vendor demos (NCR, Fiserv, Visa); RFI issued to 8 vendors; 90-day pilot at Fort Bliss'],
              ['Q6', 'KPIs', 'Transaction Approval Rate (99.5%); Customer Satisfaction (4.5/5); System Uptime (99.9%); Processing Speed (<2s)'],
              ['Q7', 'Alternatives', '5 alternatives; Preferred: Military Star Platform Overhaul ($4.2M); COI: $2,230,000/yr'],
              ['Q8', 'Stakeholders', 'CIO, CFO, COO, HQ IT Payment Systems, Military Star/ECP, ShopMyExchange.com, DFAS, DCMA, Army G-8, DoD IG'],
              ['Q9', 'Compliance', 'PCI-DSS 4.0; ITAR; Section 508; ATO/FedRAMP; DFARS'],
              ['Q10', 'Tech Stack', 'NCR Counterpoint; Military Star/ECP; AWS GovCloud; Azure Government (DoD IL5); CAC/PIV; NIPRNet'],
              ['Q11', 'Financials', '$4.2M budget; 250 FTE; $9.5B annual revenue; 5-yr horizon; 8% DoD NAF discount rate; High urgency'],
              ['Q12+13', 'Timeline + Risk', '12-18 months; Moderate risk tolerance'],
            ].map(([num, domain, value]) => new TableRow({ children: [
              dataCell(num, LIGHT, 560, true),
              dataCell(domain, MGRAY, 2000, true),
              dataCell(value, WHITE, 6800),
            ]})),
          ],
        }),
        p('', sp(180)),

        // What happens next
        h1('What Happens Next — The 6 Analysis Phases'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [560, 2000, 2400, 4400],
          rows: [
            new TableRow({ children: [
              hdrCell('Phase', NAVY, 560),
              hdrCell('Name', NAVY, 2000),
              hdrCell('Method', NAVY, 2400),
              hdrCell('Key Output', NAVY, 4400),
            ]}),
            ...[
              ['1', 'AI Solution Analysis', 'Claude AI (~$0.06)', '5 solutions, REQ-001..005, vendor scores, quality reflection'],
              ['2', 'Financial Modeling', 'Pure JavaScript', 'NPV, IRR, ROI, payback period per solution + portfolio'],
              ['3', 'Traceability & Timeline', 'Pure JavaScript', 'KPI-to-requirement traceability matrix; 4-phase roadmap; risk register'],
              ['4', 'Ranking & Recommendation', 'Pure JavaScript', 'Weighted composite score; ranked alternatives; recommendation narrative'],
              ['5', 'Executive Report', 'Pure JavaScript', 'Full branded HTML report; all sections; printable'],
              ['6', 'BRD Generation', 'AI + JS (~$0.02)', '12-section .docx Business Requirements Document; editable; downloadable'],
            ].map(([phase, name, method, output]) => new TableRow({ children: [
              dataCell(phase, NAVY.replace('1B3A5C', NAVY), 560, true),
              dataCell(name, LIGHT, 2000, true),
              dataCell(method, WHITE, 2400),
              dataCell(output, WHITE, 4400),
            ]})),
          ],
        }),
        p('', sp(180)),
        p([
          t('BCA.AI  |  Complete Intake Session  |  AAFES Exchange Card Modernization  |  April 2026', { size: 18, color: DGRAY, italics: true })
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
