import type { PlanningPeriod } from "../contracts";
import type { PlanningRepository } from "../ports/planning-repository";

type MonthlyPlanReference = { id: string; month: number; year: number };

export async function ensureMonthlyPlan(
    repository: PlanningRepository,
    input: PlanningPeriod,
): Promise<MonthlyPlanReference> {
    const planning = await repository.findMonthlyPlanning(input);
    if (planning?.id) {
        return { id: planning.id, month: planning.month, year: planning.year };
    }
    return repository.createMonthlyPlan(input);
}
