import type { PlanningPeriod } from "../contracts";
import type { MonthlyPlanning, PlanningRepository } from "../ports/planning-repository";

export async function getMonthlyPlanning(
    repository: PlanningRepository,
    input: PlanningPeriod,
): Promise<MonthlyPlanning> {
    const planning = await repository.findMonthlyPlanning(input);
    return planning ?? { ...input, id: null, phases: [] };
}
