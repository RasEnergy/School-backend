import { Router } from "express";
import { body, param } from "express-validator";
import {
	createUser,
	getUser,
	updateUser,
	deleteUser,
	getUsersBySchool,
} from "@/controllers/userController";
import {
	requireBranchAdmin,
	requireSchoolAccess,
} from "@/middleware/authorize";
import { authenticate } from "@/middleware/auth";
import { validate } from "@/middleware/validate";

const router = Router();

// User validation rules
const createUserValidation = [
	body("email")
		.isEmail()
		.normalizeEmail()
		.withMessage("Please provide a valid email"),
	body("password")
		.isLength({ min: 6 })
		.withMessage("Password must be at least 6 characters long"),
	body("firstName").notEmpty().withMessage("First name is required"),
	body("lastName").notEmpty().withMessage("Last name is required"),
	body("role")
		.isIn([
			"SUPER_ADMIN",
			"BRANCH_ADMIN",
			"REGISTRAR",
			"CASHIER",
			"TEACHER",
			"STUDENT",
			"PARENT",
		])
		.withMessage("Invalid role"),
	body("schoolId").notEmpty().withMessage("School ID is required"),
];

const updateUserValidation = [
	body("firstName")
		.optional()
		.notEmpty()
		.withMessage("First name cannot be empty"),
	body("lastName")
		.optional()
		.notEmpty()
		.withMessage("Last name cannot be empty"),
	body("phone")
		.optional()
		.isMobilePhone("any")
		.withMessage("Please provide a valid phone number"),
];

const paramValidation = [param("id").isUUID().withMessage("Invalid user ID")];

// All routes require authentication
router.use(authenticate);

// Routes
router.post(
	"/",
	requireBranchAdmin,
	createUserValidation,
	validate,
	createUser
);
router.get("/school/:schoolId", requireSchoolAccess, getUsersBySchool);
router.get("/:id", paramValidation, validate, getUser);
router.put("/:id", paramValidation, updateUserValidation, validate, updateUser);
router.delete(
	"/:id",
	requireBranchAdmin,
	paramValidation,
	validate,
	deleteUser
);

export default router;
