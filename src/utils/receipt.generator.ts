export function generatePrintableReceipt(data: {
	schoolName: string;
	invoiceNumber: string;
	studentName: string;
	studentId: string;
	branchName: string;
	gradeName: string;
	parentName: string;
	parentPhone: string;
	paymentMethod: string;
	items: Array<{
		description: string;
		feeType: string;
		quantity: number;
		amount: number;
	}>;
	totalAmount: number;
	discountAmount: number;
	finalAmount: number;
	receiptNumber: string;
	transactionNumber: string;
	paymentDate: Date;
	cashierName: string;
}) {
	return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Payment Receipt - ${data.receiptNumber}</title>
<style>
	@page {
		size: A4;
		margin: 0.5in;
	}
	
	@media print {
		body { 
			margin: 0; 
			font-size: 12px;
			line-height: 1.3;
		}
		.no-print { display: none; }
		.page-break { page-break-before: always; }
	}
	
	body {
		font-family: 'Arial', sans-serif;
		max-width: 100%;
		margin: 0 auto;
		padding: 10px;
		background: white;
		color: #333;
		font-size: 12px;
		line-height: 1.3;
	}
	
	.receipt-header {
		text-align: center;
		border-bottom: 2px solid #2563eb;
		padding-bottom: 15px;
		margin-bottom: 20px;
	}
	
	.school-name {
		font-size: 22px;
		font-weight: bold;
		color: #2563eb;
		margin-bottom: 3px;
	}
	
	.receipt-title {
		font-size: 16px;
		color: #666;
		margin-bottom: 8px;
	}
	
	.receipt-info {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
		align-items: start;
		margin-bottom: 20px;
	}
	
	.info-section {
		padding: 8px;
		border: 1px solid #ccc;
		border-radius: 4px;
	}

	.info-title {
		font-weight: bold;
		color: #1e40af;
		margin-bottom: 8px;
		font-size: 13px;
	}
			
	.info-item {
		display: flex;
		justify-content: space-between;
		margin-bottom: 6px;
		padding: 2px 0;
	}
	
	.info-label {
		color: #666;
		font-weight: 500;
		font-size: 11px;
	}
	
	.info-value {
		font-weight: 600;
		color: #333;
		font-size: 11px;
	}
	
	.items-table {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 20px;
		background: white;
		box-shadow: 0 1px 3px rgba(0,0,0,0.1);
		font-size: 11px;
	}
	
	.items-table th {
		background: #2563eb;
		color: white;
		padding: 8px;
		text-align: left;
		font-weight: 600;
		font-size: 11px;
	}
	
	.items-table td {
		padding: 8px;
		border-bottom: 1px solid #e5e7eb;
		font-size: 11px;
	}
	
	.items-table tr:nth-child(even) {
		background: #f9fafb;
	}
	
	.amount-cell {
		text-align: right;
		font-weight: 600;
	}
	
	.payment-summary {
		background: #f0f9ff;
		border: 2px solid #2563eb;
		border-radius: 6px;
		padding: 15px;
		margin-bottom: 20px;
	}
	
	.summary-row {
		display: flex;
		justify-content: space-between;
		margin-bottom: 8px;
		padding: 3px 0;
		font-size: 12px;
	}
	
	.summary-total {
		border-top: 2px solid #2563eb;
		padding-top: 8px;
		font-size: 14px;
		font-weight: bold;
		color: #2563eb;
	}
	
	.receipt-footer {
		text-align: center;
		margin-top: 25px;
		padding-top: 15px;
		border-top: 1px solid #e5e7eb;
		color: #666;
	}
	
	.print-date {
		font-size: 10px;
		color: #999;
	}
	
	.thank-you {
		font-size: 14px;
		color: #2563eb;
		font-weight: 600;
		margin-bottom: 8px;
	}
	
	.transaction-details {
		display: grid; 
		grid-template-columns: 1fr 1fr; 
		gap: 15px; 
		margin-bottom: 20px;
	}
	
	@media (max-width: 768px) {
		.receipt-info, .transaction-details {
			grid-template-columns: 1fr;
		}
		
		.school-name {
			font-size: 20px;
		}
	}
</style>
</head>
<body>
<div class="receipt-header">
	<div class="school-name">${data.schoolName}</div>
	<div class="receipt-title">PAYMENT RECEIPT</div>
	<div style="font-size: 12px; color: #666;">Receipt #: ${
		data.receiptNumber
	}</div>
