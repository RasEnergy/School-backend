import { prisma } from "@/config/database"
import type { UserRole } from "@prisma/client"
import { hashPassword } from "@/utils/auth"

export interface CreateUserData {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  role: UserRole
  schoolId: string
  branchId?: string
}

export interface UpdateUserData {
  firstName?: string
  lastName?: string
  phone?: string
  avatar?: string
  isActive?: boolean
}

export const createUser = async (userData: CreateUserData) => {
  const hashedPassword = await hashPassword(userData.password)

  return prisma.user.create({
    data: {
      ...userData,
      password: hashedPassword,
    },
    include: {
      school: true,
      branch: true,
    },
  })
}

export const getUserById = async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    include: {
      school: true,
      branch: true,
      teacherProfile: true,
      studentProfile: true,
      parentProfile: true,
    },
  })
}

export const getUserByEmail = async (email: string) => {
  return prisma.user.findUnique({
    where: { email },
    include: {
      school: true,
      branch: true,
    },
  })
}

export const updateUser = async (id: string, userData: UpdateUserData) => {
  return prisma.user.update({
    where: { id },
    data: userData,
    include: {
      school: true,
      branch: true,
    },
  })
}

export const deleteUser = async (id: string) => {
  return prisma.user.update({
    where: { id },
    data: { isActive: false },
  })
}

export const getUsersBySchool = async (schoolId: string, branchId?: string) => {
  return prisma.user.findMany({
    where: {
      schoolId,
      ...(branchId && { branchId }),
      isActive: true,
    },
    include: {
      school: true,
      branch: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}

export const getUsersByRole = async (role: UserRole, schoolId: string, branchId?: string) => {
  return prisma.user.findMany({
    where: {
      role,
      schoolId,
      ...(branchId && { branchId }),
      isActive: true,
    },
    include: {
      school: true,
      branch: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}
