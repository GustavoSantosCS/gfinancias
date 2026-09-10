export function formatDayAndMonth(day: number, month: number) {
    return String(day).padStart(2, "0") + "/" + String(month).padStart(2, "0");
}

export function formatCompetence(month: number, year: number) {
    return `${String(month).padStart(2, "0")}/${year}`;
}

export function formatDate(value: string | Date) {
    return new Date(value).toLocaleDateString("pt-BR");
}

export function currentPeriod() {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function nextBillingMonth(month: number, closingDay: number, dueDay: number) {
    return dueDay < closingDay ? (month === 12 ? 1 : month + 1) : month;
}
