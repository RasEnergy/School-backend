import multer from "multer"
import path from "path"
import fs from "fs"
import type { Express } from "express"

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || "./uploads"
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subfolder = "general"

    // Determine subfolder based on file type or route
    if (file.fieldname === "avatar" || file.fieldname === "photo") {
      subfolder = "profiles"
    } else if (file.fieldname === "logo") {
      subfolder = "logos"
    } else if (file.fieldname === "document") {
      subfolder = "documents"
    }

    const fullPath = path.join(uploadDir, subfolder)
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true })
    }

    cb(null, fullPath)
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const extension = path.extname(file.originalname)
    const baseName = path.basename(file.originalname, extension)
    cb(null, `${baseName}-${uniqueSuffix}${extension}`)
  },
})

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Define allowed file types
  const allowedTypes = {
    image: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"],
    document: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    excel: ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  }

  const allAllowedTypes = [...allowedTypes.image, ...allowedTypes.document, ...allowedTypes.excel]

  if (allAllowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`))
  }
}

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Number.parseInt(process.env.MAX_FILE_SIZE || "5242880"), // 5MB default
    files: 5, // Maximum 5 files per request
  },
})

// Export different upload configurations
export const uploadSingle = (fieldName: string) => upload.single(fieldName)
export const uploadMultiple = (fieldName: string, maxCount = 5) => upload.array(fieldName, maxCount)
export const uploadFields = (fields: { name: string; maxCount: number }[]) => upload.fields(fields)

// Error handling middleware for multer
export const handleUploadError = (error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "File too large. Maximum size is 5MB.",
      })
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        error: "Too many files. Maximum is 5 files.",
      })
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        error: "Unexpected file field.",
      })
    }
  }

  if (error.message.includes("File type")) {
    return res.status(400).json({
      success: false,
      error: error.message,
    })
  }

  next(error)
}
