import type { Request, Response, NextFunction } from "express"
import * as teacherService from "@/services/teacherService"

export const createTeacher = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacherData = req.body
    const newTeacher = await teacherService.createTeacher(teacherData)

    res.status(201).json({
      success: true,
      data: { teacher: newTeacher },
    })
  } catch (error) {
    console.error("Create teacher error:", error)
    next(error)
  }
}

export const getTeacher = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const teacher = await teacherService.getTeacherById(id)

    if (!teacher) {
      return res.status(404).json({
        success: false,
        error: "Teacher not found",
      })
    }

    res.status(200).json({
      success: true,
      data: { teacher },
    })
  } catch (error) {
    console.error("Get teacher error:", error)
    next(error)
  }
}

export const updateTeacher = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const updateData = req.body

    const updatedTeacher = await teacherService.updateTeacher(id, updateData)

    res.status(200).json({
      success: true,
      data: { teacher: updatedTeacher },
    })
  } catch (error) {
    console.error("Update teacher error:", error)
    next(error)
  }
}

export const deleteTeacher = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    await teacherService.deleteTeacher(id)

    res.status(200).json({
      success: true,
      message: "Teacher deleted successfully",
    })
  } catch (error) {
    console.error("Delete teacher error:", error)
    next(error)
  }
}

export const getTeachersByBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId } = req.params
    const { subjectId } = req.query

    const teachers = await teacherService.getTeachersByBranch(branchId, subjectId as string)

    res.status(200).json({
      success: true,
      data: { teachers },
    })
  } catch (error) {
    console.error("Get teachers by branch error:", error)
    next(error)
  }
}
