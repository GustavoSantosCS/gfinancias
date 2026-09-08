type DateRange = {
    endDay: number;
    startDay: number;
};

type ValidatePhaseInput = {
    candidate: DateRange;
    existing: DateRange[];
    month: number;
    year: number;
};

function daysInMonth(year: number, month: number) {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function assertPhaseIsValid({ candidate, existing, month, year }: ValidatePhaseInput) {
    const lastDay = daysInMonth(year, month);
    if (
        candidate.startDay < 1 ||
        candidate.endDay < candidate.startDay ||
        candidate.endDay > lastDay
    ) {
        throw new Error("Phase dates must be within the selected month");
    }

    const overlaps = existing.some(
        (phase) => candidate.startDay <= phase.endDay && candidate.endDay >= phase.startDay,
    );
    if (overlaps) {
        throw new Error("Phase dates cannot overlap");
    }
}
