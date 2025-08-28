import { Router } from "express";
import { enrollmentController } from "../controllers/enrollmentController";
import { authenticate } from "../middleware/auth";
import { requireRegistrar } from "../middleware/authorize";

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// POST /enrollments - Create new enrollment
router.post("/", requireRegistrar, enrollmentController.createEnrollment);

// GET /enrollments - Get registrations with filtering
router.get("/", requireRegistrar, enrollmentController.getRegistrations);

export default router;
