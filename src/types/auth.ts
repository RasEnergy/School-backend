import type { UserRole } from "@prisma/client";

export interface AuthUser {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	role: UserRole;
	schoolId: string;
	branchId?: string;
}

export interface LoginRequest {
	email: string;
	password: string;
}

export interface LoginResponse {
	user: AuthUser;
	token: string;
}

export interface AuthRequest extends Request {
	user?: AuthUser;
}
