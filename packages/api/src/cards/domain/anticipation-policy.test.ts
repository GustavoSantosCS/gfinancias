import { describe, expect, it } from "vite-plus/test";

import {
    FirstInstallmentAnticipationError,
    NonConsecutiveInstallmentsError,
    UnavailableInstallmentError,
} from "./errors";
import { prepareAnticipation } from "./anticipation-policy";

const entries = [
    { amount: 10_000, competenceMonth: 1, competenceYear: 2028, kind: "REGULAR", number: 1 },
    { amount: 10_000, competenceMonth: 2, competenceYear: 2028, kind: "REGULAR", number: 2 },
    { amount: 10_000, competenceMonth: 3, competenceYear: 2028, kind: "REGULAR", number: 3 },
] as const;

describe("anticipation policy", () => {
    it("builds an ordered anticipation snapshot from available regular installments", () => {
        expect(
            prepareAnticipation({
                date: "2028-01-15",
                entries,
                mode: "GROUPED",
                selectedNumbers: [3, 2],
                title: "Notebook",
                values: [19_000],
            }),
        ).toMatchObject({
            description:
                "Notebook - parcelas 2, 3, valor original 20000, valor antecipado 19000, competências 2/2028, 3/2028",
            originals: [entries[1], entries[2]],
            snapshot: {
                adjustedValues: [19_000],
                anticipationDate: "2028-01-15",
                mode: "GROUPED",
                originalCompetences: [
                    { month: 2, year: 2028 },
                    { month: 3, year: 2028 },
                ],
                originalTotal: 20_000,
                originalValues: [10_000, 10_000],
                selectedNumbers: [2, 3],
                totalAnticipated: 19_000,
            },
        });
    });

    it.each([
        [[1], FirstInstallmentAnticipationError],
        [[2, 4], NonConsecutiveInstallmentsError],
        [[2, 3], UnavailableInstallmentError, [entries[0], entries[1]]],
    ])(
        "rejects invalid installment selections",
        (selectedNumbers, ErrorClass, available: readonly (typeof entries)[number][] = entries) => {
            expect(() =>
                prepareAnticipation({
                    date: "2028-01-15",
                    entries: available,
                    mode: "GROUPED",
                    selectedNumbers,
                    title: "Notebook",
                    values: [10_000],
                }),
            ).toThrowError(ErrorClass);
        },
    );
});
