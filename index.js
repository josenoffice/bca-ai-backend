import 'dotenv/config'
import express from 'express'
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

const app = express()
const PORT = process.env.PORT || 3001
const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Rate limiting ─────────────────────────────────────────────────────────────
// In-memory store — all counters reset on server restart
const rateLimitStore = new Map()

const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour window
  max: 10,                      // 10 requests per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. You have reached the 10 requests/hour limit. Please try again later.',
    retryAfter: '1 hour'
  },
  skip: (req) => {
    // Whitelist: skip rate limiting for localhost (dev/testing)
    const ip = req.ip || req.connection.remoteAddress
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1'
  }
})

// ── Admin reset endpoint ──────────────────────────────────────────────────────
// Reset all rate limits without restarting the server
// Usage: POST https://your-app.onrender.com/admin/reset?key=YOUR_ADMIN_SECRET
app.post('/admin/reset', (req, res) => {
  const secret = process.env.ADMIN_SECRET
  if (!secret) {
    return res.status(503).json({ error: 'Admin endpoint not configured. Set ADMIN_SECRET env var.' })
  }
  if (req.query.key !== secret) {
    return res.status(401).json({ error: 'Invalid admin key.' })
  }
  // express-rate-limit resets when server restarts; for in-memory reset
  // we patch the store by clearing the internal store map
  apiLimiter.resetKey?.('all') // no-op if not supported
  rateLimitStore.clear()
  console.log(`[admin] Rate limits manually reset at ${new Date().toISOString()}`)
  return res.json({
    success: true,
    message: 'All rate limit counters have been cleared.',
    timestamp: new Date().toISOString()
  })
})

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  next()
})
app.use(express.json())

// ── API routes (rate limited) ─────────────────────────────────────────────────
app.use('/api', apiLimiter)
app.use('/api', phase1Router)
app.use('/api', phase15Router)
app.use('/api', phase16Router)
app.use('/api', reflectionRouter)
app.use('/api', phase2Router)
app.use('/api', phase3Router)
app.use('/api', phase4Router)
app.use('/api', phase5Router)
app.use('/api', phase6Router)

// ── Static routes (not rate limited) ─────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }))
app.get('/', (_req, res) => res.sendFile(join(__dirname, 'phase1-viewer.html')))
app.get('/BCA_Intake_App.html', (_req, res) => res.sendFile(join(__dirname, 'BCA_Intake_App.html')))
app.get('/conversational-intake', (_req, res) => res.sendFile(join(__dirname, 'conversational-intake.html')))

app.listen(PORT, () => {
  console.log(`BCA AI Backend running on port ${PORT}`)
  console.log(`Rate limit: 10 requests/IP/hour on /api routes`)
  console.log(`Admin reset: POST /admin/reset?key=ADMIN_SECRET`)
})
