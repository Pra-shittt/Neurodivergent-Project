import User from '../models/User.js'
import { sendTokenResponse, clearTokenCookie } from '../utils/tokenUtils.js'

// POST /api/v1/auth/register
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role, pronouns, diagnoses } = req.body

    const existing = await User.findOne({ email })
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' })
    }

    const user = await User.create({ name, email, password, role, pronouns, diagnoses })
    sendTokenResponse(res, user)

    const { password: _, ...safeUser } = user.toObject()
    res.status(201).json({ success: true, data: { user: safeUser } })
  } catch (err) {
    next(err)
  }
}

// POST /api/v1/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email }).select('+password')
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' })
    }

    sendTokenResponse(res, user)

    const { password: _, ...safeUser } = user.toObject()
    res.json({ success: true, data: { user: safeUser } })
  } catch (err) {
    next(err)
  }
}

// POST /api/v1/auth/logout
export const logout = (req, res) => {
  clearTokenCookie(res)
  res.json({ success: true, data: { message: 'Logged out successfully.' } })
}

// GET /api/v1/auth/me
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
    res.json({ success: true, data: { user } })
  } catch (err) {
    next(err)
  }
}
