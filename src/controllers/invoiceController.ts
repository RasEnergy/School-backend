import type { Request, Response } from "express";
import { invoiceService } from "../services/invoiceService";

export const invoiceController = {
	async getInvoices(req: Request, res: Response) {
		try {
			const {
				page = "1",
				limit = "10",
				status,
				branchId,
				paymentMethod,
				search,
			} = req.query;
			const user = req.user;
			if (!user) {
				return res.status(401).json({ error: "Unauthorized" });
			}

			const filters = {
				page: Number.parseInt(page as string),
				limit: Number.parseInt(limit as string),
				status: status as string,
				branchId: branchId as string,
				paymentMethod: paymentMethod as string,
				search: search as string,
			};

			const result = await invoiceService.getInvoices(filters, user);
			res.json(result);
		} catch (error) {
			console.error("Get invoices error:", error);
			res.status(500).json({ error: "Internal server error" });
		}
	},

	async exportInvoices(req: Request, res: Response) {
		try {
			const user = req.user;
			if (!user) {
				return res.status(401).json({ error: "Unauthorized" });
			}
			const {
				status,
				branchId,
				paymentMethod,
				search,
				format = "excel",
			} = req.query;

			const filters = {
				status: status as string,
				branchId: branchId as string,
				paymentMethod: paymentMethod as string,
				search: search as string,
			};

			const buffer = await invoiceService.exportInvoices(
				filters,
				user,
				format as string
			);

			const filename = `invoices-export-${
				new Date().toISOString().split("T")[0]
			}.xlsx`;

			res.setHeader(
				"Content-Type",
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
			);
			res.setHeader(
				"Content-Disposition",
				`attachment; filename="${filename}"`
			);
			res.send(buffer);
		} catch (error) {
			console.error("Export invoices error:", error);
			res.status(500).json({ error: "Failed to export invoices" });
		}
	},

	async getInvoiceById(req: Request, res: Response) {
		try {
			const { id } = req.params;
			const user = req.user;
			if (!user) {
				return res.status(401).json({ error: "Unauthorized" });
			}
			const invoice = await invoiceService.getInvoiceById(id, user);

			if (!invoice) {
				return res.status(404).json({ error: "Invoice not found" });
			}

			res.json(invoice);
		} catch (error) {
			console.error("Get invoice by ID error:", error);
			res.status(500).json({ error: "Internal server error" });
		}
	},

	async confirmPayment(req: Request, res: Response) {
		try {
			const { id } = req.params;
			const user = req.user;
			if (!user) {
				return res.status(401).json({ error: "Unauthorized" });
			}
			const { transactionReference, notes } = req.body;

			const result = await invoiceService.confirmPayment(
				id,
				transactionReference,
				notes,
				user
			);

			res.json({
				message: "Payment confirmed successfully",
				invoice: result.updatedInvoice,
				payment: result.updatedPayment,
			});
		} catch (error: any) {
			console.error("Confirm payment error:", error);
			if (error.message === "Invoice not found") {
				return res.status(404).json({ error: error.message });
			}
			if (
				error.message === "Invoice already paid" ||
				error.message === "No pending payment found"
			) {
				return res.status(400).json({ error: error.message });
			}
			res.status(500).json({ error: "Internal server error" });
		}
	},

	async resendPaymentLink(req: Request, res: Response) {
		try {
			const { id } = req.params;

			const user = req.user;
			if (!user) {
				return res.status(401).json({ error: "Unauthorized" });
			}

			const result = await invoiceService.resendPaymentLink(id, user);

			// Here you would integrate with your SMS service
			// await smsService.resendPaymentLink(result.parentPhone, ...)

			res.json({
				message: "Payment link resent successfully",
			});
		} catch (error: any) {
			console.error("Resend payment link error:", error);
			if (error.message === "Invoice not found") {
				return res.status(404).json({ error: error.message });
			}
			if (
				error.message === "No pending online payment found" ||
				error.message === "Parent phone number not found"
			) {
				return res.status(400).json({ error: error.message });
			}
			res.status(500).json({ error: "Internal server error" });
		}
	},
};
