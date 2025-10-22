// import type { Request, Response } from "express"
// import { ReceiptService } from "../services/receiptService"
import type { Request, Response } from "express"
import { ReceiptService } from "../services/receiptService"

export class ReceiptController {
  // static async generateReceipt(req: Request, res: Response) {
  //   try {
  //     const { invoiceIds } = req.body
  //     const { id } = req.params
  //     const user = req.user

  //     if (!user) {
  //       return res.status(401).json({ error: "Unauthorized" })
  //     }

  //     // Handle both single ID from params and multiple IDs from body
  //     const targetIds = invoiceIds || (id ? [id] : [])

  //     if (!targetIds || targetIds.length === 0) {
  //       return res.status(400).json({ error: "Invoice ID(s) required" })
  //     }

  //     const receiptData = await ReceiptService.getReceiptData(targetIds, user.role, user.branchId)

  //     if (receiptData.needsFsNumber) {
  //       return res.status(400).json({
  //         error: "FS number required",
  //         needsFsNumber: true,
  //         invoicesNeedingFs: receiptData.invoicesNeedingFs,
  //       })
  //     }

  //     // Handle single invoice (legacy format)
  //     if (!receiptData.isMultiple && receiptData.invoice) {
  //       const { invoice, payment, receiptNumber } = receiptData

  //       const receiptHTML = ReceiptService.generatePrintableReceipt({
  //         schoolName: "Yeka Michael Schools",
  //         invoiceNumber: invoice.invoiceNumber,
  //         studentName: `${invoice.student.user.firstName} ${invoice.student.user.lastName}`,
  //         studentId: invoice.student.studentId,
  //         branchName: invoice.branch.name,
  //         gradeName: invoice.student.grade?.name || "N/A",
  //         parentName: invoice.student.parents[0]
  //           ? `${invoice.student.parents[0].parent.user.firstName} ${invoice.student.parents[0].parent.user.lastName}`
  //           : "N/A",
  //         parentPhone: invoice.student.parents[0]?.parent.user.phone || "N/A",
  //         paymentMethod: payment.paymentMethod,
  //         items: invoice.items.map((item) => ({
  //           description: item.description,
  //           feeType: item.feeType.name,
  //           quantity: item.quantity,
  //           amount: Number(item.amount),
  //         })),
  //         totalAmount: Number(invoice.totalAmount),
  //         discountAmount: invoice.discountAmount ? Number(invoice.discountAmount) : 0,
  //         finalAmount: Number(invoice.finalAmount || invoice.paidAmount || invoice.totalAmount),
  //         receiptNumber: receiptNumber,
  //         transactionNumber: payment.transactionId,
  //         paymentDate: payment.createdAt,
  //         cashierName: payment.processedBy
  //           ? `${payment.processedBy.firstName} ${payment.processedBy.lastName}`
  //           : "System",
  //         fsNumber: invoice.fsNumber || undefined,
  //       })

  //       res.setHeader("Content-Type", "text/html")
  //       res.send(receiptHTML)
  //     } else {
  //       // Handle multiple invoices
  //       const invoices = receiptData.invoices
  //       const parentInfo = {
  //         name: `${invoices[0].student.parents[0]?.parent.user.firstName} ${invoices[0].student.parents[0]?.parent.user.lastName}`,
  //         phone: invoices[0].student.parents[0]?.parent.user.phone,
  //       }

  //       const receiptHTML = ReceiptService.generateCombinedReceipt(invoices, parentInfo)

  //       res.setHeader("Content-Type", "text/html")
  //       res.send(receiptHTML)
  //     }
  //   } catch (error: any) {
  //     console.error("Receipt generation error:", error)
  //     res.status(500).json({ error: error.message || "Internal server error" })
  //   }
  // }

