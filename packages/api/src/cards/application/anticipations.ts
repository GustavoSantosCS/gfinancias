import type { AnticipateInput } from "../contracts";
import { ArchivedCardError, PurchaseNotFoundError } from "../domain/errors";
import { prepareAnticipation } from "../domain/anticipation-policy";
import { parseCivilDateAtNoon } from "../domain/purchase-policy";
import type { CardsUnitOfWork, NewInstallment } from "../ports/cards-repository";

export async function anticipatePurchase(unitOfWork: CardsUnitOfWork, input: AnticipateInput) {
    return unitOfWork.run(async (repository) => {
        const purchase = await repository.findPurchase(input.purchaseId);
        if (!purchase) throw new PurchaseNotFoundError();
        if (purchase.card.status === "ARCHIVED") {
            throw new ArchivedCardError("Cartões arquivados não podem receber antecipações.");
        }

        const prepared = prepareAnticipation({
            date: input.date,
            entries: purchase.entries,
            mode: input.mode,
            selectedNumbers: input.selectedNumbers,
            title: purchase.title,
            values: input.values,
        });
        const anticipation = await repository.createAnticipation({
            date: parseCivilDateAtNoon(input.date),
            description: prepared.description,
            mode: input.mode,
            purchaseId: purchase.id,
            snapshot: JSON.stringify(prepared.snapshot),
        });
        const entries: Array<NewInstallment & { purchaseId: string }> =
            input.mode === "GROUPED"
                ? [
                      {
                          amount: input.values[0] as number,
                          anticipationId: anticipation.id,
                          competenceMonth: input.focusMonth,
                          competenceYear: input.focusYear,
                          kind: "ANTICIPATION",
                          number: prepared.selected[0] as number,
                          purchaseId: purchase.id,
                          total: purchase.installments,
                      },
                  ]
                : prepared.originals.map((entry, index) => ({
                      amount: input.values[index] as number,
                      anticipationId: anticipation.id,
                      competenceMonth: input.focusMonth,
                      competenceYear: input.focusYear,
                      kind: "ANTICIPATION",
                      number: entry.number,
                      purchaseId: purchase.id,
                      total: purchase.installments,
                  }));

        await repository.deleteInstallments(prepared.originals.map((entry) => entry.id));
        await repository.createInstallments(entries);
        return { ...anticipation, entries };
    });
}
