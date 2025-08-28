import type { Request, Response, NextFunction } from "express"

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()

  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`)

  // Log user if authenticated
  if (req.user) {
    console.log(`  User: ${req.user.email} (${req.user.role})`)
  }

  // Log request body for non-GET requests (excluding sensitive data)
  if (req.method !== "GET" && req.body) {
    const logBody = { ...req.body }
    // Remove sensitive fields
    delete logBody.password
    delete logBody.currentPassword
    delete logBody.newPassword
    delete logBody.token

    if (Object.keys(logBody).length > 0) {
      console.log(`  Body:`, logBody)
    }
  }

  // Override res.json to log response
  const originalJson = res.json
  res.json = function (body) {
    const duration = Date.now() - start
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`)

    // Log error responses
    if (res.statusCode >= 400 && body?.error) {
      console.log(`  Error: ${body.error}`)
    }

    return originalJson.call(this, body)
  }

  next()
}
