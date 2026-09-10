const moneyFormatter = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });

export function parseCents(value: string) {
    const normalized = value.trim().replace(",", ".");
    if (!normalized || !/^-?\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
    const amount = Number(normalized);
    return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

export function formatCents(value: number | null | undefined) {
    return value === null || value === undefined ? "" : moneyFormatter.format(value / 100);
}

export function formatOptionalCents(value: number | null | undefined) {
    return value ? formatCents(value) : "\u00a0";
}
