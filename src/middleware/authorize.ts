import type { Request, Response, NextFunction } from "express";
// Define UserRole type manually if not exported by @prisma/client
export type UserRole =
	| "SUPER_ADMIN"
	| "BRANCH_ADMIN"
	| "REGISTRAR"
	| "CASHIER"
	| "TEACHER"
	| "STUDENT"
	| "PARENT";
import { hasPermission, canAccessBranch, canAccessSchool } from "@/utils/auth";

export const authorize = (roles: UserRole[]) => {
	return (req: Request, res: Response, next: NextFunction) => {
		if (!req.user) {
			return res.status(401).json({
				success: false,
				error: "Authentication required.",
			});
		}

		if (!hasPermission(req.user.role, roles)) {
			return res.status(403).json({
				success: false,
				error: "Insufficient permissions.",
			});
		}

		next();
	};
};

export const requireBranchAccess = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	if (!req.user) {
		return res.status(401).json({
			success: false,
			error: "Authentication required.",
		});
	}

	const branchId =
		req.params.branchId || req.body.branchId || (req.query.branchId as string);

	if (!branchId) {
		return res.status(400).json({
			success: false,
			error: "Branch ID is required.",
		});
	}

	if (!canAccessBranch(req.user, branchId)) {
		return res.status(403).json({
			success: false,
			error: "Access denied to this branch.",
		});
	}

	next();
};

export const requireSchoolAccess = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	if (!req.user) {
		return res.status(401).json({
			success: false,
			error: "Authentication required.",
		});
	}

	const schoolId =
		req.params.schoolId || req.body.schoolId || (req.query.schoolId as string);

	if (!schoolId) {
		return res.status(400).json({
			success: false,
			error: "School ID is required.",
		});
	}

	if (!canAccessSchool(req.user, schoolId)) {
		return res.status(403).json({
			success: false,
			error: "Access denied to this school.",
		});
	}

	next();
};

export const requireSuperAdmin = authorize(["SUPER_ADMIN"]);
export const requireBranchAdmin = authorize(["SUPER_ADMIN", "BRANCH_ADMIN"]);
export const requireRegistrar = authorize([
	"SUPER_ADMIN",
	"BRANCH_ADMIN",
	"REGISTRAR",
]);
export const requireCashier = authorize([
	"SUPER_ADMIN",
	"BRANCH_ADMIN",
	"REGISTRAR",
	"CASHIER",
]);
export const requireTeacher = authorize([
	"SUPER_ADMIN",
	"BRANCH_ADMIN",
	"REGISTRAR",
	"TEACHER",
]);
export const requireStudent = authorize([
	"SUPER_ADMIN",
	"BRANCH_ADMIN",
	"REGISTRAR",
	"STUDENT",
]);
export const requireParent = authorize([
	"SUPER_ADMIN",
	"BRANCH_ADMIN",
	"REGISTRAR",
	"PARENT",
]);
