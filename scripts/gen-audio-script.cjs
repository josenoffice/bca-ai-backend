#!/usr/bin/env node
'use strict';
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, HeadingLevel, AlignmentType, BorderStyle, WidthType,
  ShadingType, PageNumber, LevelFormat, PageBreak, VerticalAlign } = require('docx');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '..', 'BCA_AI_Audio_Script.docx');

const NAVY='1B3A5C',BLUE='2E75B6',LIGHT='D5E8F0',AMBER='FFF3CD',GREEN='D4EDDA',WHITE='FFFFFF',DGRAY='666666',MGRAY='F5F5F5';
const b=(t,o={})=>new TextRun({text:t,bold:true,...o});
const tx=(t,o={})=>new TextRun({text:t,...o});
const p=(c,o={})=>new Paragraph({children:Array.isArray(c)?c:[tx(c)],spacing:{before:80,after:80},...o});
const pb=()=>new Paragraph({children:[new PageBreak()]});
const bdr={style:BorderStyle.SINGLE,size:1,color:'CCCCCC'};
const brs={top:bdr,bottom:bdr,left:bdr,right:bdr};
const mg={top:80,bottom:80,left:120,right:120};
const h1=(t)=>new Paragraph({heading:HeadingLevel.HEADING_1,children:[new TextRun({text:t,bold:true,color:NAVY})],spacing:{before:360,after:180}});
const h2=(t)=>new Paragraph({heading:HeadingLevel.HEADING_2,children:[new TextRun({text:t,bold:true,color:BLUE})],spacing:{before:240,after:120}});

// HOST voice line (Sarah Chen)
const H=(text,note='')=>new Table({width:{size:9360,type:WidthType.DXA},columnWidths:[9360],rows:[
  new TableRow({children:[new TableCell({borders:brs,margins:{top:80,bottom:80,left:180,right:180},
    width:{size:9360,type:WidthType.DXA},shading:{fill:'E8F4FD',type:ShadingType.CLEAR},
    children:[
      p([b('HOST (Sarah):  ',{size:18,color:BLUE}),tx(text,{size:21})]),
      ...(note?[p([tx('  ['+note+']',{size:17,italics:true,color:DGRAY})])]:[] ),
    ]})]}),
]});

// EXPERT voice line (Marcus)
const E=(text,note='')=>new Table({width:{size:9360,type:WidthType.DXA},columnWidths:[9360],rows:[
  new TableRow({children:[new TableCell({borders:brs,margins:{top:80,bottom:80,left:180,right:180},
    width:{size:9360,type:WidthType.DXA},shading:{fill:LIGHT,type:ShadingType.CLEAR},
    children:[
      p([b('EXPERT (Marcus):  ',{size:18,color:NAVY}),tx(text,{size:21})]),
      ...(note?[p([tx('  ['+note+']',{size:17,italics:true,color:DGRAY})])]:[] ),
    ]})]}),
]});

// Direction / note
const DIR=(text)=>new Table({width:{size:9360,type:WidthType.DXA},columnWidths:[9360],rows:[
  new TableRow({children:[new TableCell({borders:brs,margins:{top:60,bottom:60,left:180,right:180},
    width:{size:9360,type:WidthType.DXA},shading:{fill:AMBER,type:ShadingType.CLEAR},
    children:[p([b('DIRECTION:  ',{size:17}),tx(text,{size:17,italics:true})])]})]}),
]});

const sp=()=>p('',[],{spacing:{before:80,after:80}});
const secHead=(t,dur)=>new Paragraph({heading:HeadingLevel.HEADING_2,
  children:[new TextRun({text:t,bold:true,color:BLUE}),new TextRun({text:`    ▸  ${dur}`,color:DGRAY,size:20})],
  spacing:{before:280,after:120}});

const callout=(fill,label,lines)=>new Table({width:{size:9360,type:WidthType.DXA},columnWidths:[9360],
  rows:[new TableRow({children:[new TableCell({borders:brs,margins:{top:100,bottom:100,left:180,right:180},
    width:{size:9360,type:WidthType.DXA},shading:{fill,type:ShadingType.CLEAR},
    children:[p([label]),...lines.map(l=>p([tx(l,{size:20})]))]})]})]});

