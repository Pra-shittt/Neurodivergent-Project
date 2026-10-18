import mongoose from 'mongoose'

// Stores the questionnaire template (CAT-Q, ASRS, AQ-10)
const assessmentTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    description: { type: String },
    sections: { type: [String], default: [] },
    questions: [
      {
        id: String,
        text: String,
        section: String,
      },
    ],
    options: { type: [String], default: [] },
    maxScore: { type: Number, required: true },
    riskBands: [
      {
        label: String,
        min: Number,
        max: Number,
        color: { type: String, enum: ['green', 'amber', 'rose'] },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

// Stores a user's completed assessment with scores
const userAssessmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssessmentTemplate',
      required: true,
    },
    templateName: String,
    answers: [
      {
        questionId: String,
        value: Number,
      },
    ],
    totalScore: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    sectionScores: { type: Map, of: Number },
    riskBand: {
      label: String,
      color: String,
    },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

export const AssessmentTemplate = mongoose.model('AssessmentTemplate', assessmentTemplateSchema)
export const UserAssessment = mongoose.model('UserAssessment', userAssessmentSchema)
