import type { Request, Response, NextFunction } from "express";
import { prisma } from "@/config/database";
import {
	hashPassword,
	verifyPassword,
	generateToken,
	generateRefreshToken,
	verifyRefreshToken,
	getUserById,
} from "@/utils/auth";
import type { AuthUser, LoginRequest } from "@/types/auth";

export const login = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { email, password }: LoginRequest = req.body;

		console.log({
			email,
			password,
		});

		if (!email || !password) {
			return res.status(400).json({
				success: false,
				error: "Email and password are required",
			});
		}

		// Find user with school and branch information
		const user = await prisma.user.findUnique({
			where: { email },
			include: { school: true, branch: true },
		});

		if (!user || !user.isActive) {
			return res.status(401).json({
				success: false,
				error: "Invalid credentials",
			});
		}

		// Verify password
		const isValidPassword = await verifyPassword(password, user.password);
		if (!isValidPassword) {
			return res.status(401).json({
				success: false,
				error: "Invalid credentials",
			});
		}

		// Update last login
		await prisma.user.update({
			where: { id: user.id },
			data: { lastLogin: new Date() },
		});

		// Create auth user object
		const authUser: AuthUser = {
			id: user.id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			role: user.role,
			schoolId: user.schoolId,
			branchId: user.branchId || undefined,
		};

		// Generate tokens
		const token = generateToken(authUser);
		const refreshToken = generateRefreshToken(user.id);

		// Set HTTP-only cookies
		const cookieOptions = {
			httpOnly: true,
			// secure: process.env.NODE_ENV === "production",
			secure: false,
			sameSite: "lax" as const,
			maxAge: 24 * 60 * 60 * 1000,
		};

		res.cookie("auth-token", token, cookieOptions);
		res.cookie("refresh-token", refreshToken, {
			...cookieOptions,
			maxAge: 7 * 24 * 60 * 60 * 1000,
		});

		res.status(200).json({
			success: true,
			data: {
				user: authUser,
				token,
			},
		});
	} catch (error) {
		console.error("Login error:", error);
		next(error);
	}
};

export const logout = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		// Clear cookies
		res.clearCookie("auth-token");
		res.clearCookie("refresh-token");

		res.status(200).json({
			success: true,
			message: "Logged out successfully",
		});
	} catch (error) {
		console.error("Logout error:", error);
		next(error);
	}
};

export const refreshToken = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const refreshToken = req.cookies["refresh-token"] || req.body.refreshToken;

		if (!refreshToken) {
			return res.status(401).json({
				success: false,
				error: "Refresh token not provided",
			});
		}

		// Verify refresh token
		const decoded = verifyRefreshToken(refreshToken);
		if (!decoded) {
			return res.status(401).json({
				success: false,
				error: "Invalid refresh token",
			});
		}

		// Get user data
		const user = await getUserById(decoded.userId);
		if (!user) {
			return res.status(401).json({
				success: false,
				error: "User not found",
			});
		}

		// Generate new tokens
		const newToken = generateToken(user);
		const newRefreshToken = generateRefreshToken(user.id);

		// Set new cookies
		const cookieOptions = {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax" as const,
			maxAge: 24 * 60 * 60 * 1000, // 24 hours
		};

		res.cookie("auth-token", newToken, cookieOptions);
		res.cookie("refresh-token", newRefreshToken, {
			...cookieOptions,
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
		});

		res.status(200).json({
			success: true,
			data: {
				user,
				token: newToken,
			},
		});
	} catch (error) {
		console.error("Refresh token error:", error);
		next(error);
	}
};

export const getProfile = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const user = (req as any).user as AuthUser;

		// Get fresh user data from database
		const freshUser = await getUserById(user.id);
		if (!freshUser) {
			return res.status(404).json({
				success: false,
				error: "User not found",
			});
		}

		res.status(200).json({
			success: true,
			data: { user: freshUser },
		});
	} catch (error) {
		console.error("Get profile error:", error);
		next(error);
	}
};

export const changePassword = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const user = (req as any).user as AuthUser;
		const { currentPassword, newPassword } = req.body;

		if (!currentPassword || !newPassword) {
			return res.status(400).json({
				success: false,
				error: "Current password and new password are required",
			});
		}

		// Get user from database
		const dbUser = await prisma.user.findUnique({
			where: { id: user.id },
		});

		if (!dbUser) {
			return res.status(404).json({
				success: false,
				error: "User not found",
			});
		}

		// Verify current password
		const isValidPassword = await verifyPassword(
			currentPassword,
			dbUser.password
		);
		if (!isValidPassword) {
			return res.status(400).json({
				success: false,
				error: "Current password is incorrect",
			});
		}

		// Hash new password
		const hashedNewPassword = await hashPassword(newPassword);

		// Update password
		await prisma.user.update({
			where: { id: user.id },
			data: { password: hashedNewPassword },
		});

		res.status(200).json({
			success: true,
			message: "Password changed successfully",
		});
	} catch (error) {
		console.error("Change password error:", error);
		next(error);
	}
};
