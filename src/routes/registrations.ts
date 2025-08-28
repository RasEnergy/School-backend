import { Router } from "express";
import { authenticate } from "@/middleware/auth";
import { requireRegistrar } from "@/middleware/authorize";

const router = Router();

router.use(authenticate);

// Placeholder controllers
const createRegistration = (req: any, res: any) =>
	res.json({ message: "Create registration endpoint" });
const getRegistration = (req: any, res: any) =>
	res.json({ message: "Get registration endpoint" });
const updateRegistration = (req: any, res: any) =>
	res.json({ message: "Update registration endpoint" });
const getRegistrationsByBranch = (req: any, res: any) =>
	res.json({ message: "Get registrations by branch endpoint" });
const approveRegistration = (req: any, res: any) =>
	res.json({ message: "Approve registration endpoint" });

router.post("/", requireRegistrar, createRegistration);
router.get("/branch/:branchId", getRegistrationsByBranch);
router.get("/:id", getRegistration);
router.put("/:id", requireRegistrar, updateRegistration);
router.post("/:id/approve", requireRegistrar, approveRegistration);

export default router;
