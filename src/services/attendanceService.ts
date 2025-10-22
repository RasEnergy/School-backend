import { PrismaClient, type AttendanceStatus, type AttendanceSession, type AttendanceRecord } from "@prisma/client"
import { startOfMonth, endOfMonth, eachDayOfInterval, format, getDay, startOfWeek } from "date-fns"
import * as ExcelJS from "exceljs"

const prisma = new PrismaClient()

export interface AttendanceSessionWithRecords extends AttendanceSession {
  records: (AttendanceRecord & {
    student: {
      id: string
      studentId: string
      user: {
        firstName: string
        lastName: string
      }
    }
  })[]
  class: {
    id: string
    name: string
    section: string | null
  }
}

export interface MonthlyAttendanceData {
  classId: string
  className: string
  month: number
  year: number
  workingDays: Date[]
  students: {
    id: string
    studentId: string
    firstName: string
    lastName: string
    gender: string | null
    attendance: {
      [date: string]: AttendanceStatus | null
    }
  }[]
}

export class AttendanceService {
  // Get working days for a month (excluding Sundays)
  static getWorkingDaysForMonth(year: number, month: number): Date[] {
    const start = startOfMonth(new Date(year, month - 1))
    const end = endOfMonth(new Date(year, month - 1))
    const allDays = eachDayOfInterval({ start, end })

    // Filter out Sundays (getDay() returns 0 for Sunday)
    return allDays.filter((day) => getDay(day) !== 0)
  }

  // Get week number within the month (1-5)
  static getWeekNumberInMonth(date: Date): number {
    const startOfMonthDate = startOfMonth(date)
    const startOfFirstWeek = startOfWeek(startOfMonthDate, { weekStartsOn: 1 }) // Monday as start
    const weeksDiff = Math.floor((date.getTime() - startOfFirstWeek.getTime()) / (7 * 24 * 60 * 60 * 1000))
    return Math.min(weeksDiff + 1, 5) // Cap at 5 weeks
  }

  // Create or get attendance session for a specific date and class
  static async createOrGetSession(classId: string, date: Date): Promise<AttendanceSession> {
    const sessionDate = new Date(date)
    sessionDate.setHours(0, 0, 0, 0)

    const existingSession = await prisma.attendanceSession.findUnique({
      where: {
        classId_date: {
          classId,
          date: sessionDate,
        },
      },
    })

    if (existingSession) {
      return existingSession
    }

    const month = sessionDate.getMonth() + 1
    const year = sessionDate.getFullYear()
    const weekNumber = this.getWeekNumberInMonth(sessionDate)

    return await prisma.attendanceSession.create({
      data: {
        classId,
        date: sessionDate,
        month,
        year,
        weekNumber,
      },
    })
  }

  // Mark attendance for a student
  static async markAttendance(
    sessionId: string,
    studentId: string,
    status: AttendanceStatus,
    notes?: string,
    markedBy?: string,
  ): Promise<AttendanceRecord> {
    return await prisma.attendanceRecord.upsert({
      where: {
        sessionId_studentId: {
          sessionId,
          studentId,
        },
      },
      update: {
        status,
        notes,
        markedBy,
        updatedAt: new Date(),
      },
      create: {
        sessionId,
        studentId,
        status,
        notes,
        markedBy,
      },
    })
  }

  // Bulk mark attendance for multiple students
  static async bulkMarkAttendance(
    sessionId: string,
    attendanceData: Array<{
      studentId: string
      status: AttendanceStatus
      notes?: string
    }>,
    markedBy?: string,
  ): Promise<AttendanceRecord[]> {
    const results = await Promise.all(
      attendanceData.map((data) => this.markAttendance(sessionId, data.studentId, data.status, data.notes, markedBy)),
    )
    return results
  }

