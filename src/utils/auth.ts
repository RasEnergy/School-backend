import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { AuthUser } from "@/types/auth";
import { prisma } from "@/config/database";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, 12);
}

export async function verifyPassword(
	password: string,
	hashedPassword: string
): Promise<boolean> {
	return bcrypt.compare(password, hashedPassword);
}

export function generateToken(user: AuthUser): string {
	return (jwt as any).sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function generateRefreshToken(userId: string): string {
	return (jwt as any).sign({ userId }, JWT_SECRET, {
		expiresIn: JWT_REFRESH_EXPIRES_IN,
	});
}

export function verifyToken(token: string): AuthUser | null {
	try {
		return jwt.verify(token, JWT_SECRET) as AuthUser;
	} catch {
		return null;
	}
}

export function verifyRefreshToken(token: string): { userId: string } | null {
	try {
		return jwt.verify(token, JWT_SECRET) as { userId: string };
	} catch {
		return null;
	}
}

export async function getUserById(userId: string): Promise<AuthUser | null> {
	try {
		const user = await prisma.user.findFirst({
			where: { id: userId, isActive: true },
			include: { school: true, branch: true },
		});

		if (!user) return null;

		return {
			id: user.id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			role: user.role,
			schoolId: user.schoolId,
			branchId: user.branchId || undefined,
		};
	} catch (error) {
		console.error("Error fetching user:", error);
		return null;
	}
}

export function hasPermission(
	userRole: string,
	requiredRoles: string[]
): boolean {
	return requiredRoles.includes(userRole);
}

export function canAccessBranch(user: AuthUser, branchId: string): boolean {
	if (user.role === "SUPER_ADMIN") return true;
	if (user.role === "BRANCH_ADMIN" && user.branchId === branchId) return true;
	if (user.role === "REGISTRAR" && user.branchId === branchId) return true;
	if (user.branchId === branchId) return true;
	return false;
}

export function canAccessSchool(user: AuthUser, schoolId: string): boolean {
	if (user.role === "SUPER_ADMIN") return true;
	return user.schoolId === schoolId;
}
