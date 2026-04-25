#!/usr/bin/env node
'use strict';
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, HeadingLevel, AlignmentType, BorderStyle, WidthType,
  ShadingType, PageNumber, LevelFormat, PageBreak, VerticalAlign } = require('docx');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '..', 'BCA_AI_Traditional_Intake_Spec.docx');

const NAVY='1B3A5C',BLUE='2E75B6',LIGHT='D5E8F0',AMBER='FFF3CD',GREEN='D4EDDA',WHITE='FFFFFF',DGRAY='666666',MGRAY='F5F5F5';
const b=(t,o={})=>new TextRun({text:t,bold:true,...o});
const tx=(t,o={})=>new TextRun({text:t,...o});
const p=(c,o={})=>new Paragraph({children:Array.isArray(c)?c:[tx(c)],spacing:{before:80,after:80},...o});
const pb=()=>new Paragraph({children:[new PageBreak()]});
const sp=(be=120,af=120)=>new Paragraph({children:[],spacing:{before:be,after:af}});
const bdr={style:BorderStyle.SINGLE,size:1,color:'CCCCCC'};
const brs={top:bdr,bottom:bdr,left:bdr,right:bdr};
const mg={top:80,bottom:80,left:120,right:120};
const mgW={top:100,bottom:100,left:180,right:180};

const h1=(t)=>new Paragraph({heading:HeadingLevel.HEADING_1,children:[new TextRun({text:t,bold:true,color:NAVY})],spacing:{before:360,after:180}});
const h2=(t)=>new Paragraph({heading:HeadingLevel.HEADING_2,children:[new TextRun({text:t,bold:true,color:BLUE})],spacing:{before:240,after:120}});
const h3=(t)=>new Paragraph({heading:HeadingLevel.HEADING_3,children:[new TextRun({text:t,bold:true})],spacing:{before:180,after:90}});
const bullet=(t,lv=0)=>new Paragraph({numbering:{reference:'bullets',level:lv},children:[tx(t,{size:21})],spacing:{before:40,after:40}});

const hdrCell=(t,fill=NAVY,w=2340)=>new TableCell({borders:brs,margins:mg,width:{size:w,type:WidthType.DXA},shading:{fill,type:ShadingType.CLEAR},verticalAlign:VerticalAlign.CENTER,children:[p([b(t,{color:WHITE,size:20})])]});
const datCell=(t,fill=WHITE,w=2340,bo=false)=>new TableCell({borders:brs,margins:mg,width:{size:w,type:WidthType.DXA},shading:{fill,type:ShadingType.CLEAR},children:[p(bo?[b(t,{size:20})]:[tx(t,{size:20})])]});
const multiCell=(children,fill=WHITE,w=2340)=>new TableCell({borders:brs,margins:mgW,width:{size:w,type:WidthType.DXA},shading:{fill,type:ShadingType.CLEAR},children});

const callout=(fill,label,lines)=>new Table({width:{size:9360,type:WidthType.DXA},columnWidths:[9360],rows:[new TableRow({children:[new TableCell({borders:brs,margins:mgW,width:{size:9360,type:WidthType.DXA},shading:{fill,type:ShadingType.CLEAR},children:[p([label]),...lines.map(l=>p([tx(l,{size:20})]))]})]})]});

