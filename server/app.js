import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import authRoutes from './src/routes/authRoutes.js'
import userRoutes from './src/routes/userRoutes.js'
import logRoutes from './src/routes/logRoutes.js'
import assessmentRoutes from './src/routes/assessmentRoutes.js'
import clinicianRoutes from './src/routes/clinicianRoutes.js'
import aiRoutes from './src/routes/aiRoutes.js'
import { errorHandler, notFound } from './src/middleware/errorMiddleware.js'

const app = express()

// ── Trust Proxy (Required when deployed behind reverse proxies e.g. Render, Railway, Vercel, Nginx) ──
app.set('trust proxy', 1)

// ── Security Middleware ─────────────────────────────────────
// Permit cross-origin requests by relaxing Helmet's default same-origin resource policy
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
)

// Build normalized list of allowed origins from defaults and environment variable
const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]

const customOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',')
      .map((u) => u.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, ''))
      .filter(Boolean)
  : []

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...customOrigins]))

const isOriginAllowed = (origin) => {
  if (!origin) return true // Allow requests with no origin (mobile apps, curl, server-to-server)
  const cleanOrigin = origin.trim().replace(/\/+$/, '')
  if (allowedOrigins.includes('*') || allowedOrigins.includes(cleanOrigin)) {
    return true
  }
  if (process.env.NODE_ENV !== 'production') {
    return true
  }
  let hostname = ''
  try {
    hostname = new URL(cleanOrigin).hostname
  } catch {
    return false
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true
  }
  // Allow all standard cloud deployment subdomains
  if (
    /(?:^|\.)(?:vercel\.app|netlify\.app|onrender\.com|railway\.app|up\.railway\.app|github\.io|pages\.dev)$/i.test(
      hostname
    )
  ) {
    return true
  }
  return false
}

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true)
    }
    console.warn(`[CORS] Blocked request from origin: ${origin}`)
    return callback(null, false)
  },
  credentials: true, // Allow cookies and auth headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 204,
}

app.use(cors(corsOptions))
app.options('{*path}', cors(corsOptions))

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
app.use('/api/v1/ai', aiRoutes)

// ── Error Handling ──────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

export default app
