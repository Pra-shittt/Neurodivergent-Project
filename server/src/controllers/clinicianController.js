import User from '../models/User.js'
import DailyLog from '../models/DailyLog.js'
import ClinicalNote from '../models/ClinicalNote.js'
import { UserAssessment } from '../models/Assessment.js'

// GET /api/v1/clinician/patients
export const getPatients = async (req, res, next) => {
  try {
    const clinician = await User.findById(req.user._id).select('patientIds')
    const patientIdsFromClinician = (clinician?.patientIds || []).map(String)

    // Also look up patients who have this clinician assigned by clinicianId
    const patientsByRef = await User.find({ clinicianId: req.user._id, role: 'individual' }).select('_id')
    const patientIdsFromRef = patientsByRef.map(p => String(p._id))

    const allPatientIds = Array.from(new Set([...patientIdsFromClinician, ...patientIdsFromRef]))

    // Sync roster if any reference was missing in patientIds array
    if (patientIdsFromRef.some(id => !patientIdsFromClinician.includes(id))) {
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { patientIds: { $each: patientIdsFromRef } } })
    }

    const patients = await Promise.all(
      allPatientIds.map(async (pid) => {
        const patient = await User.findById(pid).select('-password')
        if (!patient) return null

        const recentLogs = await DailyLog.find({ userId: pid })
          .sort({ date: -1 })
          .limit(7)
          .lean()

        // Check journal sharing setting: redact if patient opted out
        const shareJournals = Boolean(patient.privacySettings?.shareJournals)
        const shareMetrics = Boolean(patient.privacySettings?.shareMetrics ?? true)

        const sanitizedLogs = recentLogs.map((log) => ({
          ...log,
          journal: shareJournals ? (log.journal || '') : '',
          mood: shareMetrics ? log.mood : null,
          executiveFunction: shareMetrics ? log.executiveFunction : null,
          sensoryOverload: shareMetrics ? log.sensoryOverload : null,
          maskingFatigue: shareMetrics ? log.maskingFatigue : null,
        }))

        // Burnout flag: 3 consecutive days with maskingFatigue >= 4
        const burnoutFlag =
          recentLogs.length >= 3 &&
          recentLogs.slice(0, 3).every((l) => l.maskingFatigue >= 4)

        const assessments = await UserAssessment.find({ userId: pid })
          .sort({ completedAt: -1 })

        return {
          ...patient.toObject(),
          recentLogs: sanitizedLogs,
          burnoutFlag,
          assessments,
        }
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
    const code = (inviteCode || '').trim()
    if (!code) {
      return res.status(400).json({ success: false, error: 'Invite code is required.' })
    }

    // Case-insensitive invite code lookup
    const patient = await User.findOne({
      inviteCode: new RegExp(`^${code}$`, 'i'),
      role: 'individual',
    })
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

// POST /api/v1/clinician/unlink-patient
export const unlinkPatient = async (req, res, next) => {
  try {
    const { patientId } = req.body
    if (!patientId) {
      return res.status(400).json({ success: false, error: 'Patient ID is required.' })
    }

    await User.findByIdAndUpdate(req.user._id, { $pull: { patientIds: patientId } })
    await User.findByIdAndUpdate(patientId, { clinicianId: null })

    res.json({ success: true, data: { message: 'Patient removed from roster.' } })
  } catch (err) {
    next(err)
  }
}

// GET /api/v1/clinician/patients/:patientId/logs
export const getPatientLogs = async (req, res, next) => {
  try {
    const { patientId } = req.params
    const clinician = await User.findById(req.user._id).select('patientIds')
    const patient = await User.findById(patientId).select('privacySettings name pronouns clinicianId')
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found.' })
    }

    const isInRoster = (clinician?.patientIds || []).map(String).includes(patientId)
    const isLinked = String(patient.clinicianId) === String(req.user._id)
    if (!isInRoster && !isLinked) {
      return res.status(403).json({ success: false, error: 'Patient not in your roster.' })
    }

    const logs = await DailyLog.find({ userId: patientId }).sort({ date: -1 }).lean()
    const shareJournals = Boolean(patient.privacySettings?.shareJournals)
    const shareMetrics = Boolean(patient.privacySettings?.shareMetrics ?? true)

    const sanitizedLogs = logs.map((log) => ({
      ...log,
      journal: shareJournals ? (log.journal || '') : '',
      mood: shareMetrics ? log.mood : null,
      executiveFunction: shareMetrics ? log.executiveFunction : null,
      sensoryOverload: shareMetrics ? log.sensoryOverload : null,
      maskingFatigue: shareMetrics ? log.maskingFatigue : null,
    }))

    res.json({
      success: true,
      data: {
        patient: {
          id: patient._id,
          name: patient.name,
          pronouns: patient.pronouns,
          privacySettings: patient.privacySettings,
        },
        logs: sanitizedLogs,
        privacy: { shareJournals, shareMetrics },
      },
    })
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
