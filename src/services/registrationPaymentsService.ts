import { prisma } from "@/config/database";
import { canAccessBranch } from "@/utils/auth";
import { smsService } from "@/utils/sms";

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

	async getRegistrationDetails(registrationId: any) {
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
				grade: true,
				invoices: {
					include: {
						payments: true,
					},
					orderBy: { createdAt: "desc" },
					take: 1,
				},
			},
		});

		return registration;
	}

	async handlePayment(data: any) {
		const {
			user,
			registrationId,
			paymentMethod,
			discountPercentage = 0,
			receiptNumber,
			transactionNumber,
			paidAmount,
			notes,
			paymentDate,
		} = data;

		if (!registrationId || !paymentMethod)
			throw new Error("Registration ID and payment method are required");

		// 🔍 Validate manual payments
		if (["CASH", "BANK_TRANSFER"].includes(paymentMethod)) {
			if (!receiptNumber && !transactionNumber)
				throw new Error("Receipt or transaction number is required");
			if (!paidAmount || paidAmount <= 0)
				throw new Error("Paid amount is required for manual payments");
		}

		// 🔢 Validate discount range
		if (discountPercentage < 0 || discountPercentage > 100)
			throw new Error("Discount percentage must be between 0 and 100");

		const registration = await prisma.registration.findUnique({
			where: { id: registrationId },
			include: {
				student: {
					include: {
						user: true,
						parents: {
							include: {
								parent: {
									include: { user: true },
								},
							},
						},
					},
				},
				branch: true,
				grade: true,
				invoices: { include: { payments: true } },
			},
		});

		if (!registration) throw new Error("Registration not found");

		if (registration.status !== "PENDING_PAYMENT")
			throw new Error("Registration payment already completed");

		// 🚫 Branch access check
		if (
			["BRANCH_ADMIN", "REGISTRAR", "CASHIER"].includes(user.role) &&
			registration.branchId !== user.branchId
		)
			throw new Error("Access denied");

		// 💰 Amount calculations
		const registrationFee = Number(registration.registrationFee) || 0;
		const additionalFee = Number(registration.additionalFee) || 0;
		const baseTotal = registrationFee + additionalFee;
		const discountAmount = (baseTotal * discountPercentage) / 100;
		const finalAmount = baseTotal - discountAmount;
		const actualPaidAmount = ["CASH", "BANK_TRANSFER"].includes(paymentMethod)
			? Number(paidAmount)
			: finalAmount;

		// 🧾 Transaction block
		const result = await prisma.$transaction(async (tx) => {
			const paymentCount = await tx.payment.count();
			const invoiceCount = await tx.invoice.count();
			const paymentNumber = `PAY-${Date.now()}-${(paymentCount + 1)
				.toString()
				.padStart(4, "0")}`;
			const invoiceNumber = `INV-${Date.now()}-${(invoiceCount + 1)
				.toString()
				.padStart(4, "0")}`;

			// Fee types
			const feeTypes = await tx.feeType.findMany({
				where: {
					name: {
						in: ["Registration Fee", "Monthly Fee", "Quarterly Fee"],
					},
				},
			});
			const regType = feeTypes.find((ft) => ft.name === "Registration Fee");
			const monthType = feeTypes.find((ft) => ft.name === "Monthly Fee");
			const quarterType = feeTypes.find((ft) => ft.name === "Quarterly Fee");

			// Invoice creation
			const invoice = await tx.invoice.create({
				data: {
					invoiceNumber,
					studentId: registration.studentId,
					branchId: registration.branchId,
					registrationId: registration.id,
					totalAmount: baseTotal,
					discountAmount,
					finalAmount,
					paidAmount: actualPaidAmount,
					status: ["CASH", "BANK_TRANSFER"].includes(paymentMethod)
						? "PAID"
						: "PENDING",
					dueDate: registration.paymentDueDate,
					createdById: user.id,
				},
			});

			// Invoice items
			const items = [];
			if (regType && registrationFee > 0)
				items.push({
					invoiceId: invoice.id,
					feeTypeId: regType.id,
					description: "Registration Fee",
					amount: registrationFee,
					quantity: 1,
				});

			if (additionalFee > 0) {
				let feeType = null;
				let description = "Additional Fee";
				if (
					registration.paymentOption === "REGISTRATION_MONTHLY" &&
					monthType
				) {
					feeType = monthType;
					description = "Monthly Fee (1st & Last Month)";
				} else if (
					registration.paymentOption === "REGISTRATION_QUARTERLY" &&
					quarterType
				) {
					feeType = quarterType;
					description = "Quarterly Fee (2.5 Months)";
				}
				if (feeType)
					items.push({
						invoiceId: invoice.id,
						feeTypeId: feeType.id,
						description,
						amount: additionalFee,
						quantity: 1,
					});
			}

			if (items.length > 0) await tx.invoiceItem.createMany({ data: items });

			// Payment record
			const payment = await tx.payment.create({
				data: {
					paymentNumber,
					invoiceId: invoice.id,
					studentId: registration.studentId,
					registrationId: registration.id,
					amount: actualPaidAmount,
					transactionId: receiptNumber || transactionNumber || null,
					notes: notes || null,
					paymentDate: new Date(paymentDate),
					processedById: user.id,
					branchId: registration.branchId,
					paymentMethod,
					status: ["CASH", "BANK_TRANSFER"].includes(paymentMethod)
						? "COMPLETED"
						: "PENDING",
				},
			});

			const updatedRegistration = await tx.registration.update({
				where: { id: registrationId },
				data: {
					status: ["CASH", "BANK_TRANSFER"].includes(paymentMethod)
						? "PAYMENT_COMPLETED"
						: "PENDING_PAYMENT",
					paidAmount: actualPaidAmount,
					discountPercentage:
						discountPercentage > 0 ? discountPercentage : null,
					discountAmount: discountAmount > 0 ? discountAmount : null,
					completedAt: ["CASH", "BANK_TRANSFER"].includes(paymentMethod)
						? new Date()
						: null,
				},
				include: {
					student: {
						include: {
							user: true,
							parents: {
								include: {
									parent: {
										include: { user: true },
									},
								},
							},
						},
					},
					branch: true,
					grade: true,
				},
			});

			return { invoice, payment, registration: updatedRegistration };
		});

		// 📱 SMS Confirmation
		const parentPhone =
			result.registration.student.parents[0]?.parent.user.phone;
		const studentName = `${result.registration.student.user.firstName} ${result.registration.student.user.lastName}`;

		if (parentPhone) {
			if (["CASH", "BANK_TRANSFER"].includes(paymentMethod)) {
				await smsService.sendEnhancedRegistrationConfirmation(
					parentPhone,
					studentName,
					result.registration.student.studentId,
					result.registration.registrationNumber,
					actualPaidAmount,
					result.registration.grade?.name || "Not Assigned",
					discountPercentage
				);
			} else {
				const paymentLink = `${process.env.APP_URL}/payment/${result.invoice.id}`;
				await smsService.sendPaymentLink(
					parentPhone,
					studentName,
					result.registration.student.studentId,
					Number(actualPaidAmount),
					paymentLink,
					result.invoice.invoiceNumber
				);
			}
		}

		return {
			message: ["CASH", "BANK_TRANSFER"].includes(paymentMethod)
				? "Payment completed successfully"
				: "Registration payment processed successfully",
			registration: result.registration,
			invoice: result.invoice,
			payment: result.payment,
			redirectTo: ["CASH", "BANK_TRANSFER"].includes(paymentMethod)
				? `/registration/success/${result.registration.id}`
				: `/dashboard/invoices/${result.invoice.id}`,
		};
	}
}

export const registrationService = new RegistrationService();
