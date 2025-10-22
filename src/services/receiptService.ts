import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

enum PaymentDuration {
  ONE_MONTH = "ONE_MONTH",
  TWO_MONTHS = "TWO_MONTHS",
  QUARTER = "QUARTER",
  THREE_MONTHS = "THREE_MONTHS",
  FOUR_MONTHS = "FOUR_MONTHS",
  FIVE_MONTHS = "FIVE_MONTHS",
  TEN_MONTHS = "TEN_MONTHS",
}

// Helper function to format payment duration display
const formatPaymentDuration = (duration: PaymentDuration, createdAt: Date): string => {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]
  const shortMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  const createdMonth = createdAt.getMonth()

  switch (duration) {
    case PaymentDuration.ONE_MONTH:
      return monthNames[createdMonth]

    case PaymentDuration.TWO_MONTHS:
      const nextMonth = (createdMonth + 1) % 12
      return `${shortMonthNames[createdMonth]} and ${shortMonthNames[nextMonth]}`

    case PaymentDuration.QUARTER:
      // First quarter: Jan-Mar (months 0-2), Second quarter: Apr-Jun (months 3-5), etc.
      if (createdMonth >= 0 && createdMonth <= 2) return "First Quarter"
      if (createdMonth >= 3 && createdMonth <= 5) return "Second Quarter"
      if (createdMonth >= 6 && createdMonth <= 8) return "Third Quarter"
      return "Fourth Quarter"

    case PaymentDuration.THREE_MONTHS:
      const months3 = []
      for (let i = 0; i < 3; i++) {
        months3.push(shortMonthNames[(createdMonth + i) % 12])
      }
      return months3.join(", ")

    case PaymentDuration.FOUR_MONTHS:
      const months4 = []
      for (let i = 0; i < 4; i++) {
        months4.push(shortMonthNames[(createdMonth + i) % 12])
      }
      return months4.join(", ")

    case PaymentDuration.FIVE_MONTHS:
      const months5 = []
      for (let i = 0; i < 5; i++) {
        months5.push(shortMonthNames[(createdMonth + i) % 12])
      }
      return months5.join(", ")

    case PaymentDuration.TEN_MONTHS:
      return "Academic Year (10 months)"

    default:
      return duration
  }
}

// Helper function to calculate penalty fee
const calculatePenaltyFee = (paymentDueDate: Date, actualPaymentDate: Date): number => {
  if (actualPaymentDate <= paymentDueDate) {
    return 0 // No penalty if paid on time
  }

  const diffTime = actualPaymentDate.getTime() - paymentDueDate.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  const weeksLate = Math.ceil(diffDays / 7)

  // 50 ETB for first week late, then 25 ETB for each additional week
  return 50 + Math.max(0, weeksLate - 1) * 25
}

