#!/usr/bin/env node
'use strict';
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, HeadingLevel, AlignmentType, BorderStyle, WidthType,
  ShadingType, PageNumber, LevelFormat, PageBreak, VerticalAlign } = require('docx');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '..', 'BCA_AI_Video_Script.docx');

const NAVY='1B3A5C',BLUE='2E75B6',LIGHT='D5E8F0',AMBER='FFF3CD',GREEN='D4EDDA',WHITE='FFFFFF',DGRAY='666666',MGRAY='F5F5F5',RED='F8D7DA';
const b=(t,o={})=>new TextRun({text:t,bold:true,...o});
const tx=(t,o={})=>new TextRun({text:t,...o});
const p=(c,o={})=>new Paragraph({children:Array.isArray(c)?c:[tx(c)],spacing:{before:80,after:80},...o});
const pb=()=>new Paragraph({children:[new PageBreak()]});
const sp=(be=120,af=120)=>p('',[],{spacing:{before:be,after:af}});
const bdr={style:BorderStyle.SINGLE,size:1,color:'CCCCCC'};
const brs={top:bdr,bottom:bdr,left:bdr,right:bdr};
const mg={top:80,bottom:80,left:120,right:120};

const h1=(t)=>new Paragraph({heading:HeadingLevel.HEADING_1,children:[new TextRun({text:t,bold:true,color:NAVY})],spacing:{before:360,after:180}});
const h2=(t)=>new Paragraph({heading:HeadingLevel.HEADING_2,children:[new TextRun({text:t,bold:true,color:BLUE})],spacing:{before:240,after:120}});
const h3=(t)=>new Paragraph({heading:HeadingLevel.HEADING_3,children:[new TextRun({text:t,bold:true})],spacing:{before:180,after:80}});

const seg=(num,title,duration,shot,narration,vo=[])=>{
  const rows=[
    new TableRow({children:[new TableCell({borders:brs,margins:{top:100,bottom:100,left:180,right:180},
      width:{size:9360,type:WidthType.DXA},shading:{fill:NAVY,type:ShadingType.CLEAR},
      children:[p([b(`SEGMENT ${num}  `,{color:'BDD7EE',size:20}),b(title,{color:WHITE,size:22}),
        tx(`    ▸  ${duration}    ▸  ${shot}`,{color:'BDD7EE',size:18})])]})]}),
    new TableRow({children:[new TableCell({borders:brs,margins:{top:100,bottom:160,left:180,right:180},
      width:{size:9360,type:WidthType.DXA},shading:{fill:LIGHT,type:ShadingType.CLEAR},
      children:[
        p([b('ON SCREEN:  ',{size:18,color:BLUE}),tx(shot,{size:18,italics:true})]),
        ...narration.map(line=>p([tx(line,{size:21})])),
      ]})]}),
    ...(vo.length?[new TableRow({children:[new TableCell({borders:brs,margins:{top:80,bottom:80,left:180,right:180},
      width:{size:9360,type:WidthType.DXA},shading:{fill:AMBER,type:ShadingType.CLEAR},
      children:[p([b('PRODUCTION NOTE:  ',{size:18}),tx(vo.join(' '),{size:18,italics:true})])]})]})]:[]),
  ];
  return new Table({width:{size:9360,type:WidthType.DXA},columnWidths:[9360],rows});
};

const callout=(fill,label,lines)=>new Table({width:{size:9360,type:WidthType.DXA},columnWidths:[9360],
  rows:[new TableRow({children:[new TableCell({borders:brs,margins:{top:120,bottom:120,left:180,right:180},
    width:{size:9360,type:WidthType.DXA},shading:{fill,type:ShadingType.CLEAR},
    children:[p([label]),...lines.map(l=>p([tx(l,{size:20})]))]})]})]});

