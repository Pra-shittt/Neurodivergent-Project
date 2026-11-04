import 'dotenv/config'
import app from '../server/app.js'
import connectDB from '../server/config/db.js'
import { autoSeedTemplates } from '../server/src/utils/autoSeed.js'

let isSeeded = false

export default async function handler(req, res) {
  try {
    await connectDB()
    if (!isSeeded && process.env.MONGO_URI) {
      await autoSeedTemplates()
      isSeeded = true
    }
  } catch (err) {
    console.error('Database connection error in serverless handler:', err.message)
  }

  return app(req, res)
}