export class ReceiptService {
  static async getReceiptData(invoiceIds: string | string[], userRole: string, userBranchId?: string) {
    const ids = Array.isArray(invoiceIds) ? invoiceIds : [invoiceIds]

    const invoices = await prisma.invoice.findMany({
      where: {
        id: { in: ids },
        ...(userRole !== "SUPER_ADMIN" && userBranchId ? { branchId: userBranchId } : {}),
      },
      include: {
        student: {
          include: {
            user: true,
            grade: true,
            registration: {
              select: {
                id: true,
                registrationNumber: true,
                paymentDuration: true,
                paymentDueDate: true,
                createdAt: true,
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
          },
        },
        branch: true,
        items: {
          include: {
            feeType: true,
          },
        },
        payments: {
          include: {
            processedBy: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    if (invoices.length === 0) {
      throw new Error("Invoice(s) not found")
    }

    // Check if any invoice needs FS number
    const needsFsNumber = invoices.some((invoice) => !invoice.fsNumber)

    if (needsFsNumber) {
      return {
        invoices,
        needsFsNumber: true,
        invoicesNeedingFs: invoices
          .filter((inv) => !inv.fsNumber)
          .map((inv) => ({
            id: inv.id,
            studentName: `${inv.student.user.firstName} ${inv.student.user.lastName}`,
          })),
      }
    }

    // For single invoice, return legacy format with new fields
    if (invoices.length === 1) {
      const invoice = invoices[0]
      const payment = invoice.payments[0]
      const receiptNumber =
        invoice.student.registration?.registrationNumber || payment?.transactionId || invoice.invoiceNumber

      const registration = invoice.student.registration
      console.log("Registration details:", registration)
      const paymentDurationDisplay = registration?.paymentDuration
        ? formatPaymentDuration(registration.paymentDuration as PaymentDuration, registration.createdAt)
        : "N/A"

      console.log("Payment details:", paymentDurationDisplay)

      const penaltyFee =
        registration?.paymentDueDate && payment?.createdAt
          ? calculatePenaltyFee(new Date(registration.paymentDueDate), new Date(payment.createdAt))
          : 0

      return {
        invoice,
        payment,
        receiptNumber,
        needsFsNumber: false,
        discountAmount: invoice.discountAmount || 0,
        paymentDurationDisplay,
        penaltyFee,
      }
    }

    // For multiple invoices, return aggregated data with new fields
    const totalDiscountAmount = invoices.reduce((sum, inv) => sum + Number(inv.discountAmount || 0), 0)
    const totalPenaltyFee = invoices.reduce((sum, inv) => {
      const registration = inv.student.registration
      const payment = inv.payments[0]
      const penalty =
        registration?.paymentDueDate && payment?.createdAt
          ? calculatePenaltyFee(new Date(registration.paymentDueDate), new Date(payment.createdAt))
          : 0
      return sum + penalty
    }, 0)

    return {
      invoices,
      needsFsNumber: false,
      isMultiple: true,
      totalDiscountAmount,
      totalPenaltyFee,
    }
  }

  static async updateFsNumber(invoiceId: string, fsNumber: string, userRole: string, userBranchId?: string) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        ...(userRole !== "SUPER_ADMIN" && userBranchId ? { branchId: userBranchId } : {}),
      },
    })

    if (!invoice) {
      throw new Error("Invoice not found")
    }

    return await prisma.invoice.update({
      where: { id: invoiceId },
      data: { fsNumber },
    })
  }

  static async getParentInvoices(parentPhone: string, userRole: string, userBranchId?: string) {
    return await prisma.invoice.findMany({
      where: {
        student: {
          parents: {
            some: {
              parent: {
                user: {
                  phone: parentPhone,
                },
              },
            },
          },
        },
        ...(userRole !== "SUPER_ADMIN" && userBranchId ? { branchId: userBranchId } : {}),
      },
      include: {
        student: {
          include: {
            user: true,
            grade: true,
            registration: {
              select: {
                id: true,
                registrationNumber: true,
                paymentDuration: true,
                paymentDueDate: true,
                createdAt: true,
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
          },
        },
        branch: true,
        items: {
          include: {
            feeType: true,
          },
        },
        payments: {
          include: {
            processedBy: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })
  }

  static async checkFsNumber(invoiceId: string, userRole: string, userBranchId?: string) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        ...(userRole !== "SUPER_ADMIN" && userBranchId ? { branchId: userBranchId } : {}),
      },
      select: {
        id: true,
        fsNumber: true,
      },
    })

    if (!invoice) {
      throw new Error("Invoice not found")
    }

    return {
      hasFs: !!invoice.fsNumber,
      fsNumber: invoice.fsNumber,
      needsFsNumber: !invoice.fsNumber,
    }
  }

  static generatePrintableReceipt(data: any) {
    const currentDate = new Date().toLocaleDateString()

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Receipt - ${data.receiptNumber}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .school-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .receipt-title { font-size: 18px; margin-bottom: 20px; }
            .info-section { margin-bottom: 20px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .items-table th { background-color: #f2f2f2; }
            .total-section { margin-top: 20px; text-align: right; }
            .fs-number { font-weight: bold; color: #d32f2f; }
            .penalty-fee { color: #d32f2f; font-weight: bold; }
            @media print { body { margin: 0; } }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="school-name">${data.schoolName}</div>
            <div class="receipt-title">PAYMENT RECEIPT</div>
        </div>
        
        <div class="info-section">
            <div class="info-row">
                <span><strong>Receipt No:</strong> ${data.receiptNumber}</span>
                <span><strong>Date:</strong> ${currentDate}</span>
            </div>
            <div class="info-row">
                <span><strong>Student:</strong> ${data.studentName}</span>
                <span><strong>Student ID:</strong> ${data.studentId}</span>
            </div>
            <div class="info-row">
                <span><strong>Grade:</strong> ${data.gradeName}</span>
                <span><strong>Branch:</strong> ${data.branchName}</span>
            </div>
            <div class="info-row">
                <span><strong>Parent:</strong> ${data.parentName}</span>
                <span><strong>Phone:</strong> ${data.parentPhone}</span>
            </div>
            ${data.paymentDurationDisplay ? `<div class="info-row"><span><strong>Payment Duration:</strong> ${data.paymentDurationDisplay}</span></div>` : ""}
            ${data.fsNumber ? `<div class="info-row"><span class="fs-number"><strong>FS Number:</strong> ${data.fsNumber}</span></div>` : ""}
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Fee Type</th>
                    <th>Quantity</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                ${data.items
                  .map(
                    (item: any) => `
                    <tr>
                        <td>${item.description}</td>
                        <td>${item.feeType.name}</td>
                        <td>${item.quantity}</td>
                        <td>${Number(item.amount).toFixed(2)}</td>
                    </tr>
                `,
                  )
                  .join("")}
            </tbody>
        </table>

        <div class="total-section">
            <div><strong>Total Amount: ${data.totalAmount.toFixed(2)}</strong></div>
            ${data.discountAmount > 0 ? `<div>Discount: -${data.discountAmount.toFixed(2)}</div>` : ""}
            ${data.penaltyFee > 0 ? `<div class="penalty-fee">Penalty Fee: +${data.penaltyFee.toFixed(2)}</div>` : ""}
            <div><strong>Final Amount: ${data.finalAmount.toFixed(2)}</strong></div>
        </div>

        <div class="info-section" style="margin-top: 30px;">
            <div class="info-row">
                <span><strong>Payment Method:</strong> ${data.paymentMethod}</span>
                <span><strong>Transaction:</strong> ${data.transactionNumber}</span>
            </div>
            <div class="info-row">
                <span><strong>Cashier:</strong> ${data.cashierName}</span>
                <span><strong>Payment Date:</strong> ${new Date(data.paymentDate).toLocaleDateString()}</span>
            </div>
        </div>
    </body>
    </html>
    `
  }

  static generateCombinedReceipt(invoices: any[], parentInfo: any) {
    const currentDate = new Date().toLocaleDateString()
    const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
    const totalFinalAmount = invoices.reduce(
      (sum, inv) => sum + Number(inv.finalAmount || inv.paidAmount || inv.totalAmount),
      0,
    )

    const totalDiscountAmount = invoices.reduce((sum, inv) => sum + Number(inv.discountAmount || 0), 0)
    const totalPenaltyFee = invoices.reduce((sum, inv) => {
      const registration = inv.student.registration
      const payment = inv.payments[0]
      const penalty =
        registration?.paymentDueDate && payment?.createdAt
          ? calculatePenaltyFee(new Date(registration.paymentDueDate), new Date(payment.createdAt))
          : 0
      return sum + penalty
    }, 0)

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Combined Receipt - ${parentInfo.name}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .school-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .receipt-title { font-size: 18px; margin-bottom: 20px; }
            .info-section { margin-bottom: 20px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .student-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
            .items-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .items-table th { background-color: #f2f2f2; }
            .total-section { margin-top: 20px; text-align: right; }
            .fs-number { font-weight: bold; color: #d32f2f; }
            .penalty-fee { color: #d32f2f; font-weight: bold; }
            @media print { body { margin: 0; } }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="school-name">Yeka Michael Schools</div>
            <div class="receipt-title">COMBINED PAYMENT RECEIPT</div>
        </div>
        
        <div class="info-section">
            <div class="info-row">
                <span><strong>Date:</strong> ${currentDate}</span>
            </div>
            <div class="info-row">
                <span><strong>Parent:</strong> ${parentInfo.name}</span>
                <span><strong>Phone:</strong> ${parentInfo.phone}</span>
            </div>
        </div>

        ${invoices
          .map((invoice) => {
            const payment = invoice.payments[0]
            const receiptNumber =
              invoice.student.registration?.registrationNumber || payment?.transactionId || invoice.invoiceNumber

            const registration = invoice.student.registration
            const paymentDurationDisplay = registration?.paymentDuration
              ? formatPaymentDuration(registration.paymentDuration as PaymentDuration, registration.createdAt)
              : "N/A"

            const penaltyFee =
              registration?.paymentDueDate && payment?.createdAt
                ? calculatePenaltyFee(new Date(registration.paymentDueDate), new Date(payment.createdAt))
                : 0

            return `
          <div class="student-section">
            <h3>Student: ${invoice.student.user.firstName} ${invoice.student.user.lastName}</h3>
            <div class="info-row">
              <span><strong>Receipt No:</strong> ${receiptNumber}</span>
              <span><strong>Student ID:</strong> ${invoice.student.studentId}</span>
            </div>
            <div class="info-row">
              <span><strong>Grade:</strong> ${invoice.student.grade?.name || "N/A"}</span>
              <span><strong>Branch:</strong> ${invoice.branch.name}</span>
            </div>
            <div class="info-row">
              <span><strong>Payment Duration:</strong> ${paymentDurationDisplay}</span>
            </div>
            ${invoice.fsNumber ? `<div class="info-row"><span class="fs-number"><strong>FS Number:</strong> ${invoice.fsNumber}</span></div>` : ""}
            
            <table class="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Fee Type</th>
                  <th>Quantity</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items
                  .map(
                    (item: any) => `
                  <tr>
                    <td>${item.description}</td>
                    <td>${item.feeType.name}</td>
                    <td>${item.quantity}</td>
                    <td>${Number(item.amount).toFixed(2)}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
            
            <div style="text-align: right; margin-top: 10px;">
              ${invoice.discountAmount > 0 ? `<div>Discount: -${Number(invoice.discountAmount).toFixed(2)}</div>` : ""}
              ${penaltyFee > 0 ? `<div class="penalty-fee">Penalty Fee: +${penaltyFee.toFixed(2)}</div>` : ""}
              <div><strong>Student Total: ${Number(invoice.finalAmount || invoice.paidAmount || invoice.totalAmount).toFixed(2)}</strong></div>
            </div>
          </div>
          `
          })
          .join("")}

        <div class="total-section">
            ${totalDiscountAmount > 0 ? `<div>Total Discounts: -${totalDiscountAmount.toFixed(2)}</div>` : ""}
            ${totalPenaltyFee > 0 ? `<div class="penalty-fee">Total Penalty Fees: +${totalPenaltyFee.toFixed(2)}</div>` : ""}
            <div style="font-size: 18px;"><strong>GRAND TOTAL: ${totalFinalAmount.toFixed(2)}</strong></div>
        </div>

        <div class="info-section" style="margin-top: 30px;">
            <div class="info-row">
                <span><strong>Payment Method:</strong> ${invoices[0].payments[0]?.paymentMethod || "N/A"}</span>
                <span><strong>Cashier:</strong> ${invoices[0].payments[0]?.processedBy ? `${invoices[0].payments[0].processedBy.firstName} ${invoices[0].payments[0].processedBy.lastName}` : "System"}</span>
            </div>
        </div>
    </body>
    </html>
    `
  }
}

// import { PrismaClient } from "@prisma/client"

// const prisma = new PrismaClient()

// export class ReceiptService {
//   static async getReceiptData(invoiceIds: string | string[], userRole: string, userBranchId?: string) {
//     const ids = Array.isArray(invoiceIds) ? invoiceIds : [invoiceIds]

//     const invoices = await prisma.invoice.findMany({
//       where: {
//         id: { in: ids },
//         ...(userRole !== "SUPER_ADMIN" && userBranchId ? { branchId: userBranchId } : {}),
//       },
//       include: {
//         student: {
//           include: {
//             user: true,
//             grade: true,
//             registration: true,
//             parents: {
//               include: {
//                 parent: {
//                   include: {
//                     user: true,
//                   },
//                 },
//               },
//             },
//           },
//         },
//         branch: true,
//         items: {
//           include: {
//             feeType: true,
//           },
//         },
//         payments: {
//           include: {
//             processedBy: true,
//           },
//           orderBy: {
//             createdAt: "desc",
//           },
//         },
//       },
//     })

//     if (invoices.length === 0) {
//       throw new Error("Invoice(s) not found")
//     }

//     // Check if any invoice needs FS number
//     const needsFsNumber = invoices.some((invoice) => !invoice.fsNumber)

//     if (needsFsNumber) {
//       return {
//         invoices,
//         needsFsNumber: true,
//         invoicesNeedingFs: invoices
//           .filter((inv) => !inv.fsNumber)
//           .map((inv) => ({
//             id: inv.id,
//             studentName: `${inv.student.user.firstName} ${inv.student.user.lastName}`,
//           })),
//       }
//     }

//     // For single invoice, return legacy format
//     if (invoices.length === 1) {
//       const invoice = invoices[0]
//       const payment = invoice.payments[0]
//       const receiptNumber =
//         invoice.student.registration?.registrationNumber || payment?.transactionId || invoice.invoiceNumber

//       return {
//         invoice,
//         payment,
//         receiptNumber,
//         needsFsNumber: false,
//       }
//     }

//     // For multiple invoices, return aggregated data
//     return {
//       invoices,
//       needsFsNumber: false,
//       isMultiple: true,
//     }
//   }

//   // static async getReceiptData(invoiceId: string, userRole: string, userBranchId?: string) {
//   //   const invoice = await prisma.invoice.findFirst({
//   //     where: {
//   //       id: invoiceId,
//   //       ...(userRole !== "SUPER_ADMIN" && userBranchId ? { branchId: userBranchId } : {}),
//   //     },
//   //     include: {
//   //       student: {
//   //         include: {
//   //           user: true,
//   //           grade: true,
//   //           registration: true,
//   //           parents: {
//   //             include: {
//   //               parent: {
//   //                 include: {
//   //                   user: true,
//   //                 },
//   //               },
//   //             },
//   //           },
//   //         },
//   //       },
//   //       branch: true,
//   //       items: {
//   //         include: {
//   //           feeType: true,
//   //         },
//   //       },
//   //       payments: {
//   //         include: {
//   //           processedBy: true,
//   //         },
//   //         orderBy: {
//   //           createdAt: "desc",
//   //         },
//   //       },
//   //     },
//   //   })

//   //   if (!invoice) {
//   //     throw new Error("Invoice not found")
//   //   }

//   //   console.log("Invoice found:", invoice)

//   //   const payment = invoice.payments[0]
//   //   if (!payment) {
//   //     throw new Error("No payment found for this invoice")
//   //   }

//   //   const receiptNumber = invoice.student.registration?.registrationNumber || payment.transactionId
//   //   const needsFsNumber = !invoice.fsNumber

//   //   return {
//   //     invoice,
//   //     payment,
//   //     receiptNumber,
//   //     needsFsNumber,
//   //   }
//   // }

//   static generatePrintableReceipt(data: any): string {
//     console.log("Generating receipt for:", data)
//     return `
//       <!DOCTYPE html>
//       <html>
//         <head>
//           <title>Receipt - ${data.receiptNumber}</title>
//           <style>
//             body { font-family: Arial, sans-serif; margin: 20px; }
//             .header { text-align: center; margin-bottom: 30px; }
//             .school-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
//             .receipt-title { font-size: 18px; margin-bottom: 20px; }
//             .info-section { margin-bottom: 20px; }
//             .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
//             .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
//             .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
//             .items-table th { background-color: #f2f2f2; }
//             .total-section { margin-top: 20px; text-align: right; }
//             .fs-number { background-color: #e8f4fd; padding: 10px; margin: 20px 0; border-left: 4px solid #2196F3; }
//             @media print { body { margin: 0; } }
//           </style>
//         </head>
//         <body>
//           <div class="header">
//             <div class="school-name">${data.schoolName}</div>
//             <div class="receipt-title">PAYMENT RECEIPT</div>
//           </div>
          
//           <div class="info-section">
//             <div class="info-row"><strong>Receipt No:</strong> <span>${data.receiptNumber}</span></div>
//             <div class="info-row"><strong>Invoice No:</strong> <span>${data.invoiceNumber}</span></div>
//             <div class="info-row"><strong>Student Name:</strong> <span>${data.studentName}</span></div>
//             <div class="info-row"><strong>Student ID:</strong> <span>${data.studentId}</span></div>
//             <div class="info-row"><strong>Grade:</strong> <span>${data.gradeName}</span></div>
//             <div class="info-row"><strong>Branch:</strong> <span>${data.branchName}</span></div>
//             <div class="info-row"><strong>Parent Name:</strong> <span>${data.parentName}</span></div>
//             <div class="info-row"><strong>Parent Phone:</strong> <span>${data.parentPhone}</span></div>
//             <div class="info-row"><strong>Payment Date:</strong> <span>${new Date(data.paymentDate).toLocaleDateString()}</span></div>
//             <div class="info-row"><strong>Payment Method:</strong> <span>${data.paymentMethod}</span></div>
//             <div class="info-row"><strong>Transaction No:</strong> <span>${data.transactionNumber}</span></div>
//           </div>

//           ${data.fsNumber ? `<div class="fs-number"><strong>FS Number:</strong> ${data.fsNumber}</div>` : ""}

//           <table class="items-table">
//             <thead>
//               <tr>
//                 <th>Description</th>
//                 <th>Fee Type</th>
//                 <th>Quantity</th>
//                 <th>Amount</th>
//               </tr>
//             </thead>
//             <tbody>
//               ${data.items
//                 .map(
//                   (item: any) => `
//                 <tr>
//                   <td>${item.description}</td>
//                   <td>${item.feeType}</td>
//                   <td>${item.quantity}</td>
//                   <td>${item.amount.toFixed(2)}</td>
//                 </tr>
//               `,
//                 )
//                 .join("")}
//             </tbody>
//           </table>

//           <div class="total-section">
//             <div><strong>Total Amount: ${data.totalAmount.toFixed(2)}</strong></div>
//             ${data.discountAmount > 0 ? `<div>Discount: -${data.discountAmount.toFixed(2)}</div>` : ""}
//             <div style="font-size: 18px; margin-top: 10px;"><strong>Final Amount: ${data.finalAmount.toFixed(2)}</strong></div>
//           </div>

//           <div style="margin-top: 40px; text-align: center;">
//             <p>Processed by: ${data.cashierName}</p>
//             <p>Thank you for your payment!</p>
//           </div>
//         </body>
//       </html>
//     `
//   }

//   static async updateFsNumber(invoiceId: string, fsNumber: string, userRole: string, userBranchId?: string) {
//     const updatedInvoice = await prisma.invoice.update({
//       where: {
//         id: invoiceId,
//         ...(userRole !== "SUPER_ADMIN" && userBranchId ? { branchId: userBranchId } : {}),
//       },
//       data: {
//         fsNumber,
//       },
//     })

//     return updatedInvoice
//   }

//   static async getParentInvoices(parentPhone: string, userRole: string, userBranchId?: string) {
//     const invoices = await prisma.invoice.findMany({
//       where: {
//         student: {
//           parents: {
//             some: {
//               parent: {
//                 user: {
//                   phone: parentPhone,
//                 },
//               },
//             },
//           },
//         },
//         status: "PAID",
//         ...(userRole !== "SUPER_ADMIN" && userBranchId ? { branchId: userBranchId } : {}),
//       },
//       include: {
//         student: {
//           include: {
//             user: true,
//             grade: true,
//             registration: true,
//             parents: {
//               include: {
//                 parent: {
//                   include: {
//                     user: true,
//                   },
//                 },
//               },
//             },
//           },
//         },
//         branch: true,
//         items: {
//           include: {
//             feeType: true,
//           },
//         },
//         payments: {
//           include: {
//             processedBy: true,
//           },
//           orderBy: {
//             createdAt: "desc",
//           },
//         },
//       },
//     })

//     return invoices
//   }

//   static generateCombinedReceipt(invoices: any[], parentInfo: any): string {
//     console.log("Generating combined receipt for invoices:", invoices)
//     console.log("Parent info:", parentInfo)
//     const totalAmount = invoices.reduce(
//       (sum, inv) => sum + Number(inv.finalAmount || inv.paidAmount || inv.totalAmount),
//       0,
//     )

//     return `
//       <!DOCTYPE html>
//       <html>
//         <head>
//           <title>Combined Receipt - ${parentInfo.name}</title>
//           <style>
//             body { font-family: Arial, sans-serif; margin: 20px; }
//             .header { text-align: center; margin-bottom: 30px; }
//             .school-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
//             .receipt-title { font-size: 18px; margin-bottom: 20px; }
//             .parent-info { margin-bottom: 20px; background-color: #f5f5f5; padding: 15px; }
//             .student-section { margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; }
//             .student-header { background-color: #e8f4fd; padding: 10px; margin: -15px -15px 15px -15px; }
//             .items-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
//             .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
//             .items-table th { background-color: #f2f2f2; }
//             .fs-number { background-color: #e8f4fd; padding: 10px; margin: 10px 0; border-left: 4px solid #2196F3; }
//             .grand-total { background-color: #f0f8ff; padding: 20px; margin-top: 30px; text-align: center; font-size: 18px; font-weight: bold; }
//             @media print { body { margin: 0; } }
//           </style>
//         </head>
//         <body>
//           <div class="header">
//             <div class="school-name">Yeka Michael Schools</div>
//             <div class="receipt-title">COMBINED PAYMENT RECEIPT</div>
//           </div>
          
//           <div class="parent-info">
//             <h3>Parent Information</h3>
//             <div><strong>Name:</strong> ${parentInfo.name}</div>
//             <div><strong>Phone:</strong> ${parentInfo.phone}</div>
//             <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
//           </div>

//           ${invoices
//             .map(
//               (invoice, index) => `
//             <div class="student-section">
//               <div class="student-header">
//                 <h3>Student ${index + 1}: ${invoice.student.user.firstName} ${invoice.student.user.lastName}</h3>
//               </div>
              
//               <div style="margin-bottom: 15px;">
//                 <div><strong>Student ID:</strong> ${invoice.student.studentId}</div>
//                 <div><strong>Grade:</strong> ${invoice.student.grade?.name || "N/A"}</div>
//                 <div><strong>Branch:</strong> ${invoice.branch.name}</div>
//                 <div><strong>Receipt No:</strong> ${invoice.student.registration?.registrationNumber || invoice.payments[0]?.transactionId}</div>
//                 <div><strong>Invoice No:</strong> ${invoice.invoiceNumber}</div>
//               </div>

//               ${invoice.fsNumber ? `<div class="fs-number"><strong>FS Number:</strong> ${invoice.fsNumber}</div>` : ""}

//               <table class="items-table">
//                 <thead>
//                   <tr>
//                     <th>Description</th>
//                     <th>Fee Type</th>
//                     <th>Quantity</th>
//                     <th>Amount</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   ${invoice.items
//                     .map(
//                       (item: any) => `
//                     <tr>
//                       <td>${item.description}</td>
//                       <td>${item.feeType.name}</td>
//                       <td>${item.quantity}</td>
//                       <td>${Number(item.amount).toFixed(2)}</td>
//                     </tr>
//                   `,
//                     )
//                     .join("")}
//                 </tbody>
//               </table>

//               <div style="text-align: right; margin-top: 10px;">
//                 <strong>Student Total: ${Number(invoice.finalAmount || invoice.paidAmount || invoice.totalAmount).toFixed(2)}</strong>
//               </div>
//             </div>
//           `,
//             )
//             .join("")}

//           <div class="grand-total">
//             <div>GRAND TOTAL: ${totalAmount.toFixed(2)}</div>
//           </div>

//           <div style="margin-top: 40px; text-align: center;">
//             <p>Thank you for your payment!</p>
//           </div>
//         </body>
//       </html>
//     `
//   }

//   static async checkFsNumber(invoiceId: string, userRole: string, userBranchId?: string) {
//     const invoice = await prisma.invoice.findFirst({
//       where: {
//         id: invoiceId,
//         ...(userRole !== "SUPER_ADMIN" && userBranchId ? { branchId: userBranchId } : {}),
//       },
//       select: {
//         id: true,
//         fsNumber: true,
//       },
//     })

//     if (!invoice) {
//       throw new Error("Invoice not found")
//     }

//     return {
//       hasFs: !!invoice.fsNumber,
//       fsNumber: invoice.fsNumber,
//       needsFsNumber: !invoice.fsNumber,
//     }
//   }
// }

// import { prisma } from "@/config/database"

// export class ReceiptService {
//   static async getReceiptData(invoiceId: string, userRole: string, userBranchId?: string) {
//     const invoice = await prisma.invoice.findUnique({
//       where: { id: invoiceId },
//       include: {
//         student: {
//           include: {
//             user: true,
//             registration: {
//               select: {
//                 registrationNumber: true,
//                 // academicYear: true,
//                 createdAt: true,
//               },
//             },
//             parents: {
//               include: {
//                 parent: {
//                   include: {
//                     user: true,
//                   },
//                 },
//               },
//             },
//             grade: {
//               select: {
//                 name: true,
//               },
//             },
//           },
//         },
//         branch: true,
//         payments: {
//           where: { status: "COMPLETED" },
//           orderBy: { createdAt: "desc" },
//           take: 1,
//           include: {
//             processedBy: {
//               select: {
//                 firstName: true,
//                 lastName: true,
//               },
//             },
//           },
//         },
//         items: {
//           include: {
//             feeType: true,
//           },
//         },
//       },
//     })

//     if (!invoice) {
//       throw new Error("Invoice not found")
//     }

//     // Check branch access
//     if (
//       (userRole === "BRANCH_ADMIN" || userRole === "REGISTRAR" || userRole === "CASHIER") &&
//       invoice.branchId !== userBranchId
//     ) {
//       throw new Error("Access denied")
//     }

//     const payment = invoice.payments[0]
//     if (!payment) {
//       throw new Error("No completed payment found for this invoice")
//     }

//     // Use registration number as receipt number, fallback to transaction ID
//     const receiptNumber = invoice.student.registration?.registrationNumber || payment.transactionId

//     return {
//       invoice,
//       payment,
//       receiptNumber,
//       needsFsNumber: !invoice.fsNumber,
//     }
//   }

//   static async updateFsNumber(invoiceId: string, fsNumber: string, userRole: string, userBranchId?: string) {
//     // Check if FS number already exists
//     const existingInvoice = await prisma.invoice.findFirst({
//       where: { fsNumber },
//     })

//     if (existingInvoice && existingInvoice.id !== invoiceId) {
//       throw new Error("FS number already exists for another invoice")
//     }

//     const invoice = await prisma.invoice.findUnique({
//       where: { id: invoiceId },
//       select: { branchId: true },
//     })

//     if (!invoice) {
//       throw new Error("Invoice not found")
//     }

//     // Check branch access
//     if (
//       (userRole === "BRANCH_ADMIN" || userRole === "REGISTRAR" || userRole === "CASHIER") &&
//       invoice.branchId !== userBranchId
//     ) {
//       throw new Error("Access denied")
//     }

//     return await prisma.invoice.update({
//       where: { id: invoiceId },
//       data: { fsNumber },
//     })
//   }

//   static generatePrintableReceipt(data: {
//     schoolName: string
//     invoiceNumber: string
//     studentName: string
//     studentId: string
//     branchName: string
//     gradeName: string
//     parentName: string
//     parentPhone: string
//     paymentMethod: string
//     items: Array<{
//       description: string
//       feeType: string
//       quantity: number
//       amount: number
//     }>
//     totalAmount: number
//     discountAmount: number
//     finalAmount: number
//     receiptNumber: string
//     transactionNumber: string
//     paymentDate: Date
//     cashierName: string
//     fsNumber?: string
//   }) {
//     return `
// <!DOCTYPE html>
// <html lang="en">
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title>Payment Receipt - ${data.receiptNumber}</title>
//     <style>
//         @page {
//             size: A4;
//             margin: 0.5in;
//         }
        
//         @media print {
//             body { 
//                 margin: 0; 
//                 font-size: 12px;
//                 line-height: 1.3;
//             }
//             .no-print { display: none; }
//             .page-break { page-break-before: always; }
//         }
        
//         body {
//             font-family: 'Arial', sans-serif;
//             max-width: 100%;
//             margin: 0 auto;
//             padding: 10px;
//             background: white;
//             color: #333;
//             font-size: 12px;
//             line-height: 1.3;
//         }
        
//         .receipt-header {
//             text-align: center;
//             border-bottom: 2px solid #2563eb;
//             padding-bottom: 15px;
//             margin-bottom: 20px;
//         }
        
//         .school-name {
//             font-size: 22px;
//             font-weight: bold;
//             color: #2563eb;
//             margin-bottom: 3px;
//         }
        
//         .receipt-title {
//             font-size: 16px;
//             color: #666;
//             margin-bottom: 8px;
//         }
        
//         .receipt-numbers {
//             display: flex;
//             justify-content: center;
//             gap: 20px;
//             font-size: 12px;
//             color: #666;
//         }
        
//         .receipt-info {
//             display: grid;
//             grid-template-columns: 1fr 1fr;
//             gap: 20px;
//             align-items: start;
//             margin-bottom: 20px;
//         }
        
//         .info-section {
//             padding: 8px;
//             border: 1px solid #ccc;
//             border-radius: 4px;
//         }

//         .info-title {
//             font-weight: bold;
//             color: #1e40af;
//             margin-bottom: 8px;
//             font-size: 13px;
//         }
                
//         .info-item {
//             display: flex;
//             justify-content: space-between;
//             margin-bottom: 6px;
//             padding: 2px 0;
//         }
        
//         .info-label {
//             color: #666;
//             font-weight: 500;
//             font-size: 11px;
//         }
        
//         .info-value {
//             font-weight: 600;
//             color: #333;
//             font-size: 11px;
//         }
        
//         .items-table {
//             width: 100%;
//             border-collapse: collapse;
//             margin-bottom: 20px;
//             background: white;
//             box-shadow: 0 1px 3px rgba(0,0,0,0.1);
//             font-size: 11px;
//         }
        
//         .items-table th {
//             background: #2563eb;
//             color: white;
//             padding: 8px;
//             text-align: left;
//             font-weight: 600;
//             font-size: 11px;
//         }
        
//         .items-table td {
//             padding: 8px;
//             border-bottom: 1px solid #e5e7eb;
//             font-size: 11px;
//         }
        
//         .items-table tr:nth-child(even) {
//             background: #f9fafb;
//         }
        
//         .amount-cell {
//             text-align: right;
//             font-weight: 600;
//         }
        
//         .payment-summary {
//             background: #f0f9ff;
//             border: 2px solid #2563eb;
//             border-radius: 6px;
//             padding: 15px;
//             margin-bottom: 20px;
//         }
        
//         .summary-row {
//             display: flex;
//             justify-content: space-between;
//             margin-bottom: 8px;
//             padding: 3px 0;
//             font-size: 12px;
//         }
        
//         .summary-total {
//             border-top: 2px solid #2563eb;
//             padding-top: 8px;
//             font-size: 14px;
//             font-weight: bold;
//             color: #2563eb;
//         }
        
//         .receipt-footer {
//             text-align: center;
//             margin-top: 25px;
//             padding-top: 15px;
//             border-top: 1px solid #e5e7eb;
//             color: #666;
//         }
        
//         .print-date {
//             font-size: 10px;
//             color: #999;
//         }
        
//         .thank-you {
//             font-size: 14px;
//             color: #2563eb;
//             font-weight: 600;
//             margin-bottom: 8px;
//         }
        
//         .transaction-details {
//             display: grid; 
//             grid-template-columns: 1fr 1fr; 
//             gap: 15px; 
//             margin-bottom: 20px;
//         }
        
//         @media (max-width: 768px) {
//             .receipt-info, .transaction-details {
//                 grid-template-columns: 1fr;
//             }
            
//             .school-name {
//                 font-size: 20px;
//             }
//         }
//     </style>
// </head>
// <body>
//     <div class="receipt-header">
//         <div class="school-name">${data.schoolName}</div>
//         <div class="receipt-title">PAYMENT RECEIPT</div>
//         <div class="receipt-numbers">
//             <div>Receipt #: ${data.receiptNumber}</div>
//             ${data.fsNumber ? `<div>FS #: ${data.fsNumber}</div>` : ""}
//         </div>
//     </div>

//     <div class="receipt-info">
//         <div class="info-section">
//             <div class="info-title">Student Information</div>
//             <div class="info-item">
//                 <span class="info-label">Student Name:</span>
//                 <span class="info-value">${data.studentName}</span>
//             </div>
//             <div class="info-item">
//                 <span class="info-label">Student ID:</span>
//                 <span class="info-value">${data.studentId}</span>
//             </div>
//             <div class="info-item">
//                 <span class="info-label">Grade:</span>
//                 <span class="info-value">${data.gradeName}</span>
//             </div>
//             <div class="info-item">
//                 <span class="info-label">Branch:</span>
//                 <span class="info-value">${data.branchName}</span>
//             </div>
//         </div>

//         <div class="info-section">
//             <div class="info-title">Parent Information</div>
//             <div class="info-item">
//                 <span class="info-label">Parent Name:</span>
//                 <span class="info-value">${data.parentName}</span>
//             </div>
//             <div class="info-item">
//                 <span class="info-label">Phone Number:</span>
//                 <span class="info-value">${data.parentPhone}</span>
//             </div>
//             <div class="info-item">
//                 <span class="info-label">Payment Date:</span>
//                 <span class="info-value">${data.paymentDate.toLocaleDateString()}</span>
//             </div>
//             <div class="info-item">
//                 <span class="info-label">Payment Method:</span>
//                 <span class="info-value">${data.paymentMethod.replace("_", " ")}</span>
//             </div>
//         </div>
//     </div>

//     <table class="items-table">
//         <thead>
//             <tr>
//                 <th>Description</th>
//                 <th>Fee Type</th>
//                 <th style="text-align: center;">Qty</th>
//                 <th style="text-align: right;">Amount (ETB)</th>
//             </tr>
//         </thead>
//         <tbody>
//             ${data.items
//               .map(
//                 (item) => `
//                 <tr>
//                     <td>${item.description}</td>
//                     <td>${item.feeType}</td>
//                     <td style="text-align: center;">${item.quantity}</td>
//                     <td class="amount-cell">${item.amount.toLocaleString()}</td>
//                 </tr>
//             `,
//               )
//               .join("")}
//         </tbody>
//     </table>

//     <div class="payment-summary">
//         <div class="summary-row">
//             <span>Subtotal:</span>
//             <span>ETB ${data.totalAmount.toLocaleString()}</span>
//         </div>
//         ${
//           data.discountAmount > 0
//             ? `
//         <div class="summary-row" style="color: #059669;">
//             <span>Discount:</span>
//             <span>- ETB ${data.discountAmount.toLocaleString()}</span>
//         </div>
//         `
//             : ""
//         }
//         <div class="summary-row summary-total">
//             <span>Total Paid:</span>
//             <span>ETB ${data.finalAmount.toLocaleString()}</span>
//         </div>
//     </div>

//     <div class="transaction-details">
//         <div class="info-section">
//             <div class="info-title">Transaction Details</div>
//             <div class="info-item">
//                 <span class="info-label">Invoice Number:</span>
//                 <span class="info-value">${data.invoiceNumber}</span>
//             </div>
//             <div class="info-item">
//                 <span class="info-label">Transaction ID:</span>
//                 <span class="info-value">${data.transactionNumber}</span>
//             </div>
//             <div class="info-item">
//                 <span class="info-label">Processed By:</span>
//                 <span class="info-value">${data.cashierName}</span>
//             </div>
//             ${
//               data.fsNumber
//                 ? `
//             <div class="info-item">
//                 <span class="info-label">FS Number:</span>
//                 <span class="info-value">${data.fsNumber}</span>
//             </div>
//             `
//                 : ""
//             }
//         </div>
        
//         <div class="info-section">
//             <div class="info-title">Important Notes</div>
//             <div style="font-size: 10px; color: #666; line-height: 1.3;">
//                 • Keep this receipt for your records<br>
//                 • Contact the school office for any payment inquiries<br>
//                 • This receipt serves as proof of payment<br>
//                 • Valid for all official school purposes
//             </div>
//         </div>
//     </div>

//     <div class="receipt-footer">
//         <div class="thank-you">Thank you for your payment!</div>
//         <div style="font-size: 12px; margin-bottom: 8px;">
//             For inquiries, please contact the school administration office.
//         </div>
//         <div class="print-date">
//             Receipt generated on: ${new Date().toLocaleString()}
//         </div>
//     </div>

//     <script>
//         // Auto-print when page loads
//         window.onload = function() {
//             window.print();
//         }
//     </script>
// </body>
// </html>
//     `
//   }
// }
