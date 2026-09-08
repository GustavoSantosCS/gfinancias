import type { CreateIncomeInput, UpdateIncomeInput } from "../contracts";
import { IncomeNotFoundError, PhaseNotFoundError } from "../domain/errors";
import type { PlanningRepository } from "../ports/planning-repository";

export async function createIncome(repository: PlanningRepository, input: CreateIncomeInput) {
    if (!(await repository.findPhase(input.phaseId))) throw new PhaseNotFoundError();
    return repository.createIncome(input);
}

export async function updateIncome(repository: PlanningRepository, input: UpdateIncomeInput) {
    if (!(await repository.findIncome(input.id))) throw new IncomeNotFoundError();
    return repository.updateIncome(input);
}

export async function removeIncome(repository: PlanningRepository, id: string) {
    if (!(await repository.findIncome(id))) throw new IncomeNotFoundError();
    await repository.deleteIncome(id);
}
