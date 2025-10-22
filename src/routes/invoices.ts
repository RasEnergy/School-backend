import { Router } from "express"
import { invoiceController } from "../controllers/invoiceController"
import { authenticate } from "../middleware/auth"
// import { requireRole } from "../middleware/authorize"

const router = Router()

// Apply authentication to all routes
router.use(authenticate)


// GET /invoices - Get invoices with filtering
router.get("/", 
	// requireRole(["SUPER_ADMIN", "BRANCH_ADMIN", "REGISTRAR", "CASHIER"]), 
	invoiceController.getInvoices)

// GET /invoices/export - Export invoices
router.get(
  "/export",
//   requireRole(["SUPER_ADMIN", "BRANCH_ADMIN", "REGISTRAR", "CASHIER"]),
  invoiceController.exportInvoices,
)

// GET /invoices/:id - Get invoice by ID
router.get(
  "/:id",
//   requireRole(["SUPER_ADMIN", "BRANCH_ADMIN", "REGISTRAR", "CASHIER"]),
  invoiceController.getInvoiceById,
)

// POST /invoices/:id/confirm-payment - Confirm payment
router.post(
  "/:id/confirm-payment",
//   requireRole(["SUPER_ADMIN", "BRANCH_ADMIN", "REGISTRAR", "CASHIER"]),
  invoiceController.confirmPayment,
)

// POST /invoices/:id/resend-link - Resend payment link
router.post(
  "/:id/resend-link",
//   requireRole(["SUPER_ADMIN", "BRANCH_ADMIN", "REGISTRAR", "CASHIER"]),
  invoiceController.resendPaymentLink,
)

export default router
