// ============================================================
// mockApi.js — Simulated async API layer (Phase 1)
// Replace each method with real Axios/Fetch calls in Phase 2
// ============================================================

const delay = (ms = 600) => new Promise(r => setTimeout(r, ms))

// ── Seed Data ──────────────────────────────────────────────
const USERS = [
  {
    id: 'u1',
    name: 'Alex Rivera',
    email: 'alex@demo.com',
    password: 'demo1234',
    role: 'individual',
    pronouns: 'they/them',
    diagnoses: ['ADHD', 'ASD'],
    inviteCode: 'ALEX-2024',
    clinicianId: 'u2',
    privacySettings: { shareMetrics: true, shareJournals: false },
  },
  {
    id: 'u2',
    name: 'Dr. Morgan Chen',
    email: 'morgan@demo.com',
    password: 'demo1234',
    role: 'clinician',
    pronouns: 'she/her',
    patientIds: ['u1', 'u3'],
  },
  {
    id: 'u3',
    name: 'Jamie Patel',
    email: 'jamie@demo.com',
    password: 'demo1234',
    role: 'individual',
    pronouns: 'he/him',
    diagnoses: ['ADHD'],
    inviteCode: 'JAMIE-2024',
    clinicianId: 'u2',
    privacySettings: { shareMetrics: true, shareJournals: true },
  },
]

const generateLogs = (userId) => {
  const logs = []
  const now = new Date()
  for (let i = 13; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    logs.push({
      id: `log-${userId}-${i}`,
      userId,
      date: date.toISOString().split('T')[0],
      mood: Math.floor(Math.random() * 3) + 2,
      executiveFunction: Math.floor(Math.random() * 3) + 1,
      sensoryOverload: Math.floor(Math.random() * 4) + 1,
      maskingFatigue: Math.floor(Math.random() * 3) + 2,
      triggers: i % 3 === 0 ? ['Bright lights', 'Crowded spaces'] : i % 2 === 0 ? ['Noise', 'Time pressure'] : ['Social demands'],
      journal: i % 4 === 0 ? 'Had a particularly tough day with sensory overload at the grocery store. Took a decompression break.' : '',
    })
  }
  return logs
}

let LOGS = {
  u1: generateLogs('u1'),
  u3: generateLogs('u3'),
}

