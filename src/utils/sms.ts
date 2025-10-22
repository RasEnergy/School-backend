import axios from "axios";
interface SMSService {
	sendRegistrationConfirmation(
		phone: string,
		studentName: string,
		studentId: string,
		registrationNumber: string,
		amount: number
	): Promise<void>;

	sendPaymentLink(
		phone: string,
		studentName: string,
		studentId: string,
		amount: number,
		paymentLink: string,
		invoiceNumber: string
	): Promise<void>;

	sendPaymentConfirmation(
		phone: string,
		studentName: string,
		studentId: string,
		amount: number,
		paymentMethod: string
	): Promise<void>;

	sendEnrollmentConfirmation(
		phone: string,
		studentName: string,
		studentId: string,
		className: string
	): Promise<void>;

	resendPaymentLink(
		phone: string,
		studentName: string,
		paymentLink: string,
		amount: number,
		invoiceNumber: string
	): Promise<void>;
}

class SMSServiceImpl implements SMSService {
	async sendSMS(phone: string, message: string): Promise<void> {
		try {
			// Here you would integrate with your SMS provider (e.g., Twilio, AWS SNS, etc.)
			console.log(`Sending SMS to ${phone}: ${message}`);
			const sender = "YekaMichael";
			const requestBody = {
				from: process.env.AFRO_MESSAGES_SENDER_ID,
				sender: sender,
				to: phone,
				message: message,
				callback: process.env.AFRO_MESSAGES_CALLBACK_URL || "",
			};

			console.log("AFRO_MESSAGES_API_KEY:", process.env.AFRO_MESSAGES_API_KEY);

			const response = await axios.post(
				process.env.AFRO_MESSAGES_BASE_URL ||
					"https://api.afromessage.com/api/send",
				requestBody,
				{
					headers: {
						"Authorization": `Bearer ${process.env.AFRO_MESSAGES_API_KEY}`,
						"Content-Type": "application/json",
					},
				}
			);

			// Handle the response from AfroMessage
			if (response.status === 200) {
				const data = response.data;
				await this.logSMS(phone, message, "SENT");
				// if (data && data.acknowledge === "success") {
				// 	res.status(200).json({ message: "API success", data: data });
				// } else {
				// 	res.status(200).json({ message: "API failure", data: data });
				// }
			} else {
				console.error(
					"AfroMessage API responded with an error:",
					response.status,
					response.data
				);
				await this.logSMS(phone, message, "FAILED");
			}
			// Log to database for tracking
			// await this.logSMS(phone, message, "SENT");
		} catch (error) {
			console.error("SMS sending failed:", error);
			await this.logSMS(
				phone,
				message,
				"FAILED",
				error instanceof Error ? error.message : "Unknown error"
			);
			throw error;
		}
	}

	private async logSMS(
		phone: string,
		message: string,
		status: "PENDING" | "SENT" | "DELIVERED" | "FAILED",
		errorMessage?: string
	): Promise<void> {
		try {
			const { prisma } = await import("@/config/database");
			await prisma.sMSLog.create({
				data: {
					recipient: phone,
					message,
					status,
					errorMessage,
					sentAt: status === "SENT" ? new Date() : null,
				},
			});
		} catch (error) {
			console.error("Failed to log SMS:", error);
		}
	}

	async sendRegistrationConfirmation(
		phone: string,
		studentName: string,
		studentId: string,
		registrationNumber: string,
		amount: number
	): Promise<void> {
		const message = `Dear Parent, ${studentName} (ID: ${studentId}) has been successfully registered. Registration No: ${registrationNumber}. Payment of ETB ${amount} confirmed. Welcome to Yeka Michael Schools!`;
		await this.sendSMS(phone, message);
	}

	async sendEnhancedRegistrationConfirmation(
		phone: string,
		studentName: string,
		studentId: string,
		registrationNumber: string,
		amount: number,
		gradeName: string,
		discountPercentage?: number
	): Promise<void> {
		let message = `Dear Parent, REGISTRATION SUCCESSFUL! ${studentName} (Student ID: ${studentId}) has been registered in ${gradeName}. Registration No: ${registrationNumber}. Payment: ETB ${amount.toLocaleString()}`;

		if (discountPercentage && discountPercentage > 0) {
			// message += ` (${discountPercentage}% discount applied)`;
			message += ` (${discountPercentage} discount applied)`;
		}

		message += `. Welcome to Yeka Michael Schools! Next step: Enrollment confirmation will follow.`;

		await this.sendSMS(phone, message);
	}

	async sendPaymentLink(
		phone: string,
		studentName: string,
		studentId: string,
		amount: number,
		paymentLink: string,
		invoiceNumber: string
	): Promise<void> {
		const message = `Dear Parent, payment for ${studentName} (ID: ${studentId}) registration is required. Amount: ETB ${amount}. Pay online: ${paymentLink} Invoice: ${invoiceNumber}. Yeka Michael Schools.`;
		await this.sendSMS(phone, message);
	}

	async sendPaymentConfirmation(
		phone: string,
		studentName: string,
		studentId: string,
		amount: number,
		paymentMethod: string
	): Promise<void> {
		const message = `Dear Parent, payment of ETB ${amount} for ${studentName} (ID: ${studentId}) has been confirmed via ${paymentMethod}. Thank you! Yeka Michael Schools.`;
		await this.sendSMS(phone, message);
	}

	async sendEnrollmentConfirmation(
		phone: string,
		studentName: string,
		studentId: string,
		className: string
	): Promise<void> {
		const message = `Dear Parent, ${studentName} (ID: ${studentId}) has been successfully enrolled in ${className}. Classes begin soon. Yeka Michael Schools.`;
		await this.sendSMS(phone, message);
	}

	async resendPaymentLink(
		phone: string,
		studentName: string,
		paymentLink: string,
		amount: number,
		invoiceNumber: string
	): Promise<void> {
		const message = `Dear Parent, payment link for ${studentName} registration: ${paymentLink} Amount: ETB ${amount}. Invoice: ${invoiceNumber}. Yeka Michael Schools.`;
		await this.sendSMS(phone, message);
	}
}

export const smsService = new SMSServiceImpl();
