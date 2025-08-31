import type { Request, Response } from "express"
import { PricingService } from "@/services/pricingService"
// import { requireBranchAccess } from "./../middleware/auth"

export class PricingController {
  private pricingService: PricingService

  constructor() {
    this.pricingService = new PricingService()
  }

  // GET /api/pricing?branchId=...&gradeId=...
  public getPricing = async (req: Request, res: Response): Promise<void> => {
    try {
    //   const user = await getUserFromRequest(req)
    //   if (!user) {
    //     res.status(401).json({ error: "Unauthorized" })
    //     return
    //   }

    //   if (!hasPermission(user.role, ["SUPER_ADMIN", "BRANCH_ADMIN", "REGISTRAR", "CASHIER"])) {
    //     res.status(403).json({ error: "Insufficient permissions" })
    //     return
    //   }

      const { branchId, gradeId } = req.query

      if (!branchId || !gradeId) {
        res.status(400).json({
          error: "Branch ID and Grade ID are required",
        })
        return
      }

      const result = await this.pricingService.getPricingSchema(branchId as string, gradeId as string)

      if (!result) {
        res.status(404).json({
          error: "Pricing schema not found for this branch and grade",
        })
        return
      }

      res.status(200).json(result)
    } catch (error) {
      console.error("Pricing fetch error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }

  // POST /api/pricing
  public createOrUpdatePricing = async (req: Request, res: Response): Promise<void> => {
    try {
         const user = (req as any).user
    //   const user = await getUserFromRequest(req)
    //   if (!user) {
    //     res.status(401).json({ error: "Unauthorized" })
    //     return
    //   }

    //   if (!hasPermission(user.role, ["SUPER_ADMIN", "BRANCH_ADMIN"])) {
    //     res.status(403).json({
    //       error: "Insufficient permissions",
    //     })
    //     return
    //   }

      const { branchId, gradeId, registrationFee, monthlyFee, serviceFee } = req.body

      if (!branchId || !gradeId || !registrationFee || !monthlyFee || !serviceFee) {
        res.status(400).json({
          error: "All fields are required",
        })
        return
      }

      if (!user.schoolId) {
        res.status(400).json({
          error: "User school not found",
        })
        return
      }

      const pricingSchema = await this.pricingService.createOrUpdatePricingSchema({
        schoolId: user.schoolId,
        branchId,
        gradeId,
        registrationFee,
        monthlyFee,
        serviceFee,
      })

      res.status(200).json({
        message: "Pricing schema saved successfully",
        pricingSchema,
      })
    } catch (error) {
      console.error("Pricing schema creation error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
}
