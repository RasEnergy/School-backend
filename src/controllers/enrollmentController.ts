import type { Request, Response } from "express";
import { enrollmentService } from "../services/enrollmentService";
import { ValidationError } from "@/utils/validation";

export class EnrollmentController {
	async createEnrollment(req: Request, res: Response) {
		try {
			const user = req.user;
			if (!user) {
				return res.status(401).json({ error: "Unauthorized" });
			}

			const { registrationId, classId } = req.body;

			if (!registrationId || !classId) {
				return res.status(400).json({ error: "Missing required fields" });
			}

			const result = await enrollmentService.createEnrollment({
				registrationId,
				classId,
				userId: user.id,
			});

			res.json({
				message: "Student enrolled successfully",
				enrollment: result.enrollment,
				registration: result.updatedRegistration,
			});
		} catch (error) {
			console.error("Enrollment error:", error);

			if (error instanceof ValidationError) {
				return res.status(400).json({ error: error.message });
			}

			if (error instanceof Error) {
				// Handle known business logic errors
				if (
					error.message === "Registration not found" ||
					error.message === "Class not found"
				) {
					return res.status(404).json({ error: error.message });
				}

				if (
					error.message === "Student already enrolled" ||
					error.message === "Registration payment not completed" ||
					error.message === "No active academic year found"
				) {
					return res.status(400).json({ error: error.message });
				}
			}

			res.status(500).json({ error: "Internal server error" });
		}
	}

	async getRegistrations(req: Request, res: Response) {
		try {
			const user = req.user;
			if (!user) {
				return res.status(401).json({ error: "Unauthorized" });
			}

			const { status, branchId, page, limit } = req.query;

			const result = await enrollmentService.getRegistrations(
				{
					status: status as string,
					branchId: branchId as string,
					page: page ? Number.parseInt(page as string) : undefined,
					limit: limit ? Number.parseInt(limit as string) : undefined,
				},
				user.role,
				user.branchId
			);

			res.json(result);
		} catch (error) {
			console.error("Get registrations error:", error);

			if (error instanceof Error && error.message === "Access denied") {
				return res.status(403).json({ error: error.message });
			}

			res.status(500).json({ error: "Internal server error" });
		}
	}
}

export const enrollmentController = new EnrollmentController();
