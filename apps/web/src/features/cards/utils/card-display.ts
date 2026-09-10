import type { CardBrand } from "../types";

export const brandLabels: Record<CardBrand, string> = {
    AMERICAN_EXPRESS: "American Express",
    ELO: "Elo",
    HIPERCARD: "Hipercard",
    MASTERCARD: "Mastercard",
    OTHER: "Outra",
    VISA: "Visa",
};

export const cardColors = [
    "#0f766e",
    "#2563eb",
    "#7c3aed",
    "#be123c",
    "#c2410c",
    "#a16207",
    "#15803d",
    "#334155",
] as const;

export function randomCardColor() {
    return (
        "#" +
        Math.floor(Math.random() * 0x1000000)
            .toString(16)
            .padStart(6, "0")
    );
}

export function billingDates(
    month: number,
    closingDay: number | null | undefined,
    dueDay: number | null | undefined,
) {
    if (!closingDay || !dueDay) return null;
    const dueMonth = dueDay < closingDay ? (month === 12 ? 1 : month + 1) : month;
    return {
        closing: `${String(closingDay).padStart(2, "0")}/${String(month).padStart(2, "0")}`,
        due: `${String(dueDay).padStart(2, "0")}/${String(dueMonth).padStart(2, "0")}`,
    };
}
