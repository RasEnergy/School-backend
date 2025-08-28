import type { Request, Response, NextFunction } from "express"
import * as userService from "@/services/userService"
import type { UserRole } from "@prisma/client"

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userData = req.body

    // Check if user already exists
    const existingUser = await userService.getUserByEmail(userData.email)
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "User with this email already exists",
      })
    }

    const user = await userService.createUser(userData)

    res.status(201).json({
      success: true,
      data: { user },
    })
  } catch (error) {
    console.error("Create user error:", error)
    next(error)
  }
}

export const getUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    const user = await userService.getUserById(id)
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      })
    }

    res.status(200).json({
      success: true,
      data: { user },
    })
  } catch (error) {
    console.error("Get user error:", error)
    next(error)
  }
}

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const updateData = req.body

    const user = await userService.updateUser(id, updateData)

    res.status(200).json({
      success: true,
      data: { user },
    })
  } catch (error) {
    console.error("Update user error:", error)
    next(error)
  }
}

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    await userService.deleteUser(id)

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    })
  } catch (error) {
    console.error("Delete user error:", error)
    next(error)
  }
}

export const getUsersBySchool = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { schoolId } = req.params
    const { branchId, role } = req.query

    let users
    if (role) {
      users = await userService.getUsersByRole(role as UserRole, schoolId, branchId as string)
    } else {
      users = await userService.getUsersBySchool(schoolId, branchId as string)
    }

    res.status(200).json({
      success: true,
      data: { users },
    })
  } catch (error) {
    console.error("Get users by school error:", error)
    next(error)
  }
}
