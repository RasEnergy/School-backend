import { Router } from "express"
import { authenticate } from "@/middleware/auth"
import { requireRegistrar } from "@/middleware/authorize"
import {
  createTeacher,
  getTeacher,
  updateTeacher,
  deleteTeacher,
  getTeachersByBranch,
} from "@/controllers/teacherController"

const router = Router()

router.use(authenticate)

router.post("/", requireRegistrar, createTeacher)
router.get("/branch/:branchId", getTeachersByBranch)
router.get("/:id", getTeacher)
router.put("/:id", requireRegistrar, updateTeacher)
router.delete("/:id", requireRegistrar, deleteTeacher)

export default router
