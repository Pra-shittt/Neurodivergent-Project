import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// Verify JWT and attach user to req
export const protect = async (req, res, next) => {
  try {
    // Check httpOnly cookie first, then Authorization header
    let token = req.cookies?.token
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
      return res.status(401).json({ success: false, error: 'Not authenticated. Please log in.' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id).select('-password')
    if (!user) {
      return res.status(401).json({ success: false, error: 'User no longer exists.' })
    }

    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token.' })
  }
}

// Role-based access control
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: `Access denied. Requires role: ${roles.join(' or ')}` })
  }
  next()
}
