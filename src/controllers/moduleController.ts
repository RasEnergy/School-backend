import type { Request, Response } from "express";
import { ModuleService } from "@/services/moduleService";
import type { ModuleStatus } from "@prisma/client";

export class ModuleController {
	static async createModule(req: Request, res: Response) {
		try {
			const {
				title,
				description,
				lessonId,
				content,
				orderIndex,
				duration,
				resources,
				objectives,
			} = req.body;

			// Validate required fields
			if (!title || !lessonId || orderIndex === undefined) {
				return res.status(400).json({
					success: false,
					error: "Missing required fields: title, lessonId, orderIndex",
				});
			}

			const module = await ModuleService.createModule({
				title,
				description,
				lessonId,
				content,
				orderIndex,
				duration,
				resources: resources || [],
				objectives: objectives || [],
			});

			res.status(201).json({
				success: true,
				data: module,
			});
		} catch (error) {
			console.error("Create module error:", error);
			res.status(500).json({
				success: false,
				error: "Failed to create module",
			});
		}
	}

	static async getAllModules(req: Request, res: Response) {
		try {
			const { lessonId, status } = req.query;

			const filters: any = {};
			if (lessonId) filters.lessonId = lessonId as string;
			if (status) filters.status = status as ModuleStatus;

			const modules = await ModuleService.getAllModules(filters);

			res.json({
				success: true,
				data: modules,
			});
		} catch (error) {
			console.error("Get modules error:", error);
			res.status(500).json({
				success: false,
				error: "Failed to fetch modules",
			});
		}
	}

	static async getModuleById(req: Request, res: Response) {
		try {
			const { id } = req.params;
			const module = await ModuleService.getModuleById(id);

			if (!module) {
				return res.status(404).json({
					success: false,
					error: "Module not found",
				});
			}

			res.json({
				success: true,
				data: module,
			});
		} catch (error) {
			console.error("Get module error:", error);
			res.status(500).json({
				success: false,
				error: "Failed to fetch module",
			});
		}
	}

	static async updateModule(req: Request, res: Response) {
		try {
			const { id } = req.params;
			const updateData = req.body;

			const module = await ModuleService.updateModule(id, updateData);

			res.json({
				success: true,
				data: module,
			});
		} catch (error) {
			console.error("Update module error:", error);
			res.status(500).json({
				success: false,
				error: "Failed to update module",
			});
		}
	}

	static async deleteModule(req: Request, res: Response) {
		try {
			const { id } = req.params;
			await ModuleService.deleteModule(id);

			res.json({
				success: true,
				message: "Module deleted successfully",
			});
		} catch (error) {
			console.error("Delete module error:", error);
			res.status(500).json({
				success: false,
				error: "Failed to delete module",
			});
		}
	}

	static async getModulesByLesson(req: Request, res: Response) {
		try {
			const { lessonId } = req.params;
			const modules = await ModuleService.getModulesByLesson(lessonId);

			res.json({
				success: true,
				data: modules,
			});
		} catch (error) {
			console.error("Get lesson modules error:", error);
			res.status(500).json({
				success: false,
				error: "Failed to fetch lesson modules",
			});
		}
	}

	static async reorderModules(req: Request, res: Response) {
		try {
			const { lessonId } = req.params;
			const { moduleOrders } = req.body;

			if (!Array.isArray(moduleOrders)) {
				return res.status(400).json({
					success: false,
					error: "moduleOrders must be an array",
				});
			}

			const modules = await ModuleService.reorderModules(
				lessonId,
				moduleOrders
			);

			res.json({
				success: true,
				data: modules,
			});
		} catch (error) {
			console.error("Reorder modules error:", error);
			res.status(500).json({
				success: false,
				error: "Failed to reorder modules",
			});
		}
	}

	static async duplicateModule(req: Request, res: Response) {
		try {
			const { id } = req.params;
			const { newLessonId } = req.body;

			const module = await ModuleService.duplicateModule(id, newLessonId);

			res.status(201).json({
				success: true,
				data: module,
			});
		} catch (error) {
			console.error("Duplicate module error:", error);
			res.status(500).json({
				success: false,
				error: "Failed to duplicate module",
			});
		}
	}
}
