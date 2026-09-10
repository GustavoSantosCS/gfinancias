import { z } from "zod";

import type { CardInput, CardUpdateInput } from "../types";
import { parseCents } from "@/lib/money";
import { formValue } from "../utils/form-data";
import type { FormResult } from "./form-result";
import { issuesToErrors } from "./form-result";

const cardFields = z.object({
    brand: z
        .enum(["VISA", "MASTERCARD", "ELO", "AMERICAN_EXPRESS", "HIPERCARD", "OTHER"])
        .optional(),
    closingDay: z.number().int().min(1).max(31).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    dueDay: z.number().int().min(1).max(31).optional(),
    lastDigits: z
        .string()
        .regex(/^\d{4}$/)
        .optional(),
    limit: z.number().int().positive().optional(),
    name: z.string().trim().min(1).max(120),
});

export const cardSchema = cardFields.superRefine((value, context) => {
    if ((value.closingDay === undefined) !== (value.dueDay === undefined)) {
        context.addIssue({
            code: "custom",
            message: "Informe fechamento e vencimento juntos",
            path: ["closingDay"],
        });
    }
});

function optionalNumber(value: string) {
    return value ? Number(value) : undefined;
}

function toCardValues(data: FormData) {
    const limitText = formValue(data, "limit");
    return {
        brand: formValue(data, "brand") || undefined,
        closingDay: optionalNumber(formValue(data, "closingDay")),
        color: formValue(data, "color"),
        dueDay: optionalNumber(formValue(data, "dueDay")),
        lastDigits: formValue(data, "lastDigits") || undefined,
        limit: limitText ? (parseCents(limitText) ?? -1) : undefined,
        name: formValue(data, "name"),
    };
}

export function parseCardForm(data: FormData): FormResult<CardInput> {
    const result = cardSchema.safeParse(toCardValues(data));
    return result.success
        ? { data: result.data as CardInput, success: true }
        : { errors: issuesToErrors(result.error.issues), success: false };
}

export function parseCardUpdateForm(data: FormData, id: string): FormResult<CardUpdateInput> {
    const result = cardSchema
        .safeExtend({ id: z.string().min(1) })
        .safeParse({ ...toCardValues(data), id });
    return result.success
        ? { data: result.data as CardUpdateInput, success: true }
        : { errors: issuesToErrors(result.error.issues), success: false };
}
