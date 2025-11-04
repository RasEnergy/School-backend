import type { Request, Response } from "express";
import * as studentService from "@/services/studentService";
import multer from "multer";
import path from "path";
import type { Express } from "express";

// Configure multer for file uploads
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, process.env.UPLOAD_DIR || "uploads/");
	},
	filename: (req, file, cb) => {
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		cb(
			null,
			file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
		);
	},
});

const upload = multer({
	storage,
	limits: { fileSize: Number.parseInt(process.env.MAX_FILE_SIZE || "5242880") }, // 5MB default
	fileFilter: (req, file, cb) => {
		if (file.mimetype.startsWith("image/")) {
			cb(null, true);
		} else {
			cb(new Error("Only image files are allowed"));
		}
	},
});

// Validation functions
const validateEmail = (email: string): boolean => {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
};

const validateEthiopianPhone = (phone: string): boolean => {
	const phoneRegex = /^(\+251|0)?[79]\d{8}$/;
	return phoneRegex.test(phone);
};

const validateDateOfBirth = (dateOfBirth: string): boolean => {
	const birthDate = new Date(dateOfBirth);
	const today = new Date();
	const age = today.getFullYear() - birthDate.getFullYear();
	return age >= 3 && age <= 25;
};

const validateStudentType = (studentType: string): boolean => {
	return ["NEW_STUDENT", "REGULAR_STUDENT"].includes(studentType);
};

const validateImageFile = (file: Express.Multer.File) => {
	const maxSize = 5 * 1024 * 1024; // 5MB
	const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];

	if (file.size > maxSize) {
		return { isValid: false, error: "File size must be less than 5MB" };
	}

	if (!allowedTypes.includes(file.mimetype)) {
		return {
			isValid: false,
			error: "Only JPEG, PNG, and GIF files are allowed",
		};
	}

	return { isValid: true };
};

export const createStudent = async (req: Request, res: Response) => {
	try {
		const student = await studentService.createStudent(req.body);
		res.status(201).json({ success: true, data: student });
	} catch (error) {
		console.error("Create student error:", error);
		res.status(500).json({ success: false, error: "Failed to create student" });
	}
};

export const getStudents = async (req: Request, res: Response) => {
	try {
		const { branchId, classId, page, limit, search } = req.query;
		const user = (req as any).user;

		const params = {
			branchId: branchId as string,
			classId: classId as string,
			page: page ? Number(page) : undefined,
			limit: limit ? Number(limit) : undefined,
			search: search as string,
			userRole: user.role,
			userBranchId: user.branchId,
		};

		const result = await studentService.getStudents(params);
		res.json({ success: true, data: result });
	} catch (error) {
		console.error("Get students error:", error);
		if (error instanceof Error && error.message === "Access denied") {
			res.status(403).json({ success: false, error: "Access denied" });
		} else {
			res
				.status(500)
				.json({ success: false, error: "Failed to fetch students" });
		}
	}
};

export const getStudent = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const student = await studentService.getStudentById(id);

		if (!student) {
			return res
				.status(404)
				.json({ success: false, error: "Student not found" });
		}

		res.json({ success: true, data: student });
	} catch (error) {
		console.error("Get student error:", error);
		res.status(500).json({ success: false, error: "Failed to fetch student" });
	}
};

export const updateStudent = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const student = await studentService.updateStudent(id, req.body);
		res.json({ success: true, data: student });
	} catch (error) {
		console.error("Update student error:", error);
		res.status(500).json({ success: false, error: "Failed to update student" });
	}
};

export const deleteStudent = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		await studentService.updateStudent(id, { isActive: false });
		res.json({ success: true, message: "Student deactivated successfully" });
	} catch (error) {
		console.error("Delete student error:", error);
		res.status(500).json({ success: false, error: "Failed to delete student" });
	}
};

export const getStudentsByBranch = async (req: Request, res: Response) => {
	try {
		const { branchId } = req.params;
		const { gradeId } = req.query;
		const students = await studentService.getStudentsByBranch(
			branchId,
			gradeId as string
		);
		res.json({ success: true, data: students });
	} catch (error) {
		console.error("Get students by branch error:", error);
		res.status(500).json({ success: false, error: "Failed to fetch students" });
	}
};

