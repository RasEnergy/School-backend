import type { Request, Response, NextFunction } from "express"

export interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
  let error = { ...err }
  error.message = err.message

  // Log error
  console.error(err)

  // Prisma errors
  if (err.name === "PrismaClientKnownRequestError") {
    const message = "Database error occurred"
    error = { ...error, statusCode: 400, message }
  }

  // Validation errors
  if (err.name === "ValidationError") {
    const message = "Validation error"
    error = { ...error, statusCode: 400, message }
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token"
    error = { ...error, statusCode: 401, message }
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token expired"
    error = { ...error, statusCode: 401, message }
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || "Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  })
}
