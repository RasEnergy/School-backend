import { Router } from "express"
import { AttendanceController } from "../controllers/attendanceController"
import { authenticate } from "../middleware/auth"
// import { requireRole } from "../middleware/authorize"

const router = Router()

// Apply authentication to all routes
router.use(authenticate)

// Create or get attendance session
router.post("/sessions", 
    // requireRole(["TEACHER", "BRANCH_ADMIN", "SUPER_ADMIN"]), 
    AttendanceController.createSession)

// Mark individual attendance
router.post("/mark", 
    // requireRole(["TEACHER", "BRANCH_ADMIN", "SUPER_ADMIN"]), 
    AttendanceController.markAttendance)

// Bulk mark attendance
router.post(
  "/bulk-mark",
//   requireRole(["TEACHER", "BRANCH_ADMIN", "SUPER_ADMIN"]),
  AttendanceController.bulkMarkAttendance,
)

// Get attendance session with records
router.get(
  "/sessions/:sessionId",
//   requireRole(["TEACHER", "BRANCH_ADMIN", "SUPER_ADMIN", "REGISTRAR"]),
  AttendanceController.getSession,
)

// Get monthly attendance for a class
router.get(
  "/classes/:classId/monthly",
//   requireRole(["TEACHER", "BRANCH_ADMIN", "SUPER_ADMIN", "REGISTRAR"]),
  AttendanceController.getMonthlyAttendance,
)

// Get attendance sessions by date range
router.get(
  "/classes/:classId/sessions",
//   requireRole(["TEACHER", "BRANCH_ADMIN", "SUPER_ADMIN", "REGISTRAR"]),
  AttendanceController.getSessionsByDateRange,
)

// Get attendance statistics
router.get(
  "/classes/:classId/stats",
//   requireRole(["TEACHER", "BRANCH_ADMIN", "SUPER_ADMIN", "REGISTRAR"]),
  AttendanceController.getAttendanceStats,
)

// Export monthly attendance to Excel
router.get(
  "/classes/:classId/export/excel",
//   requireRole(["TEACHER", "BRANCH_ADMIN", "SUPER_ADMIN", "REGISTRAR"]),
  AttendanceController.exportMonthlyAttendanceExcel,
)

export default router
