import { Router } from "express"
import { PricingController } from "../controllers/pricingController"

const router = Router()
const pricingController = new PricingController()

// GET /api/pricing?branchId=...&gradeId=...
router.get("/", pricingController.getPricing)

// POST /api/pricing
router.post("/", pricingController.createOrUpdatePricing)

export default router
