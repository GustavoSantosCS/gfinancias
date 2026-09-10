import type { AnticipationMode, PurchaseDetail } from "../types";
import { parseCents } from "@/lib/money";

export type AnticipationEntry = PurchaseDetail["schedule"][number];

export function availableAnticipationEntries(detail: PurchaseDetail) {
    return detail.schedule.filter((entry) => entry.kind === "REGULAR" && entry.number >= 2);
}

export function toggleConsecutiveSelection(selected: number[], number: number) {
    if (selected.includes(number)) {
        const remaining = selected.filter((item) => item !== number);
        return remaining.every((item, index) => index === 0 || item === remaining[index - 1] + 1)
            ? remaining
            : selected;
    }
    const next = [...selected, number].sort((a, b) => a - b);
    return next.every((item, index) => index === 0 || item === next[index - 1] + 1)
        ? next
        : selected;
}

export function anticipationPreview(
    detail: PurchaseDetail,
    selectedNumbers: number[],
    mode: AnticipationMode,
    values: string[],
) {
    const entries = availableAnticipationEntries(detail).filter((entry) =>
        selectedNumbers.includes(entry.number),
    );
    const originalTotal = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const anticipatedValues =
        mode === "GROUPED"
            ? [parseCents(values[0] ?? String(originalTotal / 100)) ?? 0]
            : entries.map(
                  (entry, index) => parseCents(values[index] ?? String(entry.amount / 100)) ?? 0,
              );
    const anticipatedTotal = anticipatedValues.reduce((sum, value) => sum + value, 0);
    const newTotal = detail.amount - originalTotal + anticipatedTotal;
    const discount = originalTotal - anticipatedTotal;
    const description = `${detail.title} - parcelas ${selectedNumbers.join(", ")}, valor original ${originalTotal}, valor antecipado ${anticipatedTotal}, competências ${entries.map((entry) => `${entry.competenceMonth}/${entry.competenceYear}`).join(", ")}`;
    return {
        anticipatedTotal,
        anticipatedValues,
        description,
        discount,
        entries,
        newTotal,
        originalTotal,
    };
}
