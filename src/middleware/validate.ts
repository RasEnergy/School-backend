import type { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";

export const validate = (req: Request, res: Response, next: NextFunction) => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		return res.status(400).json({
			success: false,
			error: "Validation failed",
			details: errors.array().map((error) => ({
				field: error.type === "field" ? error.path : undefined,
				message: error.msg,
			})),
		});
	}

	next();
};
