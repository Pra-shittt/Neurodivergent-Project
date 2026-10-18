import DailyLog from '../models/DailyLog.js'

// POST /api/v1/logs
export const submitLog = async (req, res, next) => {
  try {
    const { date, mood, executiveFunction, sensoryOverload, maskingFatigue, triggers, journal } = req.body

    // Upsert: one log per user per day
    const log = await DailyLog.findOneAndUpdate(
      { userId: req.user._id, date },
      { mood, executiveFunction, sensoryOverload, maskingFatigue, triggers, journal },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    )

    res.status(201).json({ success: true, data: { log } })
  } catch (err) {
    next(err)
  }
}

// GET /api/v1/logs
export const getLogs = async (req, res, next) => {
  try {
    const { days = 14 } = req.query
    const since = new Date()
    since.setDate(since.getDate() - Number(days))
    const sinceStr = since.toISOString().split('T')[0]

    const logs = await DailyLog.find({
      userId: req.user._id,
      date: { $gte: sinceStr },
    }).sort({ date: 1 })

    res.json({ success: true, data: { logs } })
  } catch (err) {
    next(err)
  }
}

// GET /api/v1/logs/trends
export const getTrends = async (req, res, next) => {
  try {
    // MongoDB $group aggregation for weekly averages
    const trends = await DailyLog.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: {
            year: { $year: { $dateFromString: { dateString: '$date' } } },
            week: { $week: { $dateFromString: { dateString: '$date' } } },
          },
          avgMood: { $avg: '$mood' },
          avgExecutiveFunction: { $avg: '$executiveFunction' },
          avgSensoryOverload: { $avg: '$sensoryOverload' },
          avgMaskingFatigue: { $avg: '$maskingFatigue' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } },
    ])

    // Trigger frequency analysis
    const triggerFrequency = await DailyLog.aggregate([
      { $match: { userId: req.user._id } },
      { $unwind: '$triggers' },
      { $group: { _id: '$triggers', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ])

    res.json({ success: true, data: { weeklyTrends: trends, triggerFrequency } })
  } catch (err) {
    next(err)
  }
}
