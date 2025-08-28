import { Router } from "express";
import { body } from "express-validator";
import {
	login,
	logout,
	refreshToken,
	getProfile,
	changePassword,
} from "@/controllers/authController";
import { authenticate } from "@/middleware/auth";
import { validate } from "@/middleware/validate";

const router = Router();

// Login validation rules
const loginValidation = [
	body("email")
		.isEmail()
		.normalizeEmail()
		.withMessage("Please provide a valid email"),
	body("password")
		.isLength({ min: 6 })
		.withMessage("Password must be at least 6 characters long"),
];

// Change password validation rules
const changePasswordValidation = [
	body("currentPassword")
		.notEmpty()
		.withMessage("Current password is required"),
	body("newPassword")
		.isLength({ min: 6 })
		.withMessage("New password must be at least 6 characters long"),
];

// Public routes
router.post("/login", loginValidation, validate, login);
router.post("/refresh", refreshToken);

// Protected routes
router.use(authenticate); // All routes below require authentication
router.post("/logout", logout);
router.get("/profile", getProfile);
router.put(
	"/change-password",
	changePasswordValidation,
	validate,
	changePassword
);

export default router;
