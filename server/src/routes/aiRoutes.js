import { Router } from 'express'
import { detectTriggersFromText } from '../utils/triggerDetector.js'

const router = Router()

// POST /api/v1/ai/detect-triggers
// Public/protected endpoint to analyze journal text and return triggers
router.post('/detect-triggers', (req, res) => {
  const { text, journal, ratings } = req.body
  const content = text || journal || ''
  const result = detectTriggersFromText(content)

  res.json({
    success: true,
    data: {
      triggers: result.detectedItems,
      matchedTriggers: result.matchedTriggers,
      summary: result.summary,
      ratings: ratings || {},
    },
  })
})

export default router
