import {
    FirstInstallmentAnticipationError,
    NonConsecutiveInstallmentsError,
    UnavailableInstallmentError,
} from "./errors";
import { normalizeCardText } from "./purchase-policy";

type AnticipatableEntry = {
    amount: number;
    competenceMonth: number;
    competenceYear: number;
    kind: string;
    number: number;
};

type PrepareAnticipationInput<T extends AnticipatableEntry> = {
    date: string;
    entries: readonly T[];
    mode: "GROUPED" | "SEPARATE";
    selectedNumbers: number[];
    title: string;
    values: number[];
};

export function prepareAnticipation<T extends AnticipatableEntry>({
    date,
    entries,
    mode,
    selectedNumbers,
    title,
    values,
}: PrepareAnticipationInput<T>) {
    const selected = [...selectedNumbers].sort((left, right) => left - right);

    if (selected[0] === 1) throw new FirstInstallmentAnticipationError();
    if (
        selected.some(
            (number, index) => index > 0 && number !== (selected[index - 1] ?? number - 1) + 1,
        )
    ) {
        throw new NonConsecutiveInstallmentsError();
    }

    const originals = entries
        .filter((entry) => entry.kind === "REGULAR" && selected.includes(entry.number))
        .sort((left, right) => left.number - right.number);

    if (originals.length !== selected.length) throw new UnavailableInstallmentError();

    const originalValues = originals.map((entry) => entry.amount);
    const originalCompetences = originals.map((entry) => ({
        month: entry.competenceMonth,
        year: entry.competenceYear,
    }));
    const originalTotal = originalValues.reduce((sum, value) => sum + value, 0);
    const totalAnticipated = values.reduce((sum, value) => sum + value, 0);

    return {
        description: normalizeCardText(
            title +
                " - parcelas " +
                selected.join(", ") +
                ", valor original " +
                originalTotal +
                ", valor antecipado " +
                totalAnticipated +
                ", competências " +
                originalCompetences.map((item) => item.month + "/" + item.year).join(", "),
        ),
        originals,
        selected,
        snapshot: {
            adjustedValues: values,
            anticipationDate: date,
            mode,
            originalCompetences,
            originalTotal,
            originalValues,
            selectedNumbers: selected,
            totalAnticipated,
        },
    };
}
