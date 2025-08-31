import { Router } from "express"
import { body, param } from "express-validator"
import { authenticate } from "@/middleware/auth"
import { requireRegistrar, requireBranchAccess } from "@/middleware/authorize"
import { validate } from "@/middleware/validate"
import * as studentController from "@/controllers/studentController"

const router = Router()

// Student validation rules
// const createStudentValidation = [
//   body("userId").isUUID().withMessage("Valid user ID is required"),
//   body("studentId").notEmpty().withMessage("Student ID is required"),
//   body("branchId").isUUID().withMessage("Valid branch ID is required"),
//   body("studentType").optional().isIn(["REGULAR_STUDENT", "NEW_STUDENT"]).withMessage("Invalid student type"),
//   body("gender").optional().isIn(["MALE", "FEMALE"]).withMessage("Invalid gender"),
// ]

const updateStudentValidation = [
  body("studentType").optional().isIn(["REGULAR_STUDENT", "NEW_STUDENT"]).withMessage("Invalid student type"),
  body("gender").optional().isIn(["MALE", "FEMALE"]).withMessage("Invalid gender"),
  body("dateOfBirth").optional().isISO8601().withMessage("Invalid date format"),
  body("admissionDate").optional().isISO8601().withMessage("Invalid date format"),
]

// const registrationValidation = [
//   body("firstName").notEmpty().withMessage("First name is required"),
//   body("lastName").notEmpty().withMessage("Last name is required"),
// //   body("email").isEmail().withMessage("Valid email is required"),
//   body("email")
//       .notEmpty().withMessage("Email is required")
//       .isEmail().withMessage("Invalid email format"),
//   body("branchId").isUUID().withMessage("Valid branch ID is required"),
//   body("gradeId").isUUID().withMessage("Valid grade ID is required"),
//   body("studentType").isIn(["REGULAR_STUDENT", "NEW_STUDENT"]).withMessage("Invalid student type"),
//   body("paymentDuration").notEmpty().withMessage("Payment duration is required"),
//   body("parentPhone").notEmpty().withMessage("Parent phone number is required"),
//   body("registrationFee").isNumeric().withMessage("Registration fee must be a number"),
//   body("additionalFee").isNumeric().withMessage("Additional fee must be a number"),
//   body("serviceFee").isNumeric().withMessage("Service fee must be a number"),
//   body("totalAmount").isNumeric().withMessage("Total amount must be a number"),
//   body("phone").optional().withMessage("Invalid phone number format"),
//   body("parentEmail").optional().isEmail().withMessage("Invalid parent email format"),
//   body("dateOfBirth").optional().isISO8601().withMessage("Invalid date format"),
//   body("gender").optional().isIn(["MALE", "FEMALE"]).withMessage("Invalid gender"),
// ]

const paramValidation = [param("id").isUUID().withMessage("Invalid student ID")]

// All routes require authentication
router.use(authenticate)

// Routes
router.get("/", studentController.getStudents) // Main endpoint for fetching students with filtering
router.post("/", 
	requireRegistrar,
	//  createStudentValidation, 
	 validate, 
	 studentController.createStudent)
router.post(
  "/register",
  requireRegistrar,
  studentController.uploadMiddleware,
//   registrationValidation,
  validate,
  studentController.registerStudent,
)
router.get("/branch/:branchId", requireBranchAccess, studentController.getStudentsByBranch)
router.get("/search", studentController.searchStudents)
router.get("/:id", paramValidation, validate, studentController.getStudent)
router.put(
  "/:id",
  requireRegistrar,
  paramValidation,
  updateStudentValidation,
  validate,
  studentController.updateStudent,
)
router.delete("/:id", requireRegistrar, paramValidation, validate, studentController.deleteStudent)

export default router
