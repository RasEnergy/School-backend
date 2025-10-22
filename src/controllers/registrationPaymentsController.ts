import type { Request, Response } from "express";
import { registrationService } from "../services/registrationPaymentsService";
import { ValidationError } from "@/utils/validation";

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
}

export const registrationController = new RegistrationController();
