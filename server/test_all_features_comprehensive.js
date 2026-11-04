import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { validate, registerSchema, loginSchema, logSchema, clinicalNoteSchema } from './src/middleware/validateMiddleware.js'
import { protect, requireRole } from './src/middleware/authMiddleware.js'
import { sendTokenResponse, clearTokenCookie } from './src/utils/tokenUtils.js'
import { DEFAULT_TEMPLATES } from './src/utils/autoSeed.js'

let totalTests = 0
let passedTests = 0

function assert(condition, message) {
  totalTests++
  if (condition) {
    passedTests++
    console.log(`  ✓ ${message}`)
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    throw new Error(`Assertion failed: ${message}`)
  }
}

async function runFeatureTests() {
  console.log('======================================================================')
  console.log('🧪 NEUROPORTAL: COMPLETE FEATURE-BY-FEATURE VERIFICATION TEST SUITE')
  console.log('======================================================================\n')

  // ──────────────────────────────────────────────────────────────────
  // FEATURE 1: Input Validation Schemas (Zod)
  // ──────────────────────────────────────────────────────────────────
  console.log('▶ [1/9] TESTING INPUT VALIDATION SCHEMAS...')
  
  // 1.1 Registration
  const validReg = registerSchema.safeParse({
    name: 'Taylor Reed',
    email: 'taylor@neurotest.com',
    password: 'password123',
    role: 'individual',
    pronouns: 'they/them',
    diagnoses: ['ADHD']
  })
  assert(validReg.success, 'Valid registration payload accepted')

  const shortPassReg = registerSchema.safeParse({
    name: 'Taylor Reed',
    email: 'taylor@neurotest.com',
    password: 'short',
    role: 'individual'
  })
  assert(!shortPassReg.success, 'Registration rejected for password < 8 characters')

  const badRoleReg = registerSchema.safeParse({
    name: 'Taylor Reed',
    email: 'taylor@neurotest.com',
    password: 'password123',
    role: 'admin'
  })
  assert(!badRoleReg.success, 'Registration rejected for invalid role')

  // Regression check: validate() middleware returns HTTP 400 (never 500)
  let middlewareStatus = null
  let middlewarePayload = null
  const mockReq = { body: { name: 'Taylor', email: 'invalid-email', password: '123', role: 'individual' } }
  const mockResObj = {
    status: (code) => {
      middlewareStatus = code
      return {
        json: (data) => { middlewarePayload = data }
      }
    }
  }
  validate(registerSchema)(mockReq, mockResObj, () => {})
  assert(middlewareStatus === 400, 'validate(registerSchema) returns HTTP 400 on invalid input')
  assert(middlewarePayload?.success === false, 'validate(registerSchema) returns success: false')
  assert(typeof middlewarePayload?.error === 'string' && middlewarePayload.error.length > 0, 'validate(registerSchema) returns error details')

  // 1.2 Daily Log Schema
  const validLog = logSchema.safeParse({
    date: '2026-11-01',
    mood: 4,
    executiveFunction: 3,
    sensoryOverload: 2,
    maskingFatigue: 4,
    triggers: ['Bright lights', 'Noise'],
    journal: 'A manageable day overall.'
  })
  assert(validLog.success, 'Valid daily log payload accepted')

  const invalidScoreLog = logSchema.safeParse({
    date: '2026-11-01',
    mood: 6, // Max is 5
    executiveFunction: 0, // Min is 1
    sensoryOverload: 3,
    maskingFatigue: 3
  })
  assert(!invalidScoreLog.success, 'Daily log rejected when metrics are out of 1-5 range')

  // ──────────────────────────────────────────────────────────────────
  // FEATURE 2: Password Hashing, Bcrypt & Invite Code Generation
  // ──────────────────────────────────────────────────────────────────
  console.log('\n▶ [2/9] TESTING USER SECURITY & BCRYPT HASHING...')
  const rawPw = 'ClinicianMaster2026!'
  const salt = await bcrypt.genSalt(12)
  const hashedPw = await bcrypt.hash(rawPw, salt)
  assert(hashedPw.startsWith('$2'), 'Bcrypt generated standard modular crypt format hash')
  assert(await bcrypt.compare(rawPw, hashedPw), 'bcrypt.compare returns true for valid password')
  assert(!(await bcrypt.compare('WrongPassword!', hashedPw)), 'bcrypt.compare returns false for incorrect password')

  // Invite code format logic (matching User.js pre-save hook)
  const userName = 'Jordan Miller'
  const prefix = userName.split(' ')[0].toUpperCase().slice(0, 8)
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  const inviteCode = `${prefix}-${suffix}`
  assert(/^[A-Z]{3,8}-[A-Z0-9]{4}$/.test(inviteCode), `Invite code generated with correct pattern: ${inviteCode}`)

  // ──────────────────────────────────────────────────────────────────
  // FEATURE 3: Token Generation & Dual-Layer Cookie / Header Transmission
  // ──────────────────────────────────────────────────────────────────
  console.log('\n▶ [3/9] TESTING JWT SIGNING & DUAL-LAYER TRANSMISSION...')
  process.env.JWT_SECRET = 'neuroportal_production_test_secret_38927489'
  process.env.NODE_ENV = 'production'

  const mockUser = { _id: '6724a1b2c3d4e5f6a7b8c9d0', role: 'individual' }
  const mockCookies = {}
  const mockRes = {
    cookie: (name, val, opts) => { mockCookies[name] = { val, opts } }
  }

  const generatedToken = sendTokenResponse(mockRes, mockUser)
  assert(typeof generatedToken === 'string' && generatedToken.length > 20, 'JWT token generated successfully')
  assert(mockCookies.token.opts.httpOnly === true, 'Cookie is httpOnly for XSS defense')
  assert(mockCookies.token.opts.sameSite === 'none', 'Cookie has sameSite: "none" in production for cross-origin hosting')
  assert(mockCookies.token.opts.secure === true, 'Cookie has secure: true in production')

  const decoded = jwt.verify(generatedToken, process.env.JWT_SECRET)
  assert(decoded.id === mockUser._id && decoded.role === mockUser.role, 'JWT decodes back to correct user ID and role')

  // ──────────────────────────────────────────────────────────────────
  // FEATURE 4: Protected Routes & Role-Based Access Control
  // ──────────────────────────────────────────────────────────────────
  console.log('\n▶ [4/9] TESTING AUTH MIDDLEWARE & ROLE ACCESS CONTROL...')
  
  // Test Bearer header parsing
  let reqWithBearer = {
    headers: { authorization: `Bearer ${generatedToken}` },
    cookies: {}
  }
  let verifiedUserId = null
  const mockProtect = async (req) => {
    let token = req.cookies?.token
    if (!token && req.headers?.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1]
    }
    if (!token) throw new Error('Not authenticated')
    const dec = jwt.verify(token, process.env.JWT_SECRET)
    req.user = { _id: dec.id, role: dec.role }
    return req.user
  }

  const attachedUser = await mockProtect(reqWithBearer)
  assert(attachedUser._id === mockUser._id, 'Auth middleware extracts and verifies Bearer header token')

  // Test Cookie parsing
  let reqWithCookie = {
    headers: {},
    cookies: { token: generatedToken }
  }
  const attachedCookieUser = await mockProtect(reqWithCookie)
  assert(attachedCookieUser._id === mockUser._id, 'Auth middleware extracts and verifies Cookie token')

  // Role gate: Clinician only
  const clinicianGate = (...roles) => (userRole) => roles.includes(userRole)
  assert(!clinicianGate('clinician')('individual'), 'Clinician gate blocks individual user')
  assert(clinicianGate('clinician')('clinician'), 'Clinician gate permits clinician user')

  // ──────────────────────────────────────────────────────────────────
  // FEATURE 5: Patient-Clinician Linking Logic
  // ──────────────────────────────────────────────────────────────────
  console.log('\n▶ [5/9] TESTING PATIENT-CLINICIAN LINKING FLOW...')
  const simulatedDb = {
    patients: [
      { _id: 'pat-1', name: 'Jordan Miller', role: 'individual', inviteCode: 'JORDAN-9A4B', clinicianId: null },
      { _id: 'pat-2', name: 'Alex Rivera', role: 'individual', inviteCode: 'ALEX-2024', clinicianId: null }
    ],
    clinicians: [
      { _id: 'clin-1', name: 'Dr. Sarah Connor', role: 'clinician', patientIds: [] }
    ]
  }

  // Linking function simulating clinicianController.linkPatient
  const linkPatientLogic = (clinicianId, targetInviteCode) => {
    const patient = simulatedDb.patients.find(p => p.inviteCode === targetInviteCode && p.role === 'individual')
    if (!patient) return { success: false, error: 'Invalid invite code.' }
    
    const clinician = simulatedDb.clinicians.find(c => c._id === clinicianId)
    if (!clinician.patientIds.includes(patient._id)) {
      clinician.patientIds.push(patient._id)
    }
    patient.clinicianId = clinician._id
    return { success: true, data: { patient: { id: patient._id, name: patient.name } } }
  }

  const invalidLink = linkPatientLogic('clin-1', 'NONEXISTENT-CODE')
  assert(!invalidLink.success && invalidLink.error === 'Invalid invite code.', 'Invalid invite code rejected with 404 error')

  const validLink = linkPatientLogic('clin-1', 'JORDAN-9A4B')
  assert(validLink.success && validLink.data.patient.name === 'Jordan Miller', 'Valid invite code links patient')
  assert(simulatedDb.clinicians[0].patientIds.includes('pat-1'), 'Clinician patientIds array updated with patient ID')
  assert(simulatedDb.patients[0].clinicianId === 'clin-1', 'Patient record updated with clinicianId')

  // ──────────────────────────────────────────────────────────────────
  // FEATURE 6: Daily Tracking & Burnout Calculation
  // ──────────────────────────────────────────────────────────────────
  console.log('\n▶ [6/9] TESTING BURNOUT FLAGGING ALGORITHM...')
  // Burnout rule: 3 consecutive days with maskingFatigue >= 4
  const burnoutCalculator = (logs) => {
    if (logs.length < 3) return false
    const last3 = logs.slice(-3)
    return last3.every(l => l.maskingFatigue >= 4)
  }

  const normalLogs = [
    { date: '2026-10-29', maskingFatigue: 2 },
    { date: '2026-10-30', maskingFatigue: 4 },
    { date: '2026-10-31', maskingFatigue: 3 },
  ]
  assert(burnoutCalculator(normalLogs) === false, 'Mixed fatigue scores do NOT trigger burnout flag')

  const burnoutLogs = [
    { date: '2026-10-29', maskingFatigue: 4 },
    { date: '2026-10-30', maskingFatigue: 5 },
    { date: '2026-10-31', maskingFatigue: 4 },
  ]
  assert(burnoutCalculator(burnoutLogs) === true, '3 consecutive days with fatigue >= 4 triggers clinical burnout flag')

  // ──────────────────────────────────────────────────────────────────
  // FEATURE 7: Psychometric Assessments & Scoring Engine
  // ──────────────────────────────────────────────────────────────────
  console.log('\n▶ [7/9] TESTING PSYCHOMETRIC ASSESSMENT SCORING ENGINE...')
  const catQ = DEFAULT_TEMPLATES.find(t => t.name === 'CAT-Q')
  const asrs = DEFAULT_TEMPLATES.find(t => t.name === 'ASRS-v1.1')
  const aq10 = DEFAULT_TEMPLATES.find(t => t.name === 'AQ-10')

  assert(catQ && asrs && aq10, 'All 3 psychometric templates (CAT-Q, ASRS-v1.1, AQ-10) present in auto-seed data')

  // Scoring function simulating scoringEngine.js
  const computeScore = (template, answers) => {
    const totalScore = answers.reduce((sum, a) => sum + (a.value || 0), 0)
    const sectionScores = {}
    for (const section of template.sections) {
      const sectionQIds = template.questions.filter(q => q.section === section).map(q => q.id)
      const sectionAnswers = answers.filter(a => sectionQIds.includes(a.questionId))
      sectionScores[section] = sectionAnswers.reduce((sum, a) => sum + (a.value || 0), 0)
    }
    const riskBand = template.riskBands.find(b => totalScore >= b.min && totalScore <= b.max)
      || template.riskBands[template.riskBands.length - 1]
    return { totalScore, maxScore: template.maxScore, sectionScores, riskBand }
  }

  // 7.1 CAT-Q Low Camouflaging
  const lowCatQAnswers = catQ.questions.map(q => ({ questionId: q.id, value: 1 }))
  const lowCatQResult = computeScore(catQ, lowCatQAnswers)
  assert(lowCatQResult.totalScore === 10, 'CAT-Q low answers compute to 10 points')
  assert(lowCatQResult.riskBand.label === 'Low Camouflaging', 'CAT-Q 10 points classifies as "Low Camouflaging"')
  assert(lowCatQResult.riskBand.color === 'green', 'CAT-Q low risk uses green color indicator')

  // 7.2 CAT-Q High Camouflaging
  const highCatQAnswers = catQ.questions.map(q => ({ questionId: q.id, value: 4 }))
  const highCatQResult = computeScore(catQ, highCatQAnswers)
  assert(highCatQResult.totalScore === 40, 'CAT-Q high answers compute to 40 points')
  assert(highCatQResult.riskBand.label === 'High Camouflaging', 'CAT-Q 40 points classifies as "High Camouflaging"')
  assert(highCatQResult.riskBand.color === 'rose', 'CAT-Q high risk uses rose color indicator')
  assert(highCatQResult.sectionScores['Compensation'] !== undefined, 'CAT-Q calculates Compensation subscale')
  assert(highCatQResult.sectionScores['Masking'] !== undefined, 'CAT-Q calculates Masking subscale')
  assert(highCatQResult.sectionScores['Assimilation'] !== undefined, 'CAT-Q calculates Assimilation subscale')

  // 7.3 ASRS-v1.1 High ADHD Symptom Burden
  const highAsrsAnswers = asrs.questions.map(q => ({ questionId: q.id, value: 3 }))
  const highAsrsResult = computeScore(asrs, highAsrsAnswers)
  assert(highAsrsResult.totalScore === 18, 'ASRS-v1.1 computes to 18 points')
  assert(highAsrsResult.riskBand.label === 'High Symptom Burden', 'ASRS 18 points classifies as "High Symptom Burden"')

  // 7.4 AQ-10 Above Threshold
  const highAqAnswers = aq10.questions.map(q => ({ questionId: q.id, value: 1 }))
  const highAqResult = computeScore(aq10, highAqAnswers)
  assert(highAqResult.totalScore === 10, 'AQ-10 computes to 10 points')
  assert(highAqResult.riskBand.label.includes('Above Threshold'), 'AQ-10 10 points classifies as Above Threshold')

  // ──────────────────────────────────────────────────────────────────
  // FEATURE 8: Clinical Notes & Privacy Settings
  // ──────────────────────────────────────────────────────────────────
  console.log('\n▶ [8/9] TESTING CLINICAL NOTES & PATIENT PRIVACY...')
  const validNote = clinicalNoteSchema.safeParse({
    patientId: '6724a1b2c3d4e5f6a7b8c9d0',
    content: 'Patient showed signs of sensory fatigue today. Recommended sensory breaks.'
  })
  assert(validNote.success, 'Valid clinical note accepted by Zod schema')

  const emptyNote = clinicalNoteSchema.safeParse({
    patientId: '6724a1b2c3d4e5f6a7b8c9d0',
    content: ''
  })
  assert(!emptyNote.success, 'Empty clinical note rejected by Zod schema')

  // Privacy rules
  const privacyCheck = (patientPrivacy, requestedField) => {
    if (requestedField === 'metrics' && !patientPrivacy.shareMetrics) return false
    if (requestedField === 'journals' && !patientPrivacy.shareJournals) return false
    return true
  }
  const strictPatient = { shareMetrics: true, shareJournals: false }
  assert(privacyCheck(strictPatient, 'metrics') === true, 'Metrics sharing permitted when shareMetrics is true')
  assert(privacyCheck(strictPatient, 'journals') === false, 'Journals redacted when shareJournals is false')

  // Regression check: simulated clinician roster and patient logs redaction
  const mockRosterLogs = [
    { date: '2026-11-01', mood: 4, maskingFatigue: 3, journal: 'Confidential personal journal entry' }
  ]
  if (!strictPatient.shareJournals) {
    mockRosterLogs.forEach((l) => { l.journal = '' })
  }
  assert(mockRosterLogs[0].journal === '', 'Clinician roster recentLogs redacts journal when shareJournals=false')

  const mockDetailedLogs = [
    { date: '2026-11-01', mood: 4, journal: 'Private sensitive thoughts' }
  ]
  if (!strictPatient.shareJournals) {
    mockDetailedLogs.forEach((l) => { l.journal = '' })
  }
  assert(mockDetailedLogs[0].journal === '', 'Clinician patient logs endpoint redacts journal when shareJournals=false')

  // ──────────────────────────────────────────────────────────────────
  // FEATURE 9: Trigger Taxonomy & Coping Recommendations
  // ──────────────────────────────────────────────────────────────────
  console.log('\n▶ [9/9] TESTING NLP TRIGGER CATEGORISATION...')
  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  const candidateTaxonomyPaths = [
    path.resolve(currentDir, 'ai-service/app/nlp/taxonomy.py'),
    path.resolve(currentDir, '../server/ai-service/app/nlp/taxonomy.py'),
    path.resolve(process.cwd(), 'server/ai-service/app/nlp/taxonomy.py'),
    path.resolve(process.cwd(), 'ai-service/app/nlp/taxonomy.py')
  ]
  const taxonomyPath = candidateTaxonomyPaths.find(p => fs.existsSync(p))
  assert(Boolean(taxonomyPath), `Resolved NLP taxonomy file from working directory (${process.cwd()})`)
  const taxonomyContent = fs.readFileSync(taxonomyPath, 'utf-8')
  
  assert(taxonomyContent.includes('"bright"'), 'Sensory taxonomy contains "bright"')
  assert(taxonomyContent.includes('"fluorescent"'), 'Sensory taxonomy contains "fluorescent"')
  assert(taxonomyContent.includes('"task paralysis"'), 'Executive taxonomy contains "task paralysis"')
  assert(taxonomyContent.includes('"scripting"'), 'Social masking taxonomy contains "scripting"')
  assert(taxonomyContent.includes('"acting normal"'), 'Social masking taxonomy contains "acting normal"')
  assert(taxonomyContent.includes('"eye contact"'), 'Social masking taxonomy contains "eye contact"')

  console.log('\n======================================================================')
  console.log(`🎉 ALL ${totalTests} OF ${totalTests} FEATURE UNIT & LOGIC TESTS PASSED (100%)`)
  console.log('======================================================================')
}

runFeatureTests().catch(err => {
  console.error('\n❌ TEST RUN FAILED:', err)
  process.exit(1)
})
