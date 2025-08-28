import { Router } from "express";
import { LessonController } from "../controllers/lessonController";
import { authenticate } from "../middleware/auth";
// import { requireRole } from "../middleware/authorize";

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Create a new lesson
router.post(
	"/",
	// requireRole(["SUPER_ADMIN", "BRANCH_ADMIN", "TEACHER"]),
	LessonController.createLesson
);

// Get all lessons with optional filters
router.get("/", LessonController.getAllLessons);

// Get lessons by teacher
router.get("/teacher/:teacherId", LessonController.getLessonsByTeacher);

// Get lessons by class
router.get("/class/:classId", LessonController.getLessonsByClass);

// Get a specific lesson by ID
router.get("/:id", LessonController.getLessonById);

// Update a lesson
router.put(
	"/:id",
	// requireRole(["SUPER_ADMIN", "BRANCH_ADMIN", "TEACHER"]),
	LessonController.updateLesson
);

// Delete a lesson
router.delete(
	"/:id",
	// requireRole(["SUPER_ADMIN", "BRANCH_ADMIN"]),
	LessonController.deleteLesson
);

export default router;
