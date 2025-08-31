import type { Request, Response } from "express"
import { ParentService } from "../services/parentService"
import { validateEthiopianPhone } from "@/utils/validation"

export class ParentController {
  private parentService: ParentService

  constructor() {
    this.parentService = new ParentService()
  }

  async searchParent(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user
      if (!user) {
        res.status(401).json({ error: "Unauthorized" })
        return
      }

      if (!this.hasPermission(user.role, ["SUPER_ADMIN", "BRANCH_ADMIN", "REGISTRAR"])) {
        res.status(403).json({ error: "Insufficient permissions" })
        return
      }

      const { phone, email } = req.query

      if (!phone && !email) {
        res.status(400).json({ error: "Phone number or email is required" })
        return
      }

      if (phone && !validateEthiopianPhone(phone as string)) {
        res.status(400).json({ error: "Invalid phone number format" })
        return
      }

      const result = await this.parentService.searchParent({
        phone: phone as string,
        email: email as string,
        user,
      })

      res.json(result)
    } catch (error) {
      console.error("Parent search error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }

  private hasPermission(userRole: string, allowedRoles: string[]): boolean {
    return allowedRoles.includes(userRole)
  }
}
