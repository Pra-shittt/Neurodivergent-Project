import { Router } from 'express'
import {
  getPatients,
  linkPatient,
  unlinkPatient,
  getPatientLogs,
  getNotes,
  addNote,
} from '../controllers/clinicianController.js'
import { protect, requireRole } from '../middleware/authMiddleware.js'
import { validate, clinicalNoteSchema } from '../middleware/validateMiddleware.js'

const router = Router()

router.use(protect, requireRole('clinician'))

router.get('/patients', getPatients)
router.post('/link-patient', linkPatient)
router.post('/unlink-patient', unlinkPatient)
router.get('/patients/:patientId/logs', getPatientLogs)
router.get('/patients/:patientId/notes', getNotes)
router.post('/notes', validate(clinicalNoteSchema), addNote)

export default router