  // Get attendance session with records
  static async getSessionWithRecords(sessionId: string): Promise<AttendanceSessionWithRecords | null> {
    return await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            section: true,
          },
        },
        records: {
          include: {
            student: {
              select: {
                id: true,
                studentId: true,
                gender: true,
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
          orderBy: [{ student: { user: { firstName: "asc" } } }, { student: { user: { lastName: "asc" } } }],
        },
      },
    })
  }

  // Get monthly attendance data for a class
  static async getMonthlyAttendance(classId: string, year: number, month: number): Promise<MonthlyAttendanceData> {
    // Get class info
    const classInfo = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, name: true, section: true },
    })

    if (!classInfo) {
      throw new Error("Class not found")
    }

    // Get working days for the month
    const workingDays = this.getWorkingDaysForMonth(year, month)

    // Get all students in the class
    const enrollments = await prisma.enrollment.findMany({
      where: {
        classId,
        status: "ACTIVE",
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            gender: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: [{ student: { user: { firstName: "asc" } } }, { student: { user: { lastName: "asc" } } }],
    })

    // Get all attendance sessions for the month
    const sessions = await prisma.attendanceSession.findMany({
      where: {
        classId,
        year,
        month,
      },
      include: {
        records: true,
      },
    })

    // Build attendance map
    const attendanceMap: { [studentId: string]: { [date: string]: AttendanceStatus } } = {}

    sessions.forEach((session) => {
      const dateKey = format(session.date, "yyyy-MM-dd")
      session.records.forEach((record) => {
        if (!attendanceMap[record.studentId]) {
          attendanceMap[record.studentId] = {}
        }
        attendanceMap[record.studentId][dateKey] = record.status
      })
    })

    // Format student data with attendance
    const students = enrollments.map((enrollment) => ({
      id: enrollment.student.id,
      studentId: enrollment.student.studentId,
      firstName: enrollment.student.user.firstName,
      lastName: enrollment.student.user.lastName,
      gender: enrollment.student.gender,
      attendance: workingDays.reduce(
        (acc, date) => {
          const dateKey = format(date, "yyyy-MM-dd")
          acc[dateKey] = attendanceMap[enrollment.student.id]?.[dateKey] || null
          return acc
        },
        {} as { [date: string]: AttendanceStatus | null },
      ),
    }))

    return {
      classId,
      className: `${classInfo.name}${classInfo.section ? ` - ${classInfo.section}` : ""}`,
      month,
      year,
      workingDays,
      students,
    }
  }

  // Get attendance sessions for a class within a date range
  static async getSessionsByDateRange(
    classId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<AttendanceSessionWithRecords[]> {
    return await prisma.attendanceSession.findMany({
      where: {
        classId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            section: true,
          },
        },
        records: {
          include: {
            student: {
              select: {
                id: true,
                studentId: true,
                gender: true,
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
          orderBy: [{ student: { user: { firstName: "asc" } } }, { student: { user: { lastName: "asc" } } }],
        },
      },
      orderBy: { date: "asc" },
    })
  }

  // Get attendance statistics for a class
  static async getAttendanceStats(classId: string, year: number, month: number) {
    const sessions = await prisma.attendanceSession.findMany({
      where: {
        classId,
        year,
        month,
      },
      include: {
        records: true,
      },
    })

    const totalSessions = sessions.length
    const totalRecords = sessions.reduce((sum, session) => sum + session.records.length, 0)

    const statusCounts = sessions.reduce(
      (acc, session) => {
        session.records.forEach((record) => {
          acc[record.status] = (acc[record.status] || 0) + 1
        })
        return acc
      },
      {} as { [key in AttendanceStatus]: number },
    )

    const attendanceRate = totalRecords > 0 ? ((statusCounts.PRESENT || 0) / totalRecords) * 100 : 0

    return {
      totalSessions,
      totalRecords,
      statusCounts,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
    }
  }

  // Export monthly attendance data to Excel
  static async exportMonthlyAttendanceToExcel(
    classId: string,
    year: number,
    month: number,
    schoolName = "YEKA MICHAEL SCHOOLS",
    branchName = "WOSSEN BRANCH",
    homeRoomTeacher?: string,
  ): Promise<Buffer> {
    // Get monthly attendance data
    const attendanceData = await this.getMonthlyAttendance(classId, year, month)

    // Get class details
    const classInfo = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        name: true,
        section: true,
        branch: {
          select: {
            name: true,
            school: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet("Attendance Sheet")

    // Set up page layout
    worksheet.pageSetup = {
      paperSize: 9, // A4
      orientation: "landscape",
      margins: {
        left: 0.5,
        right: 0.5,
        top: 0.5,
        bottom: 0.5,
        header: 0.3,
        footer: 0.3,
      },
    }

    // School header
    worksheet.mergeCells("A1:Z3")
    const headerCell = worksheet.getCell("A1")
    headerCell.value = `${schoolName}\n${branchName}\nATTENDANCE SHEET`
    headerCell.alignment = { horizontal: "center", vertical: "middle" }
    headerCell.font = { bold: true, size: 14 }

    // Class info row
    worksheet.getCell("A5").value = `Grade: ${classInfo?.name || ""}`
    worksheet.getCell("A6").value = `Section: ${classInfo?.section || ""}`

    // Teacher and academic year info
    worksheet.getCell("M5").value = `Home-room Teacher's Name: ${homeRoomTeacher || ""}`
    worksheet.getCell("M6").value = `Academic Year: ${year}E.C`
    worksheet.getCell("S6").value = `Month: ${format(new Date(year, month - 1), "MMMM")}`

    // Headers row
    const headerRow = 8
    worksheet.getCell(`A${headerRow}`).value = "S/No"
    worksheet.getCell(`B${headerRow}`).value = "Student's Name"
    worksheet.getCell(`C${headerRow}`).value = "Sex"
    worksheet.getCell(`D${headerRow}`).value = "Id Number"

    // Week headers
    const weekHeaders = ["First Week", "Second Week", "Third Week", "Fourth Week", "Fifth Week"]
    let currentCol = 5 // Column E

    // Group working days by weeks
    const weekGroups: Date[][] = [[], [], [], [], []]
    attendanceData.workingDays.forEach((date) => {
      const weekNum = this.getWeekNumberInMonth(date) - 1
      if (weekNum >= 0 && weekNum < 5) {
        weekGroups[weekNum].push(date)
      }
    })

    const getAbbreviatedDayName = (date: Date) => {
      const dayNames = ["Su", "M", "T", "W", "Th", "F", "Sa"]
      return dayNames[date.getDay()]
    }

    // Add week headers and day numbers
    weekGroups.forEach((week, weekIndex) => {
      if (week.length > 0) {
        const startCol = currentCol
        const endCol = currentCol + week.length - 1

        // Week header
        worksheet.mergeCells(headerRow - 1, startCol, headerRow - 1, endCol)
        const weekCell = worksheet.getCell(headerRow - 1, startCol)
        weekCell.value = weekHeaders[weekIndex]
        weekCell.alignment = { horizontal: "center" }
        weekCell.font = { bold: true }

        week.forEach((date, dayIndex) => {
          const dayCell = worksheet.getCell(headerRow, startCol + dayIndex)
          const dayName = getAbbreviatedDayName(date)
          const dayNumber = date.getDate()
          dayCell.value = `${dayName}\n${dayNumber}`
          dayCell.alignment = { horizontal: "center", wrapText: true }
        })

        currentCol += week.length
      }
    })

    // Summary columns
    const summaryStartCol = currentCol
    worksheet.getCell(headerRow, summaryStartCol).value = "P"
    worksheet.getCell(headerRow, summaryStartCol + 1).value = "A"
    worksheet.getCell(headerRow, summaryStartCol + 2).value = "L"
    worksheet.getCell(headerRow, summaryStartCol + 3).value = "Total"

    // Student data rows
    attendanceData.students.forEach((student, index) => {
      const rowNum = headerRow + 1 + index

      // Basic student info
      worksheet.getCell(`A${rowNum}`).value = index + 1
      worksheet.getCell(`B${rowNum}`).value = `${student.firstName} ${student.lastName}`
      worksheet.getCell(`C${rowNum}`).value = student.gender === "MALE" ? "M" : student.gender === "FEMALE" ? "F" : ""
      worksheet.getCell(`D${rowNum}`).value = student.studentId

      // Attendance marks
      let colIndex = 5
      let presentCount = 0
      let absentCount = 0
      let lateCount = 0

      weekGroups.forEach((week) => {
        week.forEach((date) => {
          const dateKey = format(date, "yyyy-MM-dd")
          const status = student.attendance[dateKey]
          const cell = worksheet.getCell(rowNum, colIndex)

          switch (status) {
            case "PRESENT":
              cell.value = "✓"
              presentCount++
              break
            case "ABSENT":
              cell.value = "✗"
              absentCount++
              break
            case "LATE":
              cell.value = "L"
              lateCount++
              break
            case "EXCUSED":
              cell.value = "E"
              break
            default:
              cell.value = ""
          }

          cell.alignment = { horizontal: "center" }
          colIndex++
        })
      })

      // Summary counts
      worksheet.getCell(rowNum, summaryStartCol).value = presentCount
      worksheet.getCell(rowNum, summaryStartCol + 1).value = absentCount
      worksheet.getCell(rowNum, summaryStartCol + 2).value = lateCount
      worksheet.getCell(rowNum, summaryStartCol + 3).value = presentCount + absentCount + lateCount
    })

    // Apply borders to the table
    const lastRow = headerRow + attendanceData.students.length
    const lastCol = summaryStartCol + 3

    for (let row = headerRow; row <= lastRow; row++) {
      for (let col = 1; col <= lastCol; col++) {
        const cell = worksheet.getCell(row, col)
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        }
      }
    }

    // Set column widths
    worksheet.getColumn(1).width = 6 // S/No
    worksheet.getColumn(2).width = 25 // Student's Name
    worksheet.getColumn(3).width = 6 // Sex
    worksheet.getColumn(4).width = 15 // Id Number

    // Day columns
    for (let i = 5; i < summaryStartCol; i++) {
      worksheet.getColumn(i).width = 4
    }

    // Summary columns
    for (let i = summaryStartCol; i <= lastCol; i++) {
      worksheet.getColumn(i).width = 6
    }

    // Footer
    const footerRow = lastRow + 2
    worksheet.getCell(`A${footerRow}`).value = '"P" for present and "A" for late'
    worksheet.getCell(`A${footerRow + 1}`).value = `Page 1 of 1`

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(buffer)
  }
}

// import { PrismaClient, type AttendanceStatus, type AttendanceSession, type AttendanceRecord } from "@prisma/client"
// import { startOfMonth, endOfMonth, eachDayOfInterval, format, getDay, startOfWeek } from "date-fns"
// import * as ExcelJS from "exceljs"

// const prisma = new PrismaClient()

// export interface AttendanceSessionWithRecords extends AttendanceSession {
//   records: (AttendanceRecord & {
//     student: {
//       id: string
//       studentId: string
//       user: {
//         firstName: string
//         lastName: string
//       }
//       gender: string | null
//     }
//   })[]
//   class: {
//     id: string
//     name: string
//     section: string | null
//   }
// }

// export interface MonthlyAttendanceData {
//   classId: string
//   className: string
//   month: number
//   year: number
//   workingDays: Date[]
//   students: {
//     id: string
//     studentId: string
//     firstName: string
//     lastName: string
//     gender: string | null
//     attendance: {
//       [date: string]: AttendanceStatus | null
//     }
//   }[]
// }

// export class AttendanceService {
//   // Get working days for a month (excluding Sundays)
//   static getWorkingDaysForMonth(year: number, month: number): Date[] {
//     const start = startOfMonth(new Date(year, month - 1))
//     const end = endOfMonth(new Date(year, month - 1))
//     const allDays = eachDayOfInterval({ start, end })

//     // Filter out Sundays (getDay() returns 0 for Sunday)
//     return allDays.filter((day) => getDay(day) !== 0)
//   }

//   // Get week number within the month (1-5)
//   static getWeekNumberInMonth(date: Date): number {
//     const startOfMonthDate = startOfMonth(date)
//     const startOfFirstWeek = startOfWeek(startOfMonthDate, { weekStartsOn: 1 }) // Monday as start
//     const weeksDiff = Math.floor((date.getTime() - startOfFirstWeek.getTime()) / (7 * 24 * 60 * 60 * 1000))
//     return Math.min(weeksDiff + 1, 5) // Cap at 5 weeks
//   }

//   // Create or get attendance session for a specific date and class
//   static async createOrGetSession(classId: string, date: Date): Promise<AttendanceSession> {
//     const sessionDate = new Date(date)
//     sessionDate.setHours(0, 0, 0, 0)

//     const existingSession = await prisma.attendanceSession.findUnique({
//       where: {
//         classId_date: {
//           classId,
//           date: sessionDate,
//         },
//       },
//     })

//     if (existingSession) {
//       return existingSession
//     }

//     const month = sessionDate.getMonth() + 1
//     const year = sessionDate.getFullYear()
//     const weekNumber = this.getWeekNumberInMonth(sessionDate)

//     return await prisma.attendanceSession.create({
//       data: {
//         classId,
//         date: sessionDate,
//         month,
//         year,
//         weekNumber,
//       },
//     })
//   }

//   // Mark attendance for a student
//   static async markAttendance(
//     sessionId: string,
//     studentId: string,
//     status: AttendanceStatus,
//     notes?: string,
//     markedBy?: string,
//   ): Promise<AttendanceRecord> {
//     return await prisma.attendanceRecord.upsert({
//       where: {
//         sessionId_studentId: {
//           sessionId,
//           studentId,
//         },
//       },
//       update: {
//         status,
//         notes,
//         markedBy,
//         updatedAt: new Date(),
//       },
//       create: {
//         sessionId,
//         studentId,
//         status,
//         notes,
//         markedBy,
//       },
//     })
//   }

//   // Bulk mark attendance for multiple students
//   static async bulkMarkAttendance(
//     sessionId: string,
//     attendanceData: Array<{
//       studentId: string
//       status: AttendanceStatus
//       notes?: string
//     }>,
//     markedBy?: string,
//   ): Promise<AttendanceRecord[]> {
//     const results = await Promise.all(
//       attendanceData.map((data) => this.markAttendance(sessionId, data.studentId, data.status, data.notes, markedBy)),
//     )
//     return results
//   }

//   // Get attendance session with records
//   static async getSessionWithRecords(sessionId: string): Promise<AttendanceSessionWithRecords | null> {
//     return await prisma.attendanceSession.findUnique({
//       where: { id: sessionId },
//       include: {
//         class: {
//           select: {
//             id: true,
//             name: true,
//             section: true,
//           },
//         },
//         records: {
//           include: {
//             student: {
//               select: {
//                 id: true,
//                 studentId: true,
//                 gender: true,
//                 user: {
//                   select: {
//                     firstName: true,
//                     lastName: true,
//                   },
//                 },
//               },
//             },
//           },
//           orderBy: [{ student: { user: { firstName: "asc" } } }, { student: { user: { lastName: "asc" } } }],
//         },
//       },
//     })
//   }

//   // Get monthly attendance data for a class
//   static async getMonthlyAttendance(classId: string, year: number, month: number): Promise<MonthlyAttendanceData> {
//     // Get class info
//     const classInfo = await prisma.class.findUnique({
//       where: { id: classId },
//       select: { id: true, name: true, section: true },
//     })

//     if (!classInfo) {
//       throw new Error("Class not found")
//     }

//     // Get working days for the month
//     const workingDays = this.getWorkingDaysForMonth(year, month)

//     // Get all students in the class
//     const enrollments = await prisma.enrollment.findMany({
//       where: {
//         classId,
//         status: "ACTIVE",
//       },
//       include: {
//         student: {
//           select: {
//             id: true,
//             studentId: true,
//             gender: true,
//             user: {
//               select: {
//                 firstName: true,
//                 lastName: true,
//               },
//             },
//           },
//         },
//       },
//       orderBy: [{ student: { user: { firstName: "asc" } } }, { student: { user: { lastName: "asc" } } }],
//     })

//     // Get all attendance sessions for the month
//     const sessions = await prisma.attendanceSession.findMany({
//       where: {
//         classId,
//         year,
//         month,
//       },
//       include: {
//         records: true,
//       },
//     })

//     // Build attendance map
//     const attendanceMap: { [studentId: string]: { [date: string]: AttendanceStatus } } = {}

//     sessions.forEach((session) => {
//       const dateKey = format(session.date, "yyyy-MM-dd")
//       session.records.forEach((record) => {
//         if (!attendanceMap[record.studentId]) {
//           attendanceMap[record.studentId] = {}
//         }
//         attendanceMap[record.studentId][dateKey] = record.status
//       })
//     })

//     // Format student data with attendance
//     const students = enrollments.map((enrollment) => ({
//       id: enrollment.student.id,
//       studentId: enrollment.student.studentId,
//       firstName: enrollment.student.user.firstName,
//       lastName: enrollment.student.user.lastName,
//       gender: enrollment.student.gender,
//       attendance: workingDays.reduce(
//         (acc, date) => {
//           const dateKey = format(date, "yyyy-MM-dd")
//           acc[dateKey] = attendanceMap[enrollment.student.id]?.[dateKey] || null
//           return acc
//         },
//         {} as { [date: string]: AttendanceStatus | null },
//       ),
//     }))

//     return {
//       classId,
//       className: `${classInfo.name}${classInfo.section ? ` - ${classInfo.section}` : ""}`,
//       month,
//       year,
//       workingDays,
//       students,
//     }
//   }

//   // Get attendance sessions for a class within a date range
//   static async getSessionsByDateRange(
//     classId: string,
//     startDate: Date,
//     endDate: Date,
//   ): Promise<AttendanceSessionWithRecords[]> {
//     return await prisma.attendanceSession.findMany({
//       where: {
//         classId,
//         date: {
//           gte: startDate,
//           lte: endDate,
//         },
//       },
//       include: {
//         class: {
//           select: {
//             id: true,
//             name: true,
//             section: true,
//           },
//         },
//         records: {
//           include: {
//             student: {
//               select: {
//                 id: true,
//                 studentId: true,
//                 gender: true,
//                 user: {
//                   select: {
//                     firstName: true,
//                     lastName: true,
//                   },
//                 },
//               },
//             },
//           },
//           orderBy: [{ student: { user: { firstName: "asc" } } }, { student: { user: { lastName: "asc" } } }],
//         },
//       },
//       orderBy: { date: "asc" },
//     })
//   }

//   // Get attendance statistics for a class
//   static async getAttendanceStats(classId: string, year: number, month: number) {
//     const sessions = await prisma.attendanceSession.findMany({
//       where: {
//         classId,
//         year,
//         month,
//       },
//       include: {
//         records: true,
//       },
//     })

//     const totalSessions = sessions.length
//     const totalRecords = sessions.reduce((sum, session) => sum + session.records.length, 0)

//     const statusCounts = sessions.reduce(
//       (acc, session) => {
//         session.records.forEach((record) => {
//           acc[record.status] = (acc[record.status] || 0) + 1
//         })
//         return acc
//       },
//       {} as { [key in AttendanceStatus]: number },
//     )

//     const attendanceRate = totalRecords > 0 ? ((statusCounts.PRESENT || 0) / totalRecords) * 100 : 0

//     return {
//       totalSessions,
//       totalRecords,
//       statusCounts,
//       attendanceRate: Math.round(attendanceRate * 100) / 100,
//     }
//   }

//   // Export monthly attendance data to Excel
//   static async exportMonthlyAttendanceToExcel(
//     classId: string,
//     year: number,
//     month: number,
//     schoolName = "YEKA MICHAEL SCHOOLS",
//     branchName = "WOSSEN BRANCH",
//     homeRoomTeacher?: string,
//   ): Promise<Buffer> {
//     // Get monthly attendance data
//     const attendanceData = await this.getMonthlyAttendance(classId, year, month)

//     // Get class details
//     const classInfo = await prisma.class.findUnique({
//       where: { id: classId },
//       select: {
//         name: true,
//         section: true,
//         branch: {
//           select: {
//             name: true,
//             school: {
//               select: {
//                 name: true,
//               },
//             },
//           },
//         },
//       },
//     })

//     // Create workbook and worksheet
//     const workbook = new ExcelJS.Workbook()
//     const worksheet = workbook.addWorksheet("Attendance Sheet")

//     // Set up page layout
//     worksheet.pageSetup = {
//       paperSize: 9, // A4
//       orientation: "landscape",
//       margins: {
//         left: 0.5,
//         right: 0.5,
//         top: 0.5,
//         bottom: 0.5,
//         header: 0.3,
//         footer: 0.3,
//       },
//     }

//     // School header
//     worksheet.mergeCells("A1:Z3")
//     const headerCell = worksheet.getCell("A1")
//     headerCell.value = `${schoolName}\n${branchName}\nATTENDANCE SHEET`
//     headerCell.alignment = { horizontal: "center", vertical: "middle" }
//     headerCell.font = { bold: true, size: 14 }

//     // Class info row
//     worksheet.getCell("A5").value = `Grade: ${classInfo?.name || ""}`
//     worksheet.getCell("A6").value = `Section: ${classInfo?.section || ""}`

//     // Teacher and academic year info
//     worksheet.getCell("M5").value = `Home-room Teacher's Name: ${homeRoomTeacher || ""}`
//     worksheet.getCell("M6").value = `Academic Year: ${year}E.C`
//     worksheet.getCell("S6").value = `Month: ${format(new Date(year, month - 1), "MMMM")}`

//     // Headers row
//     const headerRow = 8
//     worksheet.getCell(`A${headerRow}`).value = "S/No"
//     worksheet.getCell(`B${headerRow}`).value = "Student's Name"
//     worksheet.getCell(`C${headerRow}`).value = "Sex"
//     worksheet.getCell(`D${headerRow}`).value = "Id Number"

//     // Week headers
//     const weekHeaders = ["First Week", "Second Week", "Third Week", "Fourth Week", "Fifth Week"]
//     let currentCol = 5 // Column E

//     // Group working days by weeks
//     const weekGroups: Date[][] = [[], [], [], [], []]
//     attendanceData.workingDays.forEach((date) => {
//       const weekNum = this.getWeekNumberInMonth(date) - 1
//       if (weekNum >= 0 && weekNum < 5) {
//         weekGroups[weekNum].push(date)
//       }
//     })

//     // Add week headers and day numbers
//     weekGroups.forEach((week, weekIndex) => {
//       if (week.length > 0) {
//         const startCol = currentCol
//         const endCol = currentCol + week.length - 1

//         // Week header
//         worksheet.mergeCells(headerRow - 1, startCol, headerRow - 1, endCol)
//         const weekCell = worksheet.getCell(headerRow - 1, startCol)
//         weekCell.value = weekHeaders[weekIndex]
//         weekCell.alignment = { horizontal: "center" }
//         weekCell.font = { bold: true }

//         // Day numbers
//         week.forEach((date, dayIndex) => {
//           const dayCell = worksheet.getCell(headerRow, startCol + dayIndex)
//           dayCell.value = date.getDate()
//           dayCell.alignment = { horizontal: "center" }
//         })

//         currentCol += week.length
//       }
//     })

//     // Summary columns
//     const summaryStartCol = currentCol
//     worksheet.getCell(headerRow, summaryStartCol).value = "P"
//     worksheet.getCell(headerRow, summaryStartCol + 1).value = "A"
//     worksheet.getCell(headerRow, summaryStartCol + 2).value = "L"
//     worksheet.getCell(headerRow, summaryStartCol + 3).value = "Total"

//     // Student data rows
//     attendanceData.students.forEach((student, index) => {
//       const rowNum = headerRow + 1 + index

//       // Basic student info
//       worksheet.getCell(`A${rowNum}`).value = index + 1
//       worksheet.getCell(`B${rowNum}`).value = `${student.firstName} ${student.lastName}`
//       worksheet.getCell(`C${rowNum}`).value = student.gender === "MALE" ? "M" : student.gender === "FEMALE" ? "F" : ""
//       worksheet.getCell(`D${rowNum}`).value = student.studentId

//       // Attendance marks
//       let colIndex = 5
//       let presentCount = 0
//       let absentCount = 0
//       let lateCount = 0

//       weekGroups.forEach((week) => {
//         week.forEach((date) => {
//           const dateKey = format(date, "yyyy-MM-dd")
//           const status = student.attendance[dateKey]
//           const cell = worksheet.getCell(rowNum, colIndex)

//           switch (status) {
//             case "PRESENT":
//               cell.value = "✓"
//               presentCount++
//               break
//             case "ABSENT":
//               cell.value = "✗"
//               absentCount++
//               break
//             case "LATE":
//               cell.value = "L"
//               lateCount++
//               break
//             case "EXCUSED":
//               cell.value = "E"
//               break
//             default:
//               cell.value = ""
//           }

//           cell.alignment = { horizontal: "center" }
//           colIndex++
//         })
//       })

//       // Summary counts
//       worksheet.getCell(rowNum, summaryStartCol).value = presentCount
//       worksheet.getCell(rowNum, summaryStartCol + 1).value = absentCount
//       worksheet.getCell(rowNum, summaryStartCol + 2).value = lateCount
//       worksheet.getCell(rowNum, summaryStartCol + 3).value = presentCount + absentCount + lateCount
//     })

//     // Apply borders to the table
//     const lastRow = headerRow + attendanceData.students.length
//     const lastCol = summaryStartCol + 3

//     for (let row = headerRow; row <= lastRow; row++) {
//       for (let col = 1; col <= lastCol; col++) {
//         const cell = worksheet.getCell(row, col)
//         cell.border = {
//           top: { style: "thin" },
//           left: { style: "thin" },
//           bottom: { style: "thin" },
//           right: { style: "thin" },
//         }
//       }
//     }

//     // Set column widths
//     worksheet.getColumn(1).width = 6 // S/No
//     worksheet.getColumn(2).width = 25 // Student's Name
//     worksheet.getColumn(3).width = 6 // Sex
//     worksheet.getColumn(4).width = 15 // Id Number

//     // Day columns
//     for (let i = 5; i < summaryStartCol; i++) {
//       worksheet.getColumn(i).width = 4
//     }

//     // Summary columns
//     for (let i = summaryStartCol; i <= lastCol; i++) {
//       worksheet.getColumn(i).width = 6
//     }

//     // Footer
//     const footerRow = lastRow + 2
//     worksheet.getCell(`A${footerRow}`).value = '"P" for present and "A" for late'
//     worksheet.getCell(`A${footerRow + 1}`).value = `Page 1 of 1`

//     // Generate buffer
//     const buffer = await workbook.xlsx.writeBuffer()
//     return Buffer.from(buffer)
//   }
// }
