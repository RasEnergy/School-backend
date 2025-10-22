import type { Request, Response } from "express"
import { enrollmentService } from "../services/enrollmentService"
import { ValidationError } from "@/utils/validation"

export class EnrollmentController {
  async createEnrollment(req: Request, res: Response) {
    try {
      const user = req.user
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" })
      }

      const { registrationId, classId } = req.body

      if (!registrationId || !classId) {
        return res.status(400).json({ error: "Missing required fields" })
      }

      const result = await enrollmentService.createEnrollment({
        registrationId,
        classId,
        userId: user.id,
      })

      res.json({
        message: "Student enrolled successfully",
        enrollment: result.enrollment,
        registration: result.updatedRegistration,
      })
    } catch (error) {
      console.error("Enrollment error:", error)

      if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message })
      }

      if (error instanceof Error) {
        // Handle known business logic errors
        if (error.message === "Registration not found" || error.message === "Class not found") {
          return res.status(404).json({ error: error.message })
        }

        if (
          error.message === "Student already enrolled" ||
          error.message === "Registration payment not completed" ||
          error.message === "No active academic year found"
        ) {
          return res.status(400).json({ error: error.message })
        }
      }

      res.status(500).json({ error: "Internal server error" })
    }
  }

  async unenrollStudent(req: Request, res: Response) {
    try {
      const user = req.user
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" })
      }

      const { registrationId } = req.body

      if (!registrationId) {
        return res.status(400).json({ error: "Missing registration ID" })
      }

      const result = await enrollmentService.unenrollStudent({
        registrationId,
        userId: user.id,
      })

      res.json({
        message: "Student unenrolled successfully",
        registration: result.updatedRegistration,
      })
    } catch (error) {
      console.error("Unenrollment error:", error)

      if (error instanceof Error) {
        if (error.message === "Registration not found" || error.message === "Student not enrolled") {
          return res.status(404).json({ error: error.message })
        }
      }

      res.status(500).json({ error: "Internal server error" })
    }
  }

  async getRegistrations(req: Request, res: Response) {
    try {
      const user = req.user
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" })
      }

      const { status, branchId, gradeId, page, limit } = req.query

      const result = await enrollmentService.getRegistrations(
        {
          status: status as string,
          branchId: branchId as string,
          gradeId: gradeId as string,
          page: page ? Number.parseInt(page as string) : undefined,
          limit: limit ? Number.parseInt(limit as string) : undefined,
        },
        user.role,
        user.branchId,
      )

      res.json(result)
    } catch (error) {
      console.error("Get registrations error:", error)

      if (error instanceof Error && error.message === "Access denied") {
        return res.status(403).json({ error: error.message })
      }

      res.status(500).json({ error: "Internal server error" })
    }
  }

  async getStats(req: Request, res: Response) {
    try {
      const user = req.user
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" })
      }

      const stats = await enrollmentService.getEnrollmentStats(user.role, user.branchId)

      res.json({
        success: true,
        data: { stats },
      })
    } catch (error) {
      console.error("Get stats error:", error)

      if (error instanceof Error && error.message === "Access denied") {
        return res.status(403).json({ error: error.message })
      }

      res.status(500).json({ error: "Internal server error" })
    }
  }

  async exportEnrolledStudents(req: Request, res: Response) {
    try {
      const user = req.user
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" })
      }

      const { gradeId } = req.query

      const csvData = await enrollmentService.exportEnrolledStudents({
        gradeId: gradeId as string,
        userRole: user.role,
        userBranchId: user.branchId,
      })

      res.setHeader("Content-Type", "text/csv")
      res.setHeader("Content-Disposition", 'attachment; filename="enrolled-students.csv"')
      res.send(csvData)
    } catch (error) {
      console.error("Export error:", error)

      if (error instanceof Error && error.message === "Access denied") {
        return res.status(403).json({ error: error.message })
      }

      res.status(500).json({ error: "Internal server error" })
    }
  }
}

export const enrollmentController = new EnrollmentController()

// import type { Request, Response } from "express";
// import { enrollmentService } from "../services/enrollmentService";
// import { ValidationError } from "@/utils/validation";

// export class EnrollmentController {
// 	async createEnrollment(req: Request, res: Response) {
// 		try {
// 			const user = req.user;
// 			if (!user) {
// 				return res.status(401).json({ error: "Unauthorized" });
// 			}

// 			const { registrationId, classId } = req.body;

// 			if (!registrationId || !classId) {
// 				return res.status(400).json({ error: "Missing required fields" });
// 			}

// 			const result = await enrollmentService.createEnrollment({
// 				registrationId,
// 				classId,
// 				userId: user.id,
// 			});

// 			res.json({
// 				message: "Student enrolled successfully",
// 				enrollment: result.enrollment,
// 				registration: result.updatedRegistration,
// 			});
// 		} catch (error) {
// 			console.error("Enrollment error:", error);

// 			if (error instanceof ValidationError) {
// 				return res.status(400).json({ error: error.message });
// 			}

// 			if (error instanceof Error) {
// 				// Handle known business logic errors
// 				if (
// 					error.message === "Registration not found" ||
// 					error.message === "Class not found"
// 				) {
// 					return res.status(404).json({ error: error.message });
// 				}

// 				if (
// 					error.message === "Student already enrolled" ||
// 					error.message === "Registration payment not completed" ||
// 					error.message === "No active academic year found"
// 				) {
// 					return res.status(400).json({ error: error.message });
// 				}
// 			}

// 			res.status(500).json({ error: "Internal server error" });
// 		}
// 	}

// 	async getRegistrations(req: Request, res: Response) {
// 		try {
// 			const user = req.user;
// 			if (!user) {
// 				return res.status(401).json({ error: "Unauthorized" });
// 			}

// 			const { status, branchId, page, limit } = req.query;

// 			const result = await enrollmentService.getRegistrations(
// 				{
// 					status: status as string,
// 					branchId: branchId as string,
// 					page: page ? Number.parseInt(page as string) : undefined,
// 					limit: limit ? Number.parseInt(limit as string) : undefined,
// 				},
// 				user.role,
// 				user.branchId
// 			);

// 			res.json(result);
// 		} catch (error) {
// 			console.error("Get registrations error:", error);

// 			if (error instanceof Error && error.message === "Access denied") {
// 				return res.status(403).json({ error: error.message });
// 			}

// 			res.status(500).json({ error: "Internal server error" });
// 		}
// 	}
// }

// export const enrollmentController = new EnrollmentController();
