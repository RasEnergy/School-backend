import { prisma } from "@/config/database";
import type { Gender } from "@prisma/client";

export interface CreateTeacherData {
	userId: string;
	employeeId: string;
	branchId: string;
	dateOfBirth?: Date;
	gender?: Gender;
	qualification?: string;
	experience?: number;
	joinDate?: Date;
	salary?: number;
	address?: string;
	emergencyContact?: string;
	photo?: string;
}

export interface UpdateTeacherData {
	employeeId?: string;
	dateOfBirth?: Date;
	gender?: Gender;
	qualification?: string;
	experience?: number;
	joinDate?: Date;
	salary?: number;
	address?: string;
	emergencyContact?: string;
	photo?: string;
	isActive?: boolean;
}

export const createTeacher = async (teacherData: CreateTeacherData) => {
	return prisma.teacher.create({
		data: teacherData,
		include: {
			user: true,
			branch: true,
			subjects: {
				include: {
					subject: true,
				},
			},
		},
	});
};

export const getTeacherById = async (id: string) => {
	return prisma.teacher.findUnique({
		where: { id },
		include: {
			user: true,
			branch: true,
			subjects: {
				include: {
					subject: true,
				},
			},
		},
	});
};

export const getTeacherByEmployeeId = async (employeeId: string) => {
	return prisma.teacher.findUnique({
		where: { employeeId },
		include: {
			user: true,
			branch: true,
			subjects: {
				include: {
					subject: true,
				},
			},
		},
	});
};

export const updateTeacher = async (
	id: string,
	teacherData: UpdateTeacherData
) => {
	return prisma.teacher.update({
		where: { id },
		data: teacherData,
		include: {
			user: true,
			branch: true,
			subjects: {
				include: {
					subject: true,
				},
			},
		},
	});
};

export const deleteTeacher = async (id: string) => {
	return prisma.teacher.update({
		where: { id },
		data: { isActive: false },
	});
};

export const getTeachersByBranch = async (
	branchId: string,
	subjectId?: string
) => {
	return prisma.teacher.findMany({
		where: {
			branchId,
			isActive: true,
			...(subjectId && {
				subjects: {
					some: {
						subjectId,
					},
				},
			}),
		},
		include: {
			user: true,
			branch: true,
			subjects: {
				include: {
					subject: true,
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
	});
};

export const searchTeachers = async (query: string, branchId: string) => {
	return prisma.teacher.findMany({
		where: {
			branchId,
			isActive: true,
			OR: [
				{
					employeeId: {
						contains: query,
						mode: "insensitive",
					},
				},
				{
					user: {
						firstName: {
							contains: query,
							mode: "insensitive",
						},
					},
				},
				{
					user: {
						lastName: {
							contains: query,
							mode: "insensitive",
						},
					},
				},
				{
					user: {
						email: {
							contains: query,
							mode: "insensitive",
						},
					},
				},
			],
		},
		include: {
			user: true,
			branch: true,
			subjects: {
				include: {
					subject: true,
				},
			},
		},
		take: 20,
	});
};
