import type { CreateExpenseInput, UpdateExpenseInput } from "../contracts";
import { ExpenseNotFoundError, PhaseNotFoundError } from "../domain/errors";
import type { PlanningRepository } from "../ports/planning-repository";

export async function createExpense(repository: PlanningRepository, input: CreateExpenseInput) {
    if (!(await repository.findPhase(input.phaseId))) throw new PhaseNotFoundError();
    return repository.createExpense(input);
}

export async function updateExpense(repository: PlanningRepository, input: UpdateExpenseInput) {
    if (!(await repository.findExpense(input.id))) throw new ExpenseNotFoundError();
    return repository.updateExpense(input);
}

export async function removeExpense(repository: PlanningRepository, id: string) {
    if (!(await repository.findExpense(id))) throw new ExpenseNotFoundError();
    await repository.deleteExpense(id);
}
