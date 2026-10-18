import { Router } from 'express'
import { submitLog, getLogs, getTrends } from '../controllers/logController.js'
import { protect, requireRole } from '../middleware/authMiddleware.js'
import { validate, logSchema } from '../middleware/validateMiddleware.js'

const router = Router()

router.use(protect, requireRole('individual'))

router.post('/', validate(logSchema), submitLog)
router.get('/', getLogs)
router.get('/trends', getTrends)

export default router
