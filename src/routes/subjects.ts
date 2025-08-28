import { Router } from "express"
import { authenticate } from "@/middleware/auth"
import { requireRegistrar } from "@/middleware/authorize"
import {
  createSubject,
  getSubject,
  updateSubject,
  deleteSubject,
  getSubjectsBySchool,
} from "@/controllers/subjectController"

const router = Router()

router.use(authenticate)

router.post("/", requireRegistrar, createSubject)
router.get("/school/:schoolId", getSubjectsBySchool)
router.get("/:id", getSubject)
router.put("/:id", requireRegistrar, updateSubject)
router.delete("/:id", requireRegistrar, deleteSubject)

export default router
