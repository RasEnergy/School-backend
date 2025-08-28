import { prisma } from "@/config/database"

export interface CreateSchoolData {
  name: string
  code: string
  address?: string
  phone?: string
  email?: string
  logo?: string
}

export interface UpdateSchoolData {
  name?: string
  code?: string
  address?: string
  phone?: string
  email?: string
  logo?: string
  isActive?: boolean
}

export const createSchool = async (schoolData: CreateSchoolData) => {
  return prisma.school.create({
    data: schoolData,
    include: {
      branches: true,
      users: true,
    },
  })
}

export const getSchoolById = async (id: string) => {
  return prisma.school.findUnique({
    where: { id },
    include: {
      branches: {
        where: { isActive: true },
        orderBy: { name: "asc" },
      },
      users: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      },
      FeeType: {
        where: { isActive: true },
      },
      Grade: {
        where: { isActive: true },
        orderBy: { level: "asc" },
      },
    },
  })
}

export const updateSchool = async (id: string, schoolData: UpdateSchoolData) => {
  return prisma.school.update({
    where: { id },
    data: schoolData,
    include: {
      branches: true,
    },
  })
}

export const getAllSchools = async () => {
  return prisma.school.findMany({
    where: { isActive: true },
    include: {
      branches: {
        where: { isActive: true },
      },
      _count: {
        select: {
          users: true,
          branches: true,
        },
      },
    },
    orderBy: { name: "asc" },
  })
}

export const getSchoolByCode = async (code: string) => {
  return prisma.school.findUnique({
    where: { code },
    include: {
      branches: true,
    },
  })
}
