import 'dotenv/config'
import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
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

// Allow file:// and any origin for local viewer
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  next()
})
app.use(express.json())

app.use('/api', phase1Router)
app.use('/api', phase15Router)
app.use('/api', phase16Router)
app.use('/api', reflectionRouter)
app.use('/api', phase2Router)
app.use('/api', phase3Router)
app.use('/api', phase4Router)
app.use('/api', phase5Router)
app.use('/api', phase6Router)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))
app.get('/', (_req, res) => res.sendFile(join(__dirname, 'phase1-viewer.html')))
app.get('/BCA_Intake_App.html', (_req, res) => res.sendFile(join(__dirname, 'BCA_Intake_App.html')))

app.listen(PORT, () => {
  console.log(`BCA AI Backend running on port ${PORT}`)
})
