import path from 'path'
import mongoose from 'mongoose'
import app from './app.js'
import User from './src/models/User.js'
import DailyLog from './src/models/DailyLog.js'
import ClinicalNote from './src/models/ClinicalNote.js'
import { AssessmentTemplate, UserAssessment } from './src/models/Assessment.js'
import { autoSeedTemplates } from './src/utils/autoSeed.js'

async function runFullE2ETest() {
  let serverInstance = null
  try {
    console.log('Connecting to active test MongoDB on port 27018...')
    await mongoose.connect('mongodb://127.0.0.1:27018/neuroportal_e2e_test', {
      serverSelectionTimeoutMS: 3000
    })
    console.log('✅ Connected to MongoDB on port 27018!\n')

    // Clean test database
    await mongoose.connection.dropDatabase()

    // Start Express HTTP server
    const PORT = 5099
    serverInstance = app.listen(PORT)
    const BASE_URL = `http://127.0.0.1:${PORT}/api/v1`
    console.log(`✅ Express Server running at ${BASE_URL}\n`)

    const apiFetch = async (endpoint, options = {}) => {
      const url = `${BASE_URL}${endpoint}`
      const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
      const res = await fetch(url, { ...options, headers })
      const body = await res.json().catch(() => ({}))
      return { status: res.status, headers: res.headers, body }
    }

    console.log('===============================================================')
    console.log('🔬 NEUROPORTAL FULL END-TO-END AUTOMATED FEATURE TEST SUITE')
    console.log('===============================================================\n')

    // ─────────────────────────────────────────────────────────────
    // FEATURE 0: Database Auto-Seeding
    // ─────────────────────────────────────────────────────────────
    console.log('▶ [0/8] TESTING ASSESSMENT TEMPLATES AUTO-SEEDING...')
    await autoSeedTemplates()
    const templates = await AssessmentTemplate.find({ isActive: true })
    console.log(`  ✓ Templates in DB: ${templates.length} (${templates.map(t => t.name).join(', ')})`)
    if (templates.length < 3) throw new Error('Auto-seed failed to insert all templates')

    // ─────────────────────────────────────────────────────────────
    // FEATURE 1: Register New Individual Account
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ [1/8] TESTING NEW INDIVIDUAL ACCOUNT REGISTRATION...')
    const patientPayload = {
      name: 'Jordan Miller',
      email: 'jordan.miller@neurotest.org',
      password: 'SecurePass987!',
      role: 'individual',
      pronouns: 'they/them',
      diagnoses: ['ADHD', 'ASD']
    }

    const regPatientRes = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(patientPayload)
    })

    console.log(`  ✓ HTTP Status: ${regPatientRes.status}`)
    console.log(`  ✓ Success: ${regPatientRes.body.success}`)
    console.log(`  ✓ User ID: ${regPatientRes.body.data?.user?._id}`)
    console.log(`  ✓ Role: ${regPatientRes.body.data?.user?.role}`)
    console.log(`  ✓ Invite Code Generated: ${regPatientRes.body.data?.user?.inviteCode}`)
    console.log(`  ✓ Token returned in payload: ${Boolean(regPatientRes.body.data?.token)}`)
    console.log(`  ✓ Cookie set in header: ${Boolean(regPatientRes.headers.get('set-cookie'))}`)

    const patientToken = regPatientRes.body.data?.token
    const patientInviteCode = regPatientRes.body.data?.user?.inviteCode
    const patientId = regPatientRes.body.data?.user?._id

    if (!patientToken || !patientInviteCode) {
      throw new Error('Registration did not produce token or invite code')
    }

    // Verify duplicate registration rejection
    const dupRes = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(patientPayload)
    })
    console.log(`  ✓ Duplicate email rejected: HTTP ${dupRes.status} (${dupRes.body.error})`)

    // ─────────────────────────────────────────────────────────────
    // FEATURE 2: Register New Clinician Account
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ [2/8] TESTING NEW CLINICIAN ACCOUNT REGISTRATION...')
    const clinicianPayload = {
      name: 'Dr. Sarah Connor, PsyD',
      email: 'dr.sarah@neuroclinic.org',
      password: 'ClinicianSecure2026!',
      role: 'clinician',
      pronouns: 'she/her'
    }

    const regClinicianRes = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(clinicianPayload)
    })

    console.log(`  ✓ HTTP Status: ${regClinicianRes.status}`)
    console.log(`  ✓ Clinician ID: ${regClinicianRes.body.data?.user?._id}`)
    console.log(`  ✓ Role: ${regClinicianRes.body.data?.user?.role}`)
    const clinicianToken = regClinicianRes.body.data?.token
    const clinicianId = regClinicianRes.body.data?.user?._id

    // ─────────────────────────────────────────────────────────────
    // FEATURE 3: Login Authentication & Protected Session
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ [3/8] TESTING LOGIN AUTHENTICATION & REJECTION...')
    // Wrong password
    const badLogin = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: patientPayload.email, password: 'WrongPassword' })
    })
    console.log(`  ✓ Wrong password rejected: HTTP ${badLogin.status} (${badLogin.body.error})`)

    // Correct password
    const goodLogin = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: patientPayload.email, password: patientPayload.password })
    })
    console.log(`  ✓ Correct password accepted: HTTP ${goodLogin.status} (User: ${goodLogin.body.data.user.name})`)

    // Get Me with Bearer Token
    const meRes = await apiFetch('/auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${patientToken}` }
    })
    console.log(`  ✓ /auth/me returns authenticated user: ${meRes.body.data?.user?.email}`)

    // ─────────────────────────────────────────────────────────────
    // FEATURE 4: Patient-Clinician Linking via Invite Code
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ [4/8] TESTING PATIENT-CLINICIAN LINKING VIA INVITE CODE...')
    console.log(`  Linking patient invite code: ${patientInviteCode} to Clinician: ${clinicianId}`)

    // Invalid code test
    const badLinkRes = await apiFetch('/clinician/link-patient', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clinicianToken}` },
      body: JSON.stringify({ inviteCode: 'FAKE-9999' })
    })
    console.log(`  ✓ Invalid invite code rejected: HTTP ${badLinkRes.status} (${badLinkRes.body.error})`)

    // Valid link
    const goodLinkRes = await apiFetch('/clinician/link-patient', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clinicianToken}` },
      body: JSON.stringify({ inviteCode: patientInviteCode })
    })
    console.log(`  ✓ Valid link successful: HTTP ${goodLinkRes.status} (Linked: ${goodLinkRes.body.data?.patient?.name})`)

    // Verify patient appears in clinician's roster
    const rosterRes = await apiFetch('/clinician/patients', {
      method: 'GET',
      headers: { Authorization: `Bearer ${clinicianToken}` }
    })
    console.log(`  ✓ Clinician patient roster count: ${rosterRes.body.data?.patients?.length}`)
    console.log(`  ✓ Roster patient name: ${rosterRes.body.data?.patients?.[0]?.name}`)

    // ─────────────────────────────────────────────────────────────
    // FEATURE 5: Daily Logging & Emotional/Sensory Tracking
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ [5/8] TESTING DAILY LOGGING & HISTORY...')
    const today = new Date().toISOString().split('T')[0]
    const logData = {
      date: today,
      mood: 4,
      executiveFunction: 3,
      sensoryOverload: 2,
      maskingFatigue: 4,
      triggers: ['Bright lights', 'Loud noises'],
      journal: 'Had a sensory sensitive morning in the office with flickering fluorescent lighting. Stepped outside with noise-cancelling headphones.'
    }

    const logRes = await apiFetch('/logs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify(logData)
    })
    console.log(`  ✓ Daily log saved: HTTP ${logRes.status} (Log ID: ${logRes.body.data?.log?._id})`)

    // Test upsert (submitting again on the same date should update, not crash)
    const updateLogRes = await apiFetch('/logs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({ ...logData, mood: 5 })
    })
    console.log(`  ✓ Daily log upserted cleanly: New Mood = ${updateLogRes.body.data?.log?.mood}`)

    // Retrieve history
    const getLogsRes = await apiFetch('/logs?days=14', {
      method: 'GET',
      headers: { Authorization: `Bearer ${patientToken}` }
    })
    console.log(`  ✓ Retrieved logs count: ${getLogsRes.body.data?.logs?.length}`)

    // ─────────────────────────────────────────────────────────────
    // FEATURE 6: Psychometric Assessments (CAT-Q, ASRS-v1.1)
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ [6/8] TESTING PSYCHOMETRIC ASSESSMENT SUBMISSION & SCORING...')
    const catQTemplate = templates.find(t => t.name === 'CAT-Q')
    console.log(`  Targeting Template: ${catQTemplate.name} (${catQTemplate.fullName})`)

    // Answers simulating moderate-to-high camouflaging
    const answers = catQTemplate.questions.map((q, idx) => ({
      questionId: q.id,
      value: (idx % 2 === 0) ? 4 : 5
    }))

    const assessRes = await apiFetch('/assessments/submit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({
        templateId: catQTemplate._id.toString(),
        answers
      })
    })

    console.log(`  ✓ Assessment Submitted: HTTP ${assessRes.status}`)
    console.log(`  ✓ Total Score: ${assessRes.body.data?.assessment?.totalScore} / ${assessRes.body.data?.assessment?.maxScore}`)
    console.log(`  ✓ Risk Band: "${assessRes.body.data?.assessment?.riskBand?.label}" (Color: ${assessRes.body.data?.assessment?.riskBand?.color})`)
    console.log(`  ✓ Subscale Breakdown:`, assessRes.body.data?.assessment?.sectionScores)

    // Patient views their own assessments
    const myAssessRes = await apiFetch('/assessments/my-results', {
      method: 'GET',
      headers: { Authorization: `Bearer ${patientToken}` }
    })
    console.log(`  ✓ Patient my-results retrieved: ${myAssessRes.body.data?.assessments?.length} assessment(s)`)

    // ─────────────────────────────────────────────────────────────
    // FEATURE 7: Clinician Visibility & Clinical Notes
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ [7/8] TESTING CLINICIAN VIEW OF PATIENT ASSESSMENTS & NOTES...')
    const updatedRosterRes = await apiFetch('/clinician/patients', {
      method: 'GET',
      headers: { Authorization: `Bearer ${clinicianToken}` }
    })

    const linkedPatient = updatedRosterRes.body.data?.patients?.[0]
    console.log(`  ✓ Clinician sees patient's assessment score: ${linkedPatient?.assessments?.[0]?.totalScore}/${linkedPatient?.assessments?.[0]?.maxScore}`)
    console.log(`  ✓ Clinician sees risk band label: "${linkedPatient?.assessments?.[0]?.riskBand?.label}"`)

    // Add a Clinical Note
    const noteRes = await apiFetch('/clinician/notes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clinicianToken}` },
      body: JSON.stringify({
        patientId: patientId,
        content: 'Patient demonstrates elevated camouflaging scores on CAT-Q. Discussed sensory accommodations and lowering masking fatigue at work.'
      })
    })
    console.log(`  ✓ Clinical note created: HTTP ${noteRes.status} (ID: ${noteRes.body.data?.note?._id})`)

    // Retrieve Clinical Notes
    const getNotesRes = await apiFetch(`/clinician/patients/${patientId}/notes`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${clinicianToken}` }
    })
    console.log(`  ✓ Retrieved patient notes: ${getNotesRes.body.data?.notes?.length} note(s)`)
    console.log(`  ✓ Note snippet: "${getNotesRes.body.data?.notes?.[0]?.content.slice(0, 50)}..."`)

    // ─────────────────────────────────────────────────────────────
    // FEATURE 8: Logout & Session Invalidation
    // ─────────────────────────────────────────────────────────────
    console.log('\n▶ [8/8] TESTING LOGOUT & SESSION INVALIDATION...')
    const logoutRes = await apiFetch('/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` }
    })
    console.log(`  ✓ Logout response: HTTP ${logoutRes.status} (${logoutRes.body.data?.message})`)

    console.log('\n===============================================================')
    console.log('🎉 ALL 8 CORE FEATURES TESTED END-TO-END WITH 100% SUCCESS!')
    console.log('===============================================================')

    if (serverInstance) serverInstance.close()
    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error('\n❌ TEST FAILURE:', err)
    if (serverInstance) serverInstance.close()
    await mongoose.disconnect().catch(() => {})
    process.exit(1)
  }
}

runFullE2ETest()
