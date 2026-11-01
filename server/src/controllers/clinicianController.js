import User from '../models/User.js'
import DailyLog from '../models/DailyLog.js'
import ClinicalNote from '../models/ClinicalNote.js'
import { UserAssessment } from '../models/Assessment.js'

// GET /api/v1/clinician/patients
export const getPatients = async (req, res, next) => {
  try {
    const clinician = await User.findById(req.user._id).select('patientIds')
    const patientIds = clinician.patientIds || []

    const patients = await Promise.all(
      patientIds.map(async (pid) => {
        const patient = await User.findById(pid).select('-password')
        if (!patient) return null

        const recentLogs = await DailyLog.find({ userId: pid })
          .sort({ date: -1 })
          .limit(3)

        // Burnout flag: 3 consecutive days with maskingFatigue >= 4
        const burnoutFlag =
          recentLogs.length === 3 &&
          recentLogs.every((l) => l.maskingFatigue >= 4)

        const assessments = await UserAssessment.find({ userId: pid })
          .sort({ completedAt: -1 })

        return { ...patient.toObject(), recentLogs, burnoutFlag, assessments }
      })
    )

    res.json({ success: true, data: { patients: patients.filter(Boolean) } })
  } catch (err) {
    next(err)
  }
}

// POST /api/v1/clinician/link-patient
export const linkPatient = async (req, res, next) => {
  try {
    const { inviteCode } = req.body
    const patient = await User.findOne({ inviteCode, role: 'individual' })
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Invalid invite code.' })
    }

    // Link patient to clinician
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { patientIds: patient._id },
    })
    await User.findByIdAndUpdate(patient._id, { clinicianId: req.user._id })

    res.json({ success: true, data: { patient: { id: patient._id, name: patient.name } } })
  } catch (err) {
    next(err)
  }
}

// GET /api/v1/clinician/patients/:patientId/logs
export const getPatientLogs = async (req, res, next) => {
  try {
    const { patientId } = req.params
    const clinician = await User.findById(req.user._id).select('patientIds')
    if (!clinician.patientIds.map(String).includes(patientId)) {
      return res.status(403).json({ success: false, error: 'Patient not in your roster.' })
    }

    const patient = await User.findById(patientId).select('privacySettings name pronouns')
    if (!patient.privacySettings.shareMetrics) {
      return res.status(403).json({ success: false, error: 'Patient has restricted metric sharing.' })
    }

    const logs = await DailyLog.find({ userId: patientId }).sort({ date: 1 })
    res.json({ success: true, data: { patient, logs } })
  } catch (err) {
    next(err)
  }
}

// GET /api/v1/clinician/patients/:patientId/notes
export const getNotes = async (req, res, next) => {
  try {
    const notes = await ClinicalNote.find({
      clinicianId: req.user._id,
      patientId: req.params.patientId,
    }).sort({ createdAt: -1 })
    res.json({ success: true, data: { notes } })
  } catch (err) {
    next(err)
  }
}

// POST /api/v1/clinician/notes
export const addNote = async (req, res, next) => {
  try {
    const { patientId, content } = req.body
    const note = await ClinicalNote.create({ clinicianId: req.user._id, patientId, content })
    res.status(201).json({ success: true, data: { note } })
  } catch (err) {
    next(err)
  }
}
