import { Router } from 'express'
import {
  updateProfile,
  updatePrivacy,
  getInviteCode,
  linkClinician,
  unlinkClinician,
} from '../controllers/userController.js'
import { protect, requireRole } from '../middleware/authMiddleware.js'

const router = Router()

router.use(protect)

router.patch('/profile', updateProfile)
router.patch('/privacy', requireRole('individual'), updatePrivacy)
router.get('/invite-code', requireRole('individual'), getInviteCode)
router.post('/link-clinician', requireRole('individual'), linkClinician)
router.post('/unlink-clinician', requireRole('individual'), unlinkClinician)

export default router