  static async generateReceipt(req: Request, res: Response) {
    try {
      const { invoiceIds } = req.body
      const { id } = req.params
      const user = req.user

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" })
      }

      // Handle both single ID from params and multiple IDs from body
      const targetIds = invoiceIds || (id ? [id] : [])

      if (!targetIds || targetIds.length === 0) {
        return res.status(400).json({ error: "Invoice ID(s) required" })
      }

      const receiptData = await ReceiptService.getReceiptData(targetIds, user.role, user.branchId)

      if (receiptData.needsFsNumber) {
        return res.status(400).json({
          error: "FS number required",
          needsFsNumber: true,
          invoicesNeedingFs: receiptData.invoicesNeedingFs,
        })
      }

      // Handle single invoice (legacy format)
      if (!receiptData.isMultiple && receiptData.invoice) {
        const { invoice, payment, receiptNumber, paymentDurationDisplay, penaltyFee, discountAmount } = receiptData

        const baseAmount = Number(invoice.totalAmount)
        const discount = discountAmount || 0
        const penalty = penaltyFee || 0
        const finalAmount = baseAmount - Number(discount) + penalty

        const receiptHTML = ReceiptService.generatePrintableReceipt({
          schoolName: "Yeka Michael Schools",
          invoiceNumber: invoice.invoiceNumber,
          studentName: `${invoice.student.user.firstName} ${invoice.student.user.lastName}`,
          studentId: invoice.student.studentId,
          branchName: invoice.branch.name,
          gradeName: invoice.student.grade?.name || "N/A",
          parentName: invoice.student.parents[0]
            ? `${invoice.student.parents[0].parent.user.firstName} ${invoice.student.parents[0].parent.user.lastName}`
            : "N/A",
          parentPhone: invoice.student.parents[0]?.parent.user.phone || "N/A",
          paymentMethod: payment.paymentMethod,
          items: invoice.items.map((item) => ({
            description: item.description,
            feeType: item.feeType.name,
            quantity: item.quantity,
            amount: Number(item.amount),
          })),
          totalAmount: baseAmount,
          discountAmount: discount,
          penaltyFee: penalty,
          paymentDurationDisplay: paymentDurationDisplay || "N/A",
          finalAmount: finalAmount,
          receiptNumber: receiptNumber,
          transactionNumber: payment.transactionId,
          paymentDate: payment.createdAt,
          cashierName: payment.processedBy
            ? `${payment.processedBy.firstName} ${payment.processedBy.lastName}`
            : "System",
          fsNumber: invoice.fsNumber || undefined,
        })

        res.setHeader("Content-Type", "text/html")
        res.send(receiptHTML)
      } else {
        // Handle multiple invoices
        const invoices = receiptData.invoices
        const parentInfo = {
          name: `${invoices[0].student.parents[0]?.parent.user.firstName} ${invoices[0].student.parents[0]?.parent.user.lastName}`,
          phone: invoices[0].student.parents[0]?.parent.user.phone,
        }

        const receiptHTML = ReceiptService.generateCombinedReceipt(invoices, parentInfo)

        res.setHeader("Content-Type", "text/html")
        res.send(receiptHTML)
      }
    } catch (error: any) {
      console.error("Receipt generation error:", error)
      res.status(500).json({ error: error.message || "Internal server error" })
    }
  }

  static async updateFsNumber(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { fsNumber } = req.body
      const user = req.user

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" })
      }

      if (!fsNumber) {
        return res.status(400).json({ error: "FS number is required" })
      }

      const updatedInvoice = await ReceiptService.updateFsNumber(id, fsNumber, user.role, user.branchId)

      res.json({
        message: "FS number updated successfully",
        fsNumber: updatedInvoice.fsNumber,
      })
    } catch (error: any) {
      console.error("FS number update error:", error)
      res.status(500).json({ error: error.message || "Internal server error" })
    }
  }

  static async getParentInvoices(req: Request, res: Response) {
    try {
      const { parentPhone } = req.params
      const user = req.user

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" })
      }

      if (!parentPhone || typeof parentPhone !== "string") {
        return res.status(400).json({ error: "Parent phone is required" })
      }

      const invoices = await ReceiptService.getParentInvoices(parentPhone, user.role, user.branchId)

      // Get parent information
      const parentInfo =
        invoices.length > 0
          ? {
              name: `${invoices[0].student.parents[0]?.parent.user.firstName} ${invoices[0].student.parents[0]?.parent.user.lastName}`,
              phone: invoices[0].student.parents[0]?.parent.user.phone,
            }
          : null

      res.json({
        invoices: invoices.map((invoice) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          studentName: `${invoice.student.user.firstName} ${invoice.student.user.lastName}`,
          studentId: invoice.student.studentId,
          gradeName: invoice.student.grade?.name || "N/A",
          totalAmount: Number(invoice.totalAmount),
          finalAmount: Number(invoice.finalAmount || invoice.paidAmount || invoice.totalAmount),
          receiptNumber: invoice.student.registration?.registrationNumber || invoice.payments[0]?.transactionId,
          fsNumber: invoice.fsNumber,
          needsFsNumber: !invoice.fsNumber,
        })),
        parentInfo,
      })
    } catch (error: any) {
      console.error("Get parent invoices error:", error)
      res.status(500).json({ error: error.message || "Internal server error" })
    }
  }

  static async generateCombinedReceipt(req: Request, res: Response) {
    try {
      const { parentId } = req.params
      const user = req.user

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" })
      }

      const invoices = await ReceiptService.getParentInvoices(parentId, user.role, user.branchId)

      if (invoices.length === 0) {
        return res.status(404).json({ error: "No invoices found for this parent" })
      }

      // Check if any invoice needs FS number
      const needsFsNumber = invoices.some((invoice) => !invoice.fsNumber)
      if (needsFsNumber) {
        return res.status(400).json({
          error: "Some invoices require FS numbers",
          needsFsNumber: true,
          invoicesNeedingFs: invoices
            .filter((inv) => !inv.fsNumber)
            .map((inv) => ({
              id: inv.id,
              studentName: `${inv.student.user.firstName} ${inv.student.user.lastName}`,
            })),
        })
      }

      const parentInfo = {
        name: `${invoices[0].student.parents[0]?.parent.user.firstName} ${invoices[0].student.parents[0]?.parent.user.lastName}`,
        phone: invoices[0].student.parents[0]?.parent.user.phone,
      }

      console.log("Generating combined receipt for parent:", parentInfo)
      console.log("Invoices included:", invoices.map(inv => inv.invoiceNumber)) 

      const receiptHTML = ReceiptService.generateCombinedReceipt(invoices, parentInfo)

      res.setHeader("Content-Type", "text/html")
      res.send(receiptHTML)
    } catch (error: any) {
      console.error("Combined receipt generation error:", error)
      res.status(500).json({ error: error.message || "Internal server error" })
    }
  }

  static async checkFsNumber(req: Request, res: Response) {
    try {
      const { id } = req.params
      const user = req.user

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" })
      }

      const fsCheckResult = await ReceiptService.checkFsNumber(id, user.role, user.branchId)

      res.json(fsCheckResult)
    } catch (error: any) {
      console.error("FS number check error:", error)
      res.status(500).json({ error: error.message || "Internal server error" })
    }
  }
}

