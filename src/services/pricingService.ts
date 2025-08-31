import { prisma } from "@/config/database"

interface CreatePricingSchemaData {
  schoolId: string
  branchId: string
  gradeId: string
  registrationFee: number
  monthlyFee: number
  serviceFee: number
}

export class PricingService {
  public async getPricingSchema(branchId: string, gradeId: string) {
    // Fetch pricing schema for the specific branch and grade
    const pricingSchema = await prisma.pricingSchema.findUnique({
      where: {
        branchId_gradeId: {
          branchId,
          gradeId,
        },
        isActive: true,
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        grade: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
      },
    })

    if (!pricingSchema) {
      return null
    }

    // Calculate payment options based on duration
    const paymentOptions = [
      {
        duration: "ONE_MONTH",
        label: "1 Month",
        months: 1,
        additionalFee: Number(pricingSchema.monthlyFee) * 1,
      },
      {
        duration: "TWO_MONTHS",
        label: "2 Months",
        months: 2,
        additionalFee: Number(pricingSchema.monthlyFee) * 2,
      },
      {
        duration: "QUARTER",
        label: "Quarter (2.5 Months)",
        months: 2.5,
        additionalFee: Number(pricingSchema.monthlyFee) * 2.5,
      },
      {
        duration: "THREE_MONTHS",
        label: "3 Months",
        months: 3,
        additionalFee: Number(pricingSchema.monthlyFee) * 3,
      },
      {
        duration: "FOUR_MONTHS",
        label: "4 Months",
        months: 4,
        additionalFee: Number(pricingSchema.monthlyFee) * 4,
      },
      {
        duration: "FIVE_MONTHS",
        label: "5 Months",
        months: 5,
        additionalFee: Number(pricingSchema.monthlyFee) * 5,
      },
      {
        duration: "TEN_MONTHS",
        label: "10 Months",
        months: 10,
        additionalFee: Number(pricingSchema.monthlyFee) * 10,
      },
    ]

    return {
      pricingSchema: {
        id: pricingSchema.id,
        registrationFee: Number(pricingSchema.registrationFee),
        monthlyFee: Number(pricingSchema.monthlyFee),
        serviceFee: Number(pricingSchema.serviceFee),
        branch: pricingSchema.branch,
        grade: pricingSchema.grade,
      },
      paymentOptions,
    }
  }

  public async createOrUpdatePricingSchema(data: CreatePricingSchemaData) {
    const { schoolId, branchId, gradeId, registrationFee, monthlyFee, serviceFee } = data

    // Check if pricing schema already exists
    const existingSchema = await prisma.pricingSchema.findUnique({
      where: {
        branchId_gradeId: {
          branchId,
          gradeId,
        },
      },
    })

    let pricingSchema
    if (existingSchema) {
      // Update existing schema
      pricingSchema = await prisma.pricingSchema.update({
        where: { id: existingSchema.id },
        data: {
          registrationFee,
          monthlyFee,
          serviceFee,
          isActive: true,
        },
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          grade: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
        },
      })
    } else {
      // Create new schema
      pricingSchema = await prisma.pricingSchema.create({
        data: {
          schoolId,
          branchId,
          gradeId,
          registrationFee,
          monthlyFee,
          serviceFee,
          isActive: true,
        },
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          grade: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
        },
      })
    }

    return pricingSchema
  }
}
