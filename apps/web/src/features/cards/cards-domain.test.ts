import { describe, expect, it } from "vitest";

import { formatCompetence, formatDayAndMonth, nextBillingMonth } from "@/lib/dates";
import { formatCents, parseCents } from "@/lib/money";
import { parseAnticipationInput } from "./schemas/anticipation-form";
import { parseCardForm, parseCardUpdateForm } from "./schemas/card-form";
import { parsePurchaseForm, parsePurchaseUpdateForm } from "./schemas/purchase-form";
import { anticipationPreview, toggleConsecutiveSelection } from "./utils/anticipation";

function form(values: Record<string, string>) {
    const data = new FormData();
    for (const [key, value] of Object.entries(values)) data.set(key, value);
    return data;
}

describe("cards frontend boundaries", () => {
    it("preserves explicit description clearing on updates", () => {
        expect(
            parsePurchaseUpdateForm(
                form({
                    cardId: "card-1",
                    title: "Curso",
                    amount: "100",
                    installments: "2",
                    purchaseDate: "2028-09-04",
                    description: "",
                }),
                "purchase-1",
                9,
                2028,
            ),
        ).toMatchObject({ success: true, data: { description: "" } });
    });
    it("validates dependent fields on update", () => {
        expect(
            parseCardUpdateForm(
                form({ name: "Viagem", color: "#123456", closingDay: "10" }),
                "card-1",
            ).success,
        ).toBe(false);
        expect(
            parsePurchaseUpdateForm(
                form({
                    cardId: "card-1",
                    title: "Curso",
                    amount: "100",
                    installments: "2",
                    purchaseDate: "2028-09-04",
                    remainderInstallment: "3",
                }),
                "purchase-1",
                9,
                2028,
            ).success,
        ).toBe(false);
        expect(toggleConsecutiveSelection([2, 3, 4], 3)).toEqual([2, 3, 4]);
    });
    it("parses and formats monetary values in cents", () => {
        expect(parseCents("1234,56")).toBe(123456);
        expect(parseCents("12.5")).toBe(1250);
        expect(formatCents(123456)).toContain("1.234,56");
        expect(parseCents("invalid")).toBeNull();
    });

    it("formats periods and billing dates deterministically", () => {
        expect(formatDayAndMonth(4, 9)).toBe("04/09");
        expect(formatCompetence(9, 2028)).toBe("09/2028");
        expect(nextBillingMonth(12, 28, 5)).toBe(1);
    });

    it("validates card forms and supports partial updates", () => {
        const values = form({ name: "Viagem", color: "#123456", limit: "1000,00", brand: "VISA" });
        expect(parseCardForm(values).success).toBe(true);
        expect(parseCardUpdateForm(values, "card-1")).toMatchObject({
            success: true,
            data: { id: "card-1" },
        });
        expect(parseCardForm(form({ name: "", color: "#fff" })).success).toBe(false);
    });

    it("validates purchase and anticipation forms", () => {
        const purchase = parsePurchaseForm(
            form({
                cardId: "card-1",
                title: "Curso",
                amount: "100,00",
                installments: "3",
                purchaseDate: "2028-09-04",
            }),
            9,
            2028,
        );
        expect(purchase).toMatchObject({
            success: true,
            data: { amount: 10000, focusMonth: 9, focusYear: 2028 },
        });
        expect(
            parsePurchaseForm(
                form({
                    cardId: "card-1",
                    title: "Curso",
                    amount: "100,00",
                    installments: "2",
                    remainderInstallment: "3",
                    purchaseDate: "2028-09-04",
                }),
                9,
                2028,
            ).success,
        ).toBe(false);
        expect(
            parseAnticipationInput({
                date: "2028-09-10",
                purchaseId: "purchase-1",
                focusMonth: 9,
                focusYear: 2028,
                mode: "GROUPED",
                selectedNumbers: [2, 3],
                values: [10000],
            }).success,
        ).toBe(true);
    });

    it("keeps anticipation selection consecutive and previews totals", () => {
        expect(toggleConsecutiveSelection([2, 3], 2)).toEqual([3]);
        expect(toggleConsecutiveSelection([2], 3)).toEqual([2, 3]);
        expect(
            anticipationPreview(
                {
                    amount: 30000,
                    title: "Curso",
                    schedule: [
                        {
                            amount: 10000,
                            competenceMonth: 9,
                            competenceYear: 2028,
                            kind: "REGULAR",
                            number: 1,
                            status: "PENDING",
                            total: 3,
                        },
                        {
                            amount: 10000,
                            competenceMonth: 10,
                            competenceYear: 2028,
                            kind: "REGULAR",
                            number: 2,
                            status: "PENDING",
                            total: 3,
                        },
                        {
                            amount: 10000,
                            competenceMonth: 11,
                            competenceYear: 2028,
                            kind: "REGULAR",
                            number: 3,
                            status: "PENDING",
                            total: 3,
                        },
                    ],
                } as never,
                [2, 3],
                "GROUPED",
                ["180.00"],
            ),
        ).toMatchObject({ newTotal: 28000 });
    });
});
