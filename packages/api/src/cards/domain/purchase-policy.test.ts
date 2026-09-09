import { describe, expect, it } from "vite-plus/test";

import { InvalidCivilDateError } from "./errors";
import { createInstallments, normalizeCardText, parseCivilDateAtNoon } from "./purchase-policy";

describe("card purchase policy", () => {
    it("normalizes whitespace and truncates text to the persisted limit", () => {
        expect(normalizeCardText("  Cartão   principal ")).toBe("Cartão principal");
        expect(normalizeCardText("a".repeat(510))).toBe("a".repeat(499) + "…");
    });

    it("stores civil dates at UTC noon and rejects impossible dates", () => {
        expect(parseCivilDateAtNoon("2028-02-29").toISOString()).toBe("2028-02-29T12:00:00.000Z");
        expect(() => parseCivilDateAtNoon("2028-02-30")).toThrowError(InvalidCivilDateError);
    });

    it("creates installments across years and assigns the remainder to the selected installment", () => {
        expect(
            createInstallments({
                amount: 10_001,
                focusMonth: 11,
                focusYear: 2028,
                installments: 3,
                remainderInstallment: 2,
            }),
        ).toEqual([
            { amount: 3333, competenceMonth: 11, competenceYear: 2028, number: 1, total: 3 },
            { amount: 3335, competenceMonth: 12, competenceYear: 2028, number: 2, total: 3 },
            { amount: 3333, competenceMonth: 1, competenceYear: 2029, number: 3, total: 3 },
        ]);
    });
});
