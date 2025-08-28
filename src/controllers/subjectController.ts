import type { Request, Response, NextFunction } from "express";
import * as subjectService from "@/services/subjectService";

export const createSubject = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const subjectData = req.body;
		const newSubject = await subjectService.createSubject(subjectData);

		res.status(201).json({
			success: true,
			data: { subject: newSubject },
		});
	} catch (error) {
		console.error("Create subject error:", error);
		next(error);
	}
};

export const getSubject = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { id } = req.params;
		const subject = await subjectService.getSubjectById(id);

		if (!subject) {
			return res.status(404).json({
				success: false,
				error: "Subject not found",
			});
		}

		res.status(200).json({
			success: true,
			data: { subject },
		});
	} catch (error) {
		console.error("Get subject error:", error);
		next(error);
	}
};

export const updateSubject = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { id } = req.params;
		const updateData = req.body;

		const updatedSubject = await subjectService.updateSubject(id, updateData);

		res.status(200).json({
			success: true,
			data: { subject: updatedSubject },
		});
	} catch (error) {
		console.error("Update subject error:", error);
		next(error);
	}
};

export const deleteSubject = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { id } = req.params;
		await subjectService.deleteSubject(id);

		res.status(200).json({
			success: true,
			message: "Subject deleted successfully",
		});
	} catch (error) {
		console.error("Delete subject error:", error);
		next(error);
	}
};

export const getSubjectsBySchool = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { schoolId } = req.params;
		const { gradeId } = req.query;

		const subjects = await subjectService.getSubjectsBySchool(
			schoolId,
			gradeId as string
		);

		res.status(200).json({
			success: true,
			data: { subjects },
		});
	} catch (error) {
		console.error("Get subjects by school error:", error);
		next(error);
	}
};
