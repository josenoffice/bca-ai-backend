---
name: bca-phase6-brd
description: >
  BCA.AI Phase 6 — Business Requirements Document Generation. Use this skill
  whenever building or running the Phase 6 endpoint for the Business Case
  Analyzer app. Triggers when user asks to: build the phase6 API route,
  generate the BRD, create BRD sections, build the .docx download, add AI
  rewrite for BRD sections, or test Phase 6 logic. Phase 6 uses a HYBRID
  approach: 2 parallel Claude API calls (narrative + requirements) plus 7
  instant JS-assembled sections = 12 total BRD sections. Receives Phase 5
  output (carries all Phase 1-5 data), produces editable sections, supports
  AI rewrite per section, and generates downloadable .docx with cover page,
  TOC, headers/footers, and page numbers.
---

# BCA Phase 6 — Business Requirements Document

## What this phase does (non-technical)

Takes the complete BCA pipeline output (Phases 1-5) and generates a formal
12-section Business Requirements Document. Users can edit sections inline,
request AI rewrites with custom instructions, add/delete custom sections,
and download the final BRD as a professional .docx file.

## Files in this skill

- `SKILL.md` — this file
- `output-shape.md` — exact JSON output shape for all 3 endpoints
- `output-shape.json` — concrete example JSON response
- `html-template.md` — frontend card/section rendering structure

---

## CRITICAL — Hybrid Architecture (AI + JS)

Phase 6 uses 3 parallel tracks via `Promise.all`:

| Track | Method | Sections | Cost |
|-------|--------|----------|------|
| **A — Narrative** | Claude API | 2 (Business Justification), 4 (Objectives), 10 (Risk) | ~$0.01 |
| **B — Requirements** | Claude API | 6 (Functional Reqs), 7 (Non-Functional Reqs) | ~$0.01 |
| **C — Assembly** | Pure JS | 1, 3, 5, 8, 9, 11, 12 | Free |

**Total: 2 API calls (~$0.02) + 7 JS sections (free)**

---

## Architecture (3 endpoints)

```
POST /api/phase6           — Generate 12 BRD sections (3 parallel tracks)
POST /api/phase6/rewrite   — AI rewrite single section per instruction
POST /api/phase6/download  — Generate .docx binary from sections
```

### Endpoint 1: POST /phase6

```
POST /api/phase6
      |
      ├── Track A (Claude) → businessJustification, projectObjectives, riskAssessment
      ├── Track B (Claude) → functionalRequirements, nonFunctionalRequirements
      └── Track C (JS)     → execSummary, problemStatement, scope, RACI, timeline,
      |                       assumptions/constraints, sign-off
      ↓
   mergeSections() → ordered 12-section array
      ↓
   return JSON (array-wrapped: [{ status, phase, trackingId, sections[], metadata }])
```

### Endpoint 2: POST /phase6/rewrite

```
POST /api/phase6/rewrite
  Input:  { sectionId, sectionTitle, currentContent, instruction }
  Output: [{ rewrittenContent: "..." }]
```

### Endpoint 3: POST /phase6/download

```
POST /api/phase6/download
  Input:  { sections[], metadata }
  Output: Binary .docx buffer (Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document)
```

---

## 12 BRD Sections — Data Source Map

| # | Section | Source | Data From |
|---|---------|--------|-----------|
| 1 | Executive Summary | JS | Phase 5 `report.sections.executiveSummary` or fallback template |
| 2 | Business Justification | AI | wizard `businessImpact`, Phase 2 financials, Phase 4 recommendation |
| 3 | Problem Statement | JS | wizard `currentState` + `currentPainPoints` |
| 4 | Project Objectives | AI | Phase 1 solutions + benefits → SMART objectives |
| 5 | Scope (In/Out) | JS | Phase 1 `solutions[]` + `descopedPortfolio[]` |
| 6 | Functional Requirements | AI | Phase 1 `requirements[]` → expanded sub-requirements (REQ-001.1..5) |
| 7 | Non-Functional Requirements | AI | wizard `complianceRequirements[]` + `technicalStack[]` → NFR categories |
| 8 | Stakeholders & RACI | JS | Template RACI matrix |
| 9 | Implementation Timeline | JS | Phase 3 `timeline.phases[]` + `projectTimeline` |
| 10 | Risk Assessment | AI | Phase 1 `riskLevel` + Phase 1.6 compliance gaps → mitigations |
| 11 | Assumptions & Constraints | JS | Phase 2 config (discountRate, timeHorizon) + wizard values |
| 12 | Approval & Sign-off | JS | Template signature block |

