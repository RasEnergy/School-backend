import { PrismaClient, ModuleStatus } from "@prisma/client";

const prisma = new PrismaClient();

export class ModuleService {
	static async createModule(data: {
		title: string;
		description?: string;
		lessonId: string;
		content?: string;
		orderIndex: number;
		duration?: number;
		resources?: string[];
		objectives?: string[];
	}) {
		return await prisma.module.create({
			data,
			include: {
				lesson: {
					include: {
						class: { include: { grade: true, branch: true } },
						subject: true,
						teacher: { include: { user: true } },
					},
				},
			},
		});
	}

	static async getAllModules(filters?: {
		lessonId?: string;
		status?: ModuleStatus;
	}) {
		const where: any = { isActive: true };

		if (filters?.lessonId) where.lessonId = filters.lessonId;
		if (filters?.status) where.status = filters.status;

		return await prisma.module.findMany({
			where,
			include: {
				lesson: {
					include: {
						class: { include: { grade: true, branch: true } },
						subject: true,
						teacher: { include: { user: true } },
					},
				},
			},
			orderBy: [{ lesson: { startTime: "asc" } }, { orderIndex: "asc" }],
		});
	}

	static async getModuleById(id: string) {
		return await prisma.module.findUnique({
			where: { id },
			include: {
				lesson: {
					include: {
						class: { include: { grade: true, branch: true } },
						subject: true,
						teacher: { include: { user: true } },
					},
				},
			},
		});
	}

	static async updateModule(
		id: string,
		data: {
			title?: string;
			description?: string;
			content?: string;
			orderIndex?: number;
			duration?: number;
			status?: ModuleStatus;
			resources?: string[];
			objectives?: string[];
		}
	) {
		return await prisma.module.update({
			where: { id },
			data: { ...data, updatedAt: new Date() },
			include: {
				lesson: {
					include: {
						class: { include: { grade: true, branch: true } },
						subject: true,
						teacher: { include: { user: true } },
					},
				},
			},
		});
	}

	static async deleteModule(id: string) {
		return await prisma.module.update({
			where: { id },
			data: { isActive: false, updatedAt: new Date() },
		});
	}

	static async getModulesByLesson(lessonId: string) {
		return await prisma.module.findMany({
			where: { lessonId, isActive: true },
			orderBy: { orderIndex: "asc" },
		});
	}

	static async reorderModules(
		lessonId: string,
		moduleOrders: { id: string; orderIndex: number }[]
	) {
		const updatePromises = moduleOrders.map(({ id, orderIndex }) =>
			prisma.module.update({
				where: { id },
				data: { orderIndex, updatedAt: new Date() },
			})
		);

		return await Promise.all(updatePromises);
	}

	static async duplicateModule(id: string, newLessonId?: string) {
		const originalModule = await prisma.module.findUnique({
			where: { id },
		});

		if (!originalModule) {
			throw new Error("Module not found");
		}

		const targetLessonId = newLessonId || originalModule.lessonId;

		// Get the next order index for the target lesson
		const maxOrderIndex = await prisma.module.findFirst({
			where: { lessonId: targetLessonId, isActive: true },
			orderBy: { orderIndex: "desc" },
		});

		const nextOrderIndex = (maxOrderIndex?.orderIndex || 0) + 1;

		return await prisma.module.create({
			data: {
				title: `${originalModule.title} (Copy)`,
				description: originalModule.description,
				lessonId: targetLessonId,
				content: originalModule.content,
				orderIndex: nextOrderIndex,
				duration: originalModule.duration,
				resources: originalModule.resources,
				objectives: originalModule.objectives,
				status: ModuleStatus.DRAFT,
			},
			include: {
				lesson: {
					include: {
						class: { include: { grade: true, branch: true } },
						subject: true,
						teacher: { include: { user: true } },
					},
				},
			},
		});
	}
}
