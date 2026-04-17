# Phase 6 — Frontend Card/Section Rendering Template

## Overview

Phase 6 renders in the `#section-phase6` SPA section. The UI has three layers:
1. **Metadata header** — dark gradient card with project info + action buttons
2. **Section cards** — 12 editable cards with source badges and action buttons
3. **Bottom action bar** — Add Custom Section button

---

## Metadata Header (dark gradient card)

```html
<div style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);color:#fff;border-radius:12px;padding:24px 28px;margin-bottom:24px;">
  <div style="font-size:20px;font-weight:800;">Business Requirements Document</div>
  <div style="font-size:14px;margin-top:6px;opacity:0.85;">{metadata.projectTitle}</div>
  <div style="display:flex;gap:20px;margin-top:14px;font-size:12px;opacity:0.7;">
    <span>Unit: {metadata.businessUnit}</span>
    <span>Industry: {metadata.industry}</span>
    <span>Generated: {metadata.generatedAt}</span>
  </div>
  <div style="display:flex;gap:10px;margin-top:16px;">
    <button onclick="p6DownloadDocx()">&#128196; Download .docx</button>
    <button onclick="p6AddCustomSection()">+ Add Custom Section</button>
  </div>
</div>
```

---

## Source Badges

Each section card displays a source badge indicating data origin:

| Source | Badge | Colour |
|--------|-------|--------|
| `ai` | `&#10022; AI Generated` | Blue (`#dbeafe` bg, `#1d4ed8` text) |
| `phase5`, `phase1`, `phase3`, `wizard` | `&#128202; From Phase Data` | Green (`#dcfce7` bg, `#15803d` text) |
| `user` | `&#9998; User Edited` | Amber (`#fef3c7` bg, `#92400e` text) |
| `template` | `&#128196; Template` | Gray (`#f3f4f6` bg, `#6b7280` text) |

---

## Section Card Template

```html
<div class="p6-card" id="p6-card-{idx}" style="border:1px solid var(--border-light);border-radius:10px;padding:20px 24px;margin-bottom:16px;background:var(--card-bg);">
  <!-- Header row -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
    <div>
      <span style="font-size:11px;color:var(--text-light);font-weight:700;">SECTION {section.id}</span>
      <h3 style="margin:2px 0 0;font-size:16px;font-weight:700;">{section.title}</h3>
    </div>
    <div>{sourceBadge}</div>
  </div>

  <!-- Content area (renders based on section type) -->
  <div id="p6-content-{idx}">{renderedContent}</div>

  <!-- Action buttons -->
  <div style="display:flex;gap:8px;margin-top:14px;padding-top:12px;border-top:1px solid var(--border-light);">
    <button onclick="p6EditSection({idx})">Edit</button>
    <button onclick="p6RewriteSection({idx})">&#10022; AI Rewrite</button>
    <button onclick="p6DeleteSection({idx})">Delete</button>
  </div>
</div>
```

---

## Section-Specific Content Rendering

### Plain Text Sections (1, 2, 3)
```html
<div style="white-space:pre-wrap;line-height:1.7;font-size:13px;">{section.content}</div>
```

### Objectives List (Section 4)
```html
<ol style="padding-left:20px;line-height:1.8;font-size:13px;">
  {section.objectives.map(o => <li>{o.text}</li>)}
</ol>
```

### Scope — In/Out (Section 5)
```html
<div>
  <strong>IN SCOPE</strong>
  <ul>{section.inScope.map(s => <li>{s.name} (Phase {s.phase})</li>)}</ul>
</div>
<div>
  <strong>OUT OF SCOPE</strong>
  <ul>{section.outOfScope.map(s => <li>{s}</li>)}</ul>
</div>
```

### Functional Requirements (Section 6)
Each requirement in a bordered card:
```html
<div style="padding:12px;border:1px solid var(--border-light);border-radius:8px;background:var(--surface-alt);">
  <span style="font-weight:700;">{req.id} — {req.title}</span>
  <span style="priority badge">{req.priority}</span>
  <div style="font-size:11px;">Linked: {req.linkedSolutions.join(', ')}</div>
  <ul>
    {req.subRequirements.map(sub => <li><strong>{sub.id}</strong> {sub.description}</li>)}
  </ul>
</div>
```

Priority badge colours:
- `Must Have` → red (`#fee2e2` bg, `#b91c1c` text)
- `Should Have` / `Could Have` → amber (`#fef3c7` bg, `#92400e` text)

### Non-Functional Requirements (Section 7)
Category header + table:
```html
<div>
  <div style="font-weight:700;text-transform:uppercase;">{category.category}</div>
  <table>
    <tr><th>ID</th><th>Description</th><th>Priority</th></tr>
    {category.items.map(item => <tr><td>{item.id}</td><td>{item.description}</td><td>{item.priority}</td></tr>)}
  </table>
</div>
```

