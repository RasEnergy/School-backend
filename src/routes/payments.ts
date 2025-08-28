import { Router } from "express";
import { authenticate } from "@/middleware/auth";
import { requireCashier } from "@/middleware/authorize";

const router = Router();

router.use(authenticate);

// Placeholder controllers
const createPayment = (req: any, res: any) =>
	res.json({ message: "Create payment endpoint" });
const getPayment = (req: any, res: any) =>
	res.json({ message: "Get payment endpoint" });
const updatePayment = (req: any, res: any) =>
	res.json({ message: "Update payment endpoint" });
const getPaymentsByStudent = (req: any, res: any) =>
	res.json({ message: "Get payments by student endpoint" });
const processPayment = (req: any, res: any) =>
	res.json({ message: "Process payment endpoint" });

router.post("/", requireCashier, createPayment);
router.post("/process", requireCashier, processPayment);
router.get("/student/:studentId", getPaymentsByStudent);
router.get("/:id", getPayment);
router.put("/:id", requireCashier, updatePayment);

export default router;
