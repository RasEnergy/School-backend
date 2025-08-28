import { Router } from "express";
import { authenticate } from "@/middleware/auth";
import { requireCashier } from "@/middleware/authorize";

const router = Router();

router.use(authenticate);

// Placeholder controllers
const createInvoice = (req: any, res: any) =>
	res.json({ message: "Create invoice endpoint" });
const getInvoice = (req: any, res: any) =>
	res.json({ message: "Get invoice endpoint" });
const updateInvoice = (req: any, res: any) =>
	res.json({ message: "Update invoice endpoint" });
const deleteInvoice = (req: any, res: any) =>
	res.json({ message: "Delete invoice endpoint" });
const getInvoicesByStudent = (req: any, res: any) =>
	res.json({ message: "Get invoices by student endpoint" });

router.post("/", requireCashier, createInvoice);
router.get("/student/:studentId", getInvoicesByStudent);
router.get("/:id", getInvoice);
router.put("/:id", requireCashier, updateInvoice);
router.delete("/:id", requireCashier, deleteInvoice);

export default router;
