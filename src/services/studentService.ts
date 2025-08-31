import { prisma } from "@/config/database"
import type { StudentType, Gender } from "@prisma/client"
import bcrypt from "bcrypt"

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

export interface GetStudentsParams {
  branchId?: string
  classId?: string
  page?: number
  limit?: number
  search?: string
  userRole: string
  userBranchId?: string
}

export interface StudentRegistrationData {
  firstName: string
  lastName: string
  email: string
  phone?: string
  branchId: string
  gradeId: string
  studentType: string
  dateOfBirth?: string
  placeOfBirth?: string
  gender?: string
  nationality?: string
  bloodGroup?: string
  address?: string
  emergencyContact?: string
  paymentDuration: string
  existingStudentId?: string
}

export interface ParentRegistrationData {
  parentFirstName?: string
  parentLastName?: string
  parentEmail?: string
  parentPhone: string
  parentOccupation?: string
  parentWorkplace?: string
  parentAddress?: string
  relationship?: string
}

export interface PricingData {
  registrationFee: number
  additionalFee: number
  serviceFee: number
  totalAmount: number
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

export const getStudents = async (params: GetStudentsParams) => {
  const { branchId, classId, page = 1, limit = 10, search, userRole, userBranchId } = params

  // Build where clause
  const where: any = {
    isActive: true,
  }

  // Branch filtering based on user role
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

  // Class filtering
  if (classId) {
    where.enrollments = {
      some: {
        classId,
        status: "ACTIVE",
      },
    }
  }

  // Search filtering
  if (search) {
    where.OR = [
      { studentId: { contains: search, mode: "insensitive" } },
      { user: { firstName: { contains: search, mode: "insensitive" } } },
      { user: { lastName: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
    ]
  }

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        enrollments: {
          where: { status: "ACTIVE" },
          include: {
            class: {
              include: {
                grade: true,
              },
            },
            academicYear: true,
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
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.student.count({ where }),
  ])

  return {
    students,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }
}

export const generateStudentId = async (branchName: string): Promise<string> => {
  const prefix = "RSYM"
  const branchCode = branchName.substring(0, 2).toUpperCase()

  // Get the highest existing sequence number for this branch
  const existingStudents = await prisma.student.findMany({
    where: {
      studentId: {
        startsWith: `${prefix}${branchCode}`,
      },
    },
    select: {
      studentId: true,
    },
    orderBy: {
      studentId: "desc",
    },
  })

  let nextSequence = 1777 // Starting sequence number

  if (existingStudents.length > 0) {
    // Extract sequence numbers and find the highest
    const sequences = existingStudents
      .map((student) => {
        const match = student.studentId.match(new RegExp(`^${prefix}${branchCode}(\\d{4})$`))
        return match ? Number.parseInt(match[1], 10) : 0
      })
      .filter((seq) => seq > 0)

    if (sequences.length > 0) {
      nextSequence = Math.max(...sequences) + 1
    }
  }

  // Ensure sequence stays within 4-digit range (0000-9999)
  if (nextSequence > 9999) {
    nextSequence = 1777 // Reset to starting point if we exceed 9999
  }

  const studentId = `${prefix}${branchCode}${nextSequence.toString().padStart(4, "0")}`

  // Double-check uniqueness
  const existingStudent = await prisma.student.findUnique({
    where: { studentId },
  })

  if (existingStudent) {
    // If somehow this ID exists, try the next one
    return generateStudentId(branchName)
  }

  return studentId
}

export const registerStudent = async (
  studentData: StudentRegistrationData,
  parentData: ParentRegistrationData,
  pricingData: PricingData,
  studentPhotoUrl?: string,
  parentPhotoUrl?: string,
) => {
  // Get branch info
  const branch = await prisma.branch.findUnique({
    where: { id: studentData.branchId },
    include: { school: true },
  })

  if (!branch) {
    throw new Error("Branch not found")
  }

  // Get grade info
  const grade = await prisma.grade.findUnique({
    where: { id: studentData.gradeId },
  })

  if (!grade) {
    throw new Error("Grade not found")
  }

  // Verify pricing schema exists for this branch and grade
  const pricingSchema = await prisma.pricingSchema.findUnique({
    where: {
      branchId_gradeId: {
        branchId: studentData.branchId,
        gradeId: studentData.gradeId,
      },
      isActive: true,
    },
  })

  if (!pricingSchema) {
    throw new Error("Pricing schema not found for this branch and grade")
  }

  // Handle Regular Student Re-registration Flow
  let existingStudent = null
  if (studentData.existingStudentId && studentData.studentType === "REGULAR_STUDENT") {
    existingStudent = await prisma.student.findUnique({
      where: { studentId: studentData.existingStudentId },
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
        registration: true,
      },
    })

    if (!existingStudent) {
      throw new Error("Student ID not found")
    }

    // Check if student already has a pending or completed registration for current academic year
    const currentYear = new Date().getFullYear()
    const existingRegistration = await prisma.registration.findFirst({
      where: {
        studentId: existingStudent.id,
        createdAt: {
          gte: new Date(`${currentYear}-01-01`),
          lt: new Date(`${currentYear + 1}-01-01`),
        },
      },
    })

    if (existingRegistration) {
      throw new Error("Student already has a registration for this academic year")
    }
  }

  // For new students, validate unique email
  if (!existingStudent) {
    const existingStudentUser = await prisma.user.findUnique({
      where: { email: studentData.email },
    })

    if (existingStudentUser) {
      throw new Error("Student email already exists")
    }
  }

  const studentId = await generateStudentId(branch.name)
  const defaultPassword = await bcrypt.hash("student123", 10)

  const result = await prisma.$transaction(
    async (tx) => {
      let student: any = existingStudent
      let studentUser = existingStudent?.user

      // Create new student only if not existing (new student flow)
      if (!existingStudent) {
        // Create student user
        studentUser = await tx.user.create({
          data: {
            email: studentData.email,
            password: defaultPassword,
            firstName: studentData.firstName,
            lastName: studentData.lastName,
            phone: studentData.phone,
            role: "STUDENT",
            schoolId: branch.schoolId,
            branchId: studentData.branchId,
          },
        })

        student = await tx.student.create({
          data: {
            userId: studentUser.id,
            studentId,
            branchId: studentData.branchId,
            gradeId: studentData.gradeId,
            studentType: studentData.studentType as "REGULAR_STUDENT" | "NEW_STUDENT",
            dateOfBirth: studentData.dateOfBirth ? new Date(studentData.dateOfBirth) : null,
            placeOfBirth: studentData.placeOfBirth,
            gender: studentData.gender as "MALE" | "FEMALE" | null,
            nationality: studentData.nationality,
            bloodGroup: studentData.bloodGroup,
            address: studentData.address,
            emergencyContact: studentData.emergencyContact,
            photo: studentPhotoUrl,
            admissionDate: new Date(),
          },
          include: {
            user: true,
            registration: true,
            parents: true,
          },
        })
      } else {
        // Update existing student's grade for re-registration
        student = await tx.student.update({
          where: { id: existingStudent.id },
          data: {
            gradeId: studentData.gradeId,
            admissionDate: new Date(),
            branchId: studentData.branchId,
            studentType: "REGULAR_STUDENT",
            dateOfBirth: studentData.dateOfBirth ? new Date(studentData.dateOfBirth) : null,
            placeOfBirth: studentData.placeOfBirth,
            gender: studentData.gender as "MALE" | "FEMALE" | null,
            nationality: studentData.nationality,
            bloodGroup: studentData.bloodGroup,
            address: studentData.address,
            emergencyContact: studentData.emergencyContact,
            photo: studentPhotoUrl,
          },
          include: {
            user: true,
            registration: true,
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

      // Generate registration number
      const registrationCount = await tx.registration.count({
        where: { branchId: studentData.branchId },
      })
      const registrationNumber = `REG-${branch.code}-${new Date().getFullYear()}-${String(
        registrationCount + 1,
      ).padStart(4, "0")}`

      // Create registration record with payment due date (7 days from now)
      const paymentDueDate = new Date()
      paymentDueDate.setDate(paymentDueDate.getDate() + 7)

      if (!student || !student.id) {
        throw new Error("Student ID is missing when creating registration.")
      }

      const registration = await tx.registration.create({
        data: {
          studentId: student.id,
          branchId: studentData.branchId,
          gradeId: studentData.gradeId,
          registrationNumber,
          status: "PENDING_PAYMENT",
          registrationFee: pricingData.registrationFee,
          additionalFee: pricingData.additionalFee,
          serviceFee: pricingData.serviceFee,
          totalAmount: pricingData.totalAmount,
          paymentDuration: studentData.paymentDuration as any,
          paymentDueDate,
        },
      })

      // Handle parent creation/linking
      let parent = null
      if (parentData.parentPhone) {
        // Check if parent already exists by phone number
        const existingParentRelation = await tx.studentParent.findFirst({
          where: {
            parent: {
              user: {
                phone: parentData.parentPhone,
              },
            },
          },
          include: {
            parent: {
              include: {
                user: true,
              },
            },
          },
        })

        if (existingParentRelation) {
          // Use existing parent
          parent = existingParentRelation.parent

          // Update parent info if new data is provided
          if (parentData.parentFirstName || parentData.parentLastName || parentData.parentOccupation) {
            const updateData: any = {}
            const userUpdateData: any = {}

            if (parentData.parentFirstName) userUpdateData.firstName = parentData.parentFirstName
            if (parentData.parentLastName) userUpdateData.lastName = parentData.parentLastName
            if (parentData.parentOccupation) updateData.occupation = parentData.parentOccupation
            if (parentData.parentWorkplace) updateData.workplace = parentData.parentWorkplace
            if (parentData.parentAddress) updateData.address = parentData.parentAddress
            if (parentPhotoUrl) updateData.photo = parentPhotoUrl

            if (Object.keys(userUpdateData).length > 0) {
              await tx.user.update({
                where: { id: existingParentRelation.parent.user.id },
                data: userUpdateData,
              })
            }

            if (Object.keys(updateData).length > 0) {
              parent = await tx.parent.update({
                where: { id: parent.id },
                data: updateData,
              })
            }
          }
        } else if (parentData.parentFirstName && parentData.parentLastName) {
          // Create new parent
          const parentPassword = await bcrypt.hash("parent123", 10)
          const parentUser = await tx.user.create({
            data: {
              email: parentData.parentEmail || `${parentData.parentPhone}@temp.com`,
              password: parentPassword,
              firstName: parentData.parentFirstName,
              lastName: parentData.parentLastName,
              phone: parentData.parentPhone,
              role: "PARENT",
              schoolId: branch.schoolId,
              branchId: studentData.branchId,
            },
          })

          parent = await tx.parent.create({
            data: {
              userId: parentUser.id,
              occupation: parentData.parentOccupation,
              address: parentData.parentAddress,
              photo: parentPhotoUrl,
            },
          })
        }

        // Link student to parent (check if relationship already exists)
        if (parent) {
          const existingRelationship = await tx.studentParent.findUnique({
            where: {
              studentId_parentId: {
                studentId: student.id,
                parentId: parent.id,
              },
            },
          })

          if (!existingRelationship) {
            await tx.studentParent.create({
              data: {
                studentId: student.id,
                parentId: parent.id,
                relationship: (parentData.relationship?.toUpperCase() as any) || "OTHER",
              },
            })
          }
        }
      }

      return { student, studentUser, parent, registration }
    },
    { timeout: 15000 },
  )

  return result
}
