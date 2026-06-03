# Phase 5: Section 1 (One-Page Infographic) — Implementation Spec

## Architecture: Hybrid Approach

**Goal:** Executive decision-ready summary (30 seconds) followed by decision framework (5 minutes), with optional appendix for deep dive.

```
User Flow:
┌─────────────────────────────────────┐
│ Section 1: One-Page Infographic    │ ← 30 seconds
│ PROBLEM → SOLUTION → IMPACT → DECIDE│
└──────────────┬──────────────────────┘
               ↓
        [+ EXPAND FOR DETAILS]
               ↓
┌─────────────────────────────────────┐
│ Sections 2-12: Decision Framework   │ ← 5 minutes
│ Your Situation, Alternatives,       │
│ Recommended Solution, Risks, etc.   │
└──────────────┬──────────────────────┘
               ↓
        [+ VIEW APPENDIX]
               ↓
┌─────────────────────────────────────┐
│ Original 10 Components (Collapsible)│ ← 15 minutes
│ Financial tables, Value Chain, etc. │
└─────────────────────────────────────┘
```

---

## Section 1: One-Page Infographic

### Visual Layout

```
╔════════════════════════════════════════════════════════════════╗
║                  EXECUTIVE AT A GLANCE                         ║
║                                                                ║
║  Problem (🔴)          Solution (🟢)        Impact (💰)        ║
║  ─────────────        ─────────────        ─────────────       ║
║  Brief problem        Recommended          • $X PV (3Y)        ║
║  statement with       solution with        • Y% ROI            ║
║  impact on            approach badge       • Z months payback  ║
║  business             (🛒/⚙️/🔀)            • NN% confidence    ║
║                                                                ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │ Top 3 Risks                                            │   ║
║  │ 1. Risk A (Mitigation: ...)                            │   ║
║  │ 2. Risk B (Mitigation: ...)                            │   ║
║  │ 3. Risk C (Mitigation: ...)                            │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
║  Implementation Readiness: 72% ready (7/10 dimensions)         ║
║                                                                ║
║  [✅ APPROVE] [⚠️ REVIEW] [❌ REJECT] [→ MORE DETAILS]         ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

### Data Requirements

**From Phase 1-4:**
- Problem statement (from user intake or Phase 1 problem definition)
- Recommended solution name & approach type (🛒/⚙️/🔀)
- Financial metrics: PV, ROI, payback period
- Confidence score (from Phase 2 financial calc)
- Top 3 risks (from Phase 4 recommendation.topRisks or derived)
- Implementation readiness % (from Phase 4 adoption readiness)

**New Data Structure:**
```javascript
{
  section1: {
    problem: {
      statement: "...",
      businessImpact: "...",
      affectedUsers: "..."
    },
    solution: {
      name: "Recommended Solution",
      approach: "hybrid",  // 'buy', 'change', 'hybrid'
      approachLabel: "🔀 Hybrid",
      vendor: "Vendor Name (if applicable)"
    },
    impact: {
      portfolioPV3y: 2450000,
      avgROI: 185,
      paybackMonths: 8,
      confidencePct: 95
    },
    topRisks: [
      { title: "Risk A", likelihood: "Medium", impact: "High", mitigation: "..." },
      { title: "Risk B", likelihood: "High", impact: "Medium", mitigation: "..." },
      { title: "Risk C", likelihood: "Low", impact: "High", mitigation: "..." }
    ],
    implementationReadiness: {
      overall: 72,
      dimensions: {
        "Stakeholder alignment": 85,
        "Budget approved": 90,
        "Resource availability": 65,
        "Process clarity": 70,
        "Vendor readiness": 80,
        "Change readiness": 50,
        "Risk mitigation plans": 75,
        "Success metrics defined": 80,
        "Executive sponsorship": 95,
        "Timeline feasibility": 65
      }
    }
  }
}
```

### Interactive Elements

1. **Decision Buttons** (bottom of infographic)
   - ✅ APPROVE — Mark decision as approved
   - ⚠️ REVIEW — Flag for further review
   - ❌ REJECT — Reject recommendation
   - → MORE DETAILS — Expand to Sections 2-12

2. **Tooltips** (hover)
   - Approach badge (🛒/⚙️/🔀) → explains approach type
   - Confidence % → explains confidence scoring
   - Risk risk row → drills into mitigation plan
   - Readiness % → shows radar chart of 10 dimensions

3. **Collapsible Sections**
   - Top 3 Risks → expands to full 5-10 risks
   - Implementation Readiness → shows radar chart
   - Alternatives (if relevant) → shows why other options didn't win

---

## Rendering in phase1-viewer.html

**Current Flow:**
1. `renderPhase5(d)` → generates HTML for health dashboard, KPI cards, value chain
2. Calls `downloadPhase5Html()` → opens phase5.js-generated report in iframe

**New Flow:**
1. `renderPhase5(d)` → generates SECTION 1 infographic at top
2. Below infographic: "+" button to expand Sections 2-12
3. Sections 2-12 rendered inline (not via iframe)
4. Download button still works (generates PDF with all sections)

**Architecture Decision:**
- Section 1 infographic: HTML generated in phase1-viewer.html (interactive)
- Sections 2-12: Can be either:
  - **Option A**: Generated in phase5.js, displayed via iframe (less interactive, but consistent with current approach)
  - **Option B**: Rendered in phase1-viewer.html like Section 1 (more interactive, but more code in viewer)

**Recommendation**: Use OPTION A for now (less breaking changes), then migrate to OPTION B in future if needed.

---

## Implementation Steps

### Step 1: Extend phase5.js to include Section 1 data
- In `buildExecutiveNarrative()`: add section1 object with problem, solution, impact, risks, readiness
- In `exportHtml()`: inject section1 data into htmlDocument (before current "Executive Summary" section)

### Step 2: Update phase1-viewer.html renderPhase5()
- Add rendering code for Section 1 infographic (before existing iframe)
- Make infographic collapsible (default: expanded with "collapse" option)
- Add decision buttons (Approve/Review/Reject/Details)

### Step 3: Create Section 1 HTML template
- Visual layout matching mockup above
- Responsive design (works on desktop and tablet)
- Print-friendly styling

### Step 4: Test & Verify
- Load demo data
- Check Section 1 renders correctly
- Test decision buttons
- Test expand/collapse
- Print to PDF

---

## Files to Modify

1. **routes/phase5.js**
   - Add `buildSection1Data()` function to extract problem, solution, impact, risks, readiness
   - Call it in `buildExecutiveNarrative()`
   - Include section1 object in htmlDocument

2. **phase1-viewer.html**
   - Add `renderSection1()` function to generate Section 1 HTML
   - Call it in `renderPhase5()` BEFORE existing content
   - Add decision button handlers
   - Add expand/collapse toggle

---

## Data Extraction Logic

### Problem Statement
- Source: Phase 1 "user problem intake" field
- Fallback: "Portfolio covers {N} solutions to address business requirements"
- Business Impact: From Phase 1 "what's the financial impact if unsolved?"
- Affected Users: From Phase 1 org friction analysis

### Top 3 Risks
- Source: Phase 4 `recommendation.topRisks` array
- If not available: Derive from quality warnings + org friction
- Show likelihood, impact, mitigation

### Implementation Readiness
- Source: Phase 4 adoption readiness scoring
- 10 dimensions: stakeholder alignment, budget, resources, process clarity, vendor readiness, change readiness, risk plans, metrics, sponsorship, timeline
- Calculate overall as average of 10 dimensions

---

## Success Criteria

✅ Section 1 infographic displays at top of Phase 5  
✅ Executive can review decision in 30 seconds  
✅ Decision buttons functional (Approve/Review/Reject/Details)  
✅ Expand/collapse toggles between Section 1 and Sections 2-12  
✅ Appendix accessible via "+ VIEW APPENDIX" link  
✅ Responsive design works on mobile/tablet/desktop  
✅ PDF export includes all sections in proper order  
✅ No JavaScript errors  

---

## Design Notes

**Color Scheme:**
- Problem: 🔴 Red (#dc2626)
- Solution: 🟢 Green (#16a34a)
- Impact: 💰 Blue (#1976d2)
- Risks: 🟠 Orange (#ea580c)
- Ready: 🟢 Green gradient (0% red, 50% yellow, 100% green)

**Typography:**
- Headline: 18px, bold, color: var(--text-strong)
- Subheading: 14px, bold, color: var(--text-muted)
- Body: 13px, color: var(--text)
- Numbers: 24px, bold, color: var(--primary)

**Spacing:**
- Card padding: 20px 24px
- Section margin: 20px bottom
- Button gap: 12px

---

## Next: Section 2-12 Framework

After Section 1 is complete, we'll implement:
- Section 2: Your Situation (problem + impact analysis)
- Section 3: Alternatives Considered
- Section 4: Recommended Solution & Why
- Section 5: Risk & Mitigation
- Section 6: Scenarios (best/likely/worst case)
- Section 7: Assumptions & Data Quality
- Section 8: Stakeholder Alignment
- Section 9: Implementation Readiness
- Section 10: Success Definition
- Section 11: Quick Wins Timeline
- Section 12: Decision Framework & Next Steps
- Appendix: Original 10 components + detailed metrics

---

**Date:** June 3, 2026  
**Status:** Ready for implementation  
**Priority:** MUST-HAVE (Week 1 of Phase 5 roadmap)
