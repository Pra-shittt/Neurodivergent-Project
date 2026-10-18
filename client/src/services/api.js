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

// ── Response interceptor: normalise errors ─────────────────
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || 'Network error'
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
  // Auth
  login: (email, password) =>
    safe(() => client.post('/auth/login', { email, password })),

  register: (payload) =>
    safe(() => client.post('/auth/register', payload)),

  logout: () =>
    safe(() => client.post('/auth/logout')),

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
