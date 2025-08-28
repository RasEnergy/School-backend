import { prisma } from "@/config/database";

export class ValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ValidationError";
	}
}

export async function validateClassCapacity(
	classId: string,
	additionalStudents = 1
): Promise<void> {
	const classData = await prisma.class.findUnique({
		where: { id: classId },
		include: {
			_count: {
				select: {
					enrollments: {
						where: { status: "ACTIVE" },
					},
				},
			},
		},
	});

	if (!classData) {
		throw new ValidationError("Class not found");
	}

	const currentEnrollments = classData._count.enrollments;
	const totalAfterEnrollment = currentEnrollments + additionalStudents;

	if (totalAfterEnrollment > classData.capacity) {
		throw new ValidationError(
			`Class capacity exceeded. Current: ${currentEnrollments}, Capacity: ${classData.capacity}, Trying to add: ${additionalStudents}`
		);
	}
}

export async function validateUniquePhone(
	phone: string,
	excludeUserId?: string
): Promise<void> {
	if (!phone) return; // Phone is optional

	const existingUser = await prisma.user.findUnique({
		where: { phone },
	});

	if (existingUser && existingUser.id !== excludeUserId) {
		throw new ValidationError("Phone number already exists");
	}
}

export async function findExistingParentByPhone(phone: string) {
	const cleanPhone = phone.replace(/\D/g, "");
	const last9 = cleanPhone.slice(-9);

	const parentUser = await prisma.user.findFirst({
		where: {
			phone: {
				endsWith: last9,
			},
			role: "PARENT",
			isActive: true,
		},
		include: {
			parentProfile: {
				include: {
					children: {
						include: {
							student: {
								include: {
									user: {
										select: {
											firstName: true,
											lastName: true,
										},
									},
								},
							},
						},
					},
				},
			},
		},
	});

	if (!parentUser || !parentUser.parentProfile) {
		return null;
	}

	return {
		user: parentUser,
		parent: parentUser.parentProfile,
	};
}

export async function validateTeacherSubjectAssignment(
	teacherId: string,
	subjectIds: string[]
): Promise<void> {
	// Check if teacher exists
	const teacher = await prisma.teacher.findUnique({
		where: { id: teacherId },
	});

	if (!teacher) {
		throw new ValidationError("Teacher not found");
	}

	// Check if all subjects exist
	const subjects = await prisma.subject.findMany({
		where: { id: { in: subjectIds } },
	});

	if (subjects.length !== subjectIds.length) {
		throw new ValidationError("One or more subjects not found");
	}
}

export async function validateStudentEnrollment(
	studentId: string,
	classId: string,
	academicYearId: string
): Promise<void> {
	// Check if student is already enrolled in the same academic year
	const existingEnrollment = await prisma.enrollment.findFirst({
		where: {
			studentId,
			academicYearId,
			status: "ACTIVE",
		},
	});

	if (existingEnrollment) {
		throw new ValidationError(
			"Student is already enrolled in this academic year"
		);
	}

	// Validate class capacity
	await validateClassCapacity(classId, 1);
}

// export function validateEthiopianPhone(phone: string): boolean {
// 	// Ethiopian phone number validation
// 	// Format: +251XXXXXXXXX or 09XXXXXXXX or 07XXXXXXXX
// 	const ethiopianPhoneRegex = /^(\+251|0)[79]\d{8}$/;
// 	return ethiopianPhoneRegex.test(phone);
// }

export function validateEthiopianPhone(phone: string): boolean {
	// Ethiopian phone number validation
	// Accepts: +2519XXXXXXXX, 09XXXXXXXX, 07XXXXXXXX, 9XXXXXXXX
	const ethiopianPhoneRegex = /^(\+251|0|)[79]\d{8}$/;

	// If it starts with '9', add '9' as a valid prefix
	const startsWith9Regex = /^9\d{8}$/;

	return ethiopianPhoneRegex.test(phone) || startsWith9Regex.test(phone);
}

export function validateEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

export function validateDateOfBirth(dateOfBirth: string): boolean {
	const birthDate = new Date(dateOfBirth);
	const today = new Date();

	// Check if date is valid
	if (isNaN(birthDate.getTime())) {
		return false;
	}

	// Check if date is not in the future
	if (birthDate > today) {
		return false;
	}

	// Check age range (3-25 years for students)
	const age = today.getFullYear() - birthDate.getFullYear();
	const monthDiff = today.getMonth() - birthDate.getMonth();

	let actualAge = age;
	if (
		monthDiff < 0 ||
		(monthDiff === 0 && today.getDate() < birthDate.getDate())
	) {
		actualAge--;
	}

	return actualAge >= 3 && actualAge <= 25;
}

export function validateNationality(nationality: string): boolean {
	// List of common nationalities - can be expanded
	const validNationalities = [
		"Ethiopian",
		"American",
		"British",
		"Canadian",
		"German",
		"French",
		"Italian",
		"Spanish",
		"Dutch",
		"Swedish",
		"Norwegian",
		"Danish",
		"Finnish",
		"Belgian",
		"Swiss",
		"Austrian",
		"Kenyan",
		"Ugandan",
		"Tanzanian",
		"Rwandan",
		"Sudanese",
		"Egyptian",
		"South African",
		"Nigerian",
		"Ghanaian",
		"Indian",
		"Chinese",
		"Japanese",
		"Korean",
		"Australian",
		"Other",
	];

	return validNationalities.includes(nationality);
}

export function validatePlaceOfBirth(place: string): boolean {
	// Basic validation for place of birth
	return (
		place.length >= 2 && place.length <= 100 && /^[a-zA-Z\s,.-]+$/.test(place)
	);
}

export function validateStudentType(studentType: string): boolean {
	return ["REGULAR_STUDENT", "NEW_STUDENT"].includes(studentType);
}
