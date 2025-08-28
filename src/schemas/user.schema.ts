import { z } from "zod";

export const createUserSchema = z.object({
	email: z.string().email(),
	name: z.string().min(1).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
