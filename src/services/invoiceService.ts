import { prisma } from "@/config/database"
import * as XLSX from "xlsx"

interface InvoiceFilters {
  page?: number
  limit?: number
  status?: string
  branchId?: string
  paymentMethod?: string
  search?: string
}

interface User {
  id: string
  role: string
  branchId?: string
}

export const invoiceService = {
  async getInvoices(filters: InvoiceFilters, user: User) {
    const { page = 1, limit = 10, status, branchId, paymentMethod, search } = filters
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    // Branch filtering based on user role
    if (user.role === "BRANCH_ADMIN" || user.role === "REGISTRAR" || user.role === "CASHIER") {
      where.branchId = user.branchId
    } else if (branchId) {
      where.branchId = branchId
    }

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        {
          student: {
            user: { firstName: { contains: search, mode: "insensitive" } },
          },
        },
        {
          student: {
            user: { lastName: { contains: search, mode: "insensitive" } },
          },
        },
        { student: { studentId: { contains: search, mode: "insensitive" } } },
      ]
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
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
              registration: {
                select: {
                  registrationNumber: true,
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
            orderBy: { createdAt: "desc" },
            select: {
              paymentMethod: true,
              status: true,
              transactionId: true,
              paymentDate: true,
            },
          },
          createdBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ])

    const transformedInvoices = invoices.map((invoice) => ({
      ...invoice,
      registration: invoice.student.registration || null,
      student: {
        ...invoice.student,
        parents: invoice.student.parents.map((parent) => ({
          ...parent,
          parent: {
            ...parent.parent,
            user: parent.parent.user,
          },
        })),
      },
    }))

    return {
      invoices: transformedInvoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  },

  async exportInvoices(filters: Omit<InvoiceFilters, "page" | "limit">, user: User, format: string) {
    const where: any = {}

    // Branch filtering based on user role
    if (user.role === "BRANCH_ADMIN" || user.role === "REGISTRAR" || user.role === "CASHIER") {
      where.branchId = user.branchId
    } else if (filters.branchId) {
      where.branchId = filters.branchId
    }

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.search) {
      where.OR = [
        { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
        {
          student: {
            user: { firstName: { contains: filters.search, mode: "insensitive" } },
          },
        },
        {
          student: {
            user: { lastName: { contains: filters.search, mode: "insensitive" } },
          },
        },
        { student: { studentId: { contains: filters.search, mode: "insensitive" } } },
      ]
    }

    const invoices = await prisma.invoice.findMany({
      where,
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
            registration: {
              select: {
                registrationNumber: true,
              },
            },
          },
        },
        branch: true,
        payments: {
          orderBy: { createdAt: "desc" },
          select: {
            paymentMethod: true,
            status: true,
            transactionId: true,
            paymentDate: true,
          },
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const exportData = invoices.map((invoice) => ({
      "Invoice Number": invoice.invoiceNumber,
      "Transaction ID": invoice.payments[0]?.transactionId || "N/A",
      "Registration Number": invoice.student.registration?.registrationNumber || "N/A",
      "Student Name": `${invoice.student.user.firstName} ${invoice.student.user.lastName}`,
      "Student ID": invoice.student.studentId,
      "Parent Name": invoice.student.parents[0]?.parent.user.firstName
        ? `${invoice.student.parents[0].parent.user.firstName} ${invoice.student.parents[0].parent.user.lastName}`
        : "N/A",
      "Parent Phone": invoice.student.parents[0]?.parent.user.phone || "N/A",
      Branch: invoice.branch.name,
      "Total Amount": invoice.totalAmount,
      "Paid Amount": invoice.paidAmount,
      Status: invoice.status,
      "Payment Method": invoice.payments[0]?.paymentMethod || "N/A",
      "Payment Date": invoice.payments[0]?.paymentDate
        ? new Date(invoice.payments[0].paymentDate).toLocaleDateString()
        : "N/A",
      "Created By": `${invoice.createdBy.firstName} ${invoice.createdBy.lastName}`,
      "Created At": new Date(invoice.createdAt).toLocaleDateString(),
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices")

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
    return buffer
  },

  async getInvoiceById(id: string, user: User) {
    const where: any = { id }

    // Branch filtering based on user role
    if (user.role === "BRANCH_ADMIN" || user.role === "REGISTRAR" || user.role === "CASHIER") {
      where.branchId = user.branchId
    }

    const invoice = await prisma.invoice.findFirst({
      where,
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
            registration: {
              select: {
                registrationNumber: true,
                paymentDuration: true,
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
          orderBy: { createdAt: "desc" },
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!invoice) return null

    return {
      ...invoice,
      registration: invoice.student.registration || null,
      student: {
        ...invoice.student,
        parents: invoice.student.parents.map((parent) => ({
          ...parent,
          parent: {
            ...parent.parent,
            user: parent.parent.user,
          },
        })),
      },
    }
  },

  async confirmPayment(invoiceId: string, transactionReference?: string, notes?: string, user?: User) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        ...(user?.role === "BRANCH_ADMIN" || user?.role === "REGISTRAR" || user?.role === "CASHIER"
          ? { branchId: user?.branchId }
          : {}),
      },
      include: {
        payments: true,
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
      },
    })

    if (!invoice) {
      throw new Error("Invoice not found")
    }

    if (invoice.status === "PAID") {
      throw new Error("Invoice already paid")
    }

    const pendingPayment = invoice.payments.find((p) => p.status === "PENDING")
    if (!pendingPayment) {
      throw new Error("No pending payment found")
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update payment status
      const updatedPayment = await tx.payment.update({
        where: { id: pendingPayment.id },
        data: {
          status: "COMPLETED",
          transactionId: transactionReference,
          notes: notes || pendingPayment.notes,
        },
      })

      // Update invoice status
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: "PAID",
          paidAmount: invoice.totalAmount,
        },
      })

      // Update registration status if this is a registration payment
      const registration = await tx.registration.findFirst({
        where: { studentId: invoice.studentId, status: "PENDING_PAYMENT" },
      })

      if (registration) {
        await tx.registration.update({
          where: { id: registration.id },
          data: {
            status: "PAYMENT_COMPLETED",
            completedAt: new Date(),
            paidAmount: invoice.totalAmount,
          },
        })
      }

      return { updatedPayment, updatedInvoice, registration }
    })

    return result
  },

  async resendPaymentLink(invoiceId: string, user: User) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        ...(user.role === "BRANCH_ADMIN" || user.role === "REGISTRAR" || user.role === "CASHIER"
          ? { branchId: user.branchId }
          : {}),
      },
      include: {
        payments: true,
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
      },
    })

    if (!invoice) {
      throw new Error("Invoice not found")
    }

    const pendingPayment = invoice.payments.find(
      (p) => p.status === "PENDING" && (p.paymentMethod === "TELEBIRR" || p.paymentMethod === "ONLINE"),
    )

    if (!pendingPayment) {
      throw new Error("No pending online payment found")
    }

    const parentPhone = invoice.student.parents[0]?.parent.user.phone
    if (!parentPhone) {
      throw new Error("Parent phone number not found")
    }

    // Generate new invoice number
    const invoiceCount = await prisma.invoice.count()
    const newInvoiceNumber = `INV-${Date.now()}-${(invoiceCount + 1).toString().padStart(4, "0")}`

    // Update invoice with new invoice number
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { invoiceNumber: newInvoiceNumber },
    })

    return {
      invoice: updatedInvoice,
      parentPhone,
      paymentLink: `${process.env.NEXT_PUBLIC_APP_URL}/payment/${invoiceId}`,
    }
  },
}
