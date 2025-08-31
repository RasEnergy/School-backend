import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SearchParentParams {
  phone?: string
  email?: string
  user: any
}

export class ParentService {
  async searchParent({ phone, email, user }: SearchParentParams) {
    const whereClause: any = {
      role: "PARENT",
      isActive: true,
    }

    // if (user.role !== "SUPER_ADMIN" && user.schoolId) {
    //   whereClause.schoolId = user.schoolId;
    // }

    const normalizedPhone = phone ? phone.replace(/[^0-9]/g, "").slice(-9) : null

    if (normalizedPhone && email) {
      whereClause.OR = [{ phone: { endsWith: normalizedPhone } }, { email: email }]
    } else if (normalizedPhone) {
      whereClause.phone = { endsWith: normalizedPhone }
    } else if (email) {
      whereClause.email = email
    }

    const parentUser = await prisma.user.findFirst({
      where: whereClause,
      include: {
        parentProfile: {
          include: {
            children: {
              include: {
                student: {
                  include: {
                    user: {
                      select: {
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    })

    if (!parentUser || !parentUser.parentProfile) {
      return {
        found: false,
        message: "No parent found with the provided information",
      }
    }

    return {
      found: true,
      parent: {
        id: parentUser.parentProfile.id,
        user: {
          id: parentUser.id,
          firstName: parentUser.firstName,
          lastName: parentUser.lastName,
          email: parentUser.email,
          phone: parentUser.phone,
        },
        occupation: parentUser.parentProfile.occupation,
        workplace: parentUser.parentProfile.workplace,
        address: parentUser.parentProfile.address,
        photo: parentUser.parentProfile.photo,
        branch: parentUser.branch,
        children: parentUser.parentProfile.children.map((sp) => ({
          id: sp.student.id,
          studentId: sp.student.studentId,
          name: `${sp.student.user.firstName} ${sp.student.user.lastName}`,
          relationship: sp.relationship,
        })),
        createdAt: parentUser.parentProfile.createdAt,
      },
    }
  }
}
