import mongoose from 'mongoose'

// Cache MongoDB connection across serverless invocations (e.g. Vercel)
let cached = global.mongooseConnection
if (!cached) {
  cached = global.mongooseConnection = { conn: null, promise: null }
}

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.warn('⚠️ MONGO_URI is not defined in environment variables.')
    return null
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    }
    cached.promise = mongoose.connect(process.env.MONGO_URI, opts).then((m) => {
      console.log(`✅ MongoDB Connected: ${m.connection.host}`)
      return m
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (err) {
    cached.promise = null
    console.error(`❌ MongoDB connection error: ${err.message}`)
    if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
      process.exit(1)
    }
    throw err
  }

  return cached.conn
}

export default connectDB