---

## Claude API Configuration

```javascript
const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 4096
const SYSTEM_PROMPT = `You are a senior business analyst writing formal sections of a Business Requirements Document (BRD). Write in clear, professional, third-person business English. Respond with valid JSON only — no markdown, no explanation.`
```

---

## Track A — Narrative Prompt

Inputs: wizard currentState, businessImpact, painPoints, Phase 2 financials (NPV, ROI, discountRate), Phase 4 recommendation.

Output JSON:
```json
{
  "businessJustification": "3-4 paragraphs of formal prose",
  "projectObjectives": ["SMART objective 1", "SMART objective 2", ...],
  "riskAssessment": [
    {"risk": "desc", "impact": "High|Medium|Low", "likelihood": "High|Medium|Low", "mitigation": "strategy"}
  ]
}
```

## Track B — Requirements Prompt

Inputs: Phase 1 `requirements[]`, wizard `complianceRequirements[]`, `technicalStack[]`.

Output JSON:
```json
{
  "functionalRequirements": [
    {"id": "REQ-001", "title": "...", "priority": "Must Have", "linkedSolutions": ["SOL-001"], "subRequirements": [{"id": "REQ-001.1", "description": "..."}]}
  ],
  "nonFunctionalRequirements": [
    {"category": "Compliance", "items": [{"id": "NFR-C01", "description": "...", "priority": "Must Have"}]}
  ]
}
```

---

## DOCX Generation (npm `docx` package)

The .docx includes:
- **Cover page**: "Business Requirements Document", project title, BU, v1.0, date
- **Table of Contents**: auto-generated
- **Page numbers**: footer ("Page X of Y")
- **Header**: "BCA.AI — {Project Title}"
- **12 numbered sections**: Heading1/Heading2 formatting
- **Formatted tables**: Requirements, RACI matrix, Timeline, Risk register
- **Signature block**: Role + Name + Title + Date + Signature lines

---

## Frontend Interaction Model

Each section card supports:
- **Edit** — textarea swap → Save/Cancel (converts to plain `content` string, source → 'user')
- **AI Rewrite** — instruction input → POST /phase6/rewrite → blue preview → Accept/Try Again/Undo
- **Delete** — confirm → remove → renumber
- **Add Custom Section** — prompt for title → append → auto-open edit
- **Download .docx** — POST /phase6/download with current sections → blob → auto-download

Source badges:
- `AI Generated` (blue) — sections 2, 4, 6, 7, 10
- `From Phase Data` (green) — sections 1, 3, 5, 9
- `Template` (gray) — sections 8, 11, 12
- `User Edited` (amber) — after manual edit

---

## Output shape

See `output-shape.md`. Array-wrapped: `res.json([{ ...payload }])`

---

## Testing checklist

- [ ] Returns array `[{...}]`
- [ ] `phase: '6'`
- [ ] `status: 'success'`
- [ ] 12 sections in `sections[]` array
- [ ] Sections 1, 3, 5, 8, 9, 11, 12 populated from phase data (instant)
- [ ] Sections 2, 4, 10 have AI narrative content
- [ ] Section 6 has expanded sub-requirements (REQ-001.1..5)
- [ ] Section 7 has NFR categories (Compliance, Performance, Security, Availability)
- [ ] Each section has `id`, `title`, `source`, `editable: true`
- [ ] `metadata` has projectTitle, industry, generatedAt
- [ ] POST /phase6/rewrite returns `[{ rewrittenContent }]`
- [ ] POST /phase6/download returns binary .docx
- [ ] .docx opens in Word with cover page, TOC, page numbers
- [ ] Server requires `CLAUDE_API_KEY` for /phase6 and /phase6/rewrite
