import { Router } from "express"
import { receiptController } from "../controllers/receiptController"
import { authenticate } from "../middleware/auth"
// import { requireRole } from "../middleware/authorize"

const router = Router()

// Apply authentication to all routes
router.use(authenticate)

// GET /receipts/:id - Generate and print receipt
router.get(
  "/:id",
  // requireRole(["SUPER_ADMIN", "BRANCH_ADMIN", "REGISTRAR", "CASHIER"]),
  receiptController.generateReceipt,
)

router.get(
  "/:id/check-fs",
  // requireRole(["SUPER_ADMIN", "BRANCH_ADMIN", "REGISTRAR", "CASHIER"]),
  receiptController.checkFsNumber,
)

// GET /receipts/parent-invoices/:parentId - Get parent invoices
router.get(
  "/parent-invoices/:parentPhone",
  // requireRole(["SUPER_ADMIN", "BRANCH_ADMIN", "REGISTRAR", "CASHIER"]),
  receiptController.getParentInvoices,
)
// router.get(
//   "/parent-invoices/:parentId",
//   // requireRole(["SUPER_ADMIN", "BRANCH_ADMIN", "REGISTRAR", "CASHIER"]),
//   receiptController.getParentInvoices,
// )

// POST /receipts/generate - Generate receipt

router.post(
  "/generate",
  // requireRole(["SUPER_ADMIN", "BRANCH_ADMIN", "REGISTRAR", "CASHIER"]),
  receiptController.generateReceipt,
)

// GET /receipts/combined/:parentId - Generate combined receipt
router.get(
  "/combined/:parentId",
  // requireRole(["SUPER_ADMIN", "BRANCH_ADMIN", "REGISTRAR", "CASHIER"]),
  receiptController.generateCombinedReceipt,
)

// PUT /receipts/:id/fs-number - Update FS number
router.put(
  "/:id/fs-number",
  // requireRole(["SUPER_ADMIN", "BRANCH_ADMIN", "REGISTRAR", "CASHIER"]),
  receiptController.updateFsNumber,
)

export default router
