import { AssessmentTemplate } from '../models/Assessment.js'

/**
 * Server-side scoring engine for psychometric assessments.
 * Calculates total score and per-section sub-scores, then determines risk band.
 */
export const scoreAssessment = async (templateId, answers) => {
  const template = await AssessmentTemplate.findById(templateId)
  if (!template) throw new Error('Assessment template not found.')

  // Calculate total score
  const totalScore = answers.reduce((sum, a) => sum + (a.value || 0), 0)

  // Calculate per-section scores
  const sectionScores = {}
  for (const section of template.sections) {
    const sectionQIds = template.questions.filter(q => q.section === section).map(q => q.id)
    const sectionAnswers = answers.filter(a => sectionQIds.includes(a.questionId))
    sectionScores[section] = sectionAnswers.reduce((sum, a) => sum + (a.value || 0), 0)
  }

  // Determine risk band
  const riskBand = template.riskBands.find(b => totalScore >= b.min && totalScore <= b.max)
    || template.riskBands[template.riskBands.length - 1]

  return {
    totalScore,
    maxScore: template.maxScore,
    templateName: template.name,
    sectionScores,
    riskBand: { label: riskBand.label, color: riskBand.color },
  }
}
