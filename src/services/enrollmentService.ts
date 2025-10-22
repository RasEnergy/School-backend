import { prisma } from "@/config/database"
import { validateClassCapacity } from "@/utils/validation"
// import { smsService } from "../lib/sms";

export interface CreateEnrollmentData {
  registrationId: string
  classId: string
  userId: string
}

export interface UnenrollStudentData {
  registrationId: string
  userId: string
}

export interface GetRegistrationsQuery {
  status?: string
  branchId?: string
  gradeId?: string
  page?: number
  limit?: number
}

export interface ExportQuery {
  gradeId?: string
  userRole: string
  userBranchId?: string
}

export class EnrollmentService {
  async createEnrollment(data: CreateEnrollmentData) {
    const { registrationId, classId, userId } = data

    // Get registration details
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        student: {
          include: {
            user: true,
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
        },
        branch: true,
      },
    })

    if (!registration) {
      console.log("Registration not found for ID:", registrationId)
      throw new Error("Registration not found")
    }

    if (registration.status === "ENROLLED") {
      console.log("Student already enrolled for registration ID:", registrationId)  
      throw new Error("Student already enrolled")
    }

    if (registration.status !== "PAYMENT_COMPLETED") {
      console.log("Registration payment not completed for ID:", registrationId)
      throw new Error("Registration payment not completed")
    }

    // Get active academic year
    const activeAcademicYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
    })

    if (!activeAcademicYear) {
      throw new Error("No active academic year found")
    }

    // Validate class capacity
    await validateClassCapacity(classId, 1)

    // Get class details
    const classDetails = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        grade: true,
        branch: true,
      },
    })

    if (!classDetails) {
      throw new Error("Class not found")
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update student admission date
      await tx.student.update({
        where: { id: registration.studentId },
        data: {
          admissionDate: new Date(),
        },
      })

      // Create enrollment record
      const enrollment = await tx.enrollment.create({
        data: {
          studentId: registration.studentId,
          classId,
          branchId: registration.branchId,
          academicYearId: activeAcademicYear.id,
          enrollmentDate: new Date(),
          status: "ACTIVE",
        },
      })

      // Update registration status
      const updatedRegistration = await tx.registration.update({
        where: { id: registrationId },
        data: {
          status: "ENROLLED",
          enrolledAt: new Date(),
          enrolledById: userId,
        },
      })

      return { enrollment, updatedRegistration }
    })

    // Send SMS notification to parent
    const parentPhone = registration.student.parents[0]?.parent.user.phone
    // if (parentPhone) {
    // 	try {
    // 		await smsService.sendEnrollmentConfirmation(
    // 			parentPhone,
    // 			`${registration.student.user.firstName} ${registration.student.user.lastName}`,
    // 			registration.student.studentId,
    // 			`${classDetails.name}${
    // 				classDetails.section ? ` - Section ${classDetails.section}` : ""
    // 			}`
    // 		);
    // 	} catch (error) {
    // 		console.error("SMS sending failed:", error);
    // 		// Don't fail the enrollment if SMS fails
    // 	}
    // }

    return result
  }

  async unenrollStudent(data: UnenrollStudentData) {
    const { registrationId, userId } = data

    // Get registration details
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        student: {
          include: {
            user: true,
          },
        },
      },
    })

    console.log("Unenroll registration:", registration)

    if (!registration) {
      throw new Error("Registration not found")
    }

    if (registration.status !== "ENROLLED") {
      throw new Error("Student not enrolled")
    }

    const result = await prisma.$transaction(async (tx) => {
      // Find and delete the enrollment record
      const enrollment = await tx.enrollment.findFirst({
        where: {
          studentId: registration.studentId,
          status: "ACTIVE",
        },
      })

      console.log("Found enrollment for unenrollment:", enrollment) 

      if (enrollment) {
        await tx.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "INACTIVE",
            // unenrolledAt: new Date(),
            updatedAt: new Date(),
          },
        })
      }

      // Update registration status back to PAYMENT_COMPLETED
      const updatedRegistration = await tx.registration.update({
        where: { id: registrationId },
        data: {
          status: "PAYMENT_COMPLETED",
          enrolledAt: null,
          enrolledById: null,
        },
      })

      console.log("Unenrollment completed for registration ID:", registrationId)

      return { updatedRegistration }
    })

    return result
  }

  async getRegistrations(query: GetRegistrationsQuery, userRole: string, userBranchId?: string) {
    const { status, branchId, gradeId, page = 1, limit = 10 } = query

    const where: any = {}

    // Branch filtering
    if (userRole !== "SUPER_ADMIN") {
      if (branchId && userBranchId === branchId) {
        where.branchId = branchId
      } else if (userBranchId) {
        where.branchId = userBranchId
      } else {
        throw new Error("Access denied")
      }
    } else if (branchId) {
      where.branchId = branchId
    }

    if (status) where.status = status

    if (gradeId) {
      where.student = {
        gradeId: gradeId,
      }
    }

    const [registrations, total] = await Promise.all([
      prisma.registration.findMany({
        where,
        include: {
          student: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
              parents: {
                include: {
                  parent: {
                    include: {
                      user: {
                        select: {
                          firstName: true,
                          lastName: true,
                          phone: true,
                        },
                      },
                    },
                  },
                },
              },
              grade: {
                include: {
                  classes: {
                    select: {
                      id: true,
                      name: true,
                      section: true,
                    },
                  },
                },
              },
              // grade: {
              //   select: {
              //     id: true,
              //     name: true,
              //   },
              //   include: {
              //     classes: { select: { id: true, name: true, section: true }}
              //   },
              // },
            },
          },
          branch: {
            select: {
              name: true,
              code: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.registration.count({ where }),
    ])

    return {
      registrations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  async getEnrollmentStats(userRole: string, userBranchId?: string) {
    const where: any = {}

    // Apply same branch filtering as getRegistrations
    if (userRole !== "SUPER_ADMIN") {
      if (userBranchId) {
        where.branchId = userBranchId
      } else {
        throw new Error("Access denied")
      }
    }

    const [pendingPayment, readyForEnrollment, enrolled, totalRegistrations] = await Promise.all([
      prisma.registration.count({
        where: { ...where, status: "PENDING_PAYMENT" },
      }),
      prisma.registration.count({
        where: { ...where, status: "PAYMENT_COMPLETED" },
      }),
      prisma.registration.count({
        where: { ...where, status: "ENROLLED" },
      }),
      prisma.registration.count({ where }),
    ])

    return {
      pendingPayment,
      readyForEnrollment,
      enrolled,
      totalRegistrations,
    }
  }

  async exportEnrolledStudents(query: ExportQuery) {
    const { gradeId, userRole, userBranchId } = query
	console.log("Export query:", query)

    const where: any = {
      status: "ENROLLED",
    }

    // Apply branch filtering
    if (userRole !== "SUPER_ADMIN") {
      if (userBranchId) {
        where.branchId = userBranchId
      } else {
        throw new Error("Access denied")
      }
    }

    // Apply grade filtering
    if (gradeId) {
      where.student = {
        gradeId: gradeId,
      }
    }

    const enrolledStudents = await prisma.registration.findMany({
      where,
      include: {
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            grade: {
              select: {
                name: true,
              },
            },
            enrollments: {
              where: {
                status: "ACTIVE",
              },
              include: {
                class: {
                  select: {
                    name: true,
                    section: true,
                  },
                },
              },
            },
          },
        },
        branch: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: [{ student: { grade: { name: "asc" } } }, { student: { user: { firstName: "asc" } } }],
    })

    // Generate CSV content
    const headers = [
      "Student ID",
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Grade",
      "Class",
      "Section",
      "Branch",
      "Registration Number",
      "Enrollment Date",
    ]

    const csvRows = [headers.join(",")]

    enrolledStudents.forEach((registration) => {
      const student = registration.student
      const enrollment = student.enrollments[0] // Get active enrollment
      const classInfo = enrollment?.class

      const row = [
        student.studentId,
        student.user.firstName,
        student.user.lastName,
        student.user.email || "",
        student.user.phone || "",
        student.grade?.name || "",
        classInfo?.name || "",
        classInfo?.section || "",
        registration.branch.name,
        registration.registrationNumber,
        registration.enrolledAt ? new Date(registration.enrolledAt).toLocaleDateString() : "",
      ]

      csvRows.push(row.map((field) => `"${field}"`).join(","))
    })

    return csvRows.join("\n")
  }
}

export const enrollmentService = new EnrollmentService()

// import { prisma } from "@/config/database";
// import { validateClassCapacity } from "@/utils/validation";
// // import { smsService } from "../lib/sms";

// export interface CreateEnrollmentData {
// 	registrationId: string;
// 	classId: string;
// 	userId: string;
// }

// export interface GetRegistrationsQuery {
// 	status?: string;
// 	branchId?: string;
// 	page?: number;
// 	limit?: number;
// }

// export class EnrollmentService {
// 	async createEnrollment(data: CreateEnrollmentData) {
// 		const { registrationId, classId, userId } = data;

// 		// Get registration details
// 		const registration = await prisma.registration.findUnique({
// 			where: { id: registrationId },
// 			include: {
// 				student: {
// 					include: {
// 						user: true,
// 						parents: {
// 							include: {
// 								parent: {
// 									include: {
// 										user: true,
// 									},
// 								},
// 							},
// 						},
// 					},
// 				},
// 				branch: true,
// 			},
// 		});

// 		if (!registration) {
// 			throw new Error("Registration not found");
// 		}

// 		if (registration.status === "ENROLLED") {
// 			throw new Error("Student already enrolled");
// 		}

// 		if (registration.status !== "PAYMENT_COMPLETED") {
// 			throw new Error("Registration payment not completed");
// 		}

// 		// Get active academic year
// 		const activeAcademicYear = await prisma.academicYear.findFirst({
// 			where: { isActive: true },
// 		});

// 		if (!activeAcademicYear) {
// 			throw new Error("No active academic year found");
// 		}

// 		// Validate class capacity
// 		await validateClassCapacity(classId, 1);

// 		// Get class details
// 		const classDetails = await prisma.class.findUnique({
// 			where: { id: classId },
// 			include: {
// 				grade: true,
// 				branch: true,
// 			},
// 		});

// 		if (!classDetails) {
// 			throw new Error("Class not found");
// 		}

// 		const result = await prisma.$transaction(async (tx) => {
// 			// Update student admission date
// 			await tx.student.update({
// 				where: { id: registration.studentId },
// 				data: {
// 					admissionDate: new Date(),
// 				},
// 			});

// 			// Create enrollment record
// 			const enrollment = await tx.enrollment.create({
// 				data: {
// 					studentId: registration.studentId,
// 					classId,
// 					branchId: registration.branchId,
// 					academicYearId: activeAcademicYear.id,
// 					enrollmentDate: new Date(),
// 					status: "ACTIVE",
// 				},
// 			});

// 			// Update registration status
// 			const updatedRegistration = await tx.registration.update({
// 				where: { id: registrationId },
// 				data: {
// 					status: "ENROLLED",
// 					enrolledAt: new Date(),
// 					enrolledById: userId,
// 				},
// 			});

// 			return { enrollment, updatedRegistration };
// 		});

// 		// Send SMS notification to parent
// 		const parentPhone = registration.student.parents[0]?.parent.user.phone;
// 		// if (parentPhone) {
// 		// 	try {
// 		// 		await smsService.sendEnrollmentConfirmation(
// 		// 			parentPhone,
// 		// 			`${registration.student.user.firstName} ${registration.student.user.lastName}`,
// 		// 			registration.student.studentId,
// 		// 			`${classDetails.name}${
// 		// 				classDetails.section ? ` - Section ${classDetails.section}` : ""
// 		// 			}`
// 		// 		);
// 		// 	} catch (error) {
// 		// 		console.error("SMS sending failed:", error);
// 		// 		// Don't fail the enrollment if SMS fails
// 		// 	}
// 		// }

// 		return result;
// 	}

// 	async getRegistrations(
// 		query: GetRegistrationsQuery,
// 		userRole: string,
// 		userBranchId?: string
// 	) {
// 		const { status, branchId, page = 1, limit = 10 } = query;

// 		const where: any = {};

// 		// Branch filtering
// 		if (userRole !== "SUPER_ADMIN") {
// 			if (branchId && userBranchId === branchId) {
// 				where.branchId = branchId;
// 			} else if (userBranchId) {
// 				where.branchId = userBranchId;
// 			} else {
// 				throw new Error("Access denied");
// 			}
// 		} else if (branchId) {
// 			where.branchId = branchId;
// 		}

// 		if (status) where.status = status;

// 		const [registrations, total] = await Promise.all([
// 			prisma.registration.findMany({
// 				where,
// 				include: {
// 					student: {
// 						include: {
// 							user: {
// 								select: {
// 									firstName: true,
// 									lastName: true,
// 									email: true,
// 									phone: true,
// 								},
// 							},
// 							parents: {
// 								include: {
// 									parent: {
// 										include: {
// 											user: {
// 												select: {
// 													firstName: true,
// 													lastName: true,
// 													phone: true,
// 												},
// 											},
// 										},
// 									},
// 								},
// 							},
// 							grade: {
// 								select: {
// 									name: true,
// 								},
// 							},
// 						},
// 					},
// 					branch: {
// 						select: {
// 							name: true,
// 							code: true,
// 						},
// 					},
// 				},
// 				skip: (page - 1) * limit,
// 				take: limit,
// 				orderBy: { createdAt: "desc" },
// 			}),
// 			prisma.registration.count({ where }),
// 		]);

// 		return {
// 			registrations,
// 			pagination: {
// 				page,
// 				limit,
// 				total,
// 				pages: Math.ceil(total / limit),
// 			},
// 		};
// 	}
// }

// export const enrollmentService = new EnrollmentService();