// Psychometric assessment templates
const ASSESSMENT_TEMPLATES = [
  {
    id: 'catq',
    name: 'CAT-Q',
    fullName: 'Camouflaging Autistic Traits Questionnaire',
    description: 'Measures social camouflaging and masking behaviours.',
    sections: ['Compensation', 'Masking', 'Assimilation'],
    questions: [
      { id: 'q1', text: 'When I\'m in a social situation, I deliberately use a script or set of rules to guide my behaviour.', section: 'Compensation' },
      { id: 'q2', text: 'I have developed a script to use for small talk.', section: 'Compensation' },
      { id: 'q3', text: 'I notice when my social behaviour is not matching that of others around me.', section: 'Masking' },
      { id: 'q4', text: 'I hide my true self in social situations.', section: 'Masking' },
      { id: 'q5', text: 'I adjust my body language to fit in with others.', section: 'Assimilation' },
      { id: 'q6', text: 'I work hard to understand others\' true intentions and meanings.', section: 'Assimilation' },
      { id: 'q7', text: 'I consciously study and practise expressions and body language.', section: 'Compensation' },
      { id: 'q8', text: 'I always try to behave in a way that is socially expected.', section: 'Masking' },
      { id: 'q9', text: 'I prefer to be in social groups that have consistent, predictable dynamics.', section: 'Assimilation' },
      { id: 'q10', text: 'I monitor my behaviour carefully to make sure it seems "normal".', section: 'Masking' },
    ],
    options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    maxScore: 50,
    riskBands: [
      { label: 'Low Camouflaging', min: 0, max: 20, color: 'green' },
      { label: 'Moderate Camouflaging', min: 21, max: 35, color: 'amber' },
      { label: 'High Camouflaging', min: 36, max: 50, color: 'rose' },
    ],
  },
  {
    id: 'asrs',
    name: 'ASRS-v1.1',
    fullName: 'Adult ADHD Self-Report Scale',
    description: 'Screens for adult ADHD symptoms across inattention and hyperactivity.',
    sections: ['Inattention', 'Hyperactivity/Impulsivity'],
    questions: [
      { id: 'q1', text: 'How often do you have trouble wrapping up the final details of a project?', section: 'Inattention' },
      { id: 'q2', text: 'How often do you have difficulty getting things in order when you have to do a task that requires organisation?', section: 'Inattention' },
      { id: 'q3', text: 'How often do you have problems remembering appointments or obligations?', section: 'Inattention' },
      { id: 'q4', text: 'How often do you avoid or delay getting started on tasks that require a lot of thought?', section: 'Inattention' },
      { id: 'q5', text: 'How often do you fidget or squirm with your hands or feet when you have to sit down for a long time?', section: 'Hyperactivity/Impulsivity' },
      { id: 'q6', text: 'How often do you feel overly active and compelled to do things, as if driven by a motor?', section: 'Hyperactivity/Impulsivity' },
    ],
    options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Very Often'],
    maxScore: 24,
    riskBands: [
      { label: 'Low Symptom Burden', min: 0, max: 8, color: 'green' },
      { label: 'Moderate Symptoms', min: 9, max: 16, color: 'amber' },
      { label: 'High Symptom Burden', min: 17, max: 24, color: 'rose' },
    ],
  },
  {
    id: 'aq10',
    name: 'AQ-10',
    fullName: 'Autism Spectrum Quotient (10-item)',
    description: 'Brief autism screening tool measuring autistic traits.',
    sections: ['Social Skills', 'Attention Switching', 'Communication'],
    questions: [
      { id: 'q1', text: 'I often notice small sounds when others do not.', section: 'Attention Switching' },
      { id: 'q2', text: 'I usually concentrate more on the whole picture, rather than the small details.', section: 'Attention Switching' },
      { id: 'q3', text: 'I find it easy to do more than one thing at once.', section: 'Attention Switching' },
      { id: 'q4', text: 'If there is an interruption, I can switch back to what I was doing very quickly.', section: 'Attention Switching' },
      { id: 'q5', text: 'I find it easy to "read between the lines" when someone is talking to me.', section: 'Communication' },
      { id: 'q6', text: 'I know how to tell if someone listening to me is getting bored.', section: 'Social Skills' },
      { id: 'q7', text: 'When I\'m reading a story, I find it difficult to work out the characters\' intentions.', section: 'Communication' },
      { id: 'q8', text: 'I like to collect information about categories of things (e.g. types of car, types of bird, types of train…).', section: 'Social Skills' },
      { id: 'q9', text: 'I find it easy to work out what someone is thinking or feeling just by looking at their face.', section: 'Social Skills' },
      { id: 'q10', text: 'I find it difficult to work out people\'s intentions.', section: 'Communication' },
    ],
    options: ['Definitely Agree', 'Slightly Agree', 'Slightly Disagree', 'Definitely Disagree'],
    maxScore: 10,
    riskBands: [
      { label: 'Below Threshold', min: 0, max: 5, color: 'green' },
      { label: 'Above Threshold — Further Assessment Recommended', min: 6, max: 10, color: 'rose' },
    ],
  },
]

let USER_ASSESSMENTS = []
let CLINICAL_NOTES = []

