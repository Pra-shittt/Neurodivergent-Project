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
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true, // Allow cookies
}))

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