</div>

<div class="receipt-info">
	<div class="info-section">
		<div class="info-title">Student Information</div>
		<div class="info-item">
			<span class="info-label">Student Name:</span>
			<span class="info-value">${data.studentName}</span>
		</div>
		<div class="info-item">
			<span class="info-label">Student ID:</span>
			<span class="info-value">${data.studentId}</span>
		</div>
		<div class="info-item">
			<span class="info-label">Grade:</span>
			<span class="info-value">${data.gradeName}</span>
		</div>
		<div class="info-item">
			<span class="info-label">Branch:</span>
			<span class="info-value">${data.branchName}</span>
		</div>
	</div>

	<div class="info-section">
		<div class="info-title">Parent Information</div>
		<div class="info-item">
			<span class="info-label">Parent Name:</span>
			<span class="info-value">${data.parentName}</span>
		</div>
		<div class="info-item">
			<span class="info-label">Phone Number:</span>
			<span class="info-value">${data.parentPhone}</span>
		</div>
		<div class="info-item">
			<span class="info-label">Payment Date:</span>
			<span class="info-value">${data.paymentDate.toLocaleDateString()}</span>
		</div>
		<div class="info-item">
			<span class="info-label">Payment Method:</span>
			<span class="info-value">${data.paymentMethod.replace("_", " ")}</span>
		</div>
	</div>
</div>

<table class="items-table">
	<thead>
		<tr>
			<th>Description</th>
			<th>Fee Type</th>
			<th style="text-align: center;">Qty</th>
			<th style="text-align: right;">Amount (ETB)</th>
		</tr>
	</thead>
	<tbody>
		${data.items
			.map(
				(item) => `
			<tr>
				<td>${item.description}</td>
				<td>${item.feeType}</td>
				<td style="text-align: center;">${item.quantity}</td>
				<td class="amount-cell">${item.amount.toLocaleString()}</td>
			</tr>
		`
			)
			.join("")}
	</tbody>
</table>

<div class="payment-summary">
	<div class="summary-row">
		<span>Subtotal:</span>
		<span>ETB ${data.totalAmount.toLocaleString()}</span>
	</div>
	${
		data.discountAmount > 0
			? `
	<div class="summary-row" style="color: #059669;">
		<span>Discount:</span>
		<span>- ETB ${data.discountAmount.toLocaleString()}</span>
	</div>
	`
			: ""
	}
	<div class="summary-row summary-total">
		<span>Total Paid:</span>
		<span>ETB ${data.finalAmount.toLocaleString()}</span>
	</div>
</div>

<div class="transaction-details">
	<div class="info-section">
		<div class="info-title">Transaction Details</div>
		<div class="info-item">
			<span class="info-label">Invoice Number:</span>
			<span class="info-value">${data.invoiceNumber}</span>
		</div>
		<div class="info-item">
			<span class="info-label">Transaction ID:</span>
			<span class="info-value">${data.transactionNumber}</span>
		</div>
		<div class="info-item">
			<span class="info-label">Processed By:</span>
			<span class="info-value">${data.cashierName}</span>
		</div>
	</div>
	
	<div class="info-section">
		<div class="info-title">Important Notes</div>
		<div style="font-size: 10px; color: #666; line-height: 1.3;">
			• Keep this receipt for your records<br>
			• Contact the school office for any payment inquiries<br>
			• This receipt serves as proof of payment<br>
			• Valid for all official school purposes
		</div>
	</div>
</div>

<div class="receipt-footer">
	<div class="thank-you">Thank you for your payment!</div>
	<div style="font-size: 12px; margin-bottom: 8px;">
		For inquiries, please contact the school administration office.
	</div>
	<div class="print-date">
		Receipt generated on: ${new Date().toLocaleString()}
	</div>
</div>

<script>
	// Auto-print when page loads (optional)
	window.onload = function() {
		// Uncomment the line below if you want auto-print
		// window.print();
	}
</script>
</body>
</html>
`;
}
