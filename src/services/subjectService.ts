import { prisma } from "@/config/database";

export interface CreateSubjectData {
	name: string;
	code: string;
	// schoolId: string;
	// gradeId?: string;
	description?: string;
	credits?: number;
}

export interface UpdateSubjectData {
	name?: string;
	code?: string;
	// gradeId?: string;
	description?: string;
	credits?: number;
	isActive?: boolean;
}

export const createSubject = async (subjectData: CreateSubjectData) => {
	return prisma.subject.create({
		data: subjectData,
		include: {
			// grade: true,
			teachers: {
				include: {
					teacher: {
						include: {
							user: true,
						},
					},
				},
			},
		},
	});
};

export const getSubjectById = async (id: string) => {
	return prisma.subject.findUnique({
		where: { id },
		include: {
			// grade: true,
			teachers: {
				include: {
					teacher: {
						include: {
							user: true,
						},
					},
				},
			},
		},
	});
};

export const updateSubject = async (
	id: string,
	subjectData: UpdateSubjectData
) => {
	return prisma.subject.update({
		where: { id },
		data: subjectData,
		include: {
			// grade: true,
			teachers: {
				include: {
					teacher: {
						include: {
							user: true,
						},
					},
				},
			},
		},
	});
};

export const deleteSubject = async (id: string) => {
	return prisma.subject.update({
		where: { id },
		data: { isActive: false },
	});
};

export const getSubjectsBySchool = async (
	schoolId: string,
	gradeId?: string
) => {
	return prisma.subject.findMany({
		where: {
			// schoolId,
			...(gradeId && { gradeId }),
			isActive: true,
		},
		include: {
			// school: true,
			// grade: true,
			teachers: {
				include: {
					teacher: {
						include: {
							user: true,
						},
					},
				},
			},
		},
		orderBy: {
			name: "asc",
		},
	});
};

export const getSubjectByCode = async (code: string, schoolId: string) => {
	return prisma.subject.findFirst({
		where: {
			code,
			// schoolId,
			isActive: true,
		},
		include: {
			// school: true,
			// grade: true,
		},
	});
};
