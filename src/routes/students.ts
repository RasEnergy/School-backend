import { Router } from "express";
import { body, param } from "express-validator";
import { authenticate } from "@/middleware/auth";
import { requireRegistrar, requireBranchAccess } from "@/middleware/authorize";
import { validate } from "@/middleware/validate";
import * as studentController from "@/controllers/studentController";

const router = Router();

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

// Routes
router.get("/", studentController.getStudents); // Main endpoint for fetching students with filtering
router.post(
	"/",
	requireRegistrar,
	//  createStudentValidation,
	validate,
	studentController.createStudent
);
router.post(
	"/register",
	requireRegistrar,
	studentController.uploadMiddleware,
	//   registrationValidation,
	validate,
	studentController.registerStudent
);
router.get(
	"/branch/:branchId",
	requireBranchAccess,
	studentController.getStudentsByBranch
);
router.get("/export", studentController.exportStudents);

router.get("/search", studentController.searchStudents);
router.get("/:id", paramValidation, validate, studentController.getStudent);
router.put(
	"/:id",
	requireRegistrar,
	paramValidation,
	updateStudentValidation,
	validate,
	studentController.updateStudent
);
router.delete(
	"/:id",
	requireRegistrar,
	paramValidation,
	validate,
	studentController.deleteStudent
);

export default router;