// ── Mock API ───────────────────────────────────────────────
export const mockApi = {
  // Auth
  async login(email, password) {
    await delay()
    const user = USERS.find(u => u.email === email && u.password === password)
    if (!user) return { success: false, error: 'Invalid email or password.' }
    const { password: _, ...safeUser } = user
    return { success: true, data: { user: safeUser } }
  },

  async register(payload) {
    await delay()
    if (USERS.find(u => u.email === payload.email)) {
      return { success: false, error: 'An account with this email already exists.' }
    }
    const newUser = {
      id: `u${Date.now()}`,
      ...payload,
      inviteCode: payload.role === 'individual' ? `${payload.name.split(' ')[0].toUpperCase()}-${Date.now()}` : undefined,
      patientIds: payload.role === 'clinician' ? [] : undefined,
      privacySettings: payload.role === 'individual' ? { shareMetrics: true, shareJournals: false } : undefined,
    }
    USERS.push(newUser)
    if (payload.role === 'individual') LOGS[newUser.id] = []
    const { password: _, ...safeUser } = newUser
    return { success: true, data: { user: safeUser } }
  },

  // Daily Logs
  async getLogs(userId) {
    await delay(400)
    return { success: true, data: { logs: LOGS[userId] || [] } }
  },

  async submitLog(userId, logData) {
    await delay()
    const log = {
      id: `log-${Date.now()}`,
      userId,
      date: new Date().toISOString().split('T')[0],
      ...logData,
    }
    if (!LOGS[userId]) LOGS[userId] = []
    // Replace today's log if exists
    const todayIdx = LOGS[userId].findIndex(l => l.date === log.date)
    if (todayIdx >= 0) LOGS[userId][todayIdx] = log
    else LOGS[userId].push(log)
    return { success: true, data: { log } }
  },

  // Assessments
  async getAssessmentTemplates() {
    await delay(300)
    return { success: true, data: { templates: ASSESSMENT_TEMPLATES } }
  },

  async getUserAssessments(userId) {
    await delay(300)
    return { success: true, data: { assessments: USER_ASSESSMENTS.filter(a => a.userId === userId) } }
  },

  async submitAssessment(userId, templateId, answers) {
    await delay(800)
    const template = ASSESSMENT_TEMPLATES.find(t => t.id === templateId)
    if (!template) return { success: false, error: 'Assessment template not found.' }

    // Score the assessment
    const totalScore = answers.reduce((sum, a) => sum + a.value, 0)
    const sectionScores = {}
    template.sections.forEach(s => {
      const sectionQs = template.questions.filter(q => q.section === s)
      const sectionAnswers = answers.filter(a => sectionQs.find(q => q.id === a.questionId))
      sectionScores[s] = sectionAnswers.reduce((sum, a) => sum + a.value, 0)
    })
    const riskBand = template.riskBands.find(b => totalScore >= b.min && totalScore <= b.max) || template.riskBands[template.riskBands.length - 1]

    const result = {
      id: `assess-${Date.now()}`,
      userId,
      templateId,
      templateName: template.name,
      completedAt: new Date().toISOString(),
      answers,
      totalScore,
      maxScore: template.maxScore,
      sectionScores,
      riskBand,
    }
    USER_ASSESSMENTS.push(result)
    return { success: true, data: { assessment: result } }
  },

  // Clinician
  async getClinicianPatients(clinicianId) {
    await delay(500)
    const clinician = USERS.find(u => u.id === clinicianId)
    if (!clinician) return { success: false, error: 'Clinician not found.' }

    const patients = (clinician.patientIds || []).map(pid => {
      const patient = USERS.find(u => u.id === pid)
      if (!patient) return null
      const { password: _, ...safePatient } = patient
      const patientLogs = LOGS[pid] || []
      const recentLogs = patientLogs.slice(-3)
      const burnoutFlag = recentLogs.length === 3 && recentLogs.every(l => l.maskingFatigue >= 4)
      return { ...safePatient, recentLogs, burnoutFlag }
    }).filter(Boolean)

    return { success: true, data: { patients } }
  },

  async getClinicalNotes(clinicianId, patientId) {
    await delay(300)
    return { success: true, data: { notes: CLINICAL_NOTES.filter(n => n.clinicianId === clinicianId && n.patientId === patientId) } }
  },

  async addClinicalNote(clinicianId, patientId, content) {
    await delay()
    const note = { id: `note-${Date.now()}`, clinicianId, patientId, content, createdAt: new Date().toISOString() }
    CLINICAL_NOTES.push(note)
    return { success: true, data: { note } }
  },

  // Link patient to clinician
  async linkPatient(clinicianId, inviteCode) {
    await delay()
    const patient = USERS.find(u => u.inviteCode === inviteCode && u.role === 'individual')
    if (!patient) return { success: false, error: 'Invalid invite code.' }
    const clinician = USERS.find(u => u.id === clinicianId)
    if (!clinician.patientIds.includes(patient.id)) clinician.patientIds.push(patient.id)
    patient.clinicianId = clinicianId
    return { success: true, data: { patient: { name: patient.name, id: patient.id } } }
  },
}
