import { InvalidCivilDateError } from "./errors";

export type InstallmentScheduleInput = {
    amount: number;
    focusMonth: number;
    focusYear: number;
    installments: number;
    remainderInstallment?: number;
};

export type InstallmentScheduleItem = {
    amount: number;
    competenceMonth: number;
    competenceYear: number;
    number: number;
    total: number;
};

export function normalizeCardText(value: string) {
    const normalized = value.trim().replace(/\s+/g, " ");
    return normalized.length > 500
        ? normalized.slice(0, 499) + String.fromCodePoint(0x2026)
        : normalized;
}

export function parseCivilDateAtNoon(value: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const year = Number(match?.[1]);
    const month = Number(match?.[2]);
    const day = Number(match?.[3]);
    const date = new Date(Date.UTC(year, month - 1, day, 12));

    if (
        !match ||
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        throw new InvalidCivilDateError();
    }

    return date;
}

function nextCompetence(month: number, year: number, offset: number) {
    const index = month - 1 + offset;
    return { month: (index % 12) + 1, year: year + Math.floor(index / 12) };
}

export function createInstallments({
    amount,
    focusMonth,
    focusYear,
    installments,
    remainderInstallment,
}: InstallmentScheduleInput): InstallmentScheduleItem[] {
    const baseAmount = Math.floor(amount / installments);
    const remainder = amount - baseAmount * installments;
    const remainderNumber = remainderInstallment ?? installments;

    return Array.from({ length: installments }, (_, index) => {
        const competence = nextCompetence(focusMonth, focusYear, index);
        return {
            amount: baseAmount + (index + 1 === remainderNumber ? remainder : 0),
            competenceMonth: competence.month,
            competenceYear: competence.year,
            number: index + 1,
            total: installments,
        };
    });
}
