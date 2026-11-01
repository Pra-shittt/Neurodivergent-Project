import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import authRoutes from './src/routes/authRoutes.js'
import userRoutes from './src/routes/userRoutes.js'
import logRoutes from './src/routes/logRoutes.js'
import assessmentRoutes from './src/routes/assessmentRoutes.js'
import clinicianRoutes from './src/routes/clinicianRoutes.js'
import { errorHandler, notFound } from './src/middleware/errorMiddleware.js'

const app = express()

// ── Security Middleware ─────────────────────────────────────
app.use(helmet())

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((u) => u.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173']

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true)
      if (
        allowedOrigins.includes(origin) ||
        process.env.NODE_ENV !== 'production' ||
        /\.vercel\.app$/.test(new URL(origin).hostname) ||
        /\.onrender\.com$/.test(new URL(origin).hostname)
      ) {
        return callback(null, true)
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`))
    },
    credentials: true, // Allow cookies
  })
)

// ── Body Parsing ────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

// ── Health Check ────────────────────────────────────────────
app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, data: { status: 'OK', timestamp: new Date().toISOString() } })
})

// ── API Routes ──────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/users', userRoutes)
app.use('/api/v1/logs', logRoutes)
app.use('/api/v1/assessments', assessmentRoutes)
app.use('/api/v1/clinician', clinicianRoutes)

// ── Error Handling ──────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

export default app
