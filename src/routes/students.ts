import { Router } from "express";
import { body, param } from "express-validator";
import { authenticate } from "@/middleware/auth";
import { requireRegistrar, requireBranchAccess } from "@/middleware/authorize";
import { validate } from "@/middleware/validate";

const router = Router();

// Student validation rules
const createStudentValidation = [
	body("userId").isUUID().withMessage("Valid user ID is required"),
	body("studentId").notEmpty().withMessage("Student ID is required"),
	body("branchId").isUUID().withMessage("Valid branch ID is required"),
	body("studentType")
		.optional()
		.isIn(["REGULAR_STUDENT", "NEW_STUDENT"])
		.withMessage("Invalid student type"),
	body("gender")
		.optional()
		.isIn(["MALE", "FEMALE"])
		.withMessage("Invalid gender"),
];

const updateStudentValidation = [
	body("studentType")
		.optional()
		.isIn(["REGULAR_STUDENT", "NEW_STUDENT"])
		.withMessage("Invalid student type"),
	body("gender")
		.optional()
		.isIn(["MALE", "FEMALE"])
		.withMessage("Invalid gender"),
	body("dateOfBirth").optional().isISO8601().withMessage("Invalid date format"),
	body("admissionDate")
		.optional()
		.isISO8601()
		.withMessage("Invalid date format"),
];

const paramValidation = [
	param("id").isUUID().withMessage("Invalid student ID"),
];

// All routes require authentication
router.use(authenticate);

// Placeholder controllers - these would need to be implemented
const createStudent = (req: any, res: any) =>
	res.json({ message: "Create student endpoint" });
const getStudent = (req: any, res: any) =>
	res.json({ message: "Get student endpoint" });
const updateStudent = (req: any, res: any) =>
	res.json({ message: "Update student endpoint" });
const deleteStudent = (req: any, res: any) =>
	res.json({ message: "Delete student endpoint" });
const getStudentsByBranch = (req: any, res: any) =>
	res.json({ message: "Get students by branch endpoint" });
const searchStudents = (req: any, res: any) =>
	res.json({ message: "Search students endpoint" });

// Routes
router.post(
	"/",
	requireRegistrar,
	createStudentValidation,
	validate,
	createStudent
);
router.get("/branch/:branchId", requireBranchAccess, getStudentsByBranch);
router.get("/search", searchStudents);
router.get("/:id", paramValidation, validate, getStudent);
router.put(
	"/:id",
	requireRegistrar,
	paramValidation,
	updateStudentValidation,
	validate,
	updateStudent
);
router.delete(
	"/:id",
	requireRegistrar,
	paramValidation,
	validate,
	deleteStudent
);

export default router;
