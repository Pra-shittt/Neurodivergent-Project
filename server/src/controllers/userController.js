import User from '../models/User.js'

// PATCH /api/v1/users/profile
export const updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'pronouns', 'diagnoses']
    const updates = {}
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k] })

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true })
    res.json({ success: true, data: { user } })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/v1/users/privacy
export const updatePrivacy = async (req, res, next) => {
  try {
    const { shareMetrics, shareJournals } = req.body
    const updates = {}
    if (typeof shareMetrics === 'boolean') updates['privacySettings.shareMetrics'] = shareMetrics
    if (typeof shareJournals === 'boolean') updates['privacySettings.shareJournals'] = shareJournals

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true }
    )
    res.json({ success: true, data: { privacySettings: user.privacySettings } })
  } catch (err) {
    next(err)
  }
}

// GET /api/v1/users/invite-code
export const getInviteCode = async (req, res, next) => {
  try {
    if (req.user.role !== 'individual') {
      return res.status(403).json({ success: false, error: 'Only individuals have invite codes.' })
    }
    let user = await User.findById(req.user._id)
      .select('inviteCode clinicianId privacySettings name')
      .populate('clinicianId', 'name email pronouns')

    // If inviteCode is missing, generate and persist one
    if (!user.inviteCode) {
      const name = (user.name || 'USER').split(' ')[0].toUpperCase().slice(0, 8)
      const suffix = Math.random().toString(36).substring(2, 6).toUpperCase()
      user.inviteCode = `${name}-${suffix}`
      await user.save()
    }

    res.json({
      success: true,
      data: {
        inviteCode: user.inviteCode,
        privacySettings: user.privacySettings,
        clinician: user.clinicianId ? {
          id: user.clinicianId._id,
          name: user.clinicianId.name,
          email: user.clinicianId.email,
          pronouns: user.clinicianId.pronouns,
        } : null,
      },
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/v1/users/link-clinician (Patient connects to clinician via email)
export const linkClinician = async (req, res, next) => {
  try {
    const { clinicianEmail, email } = req.body
    const targetEmail = (clinicianEmail || email || '').trim().toLowerCase()
    if (!targetEmail) {
      return res.status(400).json({ success: false, error: 'Clinician email is required.' })
    }

    const clinician = await User.findOne({ email: targetEmail, role: 'clinician' })
    if (!clinician) {
      return res.status(404).json({ success: false, error: 'No clinician found with that email address.' })
    }

    await User.findByIdAndUpdate(req.user._id, { clinicianId: clinician._id })
    await User.findByIdAndUpdate(clinician._id, { $addToSet: { patientIds: req.user._id } })

    res.json({
      success: true,
      data: {
        clinician: {
          id: clinician._id,
          name: clinician.name,
          email: clinician.email,
          pronouns: clinician.pronouns,
        },
      },
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/v1/users/unlink-clinician (Patient unlinks current clinician)
export const unlinkClinician = async (req, res, next) => {
  try {
    const patient = await User.findById(req.user._id)
    if (patient?.clinicianId) {
      await User.findByIdAndUpdate(patient.clinicianId, { $pull: { patientIds: patient._id } })
      patient.clinicianId = null
      await patient.save()
    }
    res.json({ success: true, data: { message: 'Successfully unlinked from clinician.' } })
  } catch (err) {
    next(err)
  }
}
