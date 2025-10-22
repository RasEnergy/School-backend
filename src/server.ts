import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser"; // Added cookie-parser import
import dotenv from "dotenv";

// Import routes
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import studentRoutes from "./routes/students";
import schoolRoutes from "./routes/schools";
import branchRoutes from "./routes/branches";
import classRoutes from "./routes/classes";
import enrollmentRoutes from "./routes/enrollments";
import invoiceRoutes from "./routes/invoices";
import paymentRoutes from "./routes/payments";
import registrationRoutes from "./routes/registrations";
import registrationPaymentRoutes from "./routes/registration-payments";

import subjectRoutes from "./routes/subjects";
import teacherRoutes from "./routes/teachers";
import lessonRoutes from "./routes/lessons";
import moduleRoutes from "./routes/modules";
<<<<<<< HEAD
import pricingRoutes from "./routes/pricing";
import parentRoutes from "./routes/parents";

=======
import pricingRoutes from "./routes/pricing"
import parentRoutes from "./routes/parents"
import attendanceRoutes from "./routes/attendance"
import receiptRoute from "./routes/receipt"
>>>>>>> b22edc9ad97ed3c11bd29d89a12e04d803f74be6
// Import middleware
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
// const limiter = rateLimit({
// 	windowMs: 15 * 60 * 1000, // 15 minutes
// 	max: 100, // limit each IP to 100 requests per windowMs
// 	message: "Too many requests from this IP, please try again later.",
// });
// app.use("/api/", limiter);

// CORS configuration
// app.use(
// 	cors({
// 		origin: "*",
// 		credentials: true,
// 		methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
// 		allowedHeaders: ["Content-Type", "Authorization", "Accept"],
// 	})
// );

app.use(
	cors({
		// origin: "http://5.75.243.13:36443", // frontend URL
		origin: "http://localhost:3000", // frontend URL
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
		allowedHeaders: ["Content-Type", "Authorization", "Accept"],
	})
);

// app.options("*", cors());

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser()); // Added cookie parser middleware to handle req.cookies

// Logging middleware
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Health check endpoint
app.get("/health", (req, res) => {
	res.status(200).json({
		status: "OK",
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
	});
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/schools", schoolRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/registration-payments", registrationPaymentRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/modules", moduleRoutes);
app.use("/api/pricing", pricingRoutes)
app.use("/api/parents", parentRoutes)
app.use("/api/attendance", attendanceRoutes)
app.use("/api/receipts", receiptRoute)
// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
	console.log(`Health check: http://localhost:${PORT}/health`);
	console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

export default app;
