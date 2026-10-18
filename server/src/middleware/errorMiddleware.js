// Global error handler middleware
export const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.message}`)

  let statusCode = err.statusCode || 500
  let message = err.message || 'Internal Server Error'

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    message = `An account with this ${field} already exists.`
    statusCode = 409
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map(e => e.message).join('. ')
    statusCode = 400
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token.'
    statusCode = 401
  }
  if (err.name === 'TokenExpiredError') {
    message = 'Token has expired. Please log in again.'
    statusCode = 401
  }

  res.status(statusCode).json({ success: false, error: message })
}

// 404 handler
export const notFound = (req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.originalUrl} not found.` })
}
