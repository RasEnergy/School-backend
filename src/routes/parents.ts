import { Router } from "express"
import { ParentController } from "../controllers/parentController"
import { authenticate } from "../middleware/auth";
const router = Router()
const parentController = new ParentController()

// Apply authentication to all routes
router.use(authenticate);

router.get("/search", (req, res) => parentController.searchParent(req, res))

export default router
