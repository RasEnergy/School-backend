import type { Request, Response, NextFunction } from "express";
import { verifyToken, getUserById } from "@/utils/auth";
import type { AuthUser } from "@/types/auth";

// Extend Request interface to include user
declare global {
	namespace Express {
		interface Request {
			user?: AuthUser;
		}
	}
}

export const authenticate = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		// Get token from cookie or Authorization header
		const token =
			req.cookies["auth-token"] ||
			(req.headers.authorization &&
				req.headers.authorization.replace("Bearer ", ""));

		if (!token) {
			return res.status(401).json({
				success: false,
				error: "Access denied. No token provided.",
			});
		}

		// Verify token
		const decoded = verifyToken(token);
		if (!decoded) {
			return res.status(401).json({
				success: false,
				error: "Invalid token.",
			});
		}

		// Get fresh user data to ensure user is still active
		const user = await getUserById(decoded.id);
		if (!user) {
			return res.status(401).json({
				success: false,
				error: "User not found or inactive.",
			});
		}

		// Attach user to request
		req.user = user;
		next();
	} catch (error) {
		console.error("Authentication error:", error);
		res.status(401).json({
			success: false,
			error: "Invalid token.",
		});
	}
};

export const optionalAuth = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const token =
			req.cookies["auth-token"] ||
			(req.headers.authorization &&
				req.headers.authorization.replace("Bearer ", ""));

		if (token) {
			const decoded = verifyToken(token);
			if (decoded) {
				const user = await getUserById(decoded.id);
				if (user) {
					req.user = user;
				}
			}
		}

		next();
	} catch (error) {
		// Continue without authentication
		next();
	}
};
