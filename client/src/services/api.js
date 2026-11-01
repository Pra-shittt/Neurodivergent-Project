/**
 * api.js — Real Axios API client (Phase 2)
 * Replaces mockApi.js. Connects to Express backend at http://localhost:5000
 * All methods mirror the mockApi interface for zero frontend component rewrites.
 */

import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true, // Send httpOnly cookies automatically
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor: attach token as Bearer header fallback ─────────
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('nd_token')
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor: normalise errors ─────────────────
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('nd_token')
      localStorage.removeItem('nd_user')
    }
    const message = error.response?.data?.error || error.response?.data?.detail || error.message || 'Network error'
    return Promise.reject({ success: false, error: message })
  }
)

// ── Helper: wrap axios into { success, data } contract ─────
const safe = async (fn) => {
  try {
    const res = await fn()
    return { success: true, data: res.data.data }
  } catch (err) {
    return { success: false, error: err.error || 'An unexpected error occurred.' }
  }
}

// ── API Methods ─────────────────────────────────────────────
export const api = {
  // ---------- Audio transcription & NLP ----------
  analyzeAudio: async (audioFile, ratings = {}) => {
    const form = new FormData()
    form.append('audio_file', audioFile, audioFile.name || 'recording.webm')
    const defaults = {
      mood_rating: ratings.mood ?? 3,
      sensory_overload_level: ratings.sensoryOverload ?? 1,
      executive_function_level: ratings.executiveFunction ?? 3,
      masking_fatigue_level: ratings.maskingFatigue ?? 1,
    }
    Object.entries(defaults).forEach(([k, v]) => form.append(k, String(v)))

    // Candidate endpoints (prefer 127.0.0.1 on Windows to bypass IPv6 localhost resolution)
    const baseCandidates = [
      import.meta.env.VITE_AI_SERVICE_URL,
      'http://127.0.0.1:8000/api/v1',
      'http://localhost:8000/api/v1',
    ].filter(Boolean)

    for (const baseUrl of baseCandidates) {
      try {
        const res = await axios.post(`${baseUrl}/analyze-audio`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
          withCredentials: false,
          timeout: 25000,
        })
        if (res.data?.data) {
          return { success: true, data: res.data.data }
        }
      } catch (err) {
        if (err.response?.status === 400) {
          return {
            success: false,
            error: err.response.data?.detail || 'Could not transcribe audio clearly. Please try speaking closer to the mic.',
          }
        }
        // continue trying next URL candidate if network/connection issue
      }
    }

    // If the Python FastAPI service is not reachable
    return {
      success: false,
      error: import.meta.env.VITE_AI_SERVICE_URL
        ? 'Speech AI service is currently unreachable. Please verify that the AI microservice is online.'
        : 'Speech AI service on port 8000 is not running. Please start it with: uvicorn app.main:app --port 8000',
    }
  },

  // Auth
  login: async (email, password) => {
    const res = await safe(() => client.post('/auth/login', { email, password }))
    if (res.success && res.data?.token) {
      localStorage.setItem('nd_token', res.data.token)
    }
    return res
  },

  register: async (payload) => {
    const res = await safe(() => client.post('/auth/register', payload))
    if (res.success && res.data?.token) {
      localStorage.setItem('nd_token', res.data.token)
    }
    return res
  },

  logout: async () => {
    localStorage.removeItem('nd_token')
    return safe(() => client.post('/auth/logout'))
  },

  getMe: () =>
    safe(() => client.get('/auth/me')),

  // Logs
  getLogs: (userId, days = 14) =>
    safe(() => client.get(`/logs?days=${days}`)),

  submitLog: (userId, logData) =>
    safe(() => client.post('/logs', logData)),

  getTrends: () =>
    safe(() => client.get('/logs/trends')),

  // Assessments
  getAssessmentTemplates: () =>
    safe(() => client.get('/assessments/templates')),

  getUserAssessments: (userId) =>
    safe(() => client.get('/assessments/my-results')),

  submitAssessment: (userId, templateId, answers) =>
    safe(() => client.post('/assessments/submit', { templateId, answers })),

  // User Profile
  updateProfile: (data) =>
    safe(() => client.patch('/users/profile', data)),

  updatePrivacy: (settings) =>
    safe(() => client.patch('/users/privacy', settings)),

  getInviteCode: () =>
    safe(() => client.get('/users/invite-code')),

  // Clinician
  getClinicianPatients: (clinicianId) =>
    safe(() => client.get('/clinician/patients')),

  getClinicalNotes: (clinicianId, patientId) =>
    safe(() => client.get(`/clinician/patients/${patientId}/notes`)),

  addClinicalNote: (clinicianId, patientId, content) =>
    safe(() => client.post('/clinician/notes', { patientId, content })),

  linkPatient: (clinicianId, inviteCode) =>
    safe(() => client.post('/clinician/link-patient', { inviteCode })),
}
