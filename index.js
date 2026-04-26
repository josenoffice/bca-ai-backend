import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { rateLimit } from 'express-rate-limit'
import phase1Router from './routes/phase1.js'
import phase15Router from './routes/phase15.js'
import phase16Router from './routes/phase16.js'
import reflectionRouter from './routes/phase1-reflection.js'
import phase2Router from './routes/phase2.js'
import phase3Router from './routes/phase3.js'
import phase4Router from './routes/phase4.js'
import phase5Router from './routes/phase5.js'
import phase6Router from './routes/phase6.js'
import explainRouter from './routes/explain.js'
import plainEnglishRouter from './routes/plain-english.js'

const app = express()
const PORT = process.env.PORT || 3001
const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Security headers (Helmet) ─────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // disabled — frontend loads from CDNs
  crossOriginEmbedderPolicy: false,
}))

// ── Body size limit (1 MB) ────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }))

// ── Request logging middleware ────────────────────────────────────────────────
app.use((req, _res, next) => {
  const ts = new Date().toISOString()
  const ip = req.ip || req.connection.remoteAddress
  console.log(`[${ts}] ${req.method} ${req.path} — ${ip}`)
  next()
})

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : null  // null = allow all (dev mode)

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (!allowedOrigins) {
    res.header('Access-Control-Allow-Origin', '*')
  } else if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin)
  }
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

// ── VPN / proxy detection ─────────────────────────────────────────────────────
// ip-api.com free tier: 45 req/min, no API key needed
// Cache results for 1 hour to avoid repeated lookups
const vpnCache = new Map()   // ip → { blocked: bool, ts: number }
const VPN_CACHE_TTL = 60 * 60 * 1000  // 1 hour

