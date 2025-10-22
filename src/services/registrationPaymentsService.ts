import { prisma } from "@/config/database";
import { canAccessBranch } from "@/utils/auth";

export interface GetRegistrationFilters {
	page?: number;
	limit?: number;
	search?: string;
	status?: string;
	paymentOption?: string;
	branchId?: string;
}

export class RegistrationService {
	async getRegistrations(filters: GetRegistrationFilters, user: any) {
		const {
			page = 1,
			limit = 10,
			search = "",
			status = "",
			paymentOption = "",
			branchId = "",
		} = filters;

		const skip = (page - 1) * limit;
		const where: any = {};

		// 🔹 Filter based on user's role and branch/school access
		if (["BRANCH_ADMIN", "REGISTRAR"].includes(user.role) && user.branchId) {
			where.branchId = user.branchId;
		} else if (user.role !== "SUPER_ADMIN" && user.schoolId) {
			where.branch = { schoolId: user.schoolId };
		}

		// 🔹 Apply branch filter (if allowed)
		if (
			branchId &&
			(user.role === "SUPER_ADMIN" || canAccessBranch(user, branchId))
		) {
			where.branchId = branchId;
		}

		// 🔹 Apply status & paymentOption filters
		if (status && status !== "ALL") where.status = status;
		if (paymentOption && paymentOption !== "ALL")
			where.paymentOption = paymentOption;

		// 🔹 Search logic
		if (search) {
			where.OR = [
				{ registrationNumber: { contains: search, mode: "insensitive" } },
				{
					student: {
						user: {
							OR: [
								{ firstName: { contains: search, mode: "insensitive" } },
								{ lastName: { contains: search, mode: "insensitive" } },
								{ email: { contains: search, mode: "insensitive" } },
							],
						},
					},
				},
				{
					student: { studentId: { contains: search, mode: "insensitive" } },
				},
			];
		}

		// 🔹 Query registrations and count
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
						},
					},
					branch: { select: { id: true, name: true, code: true } },
					grade: { select: { id: true, name: true, level: true } },
					invoices: {
						select: {
							id: true,
							invoiceNumber: true,
							status: true,
							totalAmount: true,
							paidAmount: true,
						},
						orderBy: { createdAt: "desc" },
						take: 1,
					},
					payments: {
						select: {
							id: true,
							paymentNumber: true,
							paymentMethod: true,
							status: true,
							amount: true,
							createdAt: true,
						},
						orderBy: { createdAt: "desc" },
						take: 1,
					},
				},
				skip,
				take: limit,
				orderBy: { createdAt: "desc" },
			}),
			prisma.registration.count({ where }),
		]);

		return {
			registrations: registrations.map((r) => ({
				id: r.id,
				registrationNumber: r.registrationNumber,
				status: r.status,
				paymentOption: r.paymentOption,
				registrationFee: r.registrationFee,
				additionalFee: r.additionalFee,
				totalAmount: r.totalAmount,
				discountAmount: r.discountAmount,
				paidAmount: r.paidAmount,
				paymentDueDate: r.paymentDueDate,
				completedAt: r.completedAt,
				createdAt: r.createdAt,
				student: {
					id: r.student.id,
					studentId: r.student.studentId,
					studentType: r.student.studentType,
					user: r.student.user,
				},
				branch: r.branch,
				grade: r.grade,
				latestInvoice: r.invoices[0] || null,
				latestPayment: r.payments[0] || null,
			})),
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit),
			},
		};
	}
}

export const registrationService = new RegistrationService();
