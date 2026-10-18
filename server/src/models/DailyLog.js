import mongoose from 'mongoose'

const dailyLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: String, // YYYY-MM-DD format for easy querying
      required: true,
    },
    mood: { type: Number, min: 1, max: 5, required: true },
    executiveFunction: { type: Number, min: 1, max: 5, required: true },
    sensoryOverload: { type: Number, min: 1, max: 5, required: true },
    maskingFatigue: { type: Number, min: 1, max: 5, required: true },
    triggers: { type: [String], default: [] },
    journal: { type: String, default: '', maxlength: 5000 },
  },
  { timestamps: true }
)

// Compound index: one log per user per day
dailyLogSchema.index({ userId: 1, date: 1 }, { unique: true })

export default mongoose.model('DailyLog', dailyLogSchema)