const doc=new Document({
  styles:{default:{document:{run:{font:'Arial',size:22}}},paragraphStyles:[
    {id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,
      run:{size:36,bold:true,font:'Arial',color:NAVY},paragraph:{spacing:{before:360,after:180},outlineLevel:0}},
    {id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',quickFormat:true,
      run:{size:28,bold:true,font:'Arial',color:BLUE},paragraph:{spacing:{before:240,after:120},outlineLevel:1}},
  ]},
  sections:[
    // Cover
    {properties:{page:{size:{width:12240,height:15840},margin:{top:1440,right:1440,bottom:1440,left:1440}}},
    children:[
      p('',[],{spacing:{before:1800}}),
      new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'BCA.AI',bold:true,size:72,color:NAVY,font:'Arial'})],spacing:{before:0,after:120}}),
      new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'Podcast-Style Audio Review Script',size:36,color:BLUE,font:'Arial'})],spacing:{before:0,after:240}}),
      new Paragraph({alignment:AlignmentType.CENTER,border:{bottom:{style:BorderStyle.SINGLE,size:4,color:BLUE,space:4}},
        children:[new TextRun({text:'2 Voices  |  ~15 Minutes  |  Conversational  |  AAFES Case Study Walkthrough',bold:true,size:26,font:'Arial'})],
        spacing:{before:120,after:480}}),
      callout(LIGHT,b('Cast & Format:',{size:22}),[
        'HOST — Sarah Chen: Enterprise technology podcast host. Curious, skeptical, asks the questions a CFO would ask.',
        'EXPERT — Marcus Webb: Enterprise IT strategist and BCA.AI practitioner. Knowledgeable but conversational. Uses concrete numbers.',
        '',
        'Format: Interview-style dialogue. Not scripted-sounding. Natural interruptions and follow-up questions are good.',
        'Recording tip: Record each voice separately for editing flexibility. Target 130-140 words per minute each.',
        'Total word count: ~1,950 words  |  Estimated runtime: 14-16 minutes',
      ]),
      p('',[],{spacing:{before:480}}),
      new Table({width:{size:9360,type:WidthType.DXA},columnWidths:[700,3000,1800,2000,1860],rows:[
        new TableRow({children:[
          new TableCell({borders:brs,margins:mg,width:{size:700,type:WidthType.DXA},shading:{fill:NAVY,type:ShadingType.CLEAR},children:[p([b('#',{color:WHITE,size:20})])]}),
          new TableCell({borders:brs,margins:mg,width:{size:3000,type:WidthType.DXA},shading:{fill:NAVY,type:ShadingType.CLEAR},children:[p([b('Section',{color:WHITE,size:20})])]}),
          new TableCell({borders:brs,margins:mg,width:{size:1800,type:WidthType.DXA},shading:{fill:NAVY,type:ShadingType.CLEAR},children:[p([b('Time',{color:WHITE,size:20})])]}),
          new TableCell({borders:brs,margins:mg,width:{size:2000,type:WidthType.DXA},shading:{fill:NAVY,type:ShadingType.CLEAR},children:[p([b('Key Moment',{color:WHITE,size:20})])]}),
          new TableCell({borders:brs,margins:mg,width:{size:1860,type:WidthType.DXA},shading:{fill:NAVY,type:ShadingType.CLEAR},children:[p([b('Words',{color:WHITE,size:20})])]}),
        ]}),
        ...([
          ['1','Introduction & The Problem',   '0:00 – 2:30','Setting the AAFES scene','~325'],
          ['2','The Intake Form',               '2:30 – 5:30','Industry awareness revelation','~390'],
          ['3','Phase 1 — AI Solutions',        '5:30 – 8:00','What "investment-grade" means','~325'],
          ['4','Phase 2 — The Financials',      '8:00 – 10:00','$8.4M NPV moment','~260'],
          ['5','The Debate: Why NOT Cloud-Native?','10:00 – 12:00','The constraint-driven win','~260'],
          ['6','Phase 6 — The BRD',             '12:00 – 14:00','CFO moment of truth','~260'],
          ['7','Closing — What Surprised You?', '14:00 – 15:30','The $0.08 punchline','~130'],
        ].map(([n,sec,time,key,wc])=>new TableRow({children:[
          new TableCell({borders:brs,margins:mg,width:{size:700,type:WidthType.DXA},shading:{fill:LIGHT,type:ShadingType.CLEAR},children:[p([b(n,{size:20})])]}),
          new TableCell({borders:brs,margins:mg,width:{size:3000,type:WidthType.DXA},shading:{fill:'FFFFFF',type:ShadingType.CLEAR},children:[p([tx(sec,{size:20})])]}),
          new TableCell({borders:brs,margins:mg,width:{size:1800,type:WidthType.DXA},shading:{fill:'FFFFFF',type:ShadingType.CLEAR},children:[p([tx(time,{size:20})])]}),
          new TableCell({borders:brs,margins:mg,width:{size:2000,type:WidthType.DXA},shading:{fill:'FFFFFF',type:ShadingType.CLEAR},children:[p([tx(key,{size:20})])]}),
          new TableCell({borders:brs,margins:mg,width:{size:1860,type:WidthType.DXA},shading:{fill:'FFFFFF',type:ShadingType.CLEAR},children:[p([tx(wc,{size:20})])]}),
        ]})))
      ]}),
      pb(),
    ]},
    // Script
    {properties:{page:{size:{width:12240,height:15840},margin:{top:1440,right:1440,bottom:1440,left:1440}}},
    headers:{default:new Header({children:[new Paragraph({border:{bottom:{style:BorderStyle.SINGLE,size:4,color:BLUE,space:4}},
      children:[new TextRun({text:'BCA.AI  —  Audio Review Script  |  Sarah Chen & Marcus Webb  |  ~15 min',bold:true,font:'Arial',size:18,color:NAVY})]})]}),},
    footers:{default:new Footer({children:[new Paragraph({border:{top:{style:BorderStyle.SINGLE,size:2,color:'CCCCCC',space:4}},
      alignment:AlignmentType.CENTER,children:[new TextRun({text:'Page ',font:'Arial',size:18,color:DGRAY}),
        new TextRun({children:[PageNumber.CURRENT],font:'Arial',size:18,color:DGRAY}),
        new TextRun({text:' of ',font:'Arial',size:18,color:DGRAY}),
        new TextRun({children:[PageNumber.TOTAL_PAGES],font:'Arial',size:18,color:DGRAY})]})]})},
    children:[
      h1('Full Audio Script'),
      DIR('Music bed fades in — light, forward-moving. Fade under as host begins.'),
      sp(),

      secHead('SECTION 1 — Introduction & The Problem','0:00 – 2:30'),
      H('Welcome back to Enterprise Tech Brief. I\'m Sarah Chen. Today we are doing something a little different — a live walkthrough of an AI platform I\'ve been hearing a lot about. My guest is Marcus Webb, enterprise IT strategist. Marcus, you\'ve actually been using BCA.AI in the field. Let\'s start simple: what is it?'),
      sp(),E('BCA.AI is a business case analysis platform. You feed it a problem — a technology decision, an infrastructure upgrade, a compliance initiative — and in about ten minutes it produces a complete, investment-grade business case. Financial analysis, vendor evaluation, requirements documentation. The whole package.'),
      sp(),H('Ten minutes.'),
      sp(),E('Ten minutes. And it costs eight cents.'),
      sp(),H('Eight cents.'),
      sp(),E('Eight cents in AI API costs. Yes.'),
      sp(),H('Okay. Before we get into how, let\'s talk about why this matters. Set the scene for me.'),
      sp(),E('Sure. So picture this. You\'re the IT Director at AAFES — the Army and Air Force Exchange Service. They\'re a $9.5 billion retail operation. They run stores on military bases worldwide — CONUS, and overseas. Korea, Germany, Japan. And they\'ve got a payment system that\'s been running on 2008 infrastructure.'),
      sp(),H('2008.'),
      sp(),E('2008. And it\'s starting to fail. In the past six months, twenty-three percent of transactions at overseas locations have been declined. Not fraud. Just aging infrastructure that can\'t handle the network conditions at remote military bases.'),
      sp(),H('So military families can\'t buy groceries.'),
      sp(),E('Can\'t buy groceries. Can\'t fill prescriptions. And on top of that, there\'s a hard compliance deadline — PCI-DSS 4.0 — in twelve months. Miss it and you\'re looking at fines of up to a hundred thousand dollars per month and potential loss of card processing privileges.'),
      sp(),H('That\'s a serious problem. And before BCA.AI, what does building a business case for that problem actually look like?'),
      sp(),E('It looks like six to eight weeks. You engage a consulting firm — fifty thousand dollars at minimum, more like seventy-five for a comprehensive engagement. They interview your stakeholders. They build a financial model in Excel. They produce a forty-page PowerPoint. And there\'s a decent chance the deck arrives after the decision window has already closed — the budget cycle moved on, or leadership shifted priorities.'),
      sp(),H('So you\'re spending fifty thousand dollars on a document that might be too late to be useful.'),
      sp(),E('Exactly. And that\'s if you can afford the consulting engagement. Mid-level IT directors at government organizations often can\'t. They\'re building the business case themselves, at night, in Excel, hoping it\'s good enough to get past the CFO.'),
      sp(),sp(),

      secHead('SECTION 2 — The Intake Form','2:30 – 5:30'),
      H('So you open BCA.AI. What\'s the first thing you see?'),
      sp(),E('A conversational intake form. Fourteen questions. Step by step. The first thing it asks is your industry. And that single selection — I pick government-retail — changes everything downstream.'),
      sp(),H('Changes how?'),
      sp(),E('The symptom cards change. The KPI options change. The stakeholder list shows AAFES\'s actual organizational structure — their directorates, their regional commands, franchise partners, external oversight bodies like DFAS and DCMA. The discount rate on the financial parameters defaults to eight percent, which is the DoD Non-Appropriated Fund standard. Most generic tools don\'t even know what NAF means.'),
      sp(),H('So it knows who you are before you tell it.'),
      sp(),E('Within one selection. And then the questions are guided in a way that removes the blank-page problem. When it asks what symptoms you\'re experiencing — you don\'t type into a box. You click cards. Legacy payment infrastructure. OCONUS connectivity failures. Inventory visibility gaps. Click the ones that apply. The platform starts building its understanding.'),
      sp(),H('What about the harder questions? Like quantifying the cost of doing nothing?'),
      sp(),E('This is one of my favorite features. The Status Quo option has a built-in Cost-of-Inaction calculator. You enter: how many incidents per year, average cost per incident, your compliance risk exposure, revenue at risk, staff workaround costs. It adds them up. In the AAFES scenario, the total came to two million, two hundred thirty thousand dollars. Per year. Just to do nothing.'),
      sp(),H('And that number follows through the whole analysis?'),
      sp(),E('It flows directly into the financial model. So when Phase 2 computes the NPV for Status Quo, it\'s incorporating that two-point-two-three million as the annual cost. The comparison between doing nothing and investing four point two million in a modern platform becomes concrete.'),
      sp(),H('What\'s the most surprising question in the intake?'),
      sp(),E('The KPI question. It shows you eighteen tiles — each with a description. Transaction Approval Rate. Customer Satisfaction Score. System Uptime. Inventory Accuracy. And each tile has a target value field. So you\'re not just saying "we care about uptime." You\'re saying "we need ninety-nine point nine percent uptime." That target propagates through the entire analysis. The recommended solution gets evaluated against whether it can plausibly hit that number.'),
      sp(),sp(),

      secHead('SECTION 3 — Phase 1: AI Solution Generation','5:30 – 8:00'),
      H('Fourteen questions, you click Launch. What happens?'),
      sp(),E('Two AI calls run in parallel. One generates solutions. One generates requirements. About twenty seconds.'),
      sp(),H('And you get what?'),
      sp(),E('Five alternatives. Not five generic options. Five AAFES-specific solutions, each with a real name, a description, a benefit analysis, an implementation risk profile, and an AI confidence score.'),
      sp(),H('What were the five in your run?'),
      sp(),E('Status Quo — maintain the existing infrastructure and absorb the cost of inaction. Military Star Card Platform Overhaul — full replacement of the ECP platform with cloud-native architecture, offline processing for OCONUS. Hybrid Omnichannel Modernization — keep the POS systems, add middleware, add mobile payments. Cloud-Native Full Stack — complete infrastructure replacement, the most ambitious option. And AI Analytics Layer — add fraud detection and analytics on top of the existing infrastructure without replacing it.'),
      sp(),H('So it surfaced five meaningfully different options, not just variations on the same thing.'),
      sp(),E('Right. And each one traces back to the specific pain points and KPIs you entered. The requirements aren\'t vague either. REQ-001: Real-time transaction processing across all OCONUS locations. REQ-002: Offline payment capability with automatic sync when connectivity restores. REQ-003: PCI-DSS 4.0 compliance by December 2026. Structured. Numbered. Traceable.'),
      sp(),H('What does "traceable" mean in practice?'),
      sp(),E('Phase 3 builds a traceability matrix. Every KPI connects to every solution connects to every requirement. So if your CFO asks "how does the Military Star Overhaul affect our Transaction Approval Rate?" — you point to the matrix. The connection is documented, not asserted.'),
      sp(),H('And what about vendor selection?'),
      sp(),E('Phase 1.6 researches three vendors per solution. Scores them on compatibility with your tech stack, price, compliance capabilities, support quality, and customer references. For payment infrastructure, you might see Fiserv, FIS, and Visa scored against each other. That\'s a vendor evaluation that normally requires a separate RFI process.'),
      sp(),sp(),
      pb(),

      secHead('SECTION 4 — Phase 2: The Financial Model','8:00 – 10:00'),
      H('The part that usually kills people. The financials.'),
      sp(),E('Phase 2 is pure mathematics. No more AI calls. It runs in under a second using the financial parameters you entered — the budget, the time horizon, the discount rate. DCF modeling across all five alternatives.'),
      sp(),H('What did the numbers look like for your AAFES scenario?'),
      sp(),E('The Military Star Card Platform Overhaul: portfolio NPV of eight point four million dollars. Internal Rate of Return: thirty-four point two percent. Payback period: twenty-eight months. Three-year ROI: three hundred twelve percent.'),
      sp(),H('Those are strong numbers. Where do they come from? What\'s the benefit side of the model?'),
      sp(),E('The benefit side draws from the problem inputs. The two point two three million cost of inaction becomes an annual saving when you implement the solution. The platform also factors in the revenue that was at risk from the twenty-three percent OCONUS decline rate — if you fix the transaction approval rate, you capture that revenue. And it uses the KPI targets to estimate benefit realization over the five-year horizon.'),
      sp(),H('And the Status Quo in the model?'),
      sp(),E('Negative NPV. Deeply negative by year five. Because the cost of inaction compounds. You\'re spending two point two three million per year and getting nothing back. That comparison is the argument for investment. The model makes it automatically.'),
      sp(),H('How does a mid-level manager without a finance background know if those numbers are right?'),
      sp(),E('The inputs are transparent — you put in the budget, the revenue figure, the discount rate. The methodology is standard DCF. The AI Reflection phase — Phase 1-Reflection — scores the quality of the analysis and flags if anything looks weak. It\'s not a black box. You can see the math.'),
      sp(),sp(),

      secHead('SECTION 5 — The Debate: Why Not Cloud-Native?','10:00 – 12:00'),
      H('Here\'s a question I\'d push back on. Cloud-Native Full Stack sounds more comprehensive. Full replacement, modern from day one. Why didn\'t that win?'),
      sp(),E('Great challenge. And this is exactly what Phase 4 is for. Cloud-Native scored higher on long-term financial projections — better NPV by year five. But it scored significantly lower on two dimensions: implementation complexity and compliance readiness timeline.'),
      sp(),H('Explain the compliance piece.'),
      sp(),E('Cloud-Native Full Stack is a thirty-month implementation. But the PCI-DSS 4.0 deadline is in twelve months. That\'s not a preference — that\'s a disqualifying constraint. If you miss that deadline, you\'re paying up to a hundred thousand dollars a month in fines while your new system is still being deployed. The weighted scoring algorithm incorporates that urgency because you said "high urgency, compliance deadline within twelve months" in the intake.'),
      sp(),H('So the constraint you entered in question eleven literally changed which solution won.'),
      sp(),E('Directly. The urgency flag increases the weight on compliance readiness in Phase 4. Military Star Overhaul can be deployed in twelve to eighteen months — tight, but achievable. Cloud-Native can\'t. That\'s a structural difference, not a preference.'),
      sp(),H('What about the AI Analytics Layer? That was the cheapest option.'),
      sp(),E('One point two million versus four point two million — yes. But it doesn\'t fix the underlying problem. The payment infrastructure is still on 2008 systems. The OCONUS transaction failure rate doesn\'t improve materially. The AI layer helps with fraud detection and reporting, but it doesn\'t address offline payment capability or the aging ECP platform. The compliance gap remains.'),
      sp(),H('So it scored low on what dimension?'),
      sp(),E('Strategic fit. Twenty-five percent of the composite score. The solution doesn\'t address the stated KPIs — Transaction Approval Rate and System Uptime don\'t move enough to justify the compliance risk. The scoring surfaces that.'),
      sp(),H('And the recommendation was clear?'),
      sp(),E('Military Star Card Platform Overhaul. Score: eighty-seven out of one hundred. High confidence. The recommendation narrative explains the reasoning — references the compliance deadline, the financial performance, the implementation feasibility. It\'s not just a number. It\'s a case.'),
      sp(),sp(),

      secHead('SECTION 6 — Phase 6: The Business Requirements Document','12:00 – 14:00'),
      H('And then you get a Word document.'),
      sp(),E('Phase 6. You click Generate BRD. Two more AI calls run in parallel. About six seconds.'),
      sp(),H('What\'s in it?'),
      sp(),E('Twelve sections. Executive Summary. Business Justification. Problem Statement. Project Objectives — written as SMART objectives tied to your KPIs. Full functional requirements with sub-requirements — each of the five requirements from Phase 1 gets expanded into five detailed sub-requirements, so you end up with twenty-five traceable functional requirements. Non-Functional Requirements by category. A RACI matrix. The implementation timeline. Risk Assessment with mitigations. Assumptions and Constraints. Approval and Sign-off block with signatory lines.'),
      sp(),H('That\'s a complete document.'),
      sp(),E('Cover page. Table of contents. Page numbers. Headers and footers. The document your board needs. The document your procurement office needs. The document your Authority to Operate review team needs.'),
      sp(),H('And it\'s editable?'),
      sp(),E('Every section. Direct text edit, or you give the AI an instruction — "make this more concise," "add a reference to the PCI-DSS deadline" — and it rewrites that section alone. Add custom sections. Delete sections you don\'t need. When you\'re satisfied: download as .docx.'),
      sp(),H('You showed this to your CFO?'),
      sp(),E('She asked which consulting firm produced it.'),
      sp(),H('[laughs] That\'s the line right there.'),
      sp(),E('And when I told her it was AI-generated in six seconds and cost two cents, she asked when we could run it on the other twelve initiatives in our portfolio.'),
      sp(),sp(),

      secHead('SECTION 7 — Closing','14:00 – 15:30'),
      H('Final question. What surprised you most?'),
      sp(),E('Two things. One: the quality held up. I expected corners to be cut. The financial model to be shallow. The requirements to be generic. None of that. The NPV calculation uses standard DCF methodology. The requirements have real IDs, real categories, real traceability. The BRD reads like it was written by a senior BA.'),
      sp(),H('And two?'),
      sp(),E('The AAFES-specific knowledge. I\'ve used other AI tools that treat "government" as a checkbox. BCA.AI knows what DoD NAF means. It knows the AAFES org chart. It knows DFAS and DCMA and Army G-8. It knows that OCONUS locations have unique connectivity constraints. That domain knowledge doesn\'t come from the user — it\'s baked into the platform.'),
      sp(),H('Who is this built for? Who\'s the target user?'),
      sp(),E('The IT Director who needs to justify a four million dollar investment to the CIO by Friday. The program manager who\'s never built a DCF model. The BU leader who knows the problem is real but can\'t put numbers to it. People who have important decisions to make and no support structure to help them make the case.'),
      sp(),H('Marcus Webb, enterprise IT strategist. Thank you.'),
      sp(),E('Thanks, Sarah.'),
      sp(),H('BCA.AI. We\'ll link the platform in the show notes. Fourteen questions. Six phases. Eight cents. You\'ve been listening to Enterprise Tech Brief.'),
      DIR('Music bed fades back in. Hold 5 seconds. Fade out.'),
      p('',[],{spacing:{before:180,after:180}}),
      p([tx('BCA.AI  |  Audio Review Script  |  v1.0  |  April 2026',{size:18,color:DGRAY,italics:true})],{alignment:AlignmentType.CENTER}),
    ]},
  ],
});

Packer.toBuffer(doc).then(buf=>{fs.writeFileSync(OUT,buf);console.log('✅',OUT,'('+Math.round(buf.length/1024)+' KB)');}).catch(e=>{console.error('❌',e.message);process.exit(1);});
