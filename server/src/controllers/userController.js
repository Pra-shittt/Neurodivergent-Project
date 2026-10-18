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
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { privacySettings: { shareMetrics, shareJournals } },
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
    const user = await User.findById(req.user._id).select('inviteCode')
    res.json({ success: true, data: { inviteCode: user.inviteCode } })
  } catch (err) {
    next(err)
  }
}
