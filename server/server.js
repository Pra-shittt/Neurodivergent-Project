import 'dotenv/config'
import app from './app.js'
import connectDB from './config/db.js'
import { autoSeedTemplates } from './src/utils/autoSeed.js'

const PORT = process.env.PORT || 5000

const startServer = async () => {
  await connectDB()
  await autoSeedTemplates()
  app.listen(PORT, () => {
    console.log(`🚀 NeuroPortal Server running on http://localhost:${PORT}`)
    console.log(`📋 Environment: ${process.env.NODE_ENV}`)
    console.log(`🔗 API Base: http://localhost:${PORT}/api/v1`)
  })
}

startServer()