export const receiptController = ReceiptController

// export class ReceiptController {
//   static async generateReceipt(req: Request, res: Response) {
//     try {
//       const { id } = req.params
//       const user = req.user

//       if (!user) {
//         return res.status(401).json({ error: "Unauthorized" })
//       }

//       const { invoice, payment, receiptNumber, needsFsNumber } = await ReceiptService.getReceiptData(
//         id,
//         user.role,
//         user.branchId,
//       )

//       if (needsFsNumber) {
//         return res.status(400).json({
//           error: "FS number required",
//           needsFsNumber: true,
//           invoiceId: id,
//         })
//       }

//       const receiptHTML = ReceiptService.generatePrintableReceipt({
//         schoolName: "Yeka Michael Schools",
//         invoiceNumber: invoice.invoiceNumber,
//         studentName: `${invoice.student.user.firstName} ${invoice.student.user.lastName}`,
//         studentId: invoice.student.studentId,
//         branchName: invoice.branch.name,
//         gradeName: invoice.student.grade?.name || "N/A",
//         parentName: invoice.student.parents[0]
//           ? `${invoice.student.parents[0].parent.user.firstName} ${invoice.student.parents[0].parent.user.lastName}`
//           : "N/A",
//         parentPhone: invoice.student.parents[0]?.parent.user.phone || "N/A",
//         paymentMethod: payment.paymentMethod,
//         items: invoice.items.map((item) => ({
//           description: item.description,
//           feeType: item.feeType.name,
//           quantity: item.quantity,
//           amount: Number(item.amount),
//         })),
//         totalAmount: Number(invoice.totalAmount),
//         discountAmount: invoice.discountAmount ? Number(invoice.discountAmount) : 0,
//         finalAmount: Number(invoice.finalAmount || invoice.paidAmount || invoice.totalAmount),
//         receiptNumber: receiptNumber,
//         transactionNumber: payment.transactionId,
//         paymentDate: payment.createdAt,
//         cashierName: payment.processedBy
//           ? `${payment.processedBy.firstName} ${payment.processedBy.lastName}`
//           : "System",
//         fsNumber: invoice.fsNumber || undefined,
//       } as any)

