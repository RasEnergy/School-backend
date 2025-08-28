import { Router } from "express";
import { ModuleController } from "../controllers/moduleController";
import { authenticate } from "../middleware/auth";
// import { requireRole } from "../middleware/authorize";

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Create a new module
router.post(
	"/",
	// requireRole(["SUPER_ADMIN", "BRANCH_ADMIN", "TEACHER"]),
	ModuleController.createModule
);

// Get all modules with optional filters
router.get("/", ModuleController.getAllModules);

// Get modules by lesson
router.get("/lesson/:lessonId", ModuleController.getModulesByLesson);

// Reorder modules within a lesson
router.put(
	"/lesson/:lessonId/reorder",
	// requireRole(["SUPER_ADMIN", "BRANCH_ADMIN", "TEACHER"]),
	ModuleController.reorderModules
);

// Get a specific module by ID
router.get("/:id", ModuleController.getModuleById);

// Update a module
router.put(
	"/:id",
	// requireRole(["SUPER_ADMIN", "BRANCH_ADMIN", "TEACHER"]),
	ModuleController.updateModule
);

// Duplicate a module
router.post(
	"/:id/duplicate",
	// requireRole(["SUPER_ADMIN", "BRANCH_ADMIN", "TEACHER"]),
	ModuleController.duplicateModule
);

// Delete a module
router.delete(
	"/:id",
	// requireRole(["SUPER_ADMIN", "BRANCH_ADMIN"]),
	ModuleController.deleteModule
);

export default router;
