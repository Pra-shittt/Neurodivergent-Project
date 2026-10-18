import { AssessmentTemplate, UserAssessment } from '../models/Assessment.js'
import { scoreAssessment } from '../utils/scoringEngine.js'

// GET /api/v1/assessments/templates
export const getTemplates = async (req, res, next) => {
  try {
    const templates = await AssessmentTemplate.find({ isActive: true })
    res.json({ success: true, data: { templates } })
  } catch (err) {
    next(err)
  }
}

// POST /api/v1/assessments/submit
export const submitAssessment = async (req, res, next) => {
  try {
    const { templateId, answers } = req.body

    const scores = await scoreAssessment(templateId, answers)

    const assessment = await UserAssessment.create({
      userId: req.user._id,
      templateId,
      answers,
      ...scores,
      completedAt: new Date(),
    })

    res.status(201).json({ success: true, data: { assessment } })
  } catch (err) {
    next(err)
  }
}

// GET /api/v1/assessments/my-results
export const getMyResults = async (req, res, next) => {
  try {
    const assessments = await UserAssessment.find({ userId: req.user._id })
      .populate('templateId', 'name fullName')
      .sort({ completedAt: -1 })
    res.json({ success: true, data: { assessments } })
  } catch (err) {
    next(err)
  }
}
