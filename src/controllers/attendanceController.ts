import type { Request, Response } from "express"
import { AttendanceService } from "../services/attendanceService"
import { AttendanceStatus } from "@prisma/client"

export class AttendanceController {
  // Create or get attendance session
  static async createSession(req: Request, res: Response) {
    try {
      const { classId, date } = req.body

      if (!classId || !date) {
        return res.status(400).json({
          success: false,
          error: "Class ID and date are required",
        })
      }

      const session = await AttendanceService.createOrGetSession(classId, new Date(date))

      res.json({
        success: true,
        data: session,
      })
    } catch (error) {
      console.error("Create attendance session error:", error)
      res.status(500).json({
        success: false,
        error: "Failed to create attendance session",
      })
    }
  }

  // Mark attendance for a student
  static async markAttendance(req: Request, res: Response) {
    try {
      const { sessionId, studentId, status, notes } = req.body
      const markedBy = req.user?.id

      if (!sessionId || !studentId || !status) {
        return res.status(400).json({
          success: false,
          error: "Session ID, student ID, and status are required",
        })
      }

      if (!Object.values(AttendanceStatus).includes(status)) {
        return res.status(400).json({
          success: false,
          error: "Invalid attendance status",
        })
      }

      const record = await AttendanceService.markAttendance(sessionId, studentId, status, notes, markedBy)

      res.json({
        success: true,
        data: record,
      })
    } catch (error) {
      console.error("Mark attendance error:", error)
      res.status(500).json({
        success: false,
        error: "Failed to mark attendance",
      })
    }
  }

  // Bulk mark attendance
  static async bulkMarkAttendance(req: Request, res: Response) {
    try {
      const { sessionId, attendanceData } = req.body
      const markedBy = req.user?.id

      if (!sessionId || !Array.isArray(attendanceData)) {
        return res.status(400).json({
          success: false,
          error: "Session ID and attendance data array are required",
        })
      }

      // Validate attendance data
      for (const data of attendanceData) {
        if (!data.studentId || !data.status) {
          return res.status(400).json({
            success: false,
            error: "Each attendance record must have studentId and status",
          })
        }
        if (!Object.values(AttendanceStatus).includes(data.status)) {
          return res.status(400).json({
            success: false,
            error: `Invalid attendance status: ${data.status}`,
          })
        }
      }

      const records = await AttendanceService.bulkMarkAttendance(sessionId, attendanceData, markedBy)

      res.json({
        success: true,
        data: records,
      })
    } catch (error) {
      console.error("Bulk mark attendance error:", error)
      res.status(500).json({
        success: false,
        error: "Failed to mark bulk attendance",
      })
    }
  }

  // Get attendance session with records
  static async getSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params

      const session = await AttendanceService.getSessionWithRecords(sessionId)

      if (!session) {
        return res.status(404).json({
          success: false,
          error: "Attendance session not found",
        })
      }

      res.json({
        success: true,
        data: session,
      })
    } catch (error) {
      console.error("Get attendance session error:", error)
      res.status(500).json({
        success: false,
        error: "Failed to get attendance session",
      })
    }
  }

  // Get monthly attendance for a class
  static async getMonthlyAttendance(req: Request, res: Response) {
    try {
      const { classId } = req.params
      const { year, month } = req.query

      if (!year || !month) {
        return res.status(400).json({
          success: false,
          error: "Year and month are required",
        })
      }

      const yearNum = Number.parseInt(year as string)
      const monthNum = Number.parseInt(month as string)

      if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({
          success: false,
          error: "Invalid year or month",
        })
      }

      const data = await AttendanceService.getMonthlyAttendance(classId, yearNum, monthNum)

      res.json({
        success: true,
        data,
      })
    } catch (error) {
      console.error("Get monthly attendance error:", error)
      res.status(500).json({
        success: false,
        error: "Failed to get monthly attendance",
      })
    }
  }

  // Get attendance sessions by date range
  static async getSessionsByDateRange(req: Request, res: Response) {
    try {
      const { classId } = req.params
      const { startDate, endDate } = req.query

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: "Start date and end date are required",
        })
      }

      const sessions = await AttendanceService.getSessionsByDateRange(
        classId,
        new Date(startDate as string),
        new Date(endDate as string),
      )

      res.json({
        success: true,
        data: sessions,
      })
    } catch (error) {
      console.error("Get sessions by date range error:", error)
      res.status(500).json({
        success: false,
        error: "Failed to get attendance sessions",
      })
    }
  }

  // Get attendance statistics
  static async getAttendanceStats(req: Request, res: Response) {
    try {
      const { classId } = req.params
      const { year, month } = req.query

      if (!year || !month) {
        return res.status(400).json({
          success: false,
          error: "Year and month are required",
        })
      }

      const yearNum = Number.parseInt(year as string)
      const monthNum = Number.parseInt(month as string)

      if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({
          success: false,
          error: "Invalid year or month",
        })
      }

      const stats = await AttendanceService.getAttendanceStats(classId, yearNum, monthNum)

      res.json({
        success: true,
        data: stats,
      })
    } catch (error) {
      console.error("Get attendance stats error:", error)
      res.status(500).json({
        success: false,
        error: "Failed to get attendance statistics",
      })
    }
  }

  // Export monthly attendance to Excel
  static async exportMonthlyAttendanceExcel(req: Request, res: Response) {
    try {
      const { classId } = req.params
      const { year, month, schoolName, branchName, homeRoomTeacher } = req.query

      if (!year || !month) {
        return res.status(400).json({
          success: false,
          error: "Year and month are required",
        })
      }

      const yearNum = Number.parseInt(year as string)
      const monthNum = Number.parseInt(month as string)

      if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({
          success: false,
          error: "Invalid year or month",
        })
      }

      const buffer = await AttendanceService.exportMonthlyAttendanceToExcel(
        classId,
        yearNum,
        monthNum,
        schoolName as string,
        branchName as string,
        homeRoomTeacher as string,
      )

      // Set response headers for Excel file download
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      res.setHeader("Content-Disposition", `attachment; filename="attendance-${yearNum}-${monthNum}.xlsx"`)
      res.setHeader("Content-Length", buffer.length)

      res.send(buffer)
    } catch (error) {
      console.error("Export attendance Excel error:", error)
      res.status(500).json({
        success: false,
        error: "Failed to export attendance to Excel",
      })
    }
  }
}
