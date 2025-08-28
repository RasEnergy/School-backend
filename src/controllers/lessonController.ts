import type { Request, Response } from "express";
import { LessonService } from "@/services/lessonService";
import type { LessonStatus } from "@prisma/client";

export class LessonController {
	static async createLesson(req: Request, res: Response) {
		try {
			const {
				title,
				description,
				classId,
				subjectId,
				teacherId,
				startTime,
				endTime,
				duration,
				location,
				notes,
			} = req.body;

			// Validate required fields
			if (
				!title ||
				!classId ||
				!subjectId ||
				!teacherId ||
				!startTime ||
				!endTime ||
				!duration
			) {
				return res.status(400).json({
					success: false,
					error:
						"Missing required fields: title, classId, subjectId, teacherId, startTime, endTime, duration",
				});
			}

			const lesson = await LessonService.createLesson({
				title,
				description,
				classId,
				subjectId,
				teacherId,
				startTime: new Date(startTime),
				endTime: new Date(endTime),
				duration,
				location,
				notes,
			});

			res.status(201).json({
				success: true,
				data: lesson,
			});
		} catch (error) {
			console.error("Create lesson error:", error);
			res.status(500).json({
				success: false,
				error: "Failed to create lesson",
			});
		}
	}

	static async getAllLessons(req: Request, res: Response) {
		try {
			const { classId, subjectId, teacherId, status, startDate, endDate } =
				req.query;

			const filters: any = {};
			if (classId) filters.classId = classId as string;
			if (subjectId) filters.subjectId = subjectId as string;
			if (teacherId) filters.teacherId = teacherId as string;
			if (status) filters.status = status as LessonStatus;
			if (startDate) filters.startDate = new Date(startDate as string);
			if (endDate) filters.endDate = new Date(endDate as string);

			const lessons = await LessonService.getAllLessons(filters);

			res.json({
				success: true,
				data: lessons,
			});
		} catch (error) {
			console.error("Get lessons error:", error);
			res.status(500).json({
				success: false,
				error: "Failed to fetch lessons",
			});
		}
	}

	static async getLessonById(req: Request, res: Response) {
		try {
			const { id } = req.params;
			const lesson = await LessonService.getLessonById(id);

			if (!lesson) {
				return res.status(404).json({
					success: false,
					error: "Lesson not found",
				});
			}

			res.json({
				success: true,
				data: lesson,
			});
		} catch (error) {
			console.error("Get lesson error:", error);
			res.status(500).json({
				success: false,
				error: "Failed to fetch lesson",
			});
		}
	}

	static async updateLesson(req: Request, res: Response) {
		try {
			const { id } = req.params;
			const updateData = req.body;

			// Convert date strings to Date objects if present
			if (updateData.startTime)
				updateData.startTime = new Date(updateData.startTime);
			if (updateData.endTime) updateData.endTime = new Date(updateData.endTime);

			const lesson = await LessonService.updateLesson(id, updateData);

			res.json({
				success: true,
				data: lesson,
			});
		} catch (error) {
			console.error("Update lesson error:", error);
			res.status(500).json({
				success: false,
				error: "Failed to update lesson",
			});
		}
	}

	static async deleteLesson(req: Request, res: Response) {
		try {
			const { id } = req.params;
			await LessonService.deleteLesson(id);

			res.json({
				success: true,
				message: "Lesson deleted successfully",
			});
		} catch (error) {
			console.error("Delete lesson error:", error);
			res.status(500).json({
				success: false,
				error: "Failed to delete lesson",
			});
		}
	}

	static async getLessonsByTeacher(req: Request, res: Response) {
		try {
			const { teacherId } = req.params;
			const { startDate, endDate, status } = req.query;

			const filters: any = {};
			if (startDate) filters.startDate = new Date(startDate as string);
			if (endDate) filters.endDate = new Date(endDate as string);
			if (status) filters.status = status as LessonStatus;

			const lessons = await LessonService.getLessonsByTeacher(
				teacherId,
				filters
			);

			res.json({
				success: true,
				data: lessons,
			});
		} catch (error) {
			console.error("Get teacher lessons error:", error);
			res.status(500).json({
				success: false,
				error: "Failed to fetch teacher lessons",
			});
		}
	}

	static async getLessonsByClass(req: Request, res: Response) {
		try {
			const { classId } = req.params;
			const { startDate, endDate, status } = req.query;

			const filters: any = {};
			if (startDate) filters.startDate = new Date(startDate as string);
			if (endDate) filters.endDate = new Date(endDate as string);
			if (status) filters.status = status as LessonStatus;

			const lessons = await LessonService.getLessonsByClass(classId, filters);

			res.json({
				success: true,
				data: lessons,
			});
		} catch (error) {
			console.error("Get class lessons error:", error);
			res.status(500).json({
				success: false,
				error: "Failed to fetch class lessons",
			});
		}
	}
}
