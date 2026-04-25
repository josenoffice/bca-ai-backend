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
| `TURNSTILE_SECRET` | Recommended | Cloudflare Turnstile secret key (CAPTCHA) |
| `ALLOWED_ORIGINS` | Recommended | Comma-separated CORS origins (blank = allow all) |

---

## Security

The following security measures are active on all API routes (`/api/*`):

| Measure | Detail |
|---------|--------|
| **Rate limiting** | 5 requests per IP per hour |
| **CAPTCHA** | Cloudflare Turnstile (invisible challenge on registration modal) |
| **User registration** | Name + email required before app access; logged to console |
| **VPN / proxy blocking** | ip-api.com check; VPNs, proxies, and hosting IPs are blocked (fail-open) |
| **Helmet.js** | Secure HTTP headers on all responses |
| **Body size limit** | 1 MB maximum request body |
| **Request logging** | All requests logged with timestamp + IP |
| **CORS restriction** | Set `ALLOWED_ORIGINS` env var to lock down to your domain |
| **Input sanitization** | Control characters stripped from all string fields |

### Setting Up Cloudflare Turnstile

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Turnstile**
2. Click **Add site** → enter your domain → choose **Invisible** widget type
3. Copy the **Site Key** and **Secret Key**
4. In `phase1-viewer.html`, replace `data-sitekey="0x4AAAAAAA..."` with your Site Key
5. Add `TURNSTILE_SECRET=<your-secret-key>` to your Render environment variables

> **Local development:** `TURNSTILE_SECRET` is optional locally — verification is skipped if the variable is not set.

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
   - `TURNSTILE_SECRET` = your Cloudflare Turnstile secret key
   - `ALLOWED_ORIGINS` = `https://your-app.onrender.com`
7. Deploy

---

## Rate Limiting

API routes (`/api/*`) are rate limited to **5 requests per IP per hour**.

- Localhost (`127.0.0.1`) is whitelisted — no limit during local development
- Limit resets automatically after 1 hour
- To change the limit: update `max: 5` in `index.js` and redeploy

---

## Admin Reset Endpoint

Reset all rate limit counters and VPN cache without restarting the server:

```bash
curl -X POST "https://your-app.onrender.com/admin/reset?key=YOUR_ADMIN_SECRET"
```

**Response:**
```json
{
  "success": true,
  "message": "All rate limit counters and VPN cache have been cleared.",
  "timestamp": "2026-04-22T10:00:00.000Z"
}
```

> The `ADMIN_SECRET` is set as an environment variable on Render — it never appears in code.

### Changing the Admin Secret (no redeploy needed)

1. Log in to [render.com](https://render.com) → your service → **Environment**
2. Update the `ADMIN_SECRET` value and click **Save Changes**
3. Render restarts the service automatically — takes ~30 seconds

---

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/register` | Registration gate — validates name/email, verifies Turnstile |
| POST | `/api/analyze` | Phase 1 — intake analysis |
| POST | `/api/phase2` | Phase 2 — vendor assessment |
| POST | `/api/phase3` | Phase 3 — cost analysis |
| POST | `/api/phase4` | Phase 4 — financial analysis |
| POST | `/api/phase5` | Phase 5 — recommendations |
| POST | `/api/phase6` | Phase 6 — BRD generation |
| GET | `/health` | Health check |
| POST | `/admin/reset?key=SECRET` | Reset rate limits + VPN cache |

---

## Cost per Analysis

Each full 6-phase BCA costs approximately **$0.08** in Anthropic API fees (using Claude Haiku).

---

## License

Private — all rights reserved.
