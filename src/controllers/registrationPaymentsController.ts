import type { Request, Response } from "express";
import { registrationService } from "../services/registrationPaymentsService";
import { ValidationError } from "@/utils/validation";
import { hasPermission } from "@/utils/auth";

export class RegistrationController {
	async getRegistrations(req: Request, res: Response) {
		try {
			const user = req.user;
			if (!user) {
				return res.status(401).json({ error: "Unauthorized" });
			}

			const { page, limit, search, status, paymentOption, branchId } =
				req.query;

			const result = await registrationService.getRegistrations(
				{
					page: page ? Number(page) : 1,
					limit: limit ? Number(limit) : 10,
					search: search as string,
					status: status as string,
					paymentOption: paymentOption as string,
					branchId: branchId as string,
				},
				user
			);

			res.json(result);
		} catch (error) {
			console.error("Get registrations error:", error);

			if (error instanceof ValidationError) {
				return res.status(400).json({ error: error.message });
			}

			if (error instanceof Error && error.message === "Access denied") {
				return res.status(403).json({ error: error.message });
			}

			res.status(500).json({ error: "Internal server error" });
		}
	}

	async getRegistrationDetails(req: Request, res: Response) {
		try {
			const { registrationId } = req.query;

			if (!registrationId) {
				return res.status(400).json({ error: "Registration ID is required" });
			}

			const registration = await registrationService.getRegistrationDetails(
				registrationId
			);

			if (!registration) {
				return res.status(404).json({ error: "Registration not found" });
			}

			return res.status(200).json({ registration });
		} catch (error) {
			console.error("Registration fetch error:", error);
			res.status(500).json({ error: "Internal server error" });
		}
	}

	async processPayment(req: Request, res: Response) {
		try {
			const user = req.user; // set in middleware

			if (!user) {
				return res.status(401).json({ error: "Unauthorized" });
			}

			if (
				!hasPermission(user.role, [
					"SUPER_ADMIN",
					"BRANCH_ADMIN",
					"REGISTRAR",
					"CASHIER",
				])
			) {
				return res.status(403).json({ error: "Insufficient permissions" });
			}

			const result = await registrationService.handlePayment({
				...req.body,
				user,
			});

			return res.status(200).json(result);
		} catch (error) {
			console.error("Registration payment error:", error);
			res.status(500).json({ error: "Internal server error" });
		}
	}
}

export const registrationController = new RegistrationController();
