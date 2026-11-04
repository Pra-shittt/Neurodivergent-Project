import assert from 'assert'
import http from 'http'
import { Socket } from 'net'
import app from './app.js'

console.log('====================================================')
console.log('🧪 RUNNING COMPREHENSIVE CORS & AUTH FLOW VALIDATION')
console.log('====================================================\n')

let testsPassed = 0
let testsTotal = 0

function testRequest(description, method, url, origin, extraHeaders = {}, callback) {
  testsTotal++
  const socket = new Socket()
  const req = new http.IncomingMessage(socket)
  req.method = method
  req.url = url
  req.headers = {
    host: 'localhost:5000',
    ...(origin ? { origin } : {}),
    ...extraHeaders
  }

  const res = new http.ServerResponse(req)
  res.assignSocket(socket)

  let body = ''
  res.write = (chunk) => {
    if (chunk) body += chunk
    return true
  }

  res.end = function(chunk) {
    if (chunk && typeof chunk === 'string') body += chunk
    else if (chunk && Buffer.isBuffer(chunk)) body += chunk.toString()
    
    const headers = res.getHeaders()
    try {
      callback({ status: res.statusCode, headers, body })
      console.log(`  ✅ PASS: ${description}`)
      testsPassed++
    } catch (err) {
      console.error(`  ❌ FAIL: ${description}`)
      console.error(`     ${err.message}`)
    }
  }

  app.handle(req, res, (err) => {
    if (err) {
      console.error(`  ❌ ERROR in app.handle: ${err.message}`)
    }
  })
}

// Ensure production behavior is tested
process.env.NODE_ENV = 'production'

// 1. Vercel deployment preflight
testRequest(
  'Vercel preflight OPTIONS to /api/v1/auth/login',
  'OPTIONS',
  '/api/v1/auth/login',
  'https://neurodivergent-portal.vercel.app',
  {
    'access-control-request-method': 'POST',
    'access-control-request-headers': 'content-type,authorization'
  },
  (res) => {
    assert.strictEqual(res.status, 204, `Expected 204 No Content, got ${res.status}`)
    assert.strictEqual(res.headers['access-control-allow-origin'], 'https://neurodivergent-portal.vercel.app')
    assert.strictEqual(res.headers['access-control-allow-credentials'], 'true')
    assert.ok(res.headers['access-control-allow-methods'].includes('POST'))
  }
)

// 2. Netlify deployment preflight
testRequest(
  'Netlify preflight OPTIONS to /api/v1/auth/register',
  'OPTIONS',
  '/api/v1/auth/register',
  'https://neurodivergent-portal.netlify.app',
  {
    'access-control-request-method': 'POST',
    'access-control-request-headers': 'content-type,authorization'
  },
  (res) => {
    assert.strictEqual(res.status, 204)
    assert.strictEqual(res.headers['access-control-allow-origin'], 'https://neurodivergent-portal.netlify.app')
    assert.strictEqual(res.headers['access-control-allow-credentials'], 'true')
  }
)

// 3. Render deployment preflight
testRequest(
  'Render preflight OPTIONS to /api/v1/auth/login',
  'OPTIONS',
  '/api/v1/auth/login',
  'https://neurodivergent-client.onrender.com',
  {
    'access-control-request-method': 'POST',
    'access-control-request-headers': 'content-type'
  },
  (res) => {
    assert.strictEqual(res.status, 204)
    assert.strictEqual(res.headers['access-control-allow-origin'], 'https://neurodivergent-client.onrender.com')
  }
)

// 4. Railway deployment preflight
testRequest(
  'Railway preflight OPTIONS to /api/v1/auth/login',
  'OPTIONS',
  '/api/v1/auth/login',
  'https://neurodivergent.up.railway.app',
  {
    'access-control-request-method': 'POST',
    'access-control-request-headers': 'content-type'
  },
  (res) => {
    assert.strictEqual(res.status, 204)
    assert.strictEqual(res.headers['access-control-allow-origin'], 'https://neurodivergent.up.railway.app')
  }
)

// 5. GitHub Pages deployment preflight
testRequest(
  'GitHub Pages preflight OPTIONS to /api/v1/auth/login',
  'OPTIONS',
  '/api/v1/auth/login',
  'https://pra-shittt.github.io',
  {
    'access-control-request-method': 'POST',
    'access-control-request-headers': 'content-type'
  },
  (res) => {
    assert.strictEqual(res.status, 204)
    assert.strictEqual(res.headers['access-control-allow-origin'], 'https://pra-shittt.github.io')
  }
)

// 6. Cloudflare Pages deployment preflight
testRequest(
  'Cloudflare Pages preflight OPTIONS to /api/v1/auth/login',
  'OPTIONS',
  '/api/v1/auth/login',
  'https://neuroportal.pages.dev',
  {
    'access-control-request-method': 'POST',
    'access-control-request-headers': 'content-type'
  },
  (res) => {
    assert.strictEqual(res.status, 204)
    assert.strictEqual(res.headers['access-control-allow-origin'], 'https://neuroportal.pages.dev')
  }
)

// 7. Docker localhost:3000 preflight
testRequest(
  'Docker localhost:3000 preflight OPTIONS',
  'OPTIONS',
  '/api/v1/auth/login',
  'http://localhost:3000',
  {
    'access-control-request-method': 'POST',
    'access-control-request-headers': 'content-type'
  },
  (res) => {
    assert.strictEqual(res.status, 204)
    assert.strictEqual(res.headers['access-control-allow-origin'], 'http://localhost:3000')
  }
)

// 8. Helmet Cross-Origin-Resource-Policy check
testRequest(
  'Helmet sets Cross-Origin-Resource-Policy: cross-origin',
  'GET',
  '/api/v1/health',
  'https://neurodivergent-portal.vercel.app',
  {},
  (res) => {
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.headers['cross-origin-resource-policy'], 'cross-origin')
    assert.strictEqual(res.headers['access-control-allow-origin'], 'https://neurodivergent-portal.vercel.app')
    assert.strictEqual(res.headers['access-control-allow-credentials'], 'true')
  }
)

// 9. Health check with no origin (curl/server-to-server)
testRequest(
  'Direct server request without Origin header (curl/mobile)',
  'GET',
  '/api/v1/health',
  undefined,
  {},
  (res) => {
    assert.strictEqual(res.status, 200)
    assert.ok(res.body.includes('"status":"OK"'))
  }
)

// 10. Disallowed origin in production does NOT return CORS headers and does NOT crash server with 500
testRequest(
  'Disallowed origin in production does NOT return CORS headers or crash',
  'OPTIONS',
  '/api/v1/auth/login',
  'https://unauthorized-domain.com',
  {
    'access-control-request-method': 'POST',
    'access-control-request-headers': 'content-type'
  },
  (res) => {
    assert.strictEqual(res.headers['access-control-allow-origin'], undefined)
  }
)

console.log(`\n====================================================`)
console.log(`Summary: ${testsPassed} of ${testsTotal} CORS tests passed`)
console.log(`====================================================`)
if (testsPassed !== testsTotal) {
  process.exit(1)
}
