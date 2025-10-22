import { Router } from "express";
import { registrationController } from "../controllers/registrationPaymentsController";
import { authenticate } from "../middleware/auth";
import { requireRegistrarOrAdmin } from "../middleware/authorize";

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// GET /registrations - Fetch all registrations (with filtering & pagination)
router.get(
	"/",
	requireRegistrarOrAdmin,
	registrationController.getRegistrations
);

export default router;
