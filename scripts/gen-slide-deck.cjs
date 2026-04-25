#!/usr/bin/env node
'use strict';
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, HeadingLevel, AlignmentType, BorderStyle, WidthType,
  ShadingType, PageNumber, LevelFormat, PageBreak, VerticalAlign } = require('docx');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '..', 'BCA_AI_Slide_Deck_Outline.docx');

const NAVY='1B3A5C',BLUE='2E75B6',LIGHT='D5E8F0',AMBER='FFF3CD',GREEN='D4EDDA',WHITE='FFFFFF',DGRAY='666666',MGRAY='F5F5F5',RED='FFD6D6';
const b=(t,o={})=>new TextRun({text:t,bold:true,...o});
const tx=(t,o={})=>new TextRun({text:t,...o});
const p=(c,o={})=>new Paragraph({children:Array.isArray(c)?c:[tx(c)],spacing:{before:80,after:80},...o});
const pb=()=>new Paragraph({children:[new PageBreak()]});
const bdr={style:BorderStyle.SINGLE,size:1,color:'CCCCCC'};
const brs={top:bdr,bottom:bdr,left:bdr,right:bdr};
const mg={top:80,bottom:80,left:120,right:120};
const h1=(t)=>new Paragraph({heading:HeadingLevel.HEADING_1,children:[new TextRun({text:t,bold:true,color:NAVY})],spacing:{before:360,after:180}});

const bullet=(text,level=0)=>new Paragraph({numbering:{reference:'bullets',level},children:[tx(text,{size:21})],spacing:{before:40,after:40}});

const callout=(fill,label,lines)=>new Table({width:{size:9360,type:WidthType.DXA},columnWidths:[9360],
  rows:[new TableRow({children:[new TableCell({borders:brs,margins:{top:100,bottom:100,left:180,right:180},
    width:{size:9360,type:WidthType.DXA},shading:{fill,type:ShadingType.CLEAR},
    children:[p([label]),...lines.map(l=>p([tx(l,{size:20})]))]})]})]});

// Slide card
const slide=(num,title,section,headline,visual,bullets,notes,screenshot='')=>{
  const rows=[
    new TableRow({children:[new TableCell({borders:brs,margins:{top:80,bottom:80,left:180,right:180},
      width:{size:9360,type:WidthType.DXA},shading:{fill:NAVY,type:ShadingType.CLEAR},
      children:[p([
        b(`SLIDE ${String(num).padStart(2,'0')}  `,{color:'BDD7EE',size:18}),
        b(title,{color:WHITE,size:22}),
        tx(`    ▸  ${section}`,{color:'BDD7EE',size:16}),
      ])]})]}),
    new TableRow({children:[new TableCell({borders:brs,margins:{top:100,bottom:100,left:180,right:180},
      width:{size:9360,type:WidthType.DXA},shading:{fill:'FFFFFF',type:ShadingType.CLEAR},
      children:[
        p([b('HEADLINE:  ',{size:18,color:BLUE}),b(headline,{size:22})]),
        p('',[],{spacing:{before:60,after:60}}),
        p([b('VISUAL:  ',{size:18,color:BLUE}),tx(visual,{size:20,italics:true})]),
        ...(screenshot?[p([b('SCREENSHOT:  ',{size:18,color:BLUE}),tx(screenshot,{size:20,font:'Courier New'})])]:[] ),
      ]})]}),
    new TableRow({children:[new TableCell({borders:brs,margins:{top:80,bottom:100,left:180,right:180},
      width:{size:9360,type:WidthType.DXA},shading:{fill:LIGHT,type:ShadingType.CLEAR},
      children:[
        p([b('SLIDE CONTENT / BULLETS:',{size:18})]),
        ...bullets.map(bl=>new Paragraph({numbering:{reference:'bullets',level:0},children:[tx(bl,{size:20})],spacing:{before:40,after:40}})),
      ]})]}),
    new TableRow({children:[new TableCell({borders:brs,margins:{top:80,bottom:80,left:180,right:180},
      width:{size:9360,type:WidthType.DXA},shading:{fill:AMBER,type:ShadingType.CLEAR},
      children:[
        p([b('SPEAKER NOTES:',{size:18})]),
        ...notes.map(n=>p([tx(n,{size:19,italics:true})])),
      ]})]}),
  ];
  return new Table({width:{size:9360,type:WidthType.DXA},columnWidths:[9360],rows});
};

const sp=()=>p('',[],{spacing:{before:120,after:120}});