//       res.setHeader("Content-Type", "text/html")
//       res.send(receiptHTML)
//     } catch (error: any) {
//       console.error("Receipt generation error:", error)
//       res.status(500).json({ error: error.message || "Internal server error" })
//     }
//   }

//   static async updateFsNumber(req: Request, res: Response) {
//     try {
//       const { id } = req.params
//       const { fsNumber } = req.body
//       const user = req.user

//       if (!user) {
//         return res.status(401).json({ error: "Unauthorized" })
//       }

//       if (!fsNumber) {
//         return res.status(400).json({ error: "FS number is required" })
//       }

//       const updatedInvoice = await ReceiptService.updateFsNumber(id, fsNumber, user.role, user.branchId)

//       res.json({
//         message: "FS number updated successfully",
//         fsNumber: updatedInvoice.fsNumber,
//       })
//     } catch (error: any) {
//       console.error("FS number update error:", error)
//       res.status(500).json({ error: error.message || "Internal server error" })
//     }
//   }

//   static async getParentInvoices(req: Request, res: Response) {
//     try {
//       const { parentPhone } = req.query
//       const user = req.user

//       if (!user) {
//         return res.status(401).json({ error: "Unauthorized" })
//       }

//       if (!parentPhone || typeof parentPhone !== "string") {
//         return res.status(400).json({ error: "Parent phone is required" })
//       }

//       const invoices = await ReceiptService.getParentInvoices(parentPhone, user.role, user.branchId)

//       // Get parent information
//       const parentInfo =
//         invoices.length > 0
//           ? {
//               name: `${invoices[0].student.parents[0]?.parent.user.firstName} ${invoices[0].student.parents[0]?.parent.user.lastName}`,
//               phone: invoices[0].student.parents[0]?.parent.user.phone,
//             }
//           : null

//       res.json({
//         invoices: invoices.map((invoice) => ({
//           id: invoice.id,
//           invoiceNumber: invoice.invoiceNumber,
//           studentName: `${invoice.student.user.firstName} ${invoice.student.user.lastName}`,
//           studentId: invoice.student.studentId,
//           gradeName: invoice.student.grade?.name || "N/A",
//           totalAmount: Number(invoice.totalAmount),
//           finalAmount: Number(invoice.finalAmount || invoice.paidAmount || invoice.totalAmount),
//           receiptNumber: invoice.student.registration?.registrationNumber || invoice.payments[0]?.transactionId,
//           fsNumber: invoice.fsNumber,
//           needsFsNumber: !invoice.fsNumber,
//         })),
//         parentInfo,
//       })
//     } catch (error: any) {
//       console.error("Get parent invoices error:", error)
//       res.status(500).json({ error: error.message || "Internal server error" })
//     }
//   }

//   static async generateCombinedReceipt(req: Request, res: Response) {
//     try {
//       const { parentId } = req.params
//       const user = req.user

//       if (!user) {
//         return res.status(401).json({ error: "Unauthorized" })
//       }

//       const invoices:any = await ReceiptService.getParentInvoices(parentId, user.role, user.branchId)

//       if (invoices.length === 0) {
//         return res.status(404).json({ error: "No invoices found for this parent" })
//       }

//       // Check if any invoice needs FS number
//       const needsFsNumber = invoices.some((invoice:any) => !invoice.fsNumber)
//       if (needsFsNumber) {
//         return res.status(400).json({
//           error: "Some invoices require FS numbers",
//           needsFsNumber: true,
//           invoicesNeedingFs: invoices
//             .filter((inv:any) => !inv.fsNumber)
//             .map((inv:any) => ({
//               id: inv.id,
//               studentName: `${inv.student.user.firstName} ${inv.student.user.lastName}`,
//             })),
//         })
//       }

//       const parentInfo = {
//         name: `${invoices[0].student.parents[0]?.parent.user.firstName} ${invoices[0].student.parents[0]?.parent.user.lastName}`,
//         phone: invoices[0].student.parents[0]?.parent.user.phone,
//       }

