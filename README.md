# BCA.AI — Business Case Analysis Platform

An AI-powered platform that guides any user — from first-time business analysts to seasoned financial professionals — through a structured 6-phase Business Case Analysis process, producing a complete, defensible BCA in approximately 10 minutes.

---

## What It Does

| Phase | What Happens |
|-------|-------------|
| **Phase 1** | Guided intake — plain-language prompts generate requirements and solution alternatives |
| **Phase 2** | Vendor assessment — automated scoring across compatibility, price, and compliance |
| **Phase 3** | Cost analysis — TCO and cost modeling from intake data |
| **Phase 4** | Financial analysis — pure JavaScript DCF: NPV, IRR, ROI, payback, sensitivity |
| **Phase 5** | Recommendations and traceability matrix |
| **Phase 6** | 13-section BRD generated as a Microsoft Word (.docx) document |

---

## Tech Stack

- **Backend:** Node.js + Express
- **AI:** Anthropic Claude (claude-haiku-4-5) via `@anthropic-ai/sdk`
- **Financial computation:** Pure JavaScript (DCF, NPV, IRR, ROI) — no AI involved in math
- **Document generation:** `docx` npm package
- **Frontend:** Vanilla HTML/CSS/JS (no framework)

---

## Local Development

### Prerequisites
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/bca-ai-backend.git
cd bca-ai-backend

# Install dependencies
npm install

# Create your environment file
cp .env.example .env
# Edit .env and add your CLAUDE_API_KEY

# Start the server
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CLAUDE_API_KEY` | ✅ Yes | Your Anthropic API key |
| `PORT` | No | Server port (default: 3001) |
| `ADMIN_SECRET` | Recommended | Secret key for the admin reset endpoint |

---

## Deployment (Render.com)

1. Push this repo to GitHub (private)
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Add environment variables:
   - `CLAUDE_API_KEY` = your Anthropic API key
   - `ADMIN_SECRET` = a secret string you choose (e.g. `mySecretReset42`)
7. Deploy

---

## Rate Limiting

API routes (`/api/*`) are rate limited to **10 requests per IP per hour**.

- Localhost (`127.0.0.1`) is whitelisted — no limit during local development
- Limit resets automatically after 1 hour
- To change the limit: update `max: 10` in `index.js` and redeploy

---

## Admin Reset Endpoint

Reset all rate limit counters without restarting the server:

```bash
curl -X POST "https://your-app.onrender.com/admin/reset?key=YOUR_ADMIN_SECRET"
```

**Response:**
```json
{
  "success": true,
  "message": "All rate limit counters have been cleared.",
  "timestamp": "2026-04-22T10:00:00.000Z"
}
```

> The `ADMIN_SECRET` is set as an environment variable on Render — it never appears in code.

---

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/analyze` | Phase 1 — intake analysis |
| POST | `/api/phase2` | Phase 2 — vendor assessment |
| POST | `/api/phase3` | Phase 3 — cost analysis |
| POST | `/api/phase4` | Phase 4 — financial analysis |
| POST | `/api/phase5` | Phase 5 — recommendations |
| POST | `/api/phase6` | Phase 6 — BRD generation |
| GET | `/health` | Health check |
| POST | `/admin/reset?key=SECRET` | Reset rate limits |

---

## Cost per Analysis

Each full 6-phase BCA costs approximately **$0.08** in Anthropic API fees (using Claude Haiku).

---

## License

Private — all rights reserved.
