import { Router } from "express";
import { body, param } from "express-validator";
import { authenticate } from "@/middleware/auth";
import { requireSuperAdmin, requireSchoolAccess } from "@/middleware/authorize";
import { validate } from "@/middleware/validate";

const router = Router();

// School validation rules
const createSchoolValidation = [
	body("name").notEmpty().withMessage("School name is required"),
	body("code").notEmpty().withMessage("School code is required"),
	body("email")
		.optional()
		.isEmail()
		.withMessage("Please provide a valid email"),
	body("phone")
		.optional()
		.isMobilePhone("any")
		.withMessage("Please provide a valid phone number"),
];

const updateSchoolValidation = [
	body("name").optional().notEmpty().withMessage("School name cannot be empty"),
	body("code").optional().notEmpty().withMessage("School code cannot be empty"),
	body("email")
		.optional()
		.isEmail()
		.withMessage("Please provide a valid email"),
	body("phone")
		.optional()
		.isMobilePhone("any")
		.withMessage("Please provide a valid phone number"),
];

const paramValidation = [param("id").isUUID().withMessage("Invalid school ID")];

// All routes require authentication
router.use(authenticate);

// Placeholder controllers
const createSchool = (req: any, res: any) =>
	res.json({ message: "Create school endpoint" });
const getSchool = (req: any, res: any) =>
	res.json({ message: "Get school endpoint" });
const updateSchool = (req: any, res: any) =>
	res.json({ message: "Update school endpoint" });
const deleteSchool = (req: any, res: any) =>
	res.json({ message: "Delete school endpoint" });
const getAllSchools = (req: any, res: any) =>
	res.json({ message: "Get all schools endpoint" });

// Routes
router.post(
	"/",
	requireSuperAdmin,
	createSchoolValidation,
	validate,
	createSchool
);
router.get("/", getAllSchools);

router.get("/:id", requireSchoolAccess, paramValidation, validate, getSchool);
router.put(
	"/:id",
	requireSchoolAccess,
	paramValidation,
	updateSchoolValidation,
	validate,
	updateSchool
);
router.delete(
	"/:id",
	requireSuperAdmin,
	paramValidation,
	validate,
	deleteSchool
);

export default router;
