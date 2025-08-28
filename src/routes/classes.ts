import { Router } from "express";
import { authenticate } from "@/middleware/auth";
import { requireRegistrar } from "@/middleware/authorize";
import {
	createClass,
	getClass,
	updateClass,
	deleteClass,
	getClassesByBranch,
	getAcademicYear,
	getClassById,
} from "@/controllers/classController";
import { getGradesByBranch } from "@/controllers/classController";

const router = Router();

router.use(authenticate);

router.post("/", requireRegistrar, createClass);
router.get("/branch/:branchId", getClassesByBranch);
router.get("/grades/:branchId", getGradesByBranch);
router.get("/academic-years", getAcademicYear);
router.get("/:id", getClassById);
router.put("/:id", requireRegistrar, updateClass);

// router.put("/:id", requireAuth, requireRegistrar, classController.updateClass);
// router.get("/:id", requireAuth, classController.getClassById);

router.delete("/:id", requireRegistrar, deleteClass);

export default router;