### RACI Matrix (Section 8)
```html
<table>
  <tr><th>Role</th><th>R</th><th>A</th><th>C</th><th>I</th></tr>
  {section.raci.map(row => <tr>
    <td>{row.role}</td>
    <td>{row.r ? '✓' : '-'}</td>
    <td>{row.a ? '✓' : '-'}</td>
    <td>{row.c ? '✓' : '-'}</td>
    <td>{row.i ? '✓' : '-'}</td>
  </tr>)}
</table>
```

### Timeline (Section 9)
```html
<div>Total Duration: {timeline.totalWeeks} weeks — Start: {timeline.startDate}</div>
<table>
  <tr><th>Phase</th><th>Start</th><th>End</th><th>Duration</th></tr>
  {timeline.phases.map(p => <tr>
    <td>{p.name}</td>
    <td>Wk {p.startWeek}</td>
    <td>Wk {p.endWeek}</td>
    <td>{p.endWeek - p.startWeek + 1} wks</td>
  </tr>)}
</table>
```

### Risk Assessment (Section 10)
```html
<table>
  <tr><th>Risk</th><th>Impact</th><th>Likelihood</th><th>Mitigation</th></tr>
  {section.risks.map(r => <tr>
    <td>{r.risk}</td>
    <td style="color:{impactColor}">{r.impact}</td>
    <td style="color:{likelihoodColor}">{r.likelihood}</td>
    <td>{r.mitigation}</td>
  </tr>)}
</table>
```

Impact/Likelihood colours: High → `#b91c1c`, Medium → `#a16207`, Low → `#15803d`

### Assumptions & Constraints (Section 11)
```html
<div>
  <strong>ASSUMPTIONS</strong>
  <ul>{section.assumptions.map(a => <li>{a}</li>)}</ul>
</div>
<div>
  <strong>CONSTRAINTS</strong>
  <ul>{section.constraints.map(c => <li>{c}</li>)}</ul>
</div>
```

### Sign-off (Section 12)
```html
<table>
  <tr><th>Role</th><th>Name</th><th>Title</th><th>Date</th><th>Signature</th></tr>
  {section.signatories.map(s => <tr>
    <td>{s.role}</td>
    <td>{s.name || '________________'}</td>
    <td>{s.title || '________________'}</td>
    <td>{s.date || '____/____/________'}</td>
    <td>________________</td>
  </tr>)}
</table>
```

---

## Edit Flow

1. Click **Edit** → textarea replaces content area
2. Content flattened to plain text via `p6GetSectionPlainText()`
3. **Save** → stores as `{ content: text, source: 'user' }`, re-renders card
4. **Cancel** → restores original rendered content

```html
<textarea id="p6-edit-ta-{idx}" style="width:100%;min-height:160px;...">{plainText}</textarea>
<button onclick="p6SaveEdit({idx})">Save</button>
<button onclick="p6CancelEdit({idx})">Cancel</button>
```

---

## AI Rewrite Flow

1. Click **AI Rewrite** → instruction input replaces content area
2. Enter instruction (e.g., "Make it more concise")
3. Click **Rewrite** → POST /api/phase6/rewrite
4. Blue preview card shows rewritten content
5. **Accept** → stores new content, **Try Again** → re-opens instruction, **Undo** → restores original

```html
<!-- Step 1: Instruction input -->
<input id="p6-rewrite-instr-{idx}" placeholder="e.g. Make it more concise...">
<button onclick="p6DoRewrite({idx})">&#10022; Rewrite</button>
<button onclick="p6CancelEdit({idx})">Cancel</button>

<!-- Step 2: Preview -->
<div style="border:2px solid #3b82f6;border-radius:8px;padding:14px;background:#eff6ff;">
  <div>&#10022; AI REWRITE PREVIEW</div>
  <div>{rewrittenContent}</div>
</div>
<button onclick="p6AcceptRewrite(...)">Accept</button>
<button onclick="p6RewriteSection({idx})">Try Again</button>
<button onclick="p6CancelEdit({idx})">Undo</button>
```

---

## Loading States

Cycling messages every 2 seconds during BRD generation:
1. "Writing executive summary..."
2. "Expanding requirements..."
3. "Analysing risk landscape..."
4. "Assembling scope & timeline..."
5. "Formatting document..."

---

## Download .docx

```javascript
async function p6DownloadDocx() {
  const res = await fetch('/api/phase6/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sections: _phase6Sections, metadata: _phase6Metadata })
  });
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (metadata.projectTitle || 'BRD').replace(/[^a-zA-Z0-9_-]/g, '_') + '_BRD.docx';
  a.click();
}
```