// Section card: emoji badge + title + desc + fields + AAFES example
const secCard=(badge,num,title,desc,fields,aafesExample)=>{
  const rows=[
    new TableRow({children:[new TableCell({borders:brs,margins:{top:100,bottom:100,left:180,right:180},width:{size:9360,type:WidthType.DXA},shading:{fill:NAVY,type:ShadingType.CLEAR},children:[
      p([b(`${badge}  Section ${num}  —  ${title}`,{color:WHITE,size:22})])
    ]})]}),
    new TableRow({children:[new TableCell({borders:brs,margins:{top:80,bottom:60,left:180,right:180},width:{size:9360,type:WidthType.DXA},shading:{fill:MGRAY,type:ShadingType.CLEAR},children:[
      p([b('Purpose:  ',{size:18,color:BLUE}),tx(desc,{size:20,italics:true})])
    ]})]}),
    new TableRow({children:[new TableCell({borders:brs,margins:{top:100,bottom:80,left:180,right:180},width:{size:9360,type:WidthType.DXA},shading:{fill:WHITE,type:ShadingType.CLEAR},children:[
      p([b('Fields in this section:',{size:18})]),
      ...fields.map(f=>new Paragraph({numbering:{reference:'bullets',level:0},children:[tx(f,{size:20})],spacing:{before:40,after:40}}))
    ]})]}),
    new TableRow({children:[new TableCell({borders:brs,margins:{top:80,bottom:100,left:180,right:180},width:{size:9360,type:WidthType.DXA},shading:{fill:LIGHT,type:ShadingType.CLEAR},children:[
      p([b('AAFES Example Answer:',{size:18,color:BLUE})]),
      p([tx(aafesExample,{size:20,italics:true})])
    ]})]}),
  ];
  return new Table({width:{size:9360,type:WidthType.DXA},columnWidths:[9360],rows});
};

