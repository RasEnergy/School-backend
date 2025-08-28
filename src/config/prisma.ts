import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		log: [
			{ emit: "event", level: "query" },
			{ emit: "event", level: "error" },
			{ emit: "event", level: "warn" },
		],
	});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Optional: log slow queries
prisma.$on("query", (e: any) => {
	if (e.duration > 200) {
		console.warn(`[prisma] slow query ${e.duration}ms:`, e.query);
	}
});

export default prisma;