const doc=new Document({
  numbering:{config:[
    {reference:'bullets',levels:[
      {level:0,format:LevelFormat.BULLET,text:'\u2022',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:720,hanging:360}}}},
      {level:1,format:LevelFormat.BULLET,text:'\u25E6',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:1080,hanging:360}}}},
    ]},
    {reference:'numbers',levels:[{level:0,format:LevelFormat.DECIMAL,text:'%1.',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:720,hanging:360}}}}]},
  ]},
  styles:{default:{document:{run:{font:'Arial',size:22}}},paragraphStyles:[
    {id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,run:{size:36,bold:true,font:'Arial',color:NAVY},paragraph:{spacing:{before:360,after:180},outlineLevel:0}},
    {id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',quickFormat:true,run:{size:28,bold:true,font:'Arial',color:BLUE},paragraph:{spacing:{before:240,after:120},outlineLevel:1}},
  ]},
  sections:[
    {properties:{page:{size:{width:12240,height:15840},margin:{top:1440,right:1440,bottom:1440,left:1440}}},
    children:[
      p('',[],{spacing:{before:1800}}),
      new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'BCA.AI',bold:true,size:72,color:NAVY,font:'Arial'})],spacing:{before:0,after:120}}),
      new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'Slide Deck — Full Content Outline',size:36,color:BLUE,font:'Arial'})],spacing:{before:0,after:240}}),
      new Paragraph({alignment:AlignmentType.CENTER,border:{bottom:{style:BorderStyle.SINGLE,size:4,color:BLUE,space:4}},
        children:[new TextRun({text:'22 Slides  |  Headline + Visual + Bullets + Speaker Notes  |  ~20-30 min Presentation',bold:true,size:26,font:'Arial'})],spacing:{before:120,after:480}}),
      callout(LIGHT,b('How to use this outline:',{size:22}),[
        'Each slide card has 4 rows: Header (slide number, title, section), Content (headline + visual directive + screenshot reference), Bullets (what goes on the slide), Speaker Notes (what to say).',
        'Visual directives describe what the slide should look like — hand to your designer or build in PowerPoint/Keynote.',
        'Screenshot references match the filenames from BCA_AI_Screenshot_Guide.docx.',
        'Color palette: Navy #1B3A5C, Blue #2E75B6, Amber #FFF3CD, Green #D4EDDA.',
        'Font: Arial or Inter. Do not use Calibri or Times New Roman.',
      ]),
      p('',[],{spacing:{before:480}}),
      new Table({width:{size:9360,type:WidthType.DXA},columnWidths:[560,700,3000,2500,2600],rows:[
        new TableRow({children:[
          new TableCell({borders:brs,margins:mg,width:{size:560,type:WidthType.DXA},shading:{fill:NAVY,type:ShadingType.CLEAR},children:[p([b('#',{color:WHITE,size:20})])]}),
          new TableCell({borders:brs,margins:mg,width:{size:700,type:WidthType.DXA},shading:{fill:NAVY,type:ShadingType.CLEAR},children:[p([b('Section',{color:WHITE,size:20})])]}),
          new TableCell({borders:brs,margins:mg,width:{size:3000,type:WidthType.DXA},shading:{fill:NAVY,type:ShadingType.CLEAR},children:[p([b('Title',{color:WHITE,size:20})])]}),
          new TableCell({borders:brs,margins:mg,width:{size:2500,type:WidthType.DXA},shading:{fill:NAVY,type:ShadingType.CLEAR},children:[p([b('Headline',{color:WHITE,size:20})])]}),
          new TableCell({borders:brs,margins:mg,width:{size:2600,type:WidthType.DXA},shading:{fill:NAVY,type:ShadingType.CLEAR},children:[p([b('Screenshot',{color:WHITE,size:20})])]}),
        ]}),
        ...([
          ['01','Opening','Title & Tagline',       'Business Cases at the Speed of Business','None'],
          ['02','Problem','The Status Quo Problem', 'A Business Case Shouldn\'t Take Months','Motion graphic'],
          ['03','Problem','The Cost of Waiting',    'Waiting Is a $100K Decision','None'],
          ['04','Solution','Introducing BCA.AI',    '10 Minutes. $0.08. Board-Ready.',          'None'],
          ['05','Solution','How It Works (Overview)','6 Phases. Structured. Sequential.','None'],
          ['06','Intake','The 14-Question Intake',  'Not a Form — a Guided Conversation','01_intake_q1'],
          ['07','Intake','Industry Awareness',      'Built for Your Org, Not a Generic Template','02_intake_q2'],
          ['08','Intake','KPI Tiles & Targets',     'Define What Success Looks Like — Precisely','04_intake_q6'],
          ['09','Intake','Cost-of-Inaction',        'Name the Cost of Doing Nothing','05_intake_q7'],
          ['10','Phase 1','AI Solution Generation', '5 Investment-Grade Solutions in 20 Seconds','09_phase1_solutions'],
          ['11','Phase 1','Requirements & Vendors', 'Structured Requirements. Scored Vendors.','10_phase1_requirements'],
          ['12','Phase 2','Financial Modeling',     'NPV, IRR, ROI — No Spreadsheet Required','14_phase2_financial'],
          ['13','Phase 3','Traceability & Timeline','Every KPI Traced to Every Requirement','16_phase3_traceability'],
          ['14','Phase 4','Ranking & Recommendation','Weighted Scoring. One Clear Answer.','18_phase4_ranking'],
          ['15','Phase 5','Executive Report',       'Board-Ready in One Click','20_phase5_report'],
          ['16','Phase 6','BRD Generation',         '12 Sections. 6 Seconds. Word Document.','23_phase6_brd'],
          ['17','Phase 6','BRD Edit & Download',    'Your Document. Your Edits.','24_phase6_download'],
          ['18','Proof','The Economics',            '$0.08 vs $100,000 — There Is No Competition','None'],
          ['19','Proof','AAFES Case Study Results', '$4.2M Decision in 10 Minutes','None'],
          ['20','Trust','Compliance & Security',    'Government-Ready from Day One','None'],
          ['21','Vision','Roadmap',                 'v1.0 Today — v3.0 by End of 2026','None'],
          ['22','Close','Call to Action',           'Your Next Business Case is 10 Minutes Away','None'],
        ].map(([n,sec,title,headline,shot])=>new TableRow({children:[
          new TableCell({borders:brs,margins:mg,width:{size:560,type:WidthType.DXA},shading:{fill:LIGHT,type:ShadingType.CLEAR},children:[p([b(n,{size:20})])]}),
          new TableCell({borders:brs,margins:mg,width:{size:700,type:WidthType.DXA},shading:{fill:MGRAY,type:ShadingType.CLEAR},children:[p([tx(sec,{size:18})])]}),
          new TableCell({borders:brs,margins:mg,width:{size:3000,type:WidthType.DXA},shading:{fill:WHITE,type:ShadingType.CLEAR},children:[p([b(title,{size:20})])]}),
          new TableCell({borders:brs,margins:mg,width:{size:2500,type:WidthType.DXA},shading:{fill:WHITE,type:ShadingType.CLEAR},children:[p([tx(headline,{size:20,italics:true})])]}),
          new TableCell({borders:brs,margins:mg,width:{size:2600,type:WidthType.DXA},shading:{fill:WHITE,type:ShadingType.CLEAR},children:[p([tx(shot==='None'?'—':shot,{size:18,font:shot==='None'?'Arial':'Courier New'})])]}),
        ]})))
      ]}),
      pb(),
    ]},
    {properties:{page:{size:{width:12240,height:15840},margin:{top:1440,right:1440,bottom:1440,left:1440}}},
    headers:{default:new Header({children:[new Paragraph({border:{bottom:{style:BorderStyle.SINGLE,size:4,color:BLUE,space:4}},
      children:[new TextRun({text:'BCA.AI  —  Slide Deck Outline  |  22 Slides  |  Full Speaker Notes',bold:true,font:'Arial',size:18,color:NAVY})]})]}),},
    footers:{default:new Footer({children:[new Paragraph({border:{top:{style:BorderStyle.SINGLE,size:2,color:'CCCCCC',space:4}},
      alignment:AlignmentType.CENTER,children:[new TextRun({text:'Page ',font:'Arial',size:18,color:DGRAY}),
        new TextRun({children:[PageNumber.CURRENT],font:'Arial',size:18,color:DGRAY}),
        new TextRun({text:' of ',font:'Arial',size:18,color:DGRAY}),
        new TextRun({children:[PageNumber.TOTAL_PAGES],font:'Arial',size:18,color:DGRAY})]})]})},
    children:[
      h1('22-Slide Full Content Outline'),
      sp(),

      slide(1,'Title & Tagline','Opening',
        'Business Cases at the Speed of Business.',
        'Navy (#1B3A5C) full-bleed background. BCA.AI wordmark centered in white, large. Tagline below in blue. Four small "phase badges" arranged across bottom: Phase 1 through Phase 6 icons.',
        ['BCA.AI','Business Case Analysis Platform','From question to board-ready document in 10 minutes','Version 1.0  |  April 2026'],
        ['This is your anchor slide. Keep it minimal — one name, one claim, one number.',
         'If presenting live: don\'t read the slide. Just say: "BCA.AI. Business cases in ten minutes. Let me show you what that means."']
      ),sp(),

      slide(2,'The Status Quo Problem','Problem',
        'A Business Case Shouldn\'t Take Months.',
        'Split screen: LEFT = a consultant at a whiteboard surrounded by sticky notes, spreadsheets, slide decks (stock photo). RIGHT = a calendar showing 8 weeks X\'d out. Bold stat: "6-8 WEEKS" in large red text.',
        ['Traditional business case creation takes 6-8 weeks','Requires specialized skills across finance, strategy, and procurement','Consulting engagements: $25,000 – $100,000','Output often arrives after the decision window closes','No standard format — every team builds it differently'],
        ['Set up the pain before you show the solution. Don\'t rush here.',
         'Ask the room: "How long did your last business case take?" Let someone answer.',
         'The goal of this slide is to make everyone in the room feel the frustration before you offer the relief.']
      ),sp(),

      slide(3,'The Cost of Waiting','Problem',
        'Waiting Is a $100,000 Decision.',
        'Three-column visual: Column 1 — clock icon, "6-8 Weeks". Column 2 — dollar sign icon, "$25K-$100K". Column 3 — warning triangle, "Decision Window Closed". All three in red/amber. Below: AAFES example: "$2,230,000 annual cost of doing nothing."',
        ['Every week of delay on a $4M investment decision has a cost','The Status Quo is not free: AAFES cost of inaction = $2.23M/year','Delayed decisions cost organizations real money in:','   — Compliance fines (PCI-DSS 4.0: up to $100K/month)','   — Revenue at risk ($300K/year from declined transactions)','   — Staff workarounds ($180K/year in manual processes)'],
        ['The AAFES cost of inaction number is concrete and real — it came from the platform\'s built-in calculator.',
         '"Doing nothing" is framed as a choice with a price tag. That reframe changes how executives think about the urgency.',
         'Transition line: "What if you could have the answer in ten minutes instead of ten weeks?"']
      ),sp(),

      slide(4,'Introducing BCA.AI','Solution',
        '10 Minutes. $0.08. Board-Ready Output.',
        'Three massive numbers centered on a clean white background: "10 MIN" | "$0.08" | "12 SECTIONS". Each in a colored box (blue, amber, green). Below: one-line description of each.',
        ['10 minutes — complete intake to Phase 6 output','$0.08 — total AI API cost per full business case','12 sections — Business Requirements Document in .docx format','6 phases — from solution generation to financial model to executive report','Investment-grade quality — NPV, IRR, ROI, payback period, vendor scoring'],
        ['Let the numbers breathe. Point to each one separately.',
         '"Ten minutes." Pause. "$0.08." Pause. "Twelve-section Word document."',
         'Someone in the room will audibly react. That\'s your cue to say: "Let me show you what those ten minutes look like."']
      ),sp(),

      slide(5,'How It Works — Overview','Solution',
        '6 Phases. Structured. Sequential. Complete.',
        'Horizontal flow diagram: [Intake 14Q] → [Phase 1 AI] → [Phase 2 JS] → [Phase 3 JS] → [Phase 4 JS] → [Phase 5 JS] → [Phase 6 AI+JS]. AI phases (1 and 6) in blue bubble. JS phases (2-5) in green bubble. Cost label: "~$0.06" on Phase 1, "~$0.02" on Phase 6, "$0.00" on phases 2-5.',
        ['14 questions → 6 sequential analysis phases → 1 downloadable BRD','Phase 1: AI generates 5 solutions + requirements + vendor analysis (~$0.06)','Phases 2-5: Pure JavaScript — free, instant, deterministic','Phase 6: AI writes narrative sections + JS assembles the rest (~$0.02)','Total AI cost: ~$0.08 per complete business case'],
        ['The "AI minimalism" story is important for enterprise buyers: they worry about AI costs and reliability.',
         '"Only Phases 1 and 6 use AI. Everything else is pure math — instant, repeatable, free."',
         'This architecture also means Phases 2-5 never have API errors or latency. They just run.']
      ),sp(),
      pb(),

      slide(6,'The 14-Question Intake','Intake',
        'Not a Form — a Guided Conversation.',
        'Left half: screenshot 01_intake_q1_project_identity.png. Right half: numbered list of the 14 question topics with icons.',
        ['14 guided questions covering all dimensions of the business case','Industry-aware: selecting government-retail unlocks AAFES-specific content','Guide Me panels on every question with examples','Demo mode: auto-fills all 14 questions with AAFES Exchange Card data','Estimated completion time: 8-12 minutes for a first-time user'],
        ['The "guided conversation" framing vs "form" is deliberate. Forms feel like work. Conversations feel productive.',
         'Demo mode is a key selling point for onboarding — new users see a complete filled example immediately.',
         'The Guide Me panels mean no one needs to know the "right answer" — the platform teaches as it goes.'],
        '01_intake_q1_project_identity.png'
      ),sp(),

      slide(7,'Industry Awareness','Intake',
        'Built for Your Organization, Not a Generic Template.',
        'Side-by-side comparison: Generic tool = blank text boxes. BCA.AI = AAFES-specific symptom cards, stakeholder groups, compliance chips. Call out the difference with arrows.',
        ['Government-retail profile includes:','   — 15 AAFES-specific symptom cards (OCONUS connectivity, MilStar failures, etc.)','   — 5 stakeholder groups with 46+ AAFES org chips (DFAS, DCMA, Army G-8)','   — 18 KPI tiles with government-retail descriptions','   — 55 tech stack chips across 11 groups (NCR, MilStar/ECP, AWS GovCloud, CAC/PIV)','   — Discount rate defaults to 8% DoD NAF standard','   — Compliance chips: PCI-DSS 4.0, ITAR, Section 508, ATO/FedRAMP, DFARS'],
        ['This is a key differentiator slide. The depth of domain knowledge is what separates BCA.AI from general-purpose AI tools.',
         'The DoD NAF discount rate detail always resonates with government finance audiences — it shows the platform understands their world.',
         'Callout: "Your stakeholders are already in the platform. You just select them."'],
        '02_intake_q2_symptom_cards.png'
      ),sp(),

      slide(8,'KPI Tiles & Targets','Intake',
        'Define What Success Looks Like — Precisely.',
        'Screenshot 04_intake_q6_kpi_tiles.png filling most of the slide. Callout boxes pointing to: (1) tile description text, (2) target value field, (3) "How to use" callout header.',
        ['18 KPI tiles — each with a description of what the metric measures','Set specific numeric targets per KPI: e.g., "Transaction Approval Rate: 99.5%"','KPI targets propagate through all 6 phases','Phase 4 ranking scores solutions on their ability to hit your targets','Phase 6 BRD Project Objectives are written as SMART goals from your KPIs'],
        ['KPI tiles with descriptions prevent the "I don\'t know what KPI to pick" paralysis.',
         'The numeric target is critical — it gives the analysis something to optimize against.',
         '"When you say 99.5% Transaction Approval Rate, the financial model calculates what that improvement is worth in revenue."'],
        '04_intake_q6_kpi_tiles.png'
      ),sp(),

      slide(9,'Cost-of-Inaction Calculator','Intake',
        'Name the Cost of Doing Nothing.',
        'Large screenshot of COI calculator (05_intake_q7). Annotated: 5 input fields with labels. Running total highlighted in bold. "Use This Total" button circled.',
        ['The Status Quo option includes a built-in cost-of-inaction calculator','5 inputs: incidents×cost, compliance risk, revenue at risk, staff workarounds, CX impact','Auto-calculates and displays running total','"Use This Total" pre-fills the Status Quo cost field (remains editable)','AAFES result: $2,230,000 per year — flows directly into Phase 2 NPV model'],
        ['"What does it cost to do nothing?" is often the hardest question to answer. This calculator makes it concrete.',
         'The $2.23M number is built up from real components — not a gut feeling. That matters when presenting to a CFO.',
         '"The Status Quo has a price. This is what it costs to not make a decision."'],
        '05_intake_q7_alternatives_coi.png'
      ),sp(),
      pb(),

      slide(10,'AI Solution Generation — Phase 1','Phase 1',
        '5 Investment-Grade Solutions in 20 Seconds.',
        'Screenshot 09_phase1_solutions_overview.png left side. Right side: 3 callout boxes: (1) "2 parallel AI calls", (2) "AI confidence score", (3) "Traceable to your KPIs".',
        ['Two parallel Claude AI calls: solutions generation + requirements generation','~20 seconds to 5 fully analyzed alternatives','Each solution: name, description, benefits, implementation risks, effort estimate','AI confidence score: how confident the AI is in its own output','Solutions are AAFES-specific — not generic technology alternatives'],
        ['The parallel AI calls are worth mentioning — it\'s not sequential, it\'s concurrent. That\'s why it\'s fast.',
         'AI confidence score is a unique transparency feature — the AI reports its own uncertainty.',
         '"These aren\'t five generic options the AI made up. They\'re derived from your symptom cards, KPIs, compliance flags, and tech stack."'],
        '09_phase1_solutions_overview.png'
      ),sp(),

      slide(11,'Requirements & Vendor Analysis','Phase 1',
        'Structured Requirements. Scored Vendors.',
        'Left: screenshot 10_phase1_requirements — REQ-001 through REQ-005 table. Right: 12_phase1_6_vendor_analysis showing vendor scoring table.',
        ['REQ-001 through REQ-005: structured, numbered, categorized requirements','Priority: Must Have / Should Have / Nice to Have','Phase 1.6: 3 vendors per solution scored across 5 dimensions','Vendor scoring: Compatibility, Price, Compliance, Support, References','Phase 1-Reflection: AI quality-reviews its own output and assigns scores'],
        ['The numbered requirements (REQ-001 etc.) are directly usable in the BRD and in a future RFP.',
         'The vendor scoring replaces a separate RFI process. For AAFES, it scores against PCI-DSS and ITAR compliance capability.',
         '"The AI reviewed its own work. It flagged one area where the logic was thin. Before you even see the output, quality control has already run."'],
        '10_phase1_requirements.png'
      ),sp(),

      slide(12,'Financial Modeling — Phase 2','Phase 2',
        'NPV, IRR, ROI — No Spreadsheet Required.',
        'Screenshot 14_phase2_financial_table.png center. Highlight the Military Star row: NPV, IRR, ROI, Payback columns. Red highlight on Status Quo negative NPV row.',
        ['DCF (Discounted Cash Flow) model runs in under 1 second','Uses 8% DoD NAF discount rate (AAFES standard)','Per solution: NPV, IRR, ROI%, Payback Period, 3-Year Benefit','Portfolio-level: combined NPV and IRR across all solutions','Military Star Platform Overhaul: NPV $8.4M | IRR 34.2% | ROI 312% | Payback 28 months','Status Quo: deeply negative NPV — the cost of inaction is quantified'],
        ['"Phase 2 is free. It\'s just math. The DCF model runs in milliseconds."',
         'Point to the Status Quo row: "This is what happens to the financial model when you do nothing. The $2.23M cost of inaction accumulates every year. By year 5, you\'ve spent more than the investment would have cost."',
         'IRR of 34.2% is well above the 8% hurdle rate — this investment clears the bar.'],
        '14_phase2_financial_table.png'
      ),sp(),

      slide(13,'Traceability & Implementation Timeline — Phase 3','Phase 3',
        'Every KPI Traced to Every Requirement.',
        'Left: screenshot 16_phase3_traceability_matrix — show the matrix. Right: screenshot 17_phase3_timeline — 4-phase Gantt bar.',
        ['Traceability matrix: KPIs → Solutions → Requirements (full linkage)','Every requirement traces to the KPI it addresses','Phase 3 timeline: 4 phases across 18 months','Phase 1: Foundation & Vendor Selection (months 1-4)','Phase 2: Pilot CONUS (months 5-8)','Phase 3: OCONUS Rollout (months 9-14)','Phase 4: Optimization & Go-Live (months 15-18)'],
        ['"If a stakeholder asks how this solution addresses the transaction approval rate — point to the matrix. The connection is documented, not asserted."',
         'The 18-month timeline matters for the PCI-DSS deadline: the solution fits within the compliance window.',
         'Transition: "Phase 4 takes all of this analysis and produces a clear ranked recommendation."'],
        '16_phase3_traceability_matrix.png'
      ),sp(),
      pb(),

      slide(14,'Ranking & Recommendation — Phase 4','Phase 4',
        'Weighted Scoring. One Clear Answer.',
        'Screenshot 18_phase4_ranking_table.png. Overlay a donut chart showing the 5 scoring weights: Financial 30%, Strategic 25%, Risk 20%, Implementation 15%, Compliance 10%. Highlight the #1 row (87/100).',
        ['5-dimension weighted scoring applied to all alternatives','Financial: 30%  |  Strategic Fit: 25%  |  Risk: 20%  |  Implementation: 15%  |  Compliance: 10%','Military Star Platform Overhaul: composite score 87/100 — High confidence','Cloud-Native Full Stack: scored higher on long-term financials BUT lower on compliance timeline','The urgency flag (compliance deadline) increased compliance weight — deadline-driven recommendation'],
        ['"The weights aren\'t arbitrary. They reflect the relative importance of each dimension for this specific project, based on inputs like urgency and risk tolerance."',
         '"Cloud-Native scored higher on 5-year NPV but failed the compliance timeline test. The platform surfaces that automatically."',
         'This slide answers the "why this solution?" question before anyone has to ask.'],
        '18_phase4_ranking_table.png'
      ),sp(),

      slide(15,'Executive Report — Phase 5','Phase 5',
        'Board-Ready in One Click.',
        'Screenshot 20_phase5_report_header.png and 21_phase5_alternatives_comparison.png side by side. Show the branded HTML report structure.',
        ['Full HTML executive report — all sections, all tables, all charts','Sections: Executive Summary, Problem Statement, Alternatives Comparison, Financial Analysis, Risk Matrix, Implementation Roadmap, Recommendation','Branded with BCA.AI styling — print-ready or shareable as HTML','Alternatives comparison table: all 5 options side by side with cost, NPV, risk, timeline','Zero additional cost — pure JavaScript assembly of phases 1-4 data'],
        ['"Phase 5 costs nothing to run. It takes everything from phases 1 through 4 and formats it into a complete executive report."',
         '"This is what you send to your leadership team before asking for budget approval. The full story, one document."',
         'Transition: "And then Phase 6 turns that into a Word document for your board."'],
        '20_phase5_report_header.png'
      ),sp(),

      slide(16,'BRD Generation — Phase 6','Phase 6',
        '12 Sections. 6 Seconds. Word Document.',
        'Screenshot 23_phase6_brd_section_cards.png. Annotate: BLUE badge = "AI Generated" (2 cents), GREEN badge = "From Phase Data" (free). Count: 5 blue + 7 green = $0.02 total.',
        ['Click Generate BRD → 2 parallel AI calls + 7 instant JS sections → 12 cards','AI-generated sections (blue badge): Business Justification, Project Objectives, Functional Requirements, Non-Functional Requirements, Risk Assessment','JS-assembled sections (green badge): Executive Summary, Problem Statement, Scope, RACI Matrix, Timeline, Assumptions, Approval Sign-off','Cost: ~$0.02 for the 2 AI calls. The 7 JS sections are free.','Generation time: ~6 seconds'],
        ['"See those two badge colors? Blue sections cost about a penny each. Green sections are free — assembled from data phases 1-5 already computed."',
         '"That\'s how 12 sections cost two cents."',
         '"And the functional requirements — each of the 5 requirements from Phase 1 gets expanded into 5 sub-requirements. You end up with 25 traceable functional requirements in the BRD."'],
        '23_phase6_brd_section_cards.png'
      ),sp(),

      slide(17,'BRD Edit & Download','Phase 6',
        'Your Document. Your Edits.',
        'Screenshot 24_phase6_download_brd.png center. Three call-out boxes: (1) Edit button → textarea, (2) AI Rewrite button → instruction input, (3) Download .docx → file appears.',
        ['Every section is editable: direct textarea edit OR AI Rewrite with an instruction','AI Rewrite example: "Make this more concise" / "Add a reference to the PCI-DSS deadline"','Add custom sections | Delete sections | Reorder','Download as .docx: cover page, TOC, page numbers, headers, footers — all included','The downloaded document is a Microsoft Word file — your team can edit it further'],
        ['"You don\'t have to take what the AI gives you. Every section is fully editable — directly or with another AI instruction."',
         '"The CFO wants a different risk framing? Type the instruction. It rewrites that one section. Everything else stays."',
         '"Click download. Microsoft Word document. Board-ready."'],
        '24_phase6_download_brd.png'
      ),sp(),
      pb(),

      slide(18,'The Economics','Proof',
        '$0.08 vs $100,000 — There Is No Competition.',
        'Large split visual. LEFT column (red): Traditional — clock (6-8 wks), dollar ($$$$), inconsistent format icon, no financial model icon. RIGHT column (green): BCA.AI — clock (10 min), "$0.08", standardized format, NPV/IRR/ROI icon. Strike-through effect on left column values.',
        ['Traditional approach:  6-8 weeks  |  $25K-$100K  |  Inconsistent  |  No standard model','BCA.AI:  10 minutes  |  $0.08  |  Standardized 12-section BRD  |  Investment-grade DCF','Cost reduction: 99.9%','Time reduction: 99.9%','Quality: identical output — NPV, IRR, requirements, vendor scoring, RACI, timeline'],
        ['"The output is identical. The time is one-nine-nine-nine-th. The cost is one one-hundred-thousandth."',
         '"There isn\'t a category where the traditional approach wins except habit."',
         'Let this one land. Don\'t rush to the next slide.']
      ),sp(),

      slide(19,'AAFES Case Study Results','Proof',
        '$4.2M Decision. Analyzed in 10 Minutes.',
        'Navy background. Center: AAFES logo placeholder (or text "AAFES"). Four result boxes: Portfolio NPV $8.4M | IRR 34.2% | Payback 28 months | ROI 312%. Below: "5 alternatives analyzed | Preferred solution: Military Star Platform Overhaul | Score: 87/100".',
        ['Organization: Army & Air Force Exchange Service (AAFES)','Problem: 23% OCONUS transaction decline rate on 2008-era infrastructure','Decision size: $4.2M investment across 5 alternatives','Compliance driver: PCI-DSS 4.0 deadline in 12 months','Annual cost of inaction: $2,230,000','Recommendation: Military Star Card Platform Overhaul','Financial result: Portfolio NPV $8.4M | IRR 34.2% | Payback 28 months | 3-yr ROI 312%'],
        ['"This is a real scenario. Fourteen million military customers depending on a working payment system."',
         '"In ten minutes, BCA.AI produced the financial model, the vendor analysis, the implementation roadmap, and the BRD that the IT Director needs to take to the board."',
         '"The consulting engagement that would have cost fifty thousand dollars and eight weeks."']
      ),sp(),

      slide(20,'Compliance & Security','Trust',
        'Government-Ready from Day One.',
        'Grid of compliance badge icons: PCI-DSS 4.0 (red), ITAR (navy), Section 508 (blue), ATO/FedRAMP (green), DFARS (amber). Below: tech infrastructure badges: AWS GovCloud, Azure DoD IL5, CAC/PIV, NIPRNet.',
        ['Compliance frameworks supported: PCI-DSS 4.0, ITAR, Section 508, ATO/FedRAMP, DFARS','Compliance requirements flow from intake through all 6 phases','Phase 1.6 vendor scoring includes compliance dimension','Phase 6 NFR section captures compliance requirements as non-functional requirements','Infrastructure: AWS GovCloud (ITAR-ready), Azure DoD IL5, CAC/PIV authentication support'],
        ['"These aren\'t checkbox items. The compliance flags you enter in the intake change which solutions the AI recommends, how vendors are scored, and what appears in the BRD."',
         '"For AAFES, PCI-DSS 4.0 compliance is the reason the 30-month Cloud-Native solution didn\'t win. The compliance awareness is baked into the recommendation engine."']
      ),sp(),

      slide(21,'Roadmap','Vision',
        'v1.0 Today — v3.0 by Q4 2026.',
        'Three-column timeline: v1.0 (navy, "Available Now"), v2.0 (blue, "Q3 2026"), v3.0 (green, "Q4 2026"). Each column has 4-5 feature bullets.',
        ['v1.0 — Available Now: 6 analysis phases, AAFES government-retail support, Phase 6 BRD .docx download, Demo mode with pre-filled AAFES scenario','v2.0 — Q3 2026: Multi-scenario comparison, Cost-Benefit Analysis table in BRD, User accounts with saved analyses, Vendor Recommendations table','v3.0 — Q4 2026: PowerPoint export (Phase 5 slides), Jira/ServiceNow integration, CAC/PIV SSO for government orgs, Custom AI fine-tuning on org data'],
        ['"v1.0 is complete and running today. The eight-cent business case is real and available."',
         '"v2.0 adds portfolio-level analysis — compare multiple business cases side by side."',
         '"v3.0 connects BCA.AI directly to your existing project management and procurement systems."']
      ),sp(),

      slide(22,'Call to Action','Close',
        'Your Next Business Case is 10 Minutes Away.',
        'Clean navy slide. BCA.AI logo. One large stat: "10 MIN / $0.08 / 12 SECTIONS". Below: URL / contact. Tagline: "Business cases at the speed of business."',
        ['Try the AAFES demo: ?demo=true on the intake URL','Complete your first real business case in under 15 minutes','All 6 phases — AI solutions, financials, timeline, ranking, report, BRD','Download the Word document and share with your leadership team today','Contact: [your contact info]'],
        ['"I want you to try it today. Not next quarter. Today."',
         '"Go to the URL on the screen, add ?demo=true to the end, and watch all fourteen questions fill themselves with the AAFES scenario. Then hit Launch and watch six phases of analysis run in real time."',
         '"Your next business case is ten minutes away."',
         'End with a long pause. Let the URL sit on screen. Do not rush to end the presentation.']
      ),sp(),
      p([tx('BCA.AI  |  Slide Deck Outline  |  v1.0  |  April 2026',{size:18,color:DGRAY,italics:true})],{alignment:AlignmentType.CENTER}),
    ]},
  ],
});

Packer.toBuffer(doc).then(buf=>{fs.writeFileSync(OUT,buf);console.log('✅',OUT,'('+Math.round(buf.length/1024)+' KB)');}).catch(e=>{console.error('❌',e.message);process.exit(1);});
