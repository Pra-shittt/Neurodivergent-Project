import { Router } from 'express'
import { getTemplates, submitAssessment, getMyResults } from '../controllers/assessmentController.js'
import { protect, requireRole } from '../middleware/authMiddleware.js'
import { validate, assessmentSubmitSchema } from '../middleware/validateMiddleware.js'

const router = Router()

router.use(protect)

router.get('/templates', getTemplates)
router.post('/submit', requireRole('individual'), validate(assessmentSubmitSchema), submitAssessment)
router.get('/my-results', requireRole('individual'), getMyResults)

export default router