export const searchStudents = async (req: Request, res: Response) => {
	try {
		const { q: query, branchId } = req.query;

		if (!query || !branchId) {
			return res
				.status(400)
				.json({ success: false, error: "Query and branchId are required" });
		}

		const students = await studentService.searchStudents(
			query as string,
			branchId as string
		);
		res.json({ success: true, data: students });
	} catch (error) {
		console.error("Search students error:", error);
		res
			.status(500)
			.json({ success: false, error: "Failed to search students" });
	}
};

export const registerStudent = async (req: Request, res: Response) => {
	try {
		const user = (req as any).user;
		if (!user) {
			return res.status(401).json({ success: false, error: "Unauthorized" });
		}

		// Check permissions
		if (!["SUPER_ADMIN", "BRANCH_ADMIN", "REGISTRAR"].includes(user.role)) {
			return res
				.status(403)
				.json({ success: false, error: "Insufficient permissions" });
		}

		// Extract form data
		const studentData: studentService.StudentRegistrationData = {
			firstName: req.body.firstName,
			lastName: req.body.lastName,
			email: req.body.email,
			phone: req.body.phone,
			branchId: req.body.branchId,
			gradeId: req.body.gradeId,
			studentType: req.body.studentType,
			dateOfBirth: req.body.dateOfBirth,
			placeOfBirth: req.body.placeOfBirth,
			gender: req.body.gender,
			nationality: req.body.nationality,
			bloodGroup: req.body.bloodGroup,
			address: req.body.address,
			emergencyContact: req.body.emergencyContact,
			paymentDuration: req.body.paymentDuration,
			existingStudentId: req.body.existingStudentId,
		};

		const pricingData: studentService.PricingData = {
			registrationFee: Number(req.body.registrationFee),
			additionalFee: Number(req.body.additionalFee),
			serviceFee: Number(req.body.serviceFee),
			totalAmount: Number(req.body.totalAmount),
		};

		const parentData: studentService.ParentRegistrationData = {
			parentFirstName: req.body.parentFirstName,
			parentLastName: req.body.parentLastName,
			parentEmail: req.body.parentEmail,
			parentPhone: req.body.parentPhone,
			parentOccupation: req.body.parentOccupation,
			parentWorkplace: req.body.parentWorkplace,
			parentAddress: req.body.parentAddress,
			relationship: req.body.relationship,
		};

		// Validate required fields
		if (
			!studentData.firstName ||
			!studentData.lastName ||
			!studentData.email ||
			!studentData.branchId ||
			!studentData.gradeId ||
			!studentData.studentType ||
			!studentData.paymentDuration
		) {
			return res
				.status(400)
				.json({ success: false, error: "Missing required student fields" });
		}

		// Validate pricing data
		if (
			!pricingData.registrationFee ||
			!pricingData.additionalFee ||
			!pricingData.serviceFee ||
			!pricingData.totalAmount
		) {
			return res
				.status(400)
				.json({ success: false, error: "Missing pricing information" });
		}

		// Validate parent phone is required
		if (!parentData.parentPhone) {
			return res
				.status(400)
				.json({ success: false, error: "Parent phone number is required" });
		}

		// Validate email format
		if (!validateEmail(studentData.email)) {
			return res
				.status(400)
				.json({ success: false, error: "Invalid email format" });
		}

		if (parentData.parentEmail && !validateEmail(parentData.parentEmail)) {
			return res
				.status(400)
				.json({ success: false, error: "Invalid parent email format" });
		}

		// Validate phone numbers
		if (studentData.phone && !validateEthiopianPhone(studentData.phone)) {
			return res
				.status(400)
				.json({ success: false, error: "Invalid phone number format" });
		}

		if (!validateEthiopianPhone(parentData.parentPhone)) {
			return res
				.status(400)
				.json({ success: false, error: "Invalid parent phone number format" });
		}

		// Validate date of birth
		if (
			studentData.dateOfBirth &&
			!validateDateOfBirth(studentData.dateOfBirth)
		) {
			return res.status(400).json({
				success: false,
				error: "Invalid date of birth. Student must be between 3-25 years old",
			});
		}

		// Validate gender
		if (
			studentData.gender &&
			!["MALE", "FEMALE"].includes(studentData.gender)
		) {
			return res.status(400).json({ success: false, error: "Invalid gender" });
		}

		// Validate student type
		if (!validateStudentType(studentData.studentType)) {
			return res
				.status(400)
				.json({ success: false, error: "Invalid student type" });
		}

		// Validate photo files if present
		const files = req.files as { [fieldname: string]: Express.Multer.File[] };
		let studentPhotoUrl: string | undefined;
		let parentPhotoUrl: string | undefined;

		if (files?.studentPhoto?.[0]) {
			const validation = validateImageFile(files.studentPhoto[0]);
			if (!validation.isValid) {
				return res.status(400).json({
					success: false,
					error: `Student photo: ${validation.error}`,
				});
			}
			studentPhotoUrl = files.studentPhoto[0].path;
		}

		if (files?.parentPhoto?.[0]) {
			const validation = validateImageFile(files.parentPhoto[0]);
			if (!validation.isValid) {
				return res
					.status(400)
					.json({ success: false, error: `Parent photo: ${validation.error}` });
			}
			parentPhotoUrl = files.parentPhoto[0].path;
		}

		// Check branch access
		if (user.role !== "SUPER_ADMIN" && user.branchId !== studentData.branchId) {
			return res
				.status(403)
				.json({ success: false, error: "Access denied to this branch" });
		}

		// Register student
		const result = await studentService.registerStudent(
			studentData,
			parentData,
			pricingData,
			studentPhotoUrl,
			parentPhotoUrl
		);

		const message =
			result.student.studentType === "REGULAR_STUDENT"
				? "Regular student re-registered successfully. Payment required to complete registration."
				: "New student registered successfully. Payment required to complete registration.";

		res.status(201).json({
			success: true,
			message,
			isExistingStudent: result.student.studentType === "REGULAR_STUDENT",
			student: {
				id: result.student.id,
				studentId: result.student.studentId,
				studentType: result.student.studentType,
				user: result.studentUser
					? {
							id: result.studentUser.id,
							firstName: result.studentUser.firstName,
							lastName: result.studentUser.lastName,
							email: result.studentUser.email,
					  }
					: null,
			},
			registration: {
				id: result.registration.id,
				registrationNumber: result.registration.registrationNumber,
				status: result.registration.status,
				totalAmount: result.registration.totalAmount,
				paymentDueDate: result.registration.paymentDueDate,
			},
			redirectTo: `/registration/payment/${result.registration.id}`,
		});
	} catch (error) {
		console.error("Student registration error:", error);
		if (error instanceof Error) {
			res.status(400).json({ success: false, error: error.message });
		} else {
			res.status(500).json({ success: false, error: "Internal server error" });
		}
	}
};

export const uploadMiddleware = upload.fields([
	{ name: "studentPhoto", maxCount: 1 },
	{ name: "parentPhoto", maxCount: 1 },
]);

export const exportStudents = async (req: Request, res: Response) => {
	try {
		console.log("RECEIVED REQUEST");
		const user = (req as any).user; // injected from authenticate middleware

		if (!user) {
			return res.status(401).json({ error: "Unauthorized" });
		}

		const { branchId, classId, search, format = "csv" } = req.query;
		console.log("branchs info", req.query);

		const students = await studentService.getFilteredStudents({
			user,
			branchId: branchId as string,
			classId: classId as string,
			search: search as string,
		});

		console.log({
			students,
		});

		if (format === "csv") {
			const csvContent = studentService.generateCSV(students);

			const fileName = `students-export-${
				new Date().toISOString().split("T")[0]
			}.csv`;

			res.setHeader("Content-Type", "text/csv");
			res.setHeader(
				"Content-Disposition",
				`attachment; filename="${fileName}"`
			);
			return res.status(200).send(csvContent);
		}

		return res.json({ students });
	} catch (error) {
		console.error("Export students error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};
