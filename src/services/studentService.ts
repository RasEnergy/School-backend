import { prisma } from "@/config/database"
import type { StudentType, Gender } from "@prisma/client"

export interface CreateStudentData {
  userId: string
  studentId: string
  branchId: string
  studentType?: StudentType
  gradeId?: string
  admissionDate?: Date
  dateOfBirth?: Date
  placeOfBirth?: string
  gender?: Gender
  nationality?: string
  bloodGroup?: string
  address?: string
  emergencyContact?: string
  photo?: string
}

export interface UpdateStudentData {
  studentType?: StudentType
  gradeId?: string
  admissionDate?: Date
  dateOfBirth?: Date
  placeOfBirth?: string
  gender?: Gender
  nationality?: string
  bloodGroup?: string
  address?: string
  emergencyContact?: string
  photo?: string
  isActive?: boolean
}

export const createStudent = async (studentData: CreateStudentData) => {
  return prisma.student.create({
    data: studentData,
    include: {
      user: true,
      branch: true,
      grade: true,
      parents: {
        include: {
          parent: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  })
}

export const getStudentById = async (id: string) => {
  return prisma.student.findUnique({
    where: { id },
    include: {
      user: true,
      branch: true,
      grade: true,
      registration: true,
      enrollments: {
        include: {
          class: true,
          academicYear: true,
        },
      },
      parents: {
        include: {
          parent: {
            include: {
              user: true,
            },
          },
        },
      },
      invoices: {
        include: {
          items: {
            include: {
              feeType: true,
            },
          },
        },
      },
      payments: true,
    },
  })
}

export const getStudentByStudentId = async (studentId: string) => {
  return prisma.student.findUnique({
    where: { studentId },
    include: {
      user: true,
      branch: true,
      grade: true,
    },
  })
}

export const updateStudent = async (id: string, studentData: UpdateStudentData) => {
  return prisma.student.update({
    where: { id },
    data: studentData,
    include: {
      user: true,
      branch: true,
      grade: true,
    },
  })
}

export const getStudentsByBranch = async (branchId: string, gradeId?: string) => {
  return prisma.student.findMany({
    where: {
      branchId,
      ...(gradeId && { gradeId }),
      isActive: true,
    },
    include: {
      user: true,
      branch: true,
      grade: true,
      registration: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}

export const searchStudents = async (query: string, branchId: string) => {
  return prisma.student.findMany({
    where: {
      branchId,
      isActive: true,
      OR: [
        {
          studentId: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          user: {
            firstName: {
              contains: query,
              mode: "insensitive",
            },
          },
        },
        {
          user: {
            lastName: {
              contains: query,
              mode: "insensitive",
            },
          },
        },
        {
          user: {
            email: {
              contains: query,
              mode: "insensitive",
            },
          },
        },
      ],
    },
    include: {
      user: true,
      branch: true,
      grade: true,
    },
    take: 20,
  })
}
