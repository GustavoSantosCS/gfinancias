import { z } from "zod";

export const planningPeriodSchema = z.object({
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(2100),
});

export const phaseSchema = z.object({
    endDay: z.number().int().min(1).max(31),
    name: z.string().trim().min(1).max(80),
    startDay: z.number().int().min(1).max(31),
});

export const incomeCategorySchema = z.enum(["SALARY", "RESERVE", "OTHER"]);
export const expenseCategorySchema = z.enum([
    "FIXED",
    "VARIABLE_FIXED",
    "VARIABLE",
    "RESERVE",
    "INVESTMENT",
]);

export const recordSchema = z.object({
    amount: z.number().int().positive(),
    name: z.string().trim().min(1).max(120),
});

export const phaseIdSchema = z.object({ id: z.string().cuid() });

export const createIncomeSchema = recordSchema.extend({
    category: incomeCategorySchema,
    phaseId: z.string().cuid(),
});

export const updateIncomeSchema = recordSchema.extend({
    category: incomeCategorySchema,
    id: z.string().cuid(),
});

export const createExpenseSchema = recordSchema.extend({
    category: expenseCategorySchema,
    phaseId: z.string().cuid(),
});

export const updateExpenseSchema = recordSchema.extend({
    category: expenseCategorySchema,
    id: z.string().cuid(),
});

export type PlanningPeriod = z.infer<typeof planningPeriodSchema>;
export type PhaseInput = z.infer<typeof phaseSchema>;
export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;
export type UpdateIncomeInput = z.infer<typeof updateIncomeSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
