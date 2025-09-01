import type { Request, Response, NextFunction } from "express";
import * as classService from "@/services/classService";

export const createClass = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const classData = req.body;
		const newClass = await classService.createClass(classData);

		res.status(201).json({
			success: true,
			data: { class: newClass },
		});
	} catch (error) {
		console.error("Create class error:", error);
		next(error);
	}
};

export const getClass = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { id } = req.params;
		const classData = await classService.getClassById(id);
		

		if (!classData) {
			return res.status(404).json({
				success: false,
				error: "Class not found",
			});
		}

		res.status(200).json({
			success: true,
			data: { class: classData },
		});
	} catch (error) {
		console.error("Get class error:", error);
		next(error);
	}
};

export const getClassById = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		console.log({id___: id});

		const result = await classService.getClassById(id);
		console.log({result__: result});

		if (!(result)) {
			return res.status(404).json(result);
		}

		res.json(result);
	} catch (error) {
		console.error("Error in getClassById controller:", error);
		res.status(500).json({
			success: false,
			error: "Internal server error",
		});
	}
};

export const updateClass = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { name, section, gradeId, academicYearId, capacity } = req.body;

		if (!name || !section || !gradeId || !academicYearId) {
			return res.status(400).json({
				success: false,
				error: "Missing required fields",
			});
		}

		const result = await classService.updateClass(id, {
			name,
			section,
			gradeId,
			academicYearId,
			capacity,
		});

		if (!result.success) {
			return res.status(400).json(result);
		}

		res.json(result);
	} catch (error) {
		console.error("Error in updateClass controller:", error);
		res.status(500).json({
			success: false,
			error: "Internal server error",
		});
	}
};

export const deleteClass = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { id } = req.params;
		await classService.deleteClass(id);

		res.status(200).json({
			success: true,
			message: "Class deleted successfully",
		});
	} catch (error) {
		console.error("Delete class error:", error);
		next(error);
	}
};

export const getClassesByBranch = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { branchId } = req.params;
		const { gradeId, academicYearId } = req.query;

		const classes = await classService.getClassesByBranch(
			branchId,
			gradeId as string,
			academicYearId as string
		);

		res.status(200).json({
			success: true,
			data: { classes },
		});
	} catch (error) {
		console.error("Get classes by branch error:", error);
		next(error);
	}
};

export const getGradesByBranch = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		console.log("GRadess");
		const { branchId } = req.params;
		console.log({
			branchId__: branchId,
		});
		// const { gradeId, academicYearId } = req.query;

		const grades = await classService.getGradesByBranch(branchId);

		res.status(200).json({
			success: true,
			data: { grades },
		});
	} catch (error) {
		console.error("Get classes by branch error:", error);
		next(error);
	}
};

export const getBranchs = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		console.log("GRadess");
		const { branchId } = req.params;
		const branches = await classService.getBranchs(branchId);

		res.status(200).json({
			success: true,
			data: { branches },
		});
	} catch (error) {
		console.error("Get classes by branch error:", error);
		next(error);
	}
};

export const getAcademicYear = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const academicYears = await classService.getAcademicYear();
		console.log({
			getAcademicYear: academicYears,
		});

		res.status(200).json({
			success: true,
			data: { academicYears },
		});
	} catch (error) {
		console.error("Get classes by branch error:", error);
		next(error);
	}
};
