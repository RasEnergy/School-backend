import { PrismaClient, type LessonStatus } from "@prisma/client";

const prisma = new PrismaClient();

export class LessonService {
	static async createLesson(data: {
		title: string;
		description?: string;
		classId: string;
		subjectId: string;
		teacherId: string;
		startTime: Date;
		endTime: Date;
		duration: number;
		location?: string;
		notes?: string;
	}) {
		return await prisma.lesson.create({
			data,
			include: {
				class: { include: { grade: true, branch: true } },
				subject: true,
				teacher: { include: { user: true } },
				modules: { orderBy: { orderIndex: "asc" } },
			},
		});
	}

	static async getAllLessons(filters?: {
		classId?: string;
		subjectId?: string;
		teacherId?: string;
		status?: LessonStatus;
		startDate?: Date;
		endDate?: Date;
	}) {
		const where: any = { isActive: true };

		if (filters?.classId) where.classId = filters.classId;
		if (filters?.subjectId) where.subjectId = filters.subjectId;
		if (filters?.teacherId) where.teacherId = filters.teacherId;
		if (filters?.status) where.status = filters.status;
		if (filters?.startDate || filters?.endDate) {
			where.startTime = {};
			if (filters.startDate) where.startTime.gte = filters.startDate;
			if (filters.endDate) where.startTime.lte = filters.endDate;
		}

		return await prisma.lesson.findMany({
			where,
			include: {
				class: { include: { grade: true, branch: true } },
				subject: true,
				teacher: { include: { user: true } },
				modules: {
					where: { isActive: true },
					orderBy: { orderIndex: "asc" },
				},
			},
			orderBy: { startTime: "asc" },
		});
	}

	static async getLessonById(id: string) {
		return await prisma.lesson.findUnique({
			where: { id },
			include: {
				class: { include: { grade: true, branch: true } },
				subject: true,
				teacher: { include: { user: true } },
				modules: {
					where: { isActive: true },
					orderBy: { orderIndex: "asc" },
				},
			},
		});
	}

	static async updateLesson(
		id: string,
		data: {
			title?: string;
			description?: string;
			classId?: string;
			subjectId?: string;
			teacherId?: string;
			startTime?: Date;
			endTime?: Date;
			duration?: number;
			status?: LessonStatus;
			location?: string;
			notes?: string;
		}
	) {
		return await prisma.lesson.update({
			where: { id },
			data: { ...data, updatedAt: new Date() },
			include: {
				class: { include: { grade: true, branch: true } },
				subject: true,
				teacher: { include: { user: true } },
				modules: { orderBy: { orderIndex: "asc" } },
			},
		});
	}

	static async deleteLesson(id: string) {
		return await prisma.lesson.update({
			where: { id },
			data: { isActive: false, updatedAt: new Date() },
		});
	}

	static async getLessonsByTeacher(
		teacherId: string,
		filters?: {
			startDate?: Date;
			endDate?: Date;
			status?: LessonStatus;
		}
	) {
		const where: any = { teacherId, isActive: true };

		if (filters?.status) where.status = filters.status;
		if (filters?.startDate || filters?.endDate) {
			where.startTime = {};
			if (filters.startDate) where.startTime.gte = filters.startDate;
			if (filters.endDate) where.startTime.lte = filters.endDate;
		}

		return await prisma.lesson.findMany({
			where,
			include: {
				class: { include: { grade: true, branch: true } },
				subject: true,
				modules: {
					where: { isActive: true },
					orderBy: { orderIndex: "asc" },
				},
			},
			orderBy: { startTime: "asc" },
		});
	}

	static async getLessonsByClass(
		classId: string,
		filters?: {
			startDate?: Date;
			endDate?: Date;
			status?: LessonStatus;
		}
	) {
		const where: any = { classId, isActive: true };

		if (filters?.status) where.status = filters.status;
		if (filters?.startDate || filters?.endDate) {
			where.startTime = {};
			if (filters.startDate) where.startTime.gte = filters.startDate;
			if (filters.endDate) where.startTime.lte = filters.endDate;
		}

		return await prisma.lesson.findMany({
			where,
			include: {
				subject: true,
				teacher: { include: { user: true } },
				modules: {
					where: { isActive: true },
					orderBy: { orderIndex: "asc" },
				},
			},
			orderBy: { startTime: "asc" },
		});
	}
}