const doc=new Document({
  numbering:{config:[
    {reference:'bullets',levels:[{level:0,format:LevelFormat.BULLET,text:'\u2022',alignment:AlignmentType.LEFT,
      style:{paragraph:{indent:{left:720,hanging:360}}}}]},
  ]},
  styles:{default:{document:{run:{font:'Arial',size:22}}},paragraphStyles:[
    {id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,
      run:{size:36,bold:true,font:'Arial',color:NAVY},paragraph:{spacing:{before:360,after:180},outlineLevel:0}},
    {id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',quickFormat:true,
      run:{size:28,bold:true,font:'Arial',color:BLUE},paragraph:{spacing:{before:240,after:120},outlineLevel:1}},
    {id:'Heading3',name:'Heading 3',basedOn:'Normal',next:'Normal',quickFormat:true,
      run:{size:24,bold:true,font:'Arial'},paragraph:{spacing:{before:180,after:90},outlineLevel:2}},
  ]},
  sections:[
    // Cover
    {properties:{page:{size:{width:12240,height:15840},margin:{top:1440,right:1440,bottom:1440,left:1440}}},
    children:[
      p('',[],{spacing:{before:1800}}),
      new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'BCA.AI',bold:true,size:72,color:NAVY,font:'Arial'})],spacing:{before:0,after:120}}),
      new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'Explainer Video — Full Narration Script',size:36,color:BLUE,font:'Arial'})],spacing:{before:0,after:240}}),
      new Paragraph({alignment:AlignmentType.CENTER,border:{bottom:{style:BorderStyle.SINGLE,size:4,color:BLUE,space:4}},
        children:[new TextRun({text:'7 Segments  |  ~15 Minutes  |  Single Narrator  |  Keyed to 24 Screenshots',bold:true,size:26,font:'Arial'})],spacing:{before:120,after:480}}),
      callout(LIGHT,b('How to use this script:',{size:22}),[
        'Read each segment aloud to a screen recording or slide presentation.',
        'The ON SCREEN line tells you which screenshot(s) to show while reading.',
        'Production notes (amber) are for the video editor — not read aloud.',
        'Total runtime estimate: 14-16 minutes at a natural speaking pace (130 words/min).',
        'Segment word counts are provided at the start of each segment.',
      ]),
      p('',[],{spacing:{before:480}}),
      new Table({width:{size:9360,type:WidthType.DXA},columnWidths:[700,2400,2400,2200,1660],
        rows:[
          new TableRow({children:[
            new TableCell({borders:brs,margins:mg,width:{size:700,type:WidthType.DXA},shading:{fill:NAVY,type:ShadingType.CLEAR},children:[p([b('#',{color:WHITE,size:20})])]}),
            new TableCell({borders:brs,margins:mg,width:{size:2400,type:WidthType.DXA},shading:{fill:NAVY,type:ShadingType.CLEAR},children:[p([b('Segment',{color:WHITE,size:20})])]}),
            new TableCell({borders:brs,margins:mg,width:{size:2400,type:WidthType.DXA},shading:{fill:NAVY,type:ShadingType.CLEAR},children:[p([b('Screenshots',{color:WHITE,size:20})])]}),
            new TableCell({borders:brs,margins:mg,width:{size:2200,type:WidthType.DXA},shading:{fill:NAVY,type:ShadingType.CLEAR},children:[p([b('Duration',{color:WHITE,size:20})])]}),
            new TableCell({borders:brs,margins:mg,width:{size:1660,type:WidthType.DXA},shading:{fill:NAVY,type:ShadingType.CLEAR},children:[p([b('Words',{color:WHITE,size:20})])]}),
          ]}),
          ...([
            ['1','The Hook',          'None (black screen or logo)',    '0:00 – 0:35','~75'],
            ['2','The Problem',       'None (motion graphics / text)',  '0:35 – 2:00','~200'],
            ['3','The Intake Form',   'Shots 01 – 08',                  '2:00 – 6:00','~520'],
            ['4','Phase 1 & 2 — AI + Financials','Shots 09 – 15',     '6:00 – 9:30','~450'],
            ['5','Phases 3, 4 & 5 — Outputs',    'Shots 16 – 21',     '9:30 – 11:30','~260'],
            ['6','Phase 6 — The BRD', 'Shots 22 – 24',                 '11:30 – 13:30','~260'],
            ['7','The Numbers + CTA', 'Motion graphics / stats',        '13:30 – 15:00','~190'],
          ].map(([n,seg,shots,dur,wc])=>new TableRow({children:[
            new TableCell({borders:brs,margins:mg,width:{size:700,type:WidthType.DXA},shading:{fill:LIGHT,type:ShadingType.CLEAR},children:[p([b(n,{size:20})])]}),
            new TableCell({borders:brs,margins:mg,width:{size:2400,type:WidthType.DXA},shading:{fill:WHITE,type:ShadingType.CLEAR},children:[p([tx(seg,{size:20})])]}),
            new TableCell({borders:brs,margins:mg,width:{size:2400,type:WidthType.DXA},shading:{fill:MGRAY,type:ShadingType.CLEAR},children:[p([tx(shots,{size:20})])]}),
            new TableCell({borders:brs,margins:mg,width:{size:2200,type:WidthType.DXA},shading:{fill:WHITE,type:ShadingType.CLEAR},children:[p([tx(dur,{size:20})])]}),
            new TableCell({borders:brs,margins:mg,width:{size:1660,type:WidthType.DXA},shading:{fill:WHITE,type:ShadingType.CLEAR},children:[p([tx(wc,{size:20})])]}),
          ]})))
        ]}),
      pb(),
    ]},
    // Script content
    {properties:{page:{size:{width:12240,height:15840},margin:{top:1440,right:1440,bottom:1440,left:1440}}},
    headers:{default:new Header({children:[new Paragraph({border:{bottom:{style:BorderStyle.SINGLE,size:4,color:BLUE,space:4}},
      children:[new TextRun({text:'BCA.AI  —  Explainer Video Script  |  Single Narrator  |  ~15 min',bold:true,font:'Arial',size:18,color:NAVY})]})]}),},
    footers:{default:new Footer({children:[new Paragraph({border:{top:{style:BorderStyle.SINGLE,size:2,color:'CCCCCC',space:4}},
      alignment:AlignmentType.CENTER,children:[new TextRun({text:'Page ',font:'Arial',size:18,color:DGRAY}),
        new TextRun({children:[PageNumber.CURRENT],font:'Arial',size:18,color:DGRAY}),
        new TextRun({text:' of ',font:'Arial',size:18,color:DGRAY}),
        new TextRun({children:[PageNumber.TOTAL_PAGES],font:'Arial',size:18,color:DGRAY})]})]})},
    children:[
      h1('Full Narration Script'),
      p('Read in a clear, measured voice. Natural pauses after each paragraph. Target pace: 130 words per minute.'),
      p('',[],{spacing:{before:120,after:120}}),

      seg('1','The Hook','0:00 – 0:35  (~75 words)','Black screen or BCA.AI logo animation',[
        'Every organization eventually faces this moment.',
        'A technology decision that could cost millions. Dozens of stakeholders with competing priorities. Compliance requirements you can\'t afford to miss. Multiple vendors making competing promises.',
        'And someone has to build the business case.',
        'Traditionally, that takes weeks. Sometimes months. And it costs tens of thousands in consulting fees.',
        'What if it took ten minutes instead?',
      ],['Fade in BCA.AI logo on "What if it took ten minutes instead?" Hold logo 2 seconds before cutting to Segment 2.']),
      p('',[],{spacing:{before:160,after:80}}),

      seg('2','The Problem','0:35 – 2:00  (~200 words)','Motion graphics: timeline comparison / cost comparison',[
        'The Army and Air Force Exchange Service — AAFES — runs a $9.5 billion retail operation. They serve fourteen million military members and their families at bases worldwide. From Fort Bragg in North Carolina to installations in Korea, Germany, and Japan.',
        'Their payment infrastructure has been running on systems from 2008. In the past six months, twenty-three percent of transactions at overseas locations have been declined. Not because of fraud. Because of aging, unreliable infrastructure that can\'t handle the network conditions at remote military bases.',
        'Military families can\'t buy groceries. Can\'t fill prescriptions. And AAFES has a hard deadline: PCI-DSS 4.0 compliance in twelve months. Missing it means fines of up to a hundred thousand dollars per month and potential loss of card processing privileges.',
        'Before BCA.AI, analyzing this problem and building a business case would take six to eight weeks. A consulting engagement. Fifty thousand dollars minimum. A forty-page slide deck that arrives after the decision window has already closed.',
        'This is what it looks like when organizations use BCA.AI instead.',
      ],['Animate: "6-8 weeks / $50K+" morphing to "10 minutes / $0.08". Show compliance deadline countdown as urgency visual.']),
      p('',[],{spacing:{before:160,after:80}}),

      seg('3','The Intake Form','2:00 – 6:00  (~520 words)','Screenshots 01 through 08 — cycle through each',[
        'BCA.AI starts with a fourteen-question conversational intake. Not a blank form. Not a spreadsheet. A guided, step-by-step experience that adapts to who you are and where you work.',
        '[SHOT 01] The first question asks for the basics: project title, your role, your business unit. And critically — your industry. The moment you select government-retail, the entire platform shifts. Every subsequent question now speaks AAFES\'s language.',
        '[SHOT 02] Instead of asking "what\'s wrong?" with a blank text box, BCA.AI presents fifteen symptom cards specific to government-retail. Legacy payment infrastructure. OCONUS connectivity failures. Inventory visibility gaps. No omnichannel capability. Click the ones that apply. The platform begins building its understanding of your problem.',
        '[SHOT 03] When it\'s time to describe the problem in your own words, you\'re not left staring at an empty textarea. Six sentence-starter chips appear: "Our current system fails when..." "This impacts the business because..." "The urgency is driven by..." Click any chip and it injects that phrase right at your cursor. Guidance without hand-holding.',
        '[SHOT 04] Success metrics. Instead of asking you to invent KPIs from scratch, BCA.AI presents eighteen tiles — each with a description of what the metric measures and why it matters. Transaction Approval Rate. Set a target: ninety-nine point five percent. Customer Satisfaction: four point five out of five. System Uptime: ninety-nine point nine percent. Processing Speed: under two seconds. Done.',
        '[SHOT 05] Here\'s where the analysis begins before you even hit submit. The alternatives map. Five options: Status Quo, and four solutions. Multiple cards can be selected simultaneously. One gets marked as preferred with a star. And the Status Quo card includes a built-in Cost-of-Inaction calculator. One hundred fifty incidents per year at eight thousand dollars each. Five hundred thousand in compliance risk. Three hundred thousand in revenue at risk. One hundred eighty thousand in staff workaround costs. Total: two million, two hundred thirty thousand dollars per year. Just to do nothing.',
        '[SHOT 06] The stakeholder question doesn\'t ask you to type names from memory. It presents AAFES\'s actual organizational structure in five groups: HQ Leadership, HQ Directorates, Business Divisions, Regional Commands, and External Oversight — including DFAS, DCMA, and the Army G-8. Forty-six chips. Your organization, already mapped.',
        '[SHOT 07] Financial parameters come with built-in guidance. Budget: four point two million. The discount rate field already knows you\'re a DoD Non-Appropriated Fund organization. It defaults to eight percent — the DoD NAF standard — with a tooltip explaining exactly why. Every field has an inline help icon. No finance degree required.',
        '[SHOT 08] After thirteen questions, you see everything you\'ve entered on one confirmation screen. Review it. Navigate back to change anything. When it\'s right — click Launch.',
      ],['Cut between screenshots as each [SHOT XX] tag appears. Dwell on each screenshot for 20-30 seconds. Slow zoom-in on key UI elements as narrator mentions them (COI total, preferred star, help icon).']),
      p('',[],{spacing:{before:160,after:80}}),
      pb(),

      seg('4','Phase 1 & Phase 2 — AI Analysis + Financial Modeling','6:00 – 9:30  (~450 words)','Screenshots 09 through 15',[
        '[SHOT 09] Phase 1 is where the AI does its work. Two calls to Claude run in parallel — one generating solutions, one generating requirements. About twenty seconds later, five investment-grade alternatives appear.',
        'Not generic solutions. Solutions built from your specific inputs. Military Star Card Platform Overhaul: modernize the Exchange Credit Program platform with a cloud-native architecture that supports offline transaction processing at OCONUS locations. Hybrid Omnichannel Modernization: keep existing POS systems, add a middleware layer, enable mobile payments. Cloud-Native Full Stack: complete infrastructure replacement. AI Analytics Layer: add intelligence on top of the existing infrastructure without replacing it.',
        'Each alternative comes with a benefit analysis, implementation risk profile, effort estimate, risk level badge, and an AI confidence score. The AI tells you how confident it is in its own output.',
        '[SHOT 10] The requirements aren\'t vague aspirations. REQ-001: Real-time transaction processing across all OCONUS locations. REQ-002: Offline payment capability with automatic sync when connectivity is restored. REQ-003: PCI-DSS 4.0 compliance by December 2026. Structured. Numbered. Traceable.',
        '[SHOT 11 & 12] Phase 1.5 estimates implementation and operating costs for each solution. Phase 1.6 researches three vendors per solution — scoring each on compatibility, price, compliance capabilities, support quality, and customer references. The platform is building the vendor evaluation your procurement team will need.',
        '[SHOT 13] Phase 1-Reflection: the AI reviews its own output. It assigns quality scores to each section — solutions quality, requirements quality, vendor analysis quality — and flags any weak logic or missing information before it reaches your stakeholders.',
        '[SHOT 14] Phase 2 costs nothing to run. It\'s pure mathematics. The Discounted Cash Flow model processes instantly using the eight percent NAF discount rate you provided. The Military Star Platform Overhaul: portfolio NPV of eight point four million dollars. Internal Rate of Return: thirty-four point two percent. Payback period: twenty-eight months. Three-year ROI: three hundred twelve percent.',
        'The Status Quo? Negative NPV. Because the two point two three million dollar annual cost of inaction you calculated — that flows directly into the financial model.',
        '[SHOT 15] The break-even analysis plots cumulative cash flow over five years for every alternative. The recommended solution crosses zero at twenty-eight months. By year five, the cost of the investment has been recovered more than three times over.',
      ],['On the financial table (Shot 14), hold for 8 seconds and animate the NPV/IRR/ROI numbers counting up. On break-even chart (Shot 15), animate the line crossing the zero axis.']),
      p('',[],{spacing:{before:160,after:80}}),

      seg('5','Phases 3, 4 & 5 — Traceability, Ranking, Executive Report','9:30 – 11:30  (~260 words)','Screenshots 16 through 21',[
        '[SHOT 16] Phase 3 builds the traceability matrix. Every KPI is connected to every solution to every requirement. Transaction Approval Rate traces to Military Star Overhaul traces to REQ-001. If a stakeholder asks how any given solution addresses a specific success metric — the answer is in this matrix.',
        '[SHOT 17] The implementation roadmap follows. Four phases. Eighteen months. Phase 1: Foundation and Vendor Selection, months one through four. Phase 2: Pilot Deployment at CONUS locations, months five through eight. Phase 3: OCONUS Rollout, months nine through fourteen. Phase 4: Optimization and Go-Live, months fifteen through eighteen. With specific milestones at each transition point.',
        '[SHOT 18] Phase 4 applies weighted multi-criteria scoring. Financial performance carries thirty percent of the weight. Strategic fit: twenty-five percent. Risk profile: twenty percent. Implementation complexity: fifteen percent. Compliance readiness: ten percent. The Military Star Platform Overhaul scores eighty-seven out of one hundred. High confidence. Ranked first.',
        '[SHOT 19] The recommendation narrative explains the why — not just the what. It references the compliance deadline, the financial performance, the implementation feasibility, and the risk tolerance you specified. The answer isn\'t just a number. It\'s a case.',
        '[SHOTS 20 & 21] Phase 5 produces the executive report: a full branded HTML document with every section, every table, every chart. Ready to print. Ready to share. Built in under one second.',
      ],['Slow pan across the traceability matrix. On the recommendation narrative, zoom to the key sentence that names the winner and states the confidence level.']),
      p('',[],{spacing:{before:160,after:80}}),
      pb(),

      seg('6','Phase 6 — The Business Requirements Document','11:30 – 13:30  (~260 words)','Screenshots 22 through 24',[
        '[SHOT 22] Phase 6 is the last mile. Click Generate BRD. Watch the loading messages cycle — Writing executive summary. Expanding requirements. Assembling timeline. Formatting. Two AI calls run in parallel. Seven sections assemble instantly from data the previous five phases already computed.',
        '[SHOT 23] Six seconds. Twelve section cards. Executive Summary. Business Justification. Problem Statement. Project Objectives. Scope — both in-scope and out-of-scope. Functional Requirements, with REQ-001 through REQ-005 each expanded into five detailed sub-requirements. Non-Functional Requirements organized by category. Stakeholders and RACI matrix. Implementation Timeline. Risk Assessment with mitigations. Assumptions and Constraints. And the Approval and Sign-off block.',
        'Notice the source badges. Blue: AI Generated. The business justification, project objectives, risk assessment, and requirements — written by the AI using your project\'s specific data. Green: From Phase Data. The executive summary, timeline, RACI, assumptions — assembled instantly from phases 1 through 5. No additional API cost. That\'s how the entire BRD costs two cents.',
        'Every section is editable. Click Edit to change the text directly. Or click AI Rewrite, type an instruction — "make this more concise" or "add a reference to the PCI-DSS deadline" — and the AI rewrites that section alone. Add your own custom sections. Delete sections you don\'t need.',
        '[SHOT 24] When it\'s ready: one click. Download as .docx. A Microsoft Word document with a cover page, an auto-generated table of contents, page numbers, headers and footers, and twelve fully formatted sections. The document your board needs. The document your procurement office needs. The document your Authority to Operate review team needs.',
        'From question to board-ready document.',
      ],['On Shot 23, animate source badges appearing on cards — blue then green. On Shot 24, show the download button being clicked and the file appearing in Finder/Downloads.']),
      p('',[],{spacing:{before:160,after:80}}),

      seg('7','The Numbers — Closing + CTA','13:30 – 15:00  (~190 words)','Motion graphics: stat cards / comparison visual',[
        'Let\'s step back and look at what just happened.',
        'Traditional business case: six to eight weeks of elapsed time. Twenty-five to one hundred thousand dollars in fees. Inconsistent format depending on who built it. Financial model only if you hire a financial analyst. And no guaranteed output — sometimes the business case just never gets finished.',
        'BCA.AI: ten minutes. Eight cents. Investment-grade financial analysis. Vendor evaluation. Traceability matrix. Implementation roadmap. Executive report. And a twelve-section Business Requirements Document in Microsoft Word format.',
        'The AAFES scenario we just walked through — fourteen million military customers, a $9.5 billion retail operation, a $4.2 million decision — analyzed in full in the time it takes to make a cup of coffee.',
        'Fourteen questions. Six phases. One downloadable business case.',
        'Business cases at the speed of business.',
        'BCA.AI.',
      ],['Animate the stat comparison as narrator reads: "6-8 weeks" strikes through, "10 minutes" appears. "$100K" strikes through, "$0.08" appears. End on BCA.AI logo with URL. Hold 5 seconds. Fade to black.']),
      p('',[],{spacing:{before:180,after:180}}),
      p([tx('BCA.AI  |  Explainer Video Script  |  v1.0  |  April 2026',{size:18,color:DGRAY,italics:true})],{alignment:AlignmentType.CENTER}),
    ]},
  ],
});

Packer.toBuffer(doc).then(buf=>{fs.writeFileSync(OUT,buf);console.log('✅',OUT,'('+Math.round(buf.length/1024)+' KB)');}).catch(e=>{console.error('❌',e.message);process.exit(1);});
