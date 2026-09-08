import { z } from "zod";

const cardBrandSchema = z.enum([
    "VISA",
    "MASTERCARD",
    "ELO",
    "AMERICAN_EXPRESS",
    "HIPERCARD",
    "OTHER",
]);
const optionalDay = z.number().int().min(1).max(31).optional();
const periodSchema = z.object({
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(9999),
});

const cardFields = z.object({
    brand: cardBrandSchema.optional(),
    closingDay: optionalDay,
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    dueDay: optionalDay,
    lastDigits: z
        .string()
        .regex(/^\d{4}$/)
        .optional(),
    limit: z.number().int().positive().optional(),
    name: z.string().trim().min(1).max(120),
});

function validatesDays<T extends { closingDay?: number; dueDay?: number }>(schema: z.ZodType<T>) {
    return schema.refine(
        (input) => (input.closingDay === undefined) === (input.dueDay === undefined),
        "Closing and due days must be informed together",
    );
}

export const cardIdSchema = z.object({ id: z.string().min(1) });
export const createCardSchema = validatesDays(cardFields);
export const updateCardSchema = validatesDays(
    cardFields.partial().extend({ id: z.string().min(1) }),
);
export const cardsListSchema = z.object({ includeArchived: z.boolean().default(false) });

export const createPurchaseSchema = z
    .object({
        focusMonth: z.number().int().min(1).max(12),
        focusYear: z.number().int().min(2000).max(9999),
        amount: z.number().int().positive(),
        cardId: z.string().min(1),
        description: z.string().trim().min(1).max(500),
        installments: z.number().int().min(1).max(12),
        purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        remainderInstallment: z.number().int().min(1).max(12),
    })
    .refine(
        (input) => input.remainderInstallment <= input.installments,
        "Invalid remainder installment",
    );

export const listPurchasesSchema = periodSchema.extend({
    cardId: z.string().min(1).optional(),
    description: z.string().max(500).optional(),
    status: z.enum(["ALL", "ACTIVE", "ARCHIVED"]).default("ALL"),
});

export const anticipateSchema = z
    .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        focusMonth: z.number().int().min(1).max(12),
        focusYear: z.number().int().min(2000).max(9999),
        mode: z.enum(["SEPARATE", "GROUPED"]),
        purchaseId: z.string().min(1),
        selectedNumbers: z.array(z.number().int().min(1)).min(1),
        values: z.array(z.number().int().positive()).min(1),
    })
    .superRefine((input, ctx) => {
        if (new Set(input.selectedNumbers).size !== input.selectedNumbers.length) {
            ctx.addIssue({ code: "custom", message: "Installments cannot repeat" });
        }
        if (
            (input.mode === "GROUPED" && input.values.length !== 1) ||
            (input.mode === "SEPARATE" && input.values.length !== input.selectedNumbers.length)
        ) {
            ctx.addIssue({ code: "custom", message: "Invalid anticipation values" });
        }
    });

export const purchaseIdSchema = z.object({ id: z.string().min(1) });

export const updatePurchaseSchema = z.object({
    amount: z.number().int().positive().optional(),
    cardId: z.string().min(1).optional(),
    description: z.string().trim().min(1).max(500).optional(),
    focusMonth: z.number().int().min(1).max(12).optional(),
    focusYear: z.number().int().min(2000).max(9999).optional(),
    id: z.string().min(1),
    installments: z.number().int().min(1).max(12).optional(),
    purchaseDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    remainderInstallment: z.number().int().min(1).max(12).optional(),
});
