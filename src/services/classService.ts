import { prisma } from "@/config/database";

export interface CreateClassData {
	name: string;
	// code: string;
	gradeId: string;
	branchId: string;
	academicYearId: string;
	capacity?: number;
	description?: string;
}

export interface UpdateClassData {
	name?: string;
	// code?: string;
	gradeId?: string;
	capacity?: number;
	description?: string;
	isActive?: boolean;
}

export const createClass = async (classData: CreateClassData) => {
	return prisma.class.create({
		data: classData,
		include: {
			grade: true,
			branch: true,
			academicYear: true,
			enrollments: {
				include: {
					student: {
						include: {
							user: true,
						},
					},
				},
			},
			_count: {
				select: {
					enrollments: true,
				},
			},
		},
	});
};

export const getClassById = async (id: string) => {
	return prisma.class.findUnique({
		where: { id },
		include: {
			grade: true,
			branch: true,
			academicYear: true,
			enrollments: {
				include: {
					student: {
						include: {
							user: true,
						},
					},
				},
			},
			_count: {
				select: {
					enrollments: true,
				},
			},
		},
	});
};

export const updateClass = async (
	id: string,
	data: {
		name: string;
		section: string;
		gradeId: string;
		academicYearId: string;
		capacity?: number | null;
	}
) => {
	try {
		const updatedClass = await prisma.class.update({
			where: { id },
			data: {
				name: data.name,
				section: data.section,
				gradeId: data.gradeId,
				academicYearId: data.academicYearId,
				capacity: data.capacity,
			} as any,
			include: {
				grade: true,
				academicYear: true,
				branch: true,
				_count: {
					select: {
						enrollments: true,
					},
				},
			},
		});

		return {
			success: true,
			data: { class: updatedClass },
			message: "Class updated successfully",
		};
	} catch (error) {
		console.error("Error updating class:", error);
		return {
			success: false,
			error: "Failed to update class",
		};
	}
};

export const deleteClass = async (id: string) => {
	return prisma.class.update({
		where: { id },
		data: { isActive: false },
	});
};

export const getClassesByBranch = async (
	branchId: string,
	gradeId?: string,
	academicYearId?: string
) => {
	return prisma.class.findMany({
		where: {
			branchId,
			...(gradeId && { gradeId }),
			...(academicYearId && { academicYearId }),
			isActive: true,
		},
		include: {
			grade: true,
			branch: true,
			academicYear: true,
			_count: {
				select: {
					enrollments: true,
				},
			},
		},
		orderBy: {
			name: "asc",
		},
	});
};

export const getGradesByBranch = async (
	branchId: string
	// gradeId?: string,
	// academicYearId?: string
) => {
	return prisma.grade.findMany({
		where: {
			branchId,
			// ...(gradeId && { gradeId }),
			// ...(academicYearId && { academicYearId }),
			isActive: true,
		},
		include: {
			// grade: true,
			// branch: true,
			// academicYear: true,
			// _count: {
			// 	select: {
			// 		enrollments: true,
			// 	},
			// },
		},
		orderBy: {
			name: "asc",
		},
	});
};

export const getBranchs = async (
	branchId: string
) => {
	return prisma.branch.findMany({
		where: {
			id:branchId,
		},
		orderBy: {
			name: "asc",
		},
	});
};

export const getClassByCode = async (code: string, branchId: string) => {
	return prisma.class.findFirst({
		where: {
			// code,
			branchId,
			isActive: true,
		},
		include: {
			grade: true,
			branch: true,
			academicYear: true,
		},
	});
};

export const getAcademicYear = async () => {
	console.log("academic-years__");
	return prisma.academicYear.findMany();
};
