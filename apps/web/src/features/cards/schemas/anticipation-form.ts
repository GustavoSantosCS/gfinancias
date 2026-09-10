import { z } from "zod";

import type { AnticipationInput } from "../types";
import type { FormResult } from "./form-result";
import { issuesToErrors } from "./form-result";

const schema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    focusMonth: z.number().int().min(1).max(12),
    focusYear: z.number().int().min(2000).max(9999),
    mode: z.enum(["SEPARATE", "GROUPED"]),
    purchaseId: z.string().min(1),
    selectedNumbers: z.array(z.number().int().min(1)).min(1),
    values: z.array(z.number().int().positive()).min(1),
});

export function parseAnticipationInput(input: AnticipationInput): FormResult<AnticipationInput> {
    const result = schema.safeParse(input);
    return result.success
        ? { data: result.data, success: true }
        : { errors: issuesToErrors(result.error.issues), success: false };
}
