import { Router } from "express";
import { requireBranchAdmin } from "@/middleware/authorize";
import { authenticate } from "@/middleware/auth";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Placeholder controllers
const createBranch = (req: any, res: any) =>
	res.json({ message: "Create branch endpoint" });
const getBranch = (req: any, res: any) =>
	res.json({ message: "Get branch endpoint" });
const updateBranch = (req: any, res: any) =>
	res.json({ message: "Update branch endpoint" });
const deleteBranch = (req: any, res: any) =>
	res.json({ message: "Delete branch endpoint" });
const getBranchesBySchool = (req: any, res: any) =>
	res.json({ message: "Get branches by school endpoint" });

// Routes
router.post("/", requireBranchAdmin, createBranch);
router.get("/school/:schoolId", getBranchesBySchool);
router.get("/:id", getBranch);
router.put("/:id", requireBranchAdmin, updateBranch);
router.delete("/:id", requireBranchAdmin, deleteBranch);

export default router;