const doc=new Document({
  numbering:{config:[{reference:'bullets',levels:[
    {level:0,format:LevelFormat.BULLET,text:'\u2022',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:720,hanging:360}}}},
    {level:1,format:LevelFormat.BULLET,text:'\u25E6',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:1080,hanging:360}}}},
  ]}]},
  styles:{default:{document:{run:{font:'Arial',size:22}}},paragraphStyles:[
    {id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,run:{size:36,bold:true,font:'Arial',color:NAVY},paragraph:{spacing:{before:360,after:180},outlineLevel:0}},
    {id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',quickFormat:true,run:{size:28,bold:true,font:'Arial',color:BLUE},paragraph:{spacing:{before:240,after:120},outlineLevel:1}},
    {id:'Heading3',name:'Heading 3',basedOn:'Normal',next:'Normal',quickFormat:true,run:{size:24,bold:true,font:'Arial'},paragraph:{spacing:{before:180,after:90},outlineLevel:2}},
  ]},
  sections:[
    {properties:{page:{size:{width:12240,height:15840},margin:{top:1440,right:1440,bottom:1440,left:1440}}},
    children:[
      sp(1800),
      new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'BCA.AI',bold:true,size:72,color:NAVY,font:'Arial'})],spacing:{before:0,after:120}}),
      new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'Traditional Structured Intake Form',size:36,color:BLUE,font:'Arial'})],spacing:{before:0,after:240}}),
      new Paragraph({alignment:AlignmentType.CENTER,border:{bottom:{style:BorderStyle.SINGLE,size:4,color:BLUE,space:4}},
        children:[new TextRun({text:'BCA_Intake_App.html  |  11 Sections  |  All-Fields-Visible  |  AI Assistant + Email Draft',bold:true,size:26,font:'Arial'})],spacing:{before:120,after:480}}),
      callout(LIGHT,b('What this document covers:',{size:22}),[
        'The Traditional Intake is BCA.AI\'s second input path — a structured, multi-section form where all fields are visible at once.',
        'Unlike the conversational intake (14 guided questions, one at a time), the traditional form presents all sections in a tabbed panel.',
        'URL: /BCA_Intake_App.html  |  File: BCA_Intake_App.html  |  Size: 3,455 lines',
        'Both the conversational and traditional intakes feed the same 6-phase AI analysis engine.',
        'This document covers: all 11 sections, every field, AI assistant features, and AAFES example answers.',
      ]),
      sp(480),
      new Table({width:{size:9360,type:WidthType.DXA},columnWidths:[560,2200,3400,3200],rows:[
        new TableRow({children:[hdrCell('#',NAVY,560),hdrCell('Section Title',NAVY,2200),hdrCell('Primary Purpose',NAVY,3400),hdrCell('Key Fields',NAVY,3200)]}),
        ...([
          ['1','Background & Strategic Alignment','Frame where the initiative came from and why it fits org strategy','Initiative Name, Driver Type, Background, Why Now, Sponsor'],
          ['2','Initiative Scope','Define what is in and out of scope, which BUs are impacted','In Scope, Out of Scope, Impacted Teams, Change Management flag'],
          ['3','Problem Definition & Root Cause','Anchor the BCA in a specific problem with evidence and cost','Problem Statement, Cost to Business, Root Cause, Evidence'],
          ['4','Desired Outcomes','Define measurable after-state outcomes with KPIs and baselines','Outcome 1-3, Metric, Baseline, Target, Benefit Owner'],
          ['5','Current Technical Stack','Capture existing systems, integrations, data sensitivity','Primary Systems, Integration Requirements, Data Classification, Tech Debt'],
          ['6','High-Level Timeline & Cost','Three-point cost estimates with milestone plan','Budget Position, Up-front Cost (low/mid/high), Annual Ongoing, Go-Live Date, Milestones'],
          ['7','Cost Benefit Analysis','Structured breakdown of all cost categories for finance','Direct Up-Front Costs breakdown, Ongoing Costs (annual)'],
          ['8','Benefits','Tangible and intangible benefit description with owners','Tangible Benefits, Intangible Benefits (strategic/experience)'],
          ['9','Performance & Success Measures','3-5 KPIs with baselines, targets, measurement method, owner','KPI, Baseline, Target, How Measured, Owner, Timing'],
          ['10','Alternatives','Options analysis including Do Nothing and Build vs Buy','Do Nothing cost, Alternative 1, Build/Buy/Partner assessment, Must-Haves'],
          ['11','Conclusions & Recommendations','Final recommendation, key risks, assumptions','Recommendation Statement, Key Risks, Key Assumptions'],
        ].map(([n,t,pur,fields])=>new TableRow({children:[datCell(n,LIGHT,560,true),datCell(t,WHITE,2200,true),datCell(pur,MGRAY,3400),datCell(fields,WHITE,3200)]})))
      ]}),
      pb(),
    ]},
    {properties:{page:{size:{width:12240,height:15840},margin:{top:1440,right:1440,bottom:1440,left:1440}}},
    headers:{default:new Header({children:[new Paragraph({border:{bottom:{style:BorderStyle.SINGLE,size:4,color:BLUE,space:4}},children:[new TextRun({text:'BCA.AI  —  Traditional Intake Form Spec  |  BCA_Intake_App.html  |  11 Sections',bold:true,font:'Arial',size:18,color:NAVY})]})]})},
    footers:{default:new Footer({children:[new Paragraph({border:{top:{style:BorderStyle.SINGLE,size:2,color:'CCCCCC',space:4}},alignment:AlignmentType.CENTER,children:[new TextRun({text:'Page ',font:'Arial',size:18,color:DGRAY}),new TextRun({children:[PageNumber.CURRENT],font:'Arial',size:18,color:DGRAY}),new TextRun({text:' of ',font:'Arial',size:18,color:DGRAY}),new TextRun({children:[PageNumber.TOTAL_PAGES],font:'Arial',size:18,color:DGRAY})]})]})},
    children:[
      h1('Smart Features — AI Assistant + Contextual Guidance'),
      callout(GREEN,b('The Traditional Form is not a plain HTML form — it has 5 built-in intelligence layers:',{size:22}),[
        '1.  AI Assistant Panel (right-hand slide-out) — context-aware guidance per section. Asks clarifying questions, explains what finance needs from each field.',
        '2.  Inline Examples — each field has a retail-specific worked example shown below the input (green callout box). Shows the user what "good" looks like.',
        '3.  Suggestion Chips — above key fields, clickable chips inject pre-written starter phrases. Similar to the conversational form\'s prompt scaffold.',
        '4.  Section Readiness Dots — each tab shows a readiness indicator (dots) showing how complete the section is. Users see "0 of 11 sections" progress pill.',
        '5.  Email Draft Feature — a "Get IT to validate your tech stack" trigger in Section 5 that generates a pre-written email to send to the IT team, with the current tech stack pre-filled.',
      ]),
      sp(120),

      h1('All 11 Sections — Full Specification'),
      sp(),

      secCard('📌','1','Background & Strategic Alignment',
        'Frame where the initiative came from and why it fits the organisation\'s strategic direction. This is the first thing approvers read.',
        [
          'Initiative Name (required) — short, descriptive, outcome-oriented name',
          'Primary Driver (required) — radio: Underperformance / Compliance & Risk / Competitive Pressure / Strategic Direction / New Opportunity / Operational Risk',
          'Conditional sub-fields based on driver:',
          '  → Underperformance: "What is performing below standard?"',
          '  → Compliance: "Name the regulation" + "Compliance deadline"',
          '  → Competitive: "What specifically have competitors done?"',
          '  → Strategic: "Name the specific strategic objective this delivers"',
          '  → Opportunity: "Describe the opportunity specifically"',
          '  → Operational Risk: "Describe the operational risk specifically"',
          'Background (required) — current situation in 2-3 sentences',
          'Why Now (required) — urgency driver in 1-2 sentences',
          'Executive Sponsor — name and title',
          'BCA Author / Submitter — name and role',
        ],
        '"Exchange Card Modernization Initiative" | Driver: Compliance & Risk | Regulation: PCI-DSS 4.0 | Deadline: December 2026 | Background: AAFES payment infrastructure from 2008. 23% of OCONUS transactions declining. 14M military customers affected. Why Now: Compliance deadline in 12 months. Non-compliance = up to $100K/month fine.'
      ),
      sp(120),

      secCard('📐','2','Initiative Scope',
        'Define clearly what this initiative will and will not do. Prevents scope creep and budget disputes.',
        [
          'In Scope (required) — free text, bullet list what IS included',
          'Out of Scope (required) — free text, what is explicitly excluded',
          'Impacted Teams / Business Units (required) — checkbox list or free text',
          'Change Management flag — yes/no: does this include change management and training?',
        ],
        'IN SCOPE: Military Star / ECP platform replacement, OCONUS offline payment capability, PCI-DSS 4.0 compliance module, mobile payment enablement, fraud detection upgrade. OUT OF SCOPE: Store POS hardware replacement, loyalty program redesign, ShopMyExchange.com ecommerce platform. IMPACTED TEAMS: HQ IT, Exchange Card Program, Finance & Accounting, 250 FTE across 4 regional commands.'
      ),
      sp(120),

      secCard('🔍','3','Problem Definition & Root Cause',
        'Anchor everything in a specific problem with evidence. Leadership needs to understand what is broken, how bad it is, what it costs, and why it keeps happening.',
        [
          'Problem Statement (required) — specific, quantified, one paragraph',
          'Cost to Business (required) — cost table: revenue impact, compliance risk, operational cost, staff workarounds, customer impact',
          'Root Cause (required) — why is this problem happening? (not symptoms)',
          'Evidence (optional) — data, audit findings, incident reports, benchmarks',
        ],
        'PROBLEM: Military Star card ECP platform (2008 vintage) cannot process transactions in degraded network environments. Result: 23% decline rate at OCONUS locations. COST: $300K/yr revenue loss + $500K compliance risk + $180K staff workarounds + $50K CX impact + $1.2M incident remediation = $2.23M/yr. ROOT CAUSE: Legacy ECP architecture designed for stable LAN connectivity — no offline queuing, no real-time sync, no mobile payment protocol.'
      ),
      sp(120),

      secCard('🎯','4','Desired Outcomes',
        'Describe what the business looks like AFTER the project succeeds. Every outcome needs a metric, a baseline, and a target.',
        [
          'Outcome 1 (required) — description + metric + baseline + target + benefit owner',
          'Outcome 2 (optional) — same structure',
          'Outcome 3 (optional) — same structure',
          'Note: Each outcome row includes Metric Name, Current Baseline, Target, and Owner fields',
        ],
        'OUTCOME 1: Reliable payment processing at all AAFES locations. Metric: Transaction Approval Rate. Baseline: 76% OCONUS / 94% CONUS. Target: 99.5% all locations. Owner: VP IT. | OUTCOME 2: PCI-DSS 4.0 compliance achieved. Metric: Compliance assessment pass/fail. Baseline: 3 of 12 requirements failing. Target: 12 of 12 passing. Owner: CISO. | OUTCOME 3: Customer satisfaction improvement. Metric: CSAT Score. Baseline: 3.2/5.0. Target: 4.5/5.0. Owner: VP Customer Experience.'
      ),
      sp(120),
      pb(),

      secCard('💻','5','Current Technical Stack',
        'Capture existing systems, integration requirements, data sensitivity, and technical debt. IT can validate via the built-in email draft feature.',
        [
          'Primary Systems (required) — free text + chip selectors for known systems',
          'Integration Requirements — systems the new solution must connect to (ERP, CRM, etc.)',
          'Data Sensitivity flag — does this involve personal, sensitive, or regulated data?',
          'Technical Debt level — radio: Low / Moderate / High / Critical',
          'Email Draft Trigger — "📧 Get IT to validate your tech stack" — generates a pre-written email with current tech stack pre-filled, ready to send to IT contact',
        ],
        'PRIMARY SYSTEMS: NCR Counterpoint POS, Military Star ECP platform (legacy), Oracle Financials. INTEGRATIONS REQUIRED: DFAS (Defense Finance & Accounting), DISA NIPRNet, AWS GovCloud (new), Azure Government (new), CAC/PIV authentication layer. DATA SENSITIVITY: Yes — PII (cardholder data), financial transaction data, ITAR-controlled data. TECH DEBT: Critical — ECP platform is 16 years old with no vendor support. Email drafted to HQ IT cybersecurity team for stack validation.'
      ),
      sp(120),

      secCard('📅','6','High-Level Timeline & Cost',
        'Three-point cost estimates. Finance expects a range — it signals that you\'ve thought about uncertainty. Numbers here anchor the financial analysis in Section 7.',
        [
          'Budget Position (required) — radio: No budget approved / Budget indicatively approved / Full budget approved',
          'Direct Up-Front Cost — low / mid / high range estimate (three fields)',
          'Annual Ongoing Costs (post go-live) — low / mid / high range',
          'Indirect Costs — transition, productivity loss, management time estimate',
          'Target Go-Live Date (required) — date picker',
          'Milestone Table — phase name, description, target date (repeating rows)',
        ],
        'BUDGET: Budget indicatively approved. UP-FRONT COST: Low $3.8M / Mid $4.2M / High $5.1M. ANNUAL ONGOING: Low $380K / Mid $420K / High $510K. INDIRECT COSTS: ~$350K (250 FTE productivity impact during transition). GO-LIVE: December 2026. MILESTONES: Vendor selection (April 2026), Development complete (August 2026), CONUS pilot (October 2026), OCONUS rollout (December 2026).'
      ),
      sp(120),

      secCard('💰','7','Cost Benefit Analysis',
        'Structured breakdown for finance. Your job is complete, accurate inputs — finance builds the model from these numbers.',
        [
          'Direct Up-Front Costs — breakdown table: Software Licenses, Implementation Services, Hardware, Training, Contingency (each with low/mid/high)',
          'Direct Ongoing Costs — annual breakdown: Software Maintenance, Support, Hosting/Cloud, Internal IT FTE',
          'Note: The 6-phase AI analysis engine auto-computes NPV/IRR/ROI from these inputs in Phase 2',
        ],
        'UP-FRONT BREAKDOWN: Software/Licenses $1.4M | Implementation Services $2.1M | Hardware (OCONUS terminals) $0.4M | Training & Change Management $0.2M | Contingency (10%) $0.42M = Total $4.52M mid. ANNUAL ONGOING: SaaS maintenance $280K | Cloud hosting AWS GovCloud $90K | Support contract $50K = $420K/yr. Notes flagged for finance: DFAS reporting requirements add ~$80K implementation complexity.'
      ),
      sp(120),

      secCard('💎','8','Benefits',
        'Describe what the organisation gains. Finance calculates financial values — your job is to describe what changes, for whom, and by how much.',
        [
          'Tangible Benefits (quantifiable) — repeating rows: Benefit Description, Annual Value ($), Year Realized, Confidence Level, Benefit Owner',
          'Intangible Benefits (strategic / experience) — free text: description of non-quantifiable benefits',
        ],
        'TANGIBLE: (1) Recovered transaction revenue from OCONUS approval rate improvement: $2.3M/yr from year 1 | High confidence | VP IT. (2) Compliance fine avoidance: $500K-$1.2M/yr | Medium confidence | CFO. (3) Staff workaround elimination: $180K/yr | High confidence | VP Operations. INTANGIBLE: Mission delivery to military families improved. DoD trust maintained. AAFES positioned as benchmark for modernized government-retail payment infrastructure. Reduced reputational risk if incident escalates during peak holiday trading.'
      ),
      sp(120),
      pb(),

      secCard('📏','9','Performance & Success Measures',
        'How will you know this initiative worked? Define 3-5 KPIs with baselines, targets, measurement method, and named owner.',
        [
          'KPI table — repeating rows: KPI Name, Baseline, Target, How Measured, Owner, When Measured',
          'Each KPI row links back to the outcomes defined in Section 4',
          'Note: KPIs here map directly to the KPI tiles in the conversational intake',
        ],
        'KPI 1: Transaction Approval Rate | Baseline: 76% OCONUS | Target: 99.5% | Measured: Payment processor dashboard, monthly | Owner: VP IT. KPI 2: System Uptime | Baseline: 94.2% | Target: 99.9% | Measured: Infrastructure monitoring tool, real-time | Owner: HQ IT Director. KPI 3: Customer Satisfaction | Baseline: 3.2/5.0 | Target: 4.5/5.0 | Measured: Post-transaction survey, quarterly | Owner: VP Customer Experience. KPI 4: PCI-DSS Compliance Score | Baseline: 9/12 requirements | Target: 12/12 | Measured: Annual QSA assessment | Owner: CISO.'
      ),
      sp(120),

      secCard('🔀','10','Alternatives',
        'Document the options seriously considered. Most common reason BCAs are sent back: insufficient alternatives analysis.',
        [
          'Do Nothing — cost of inaction (required) — annual cost breakdown',
          'Alternative 1 — description, cost estimate, pros, cons',
          'Build vs Buy vs Partner assessment — structured comparison',
          'Absolute Must-Haves — non-negotiable requirements that any chosen solution must meet',
          'Why Now vs Deferring 6-12 months — urgency justification',
        ],
        'DO NOTHING: $2.23M/yr cost of inaction. PCI-DSS fine risk escalates to $1.2M/yr non-compliance by Q4 2026. ALTERNATIVE 1: Hybrid Omnichannel Modernization (middleware layer on existing ECP) — $2.8M, 18-24 months, does not solve OCONUS offline processing. ALTERNATIVE 2: AI Analytics Layer only — $1.2M, 6-9 months, does not address core compliance gap. BUILD vs BUY: Buy/configure strongly preferred — building payment infrastructure from scratch would require FinTech expertise AAFES does not have. MUST-HAVES: Offline OCONUS processing, PCI-DSS 4.0 compliance by Dec 2026, CAC/PIV authentication, FedRAMP authorization path. DEFER 6-12 months: Not possible — compliance deadline is fixed. Deferral = $100K/month fines starting Jan 2027.'
      ),
      sp(120),

      secCard('✅','11','Conclusions & Recommendations',
        'Your final argument. Synthesize everything into a clear recommendation. First thing approvers read after the summary — make it direct and confident.',
        [
          'Recommendation Statement (required) — one clear paragraph stating what to approve and why',
          'Key Risks — table: risk description, likelihood, impact, mitigation (2-4 rows)',
          'Key Assumptions — list of assumptions the financial case rests on',
        ],
        'RECOMMENDATION: Approve the Military Star Card Platform Overhaul (Alternative 2) at a total investment of $4.2M (mid estimate). This is the only alternative that achieves PCI-DSS 4.0 compliance by December 2026, restores OCONUS transaction approval rates to 99.5%, and delivers a positive ROI of 312% over 5 years with a 28-month payback period. Cost of inaction is $2.23M per year and growing. KEY RISKS: (1) Vendor delivery timeline risk — Medium likelihood, High impact — Mitigation: fixed-price contract with milestone payments. (2) OCONUS network dependency — Low likelihood, High impact — Mitigation: offline-first architecture required in RFP. KEY ASSUMPTIONS: 8% DoD NAF discount rate, $9.5B AAFES annual revenue base, 250 FTE impacted, benefits realized from month 6 post go-live.'
      ),
      sp(120),
      pb(),

      h1('AI Assistant Panel — Detailed Spec'),
      callout(AMBER,b('The AI Assistant is a slide-out panel on the right side of the form:',{size:22}),[
        'Triggered by: clicking the "Guide" toggle or any field help icon',
        'Context-aware: changes its guidance based on which section is currently active',
        'Functions: explains what the section is for, what finance needs from each field, what "good" looks like, common mistakes to avoid',
        'Suggestion chips: above each major text field, 3-5 clickable chips inject starter phrases directly into the field',
        'Does NOT auto-fill — user always controls content; AI only suggests and explains',
      ]),
      sp(60),
      h2('Email Draft Feature — Section 5'),
      p('The "Get IT to validate your tech stack" trigger in Section 5 generates a pre-written email:'),
      bullet('Subject: "BCA Review Request — Tech Stack Validation: [Initiative Name]"'),
      bullet('Body: Summarizes the systems the user has entered, asks IT to confirm, add missing systems, flag integration concerns'),
      bullet('The email is pre-filled with the current Section 5 data — IT just reviews and replies'),
      bullet('Designed to unblock business users who don\'t know their full tech stack (a common stalling point)'),
      sp(120),

      h1('Feature Comparison: Traditional vs Conversational'),
      new Table({width:{size:9360,type:WidthType.DXA},columnWidths:[2800,3280,3280],rows:[
        new TableRow({children:[hdrCell('Feature',NAVY,2800),hdrCell('Traditional Form',NAVY,3280),hdrCell('Conversational Intake',NAVY,3280)]}),
        ...([
          ['URL','BCA_Intake_App.html','/conversational-intake'],
          ['Layout','All 11 sections visible in tabs','One question at a time, step-by-step'],
          ['Navigation','Jump to any section anytime','Linear with back-navigation'],
          ['Fields visible','All fields in a section shown at once','Next field appears after current answered'],
          ['AI assistance','Side-panel assistant + suggestion chips + inline examples','Guide Me panels per question + prompt scaffold chips'],
          ['Demo / pre-fill','No built-in demo mode','Demo mode with full AAFES data (?demo=true)'],
          ['KPI input','Table with KPI, baseline, target, owner, timing rows','Tile cards with description + target value field'],
          ['Alternatives','Do Nothing + 2 freeform alternatives','5 cards multi-select + COI calculator + preferred star'],
          ['IT validation','Email draft feature for tech stack validation','No — user enters what they know'],
          ['Cost estimates','Three-point (low/mid/high) ranges','Single value per alternative'],
          ['Completion tracking','Progress pill (0 of 11 sections) + readiness dots per tab','Step progress indicator (1 of 14)'],
          ['Output','Same 6-phase AI analysis','Same 6-phase AI analysis'],
          ['Best for','Experienced BAs, formal procurement, known data','First-time users, executives, guided exploration'],
          ['Time to complete','20-45 minutes (more detail)','8-15 minutes (guided, faster)'],
        ].map(([feat,trad,conv])=>new TableRow({children:[datCell(feat,LIGHT,2800,true),datCell(trad,WHITE,3280),datCell(conv,WHITE,3280)]})))
      ]}),
      sp(120),
      p([tx('BCA.AI  |  Traditional Intake Form Spec  |  v1.0  |  April 2026',{size:18,color:DGRAY,italics:true})],{alignment:AlignmentType.CENTER}),
    ]},
  ],
});
Packer.toBuffer(doc).then(buf=>{fs.writeFileSync(OUT,buf);console.log('✅',OUT,'('+Math.round(buf.length/1024)+' KB)');}).catch(e=>{console.error('❌',e.message);process.exit(1);});