//       const receiptHTML = ReceiptService.generateCombinedReceipt(invoices, parentInfo)

//       res.setHeader("Content-Type", "text/html")
//       res.send(receiptHTML)
//     } catch (error: any) {
//       console.error("Combined receipt generation error:", error)
//       res.status(500).json({ error: error.message || "Internal server error" })
//     }
//   }

//   static async checkFsNumber(req: Request, res: Response) {
//     try {
//       const { id } = req.params
//       const user = req.user

//       if (!user) {
//         return res.status(401).json({ error: "Unauthorized" })
//       }

//       const fsCheckResult = await ReceiptService.checkFsNumber(id, user.role, user.branchId)

//       res.json(fsCheckResult)
//     } catch (error: any) {
//       console.error("FS number check error:", error)
//       res.status(500).json({ error: error.message || "Internal server error" })
//     }
//   }
// }

// export const receiptController = ReceiptController
// import type { Request, Response } from "express"
// import { ReceiptService } from "@/services/receiptService"

// export class ReceiptController {
//   static async generateReceipt(req: Request, res: Response) {
//     try {
//       const { id } = req.params
//       const user = req.user

//       if (!user) {
//         return res.status(401).json({ error: "Unauthorized" })
//       }

//       const { invoice, payment, receiptNumber, needsFsNumber } = await ReceiptService.getReceiptData(
//         id,
//         user.role,
//         user.branchId,
//       )

//       if (needsFsNumber) {
//         return res.status(400).json({
//           error: "FS number required",
//           needsFsNumber: true,
//           invoiceId: id,
//         })
//       }

//       const receiptHTML = ReceiptService.generatePrintableReceipt({
//         schoolName: "Yeka Michael Schools",
//         invoiceNumber: invoice.invoiceNumber,
//         studentName: `${invoice.student.user.firstName} ${invoice.student.user.lastName}`,
//         studentId: invoice.student.studentId,
//         branchName: invoice.branch.name,
//         gradeName: invoice.student.grade?.name || "N/A",
//         parentName: invoice.student.parents[0]
//           ? `${invoice.student.parents[0].parent.user.firstName} ${invoice.student.parents[0].parent.user.lastName}`
//           : "N/A",
//         parentPhone: invoice.student.parents[0]?.parent.user.phone || "N/A",
//         paymentMethod: payment.paymentMethod,
//         items: invoice.items.map((item) => ({
//           description: item.description,
//           feeType: item.feeType.name,
//           quantity: item.quantity,
//           amount: Number(item.amount),
//         })),
//         totalAmount: Number(invoice.totalAmount),
//         discountAmount: invoice.discountAmount ? Number(invoice.discountAmount) : 0,
//         finalAmount: Number(invoice.finalAmount || invoice.paidAmount || invoice.totalAmount),
//         receiptNumber: receiptNumber,
//         transactionNumber: payment.transactionId,
//         paymentDate: payment.createdAt,
//         cashierName: payment.processedBy
//           ? `${payment.processedBy.firstName} ${payment.processedBy.lastName}`
//           : "System",
//         fsNumber: invoice.fsNumber || undefined,
//       } as any)

//       res.setHeader("Content-Type", "text/html")
//       res.send(receiptHTML)
//     } catch (error: any) {
//       console.error("Receipt generation error:", error)
//       res.status(500).json({ error: error.message || "Internal server error" })
//     }
//   }

//   static async updateFsNumber(req: Request, res: Response) {
//     try {
//       const { id } = req.params
//       const { fsNumber } = req.body
//       const user = req.user

//       if (!user) {
//         return res.status(401).json({ error: "Unauthorized" })
//       }

//       if (!fsNumber) {
//         return res.status(400).json({ error: "FS number is required" })
//       }

//       const updatedInvoice = await ReceiptService.updateFsNumber(id, fsNumber, user.role, user.branchId)

//       res.json({
//         message: "FS number updated successfully",
//         fsNumber: updatedInvoice.fsNumber,
//       })
//     } catch (error: any) {
//       console.error("FS number update error:", error)
//       res.status(500).json({ error: error.message || "Internal server error" })
//     }
//   }
// }

// export const receiptController = ReceiptController
