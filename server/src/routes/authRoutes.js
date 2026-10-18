import { Router } from 'express'
import { register, login, logout, getMe } from '../controllers/authController.js'
import { protect } from '../middleware/authMiddleware.js'
import { validate, registerSchema, loginSchema } from '../middleware/validateMiddleware.js'

const router = Router()

router.post('/register', validate(registerSchema), register)
router.post('/login', validate(loginSchema), login)
router.post('/logout', protect, logout)
router.get('/me', protect, getMe)

export default router