async function isVpnOrProxy(ip) {
  const now = Date.now()
  const cached = vpnCache.get(ip)
  if (cached && now - cached.ts < VPN_CACHE_TTL) return cached.blocked

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000) // 3s timeout
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=proxy,hosting,query`,
      { signal: controller.signal }
    )
    clearTimeout(timeout)
    if (!res.ok) throw new Error(`ip-api status ${res.status}`)
    const data = await res.json()
    const blocked = !!(data.proxy || data.hosting)
    vpnCache.set(ip, { blocked, ts: now })
    return blocked
  } catch {
    // Fail open — don't block if the API is unreachable
    vpnCache.set(ip, { blocked: false, ts: now })
    return false
  }
}

const isLocalhostIp = (ip) =>
  ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1'

const vpnBlocker = async (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress
  if (isLocalhostIp(ip)) return next()  // skip localhost
  const blocked = await isVpnOrProxy(ip)
  if (blocked) {
    console.log(`[vpn-block] ${ip} — blocked (proxy/hosting/VPN)`)
    return res.status(403).json({
      error: 'Access from VPN, proxy, or hosting networks is not permitted.'
    })
  }
  next()
}

// ── Cloudflare Turnstile verification helper ──────────────────────────────────
async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET
  if (!secret) {
    // If secret not configured (local dev), skip verification
    console.warn('[turnstile] TURNSTILE_SECRET not set — skipping verification')
    return true
  }
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip })
    })
    const data = await res.json()
    return data.success === true
  } catch {
    return false
  }
}

// ── Input sanitization helper ─────────────────────────────────────────────────
function sanitizeString(str, maxLen = 2000) {
  if (typeof str !== 'string') return ''
  // Strip control characters and limit length
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, maxLen)
}

// ── Rate limiting ─────────────────────────────────────────────────────────────
const rateLimitStore = new Map()

const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour window
  max: 5,                       // 5 requests per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. You have reached the 5 requests/hour limit. Please try again later.',
    retryAfter: '1 hour'
  },
  skip: (req) => isLocalhostIp(req.ip || req.connection.remoteAddress)
})

// ── Admin reset endpoint ──────────────────────────────────────────────────────
app.post('/admin/reset', (req, res) => {
  const secret = process.env.ADMIN_SECRET
  if (!secret) {
    return res.status(503).json({ error: 'Admin endpoint not configured. Set ADMIN_SECRET env var.' })
  }
  if (req.query.key !== secret) {
    return res.status(401).json({ error: 'Invalid admin key.' })
  }
  apiLimiter.resetKey?.('all')
  rateLimitStore.clear()
  vpnCache.clear()
  console.log(`[admin] Rate limits and VPN cache manually reset at ${new Date().toISOString()}`)
  return res.json({
    success: true,
    message: 'All rate limit counters and VPN cache have been cleared.',
    timestamp: new Date().toISOString()
  })
})

// ── Email allowlist ───────────────────────────────────────────────────────────
// Set ALLOWED_EMAILS=alice@company.com,bob@company.com in Render env vars.
// Leave unset (or empty) to allow any email (open mode — not recommended for demos).
const allowedEmails = process.env.ALLOWED_EMAILS
  ? new Set(process.env.ALLOWED_EMAILS.split(',').map(e => e.trim().toLowerCase()).filter(Boolean))
  : null  // null = open (no allowlist)

// ── Registration endpoint ─────────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress
  const { name, email, turnstileToken } = req.body || {}

  // Basic validation
  const cleanName = sanitizeString(name, 120)
  const cleanEmail = sanitizeString(email, 254)

  if (!cleanName || cleanName.length < 2) {
    return res.status(400).json({ error: 'Please enter your full name.' })
  }
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }

  // Email allowlist check (runs before CAPTCHA to fail fast)
  if (allowedEmails && !allowedEmails.has(cleanEmail.toLowerCase())) {
    console.log(`[access-denied] ${new Date().toISOString()} | email="${cleanEmail}" | ip=${ip} — not on allowlist`)
    return res.status(403).json({
      error: 'Access is restricted to authorized participants. Your email address is not on the access list. Please contact the BCA.AI team to request access.'
    })
  }

  // Turnstile CAPTCHA verification
  const captchaOk = await verifyTurnstile(turnstileToken, ip)
  if (!captchaOk) {
    return res.status(403).json({ error: 'CAPTCHA verification failed. Please refresh and try again.' })
  }

  // Log for audit trail (visible in Render logs)
  const ts = new Date().toISOString()
  console.log(`[registration] ${ts} | name="${cleanName}" | email="${cleanEmail}" | ip=${ip}`)

  return res.json({ success: true })
})

// ── API routes (rate limited + VPN blocked) ───────────────────────────────────
app.use('/api', vpnBlocker)
app.use('/api', apiLimiter)
app.use('/api', (req, _res, next) => {
  // Sanitize top-level string fields in request body
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key])
      }
    }
  }
  next()
})
app.use('/api', phase1Router)
app.use('/api', phase15Router)
app.use('/api', phase16Router)
app.use('/api', reflectionRouter)
app.use('/api', phase2Router)
app.use('/api', phase3Router)
app.use('/api', phase4Router)
app.use('/api', phase5Router)
app.use('/api', phase6Router)
app.use('/api', explainRouter)
app.use('/api', plainEnglishRouter)

// ── Static routes (not rate limited) ─────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }))
app.get('/', (_req, res) => res.sendFile(join(__dirname, 'phase1-viewer.html')))
app.get('/BCA_Intake_App.html', (_req, res) => res.sendFile(join(__dirname, 'BCA_Intake_App.html')))
app.get('/conversational-intake', (_req, res) => res.sendFile(join(__dirname, 'conversational-intake.html')))

app.listen(PORT, () => {
  console.log(`BCA AI Backend running on port ${PORT}`)
  console.log(`Rate limit: 5 requests/IP/hour on /api routes`)
  console.log(`VPN blocking: enabled (ip-api.com, fail-open)`)
  console.log(`Admin reset: POST /admin/reset?key=ADMIN_SECRET`)
})
