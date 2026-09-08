import { PhaseContainsRecordsError, PhaseNotFoundError } from "../domain/errors";
import type { PlanningRepository } from "../ports/planning-repository";

export async function removePhase(repository: PlanningRepository, id: string) {
    const recordCount = await repository.findPhaseRecordCount(id);
    if (recordCount === null) throw new PhaseNotFoundError();
    if (recordCount > 0) throw new PhaseContainsRecordsError();
    await repository.deletePhase(id);
}
