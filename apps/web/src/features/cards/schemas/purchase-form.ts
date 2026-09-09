import { z } from "zod";

import type { PurchaseInput, PurchaseUpdateInput } from "../types";
import { parseCents } from "@/lib/money";
import { formValue } from "../utils/form-data";
import type { FormResult } from "./form-result";
import { issuesToErrors } from "./form-result";

const baseSchema = z.object({
    amount: z.number().int().positive(),
    cardId: z.string().min(1),
    description: z.string().trim().max(500).optional(),
    installments: z.number().int().min(1).max(12),
    purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    remainderInstallment: z.number().int().min(1).max(12).optional(),
    title: z.string().trim().min(1).max(60),
});

function values(data: FormData) {
    const amount = parseCents(formValue(data, "amount"));
    return {
        amount: amount ?? -1,
        cardId: formValue(data, "cardId"),
        description: formValue(data, "description") || undefined,
        installments: Number(formValue(data, "installments")),
        purchaseDate: formValue(data, "purchaseDate"),
        remainderInstallment: formValue(data, "remainderInstallment")
            ? Number(formValue(data, "remainderInstallment"))
            : undefined,
        title: formValue(data, "title"),
    };
}

export function parsePurchaseForm(
    data: FormData,
    focusMonth: number,
    focusYear: number,
): FormResult<PurchaseInput> {
    const raw = values(data);
    const result = baseSchema
        .refine(
            (input) =>
                !input.remainderInstallment || input.remainderInstallment <= input.installments,
            {
                message: "Escolha uma parcela válida para os centavos",
                path: ["remainderInstallment"],
            },
        )
        .safeParse(raw);
    if (!result.success) return { errors: issuesToErrors(result.error.issues), success: false };
    return { data: { ...result.data, focusMonth, focusYear }, success: true };
}

export function parsePurchaseUpdateForm(
    data: FormData,
    id: string,
    focusMonth: number,
    focusYear: number,
): FormResult<PurchaseUpdateInput> {
    const raw = { ...values(data), description: formValue(data, "description") };
    const result = baseSchema
        .extend({ id: z.string().min(1) })
        .refine(
            (input) =>
                !input.remainderInstallment || input.remainderInstallment <= input.installments,
            {
                message: "Escolha uma parcela válida para os centavos",
                path: ["remainderInstallment"],
            },
        )
        .safeParse({ ...raw, id });
    if (!result.success) return { errors: issuesToErrors(result.error.issues), success: false };
    return { data: { ...result.data, focusMonth, focusYear, id }, success: true };
}
