// Client-side error handling utilities

export interface ApiError {
	message: string;
	status?: number;
	code?: string;
	details?: any[];
}

export class ApiErrorHandler {
	static handle(error: any): ApiError {
		// Network errors
		if (error instanceof TypeError && error.message.includes("fetch")) {
			return {
				message: "Network error. Please check your connection and try again.",
				status: 0,
				code: "NETWORK_ERROR",
			};
		}

		// API errors with structured response
		if (error.response) {
			return {
				message: error.response.error || "An error occurred",
				status: error.response.status,
				code: error.response.code,
				details: error.response.details,
			};
		}

		// Generic errors
		if (error instanceof Error) {
			return {
				message: error.message,
				code: "GENERIC_ERROR",
			};
		}

		// Unknown errors
		return {
			message: "An unexpected error occurred",
			code: "UNKNOWN_ERROR",
		};
	}

	static getErrorMessage(error: any): string {
		const apiError = this.handle(error);
		return apiError.message;
	}

	static isNetworkError(error: any): boolean {
		const apiError = this.handle(error);
		return apiError.code === "NETWORK_ERROR";
	}

	static isAuthError(error: any): boolean {
		const apiError = this.handle(error);
		return apiError.status === 401 || apiError.status === 403;
	}

	static isValidationError(error: any): boolean | any {
		const apiError = this.handle(error);
		return (
			apiError.status === 400 && apiError.details && apiError.details.length > 0
		);
	}
}

// Toast notification helper for errors
export const showErrorToast = (error: any, toast: any) => {
	const apiError = ApiErrorHandler.handle(error);

	toast({
		title: "Error",
		description: apiError.message,
		variant: "destructive",
	});
};

// Toast notification helper for success
export const showSuccessToast = (message: string, toast: any) => {
	toast({
		title: "Success",
		description: message,
	});
};
