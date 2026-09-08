import type { PhaseInput, PlanningPeriod } from "../contracts";
import { InvalidPhaseError } from "../domain/errors";
import { assertPhaseIsValid } from "../domain/phase-policy";
import type { PlanningRepository } from "../ports/planning-repository";
import { ensureMonthlyPlan } from "./ensure-monthly-plan";

export async function createPhase(
    repository: PlanningRepository,
    input: PlanningPeriod & PhaseInput,
) {
    const plan = await ensureMonthlyPlan(repository, { month: input.month, year: input.year });
    const existing = await repository.findPhaseIntervals(plan.id);

    try {
        assertPhaseIsValid({ candidate: input, existing, month: input.month, year: input.year });
    } catch (error) {
        if (error instanceof InvalidPhaseError) throw error;
        throw new InvalidPhaseError("Invalid phase");
    }

    return repository.createPhase({
        endDay: input.endDay,
        name: input.name,
        planId: plan.id,
        startDay: input.startDay,
    });
}
