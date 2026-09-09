import type { CreatePurchaseInput, ListPurchasesInput, UpdatePurchaseInput } from "../contracts";
import {
    ArchivedCardError,
    InvalidRemainderInstallmentError,
    PurchaseHasAnticipationsError,
    PurchaseNotFoundError,
} from "../domain/errors";
import {
    createInstallments,
    normalizeCardText,
    parseCivilDateAtNoon,
} from "../domain/purchase-policy";
import type { CardsRepository, CardsUnitOfWork } from "../ports/cards-repository";
import { requireActiveCard } from "./cards";

async function requirePurchase(repository: CardsRepository, id: string) {
    const purchase = await repository.findPurchase(id);
    if (!purchase) throw new PurchaseNotFoundError();
    return purchase;
}

export async function createPurchase(repository: CardsRepository, input: CreatePurchaseInput) {
    await requireActiveCard(
        repository,
        input.cardId,
        "Cartões arquivados não podem receber compras.",
    );

    return repository.createPurchase({
        data: {
            amount: input.amount,
            cardId: input.cardId,
            description: input.description ? normalizeCardText(input.description) : null,
            installments: input.installments,
            purchaseDate: parseCivilDateAtNoon(input.purchaseDate),
            title: normalizeCardText(input.title),
        },
        entries: createInstallments(input),
    });
}

export async function listPurchases(repository: CardsRepository, input: ListPurchasesInput) {
    return repository.listPurchases(input);
}

export async function getPurchase(repository: CardsRepository, id: string) {
    const purchase = await requirePurchase(repository, id);
    return { ...purchase, schedule: purchase.entries };
}

export async function updatePurchase(unitOfWork: CardsUnitOfWork, input: UpdatePurchaseInput) {
    return unitOfWork.run(async (repository) => {
        const purchase = await requirePurchase(repository, input.id);
        if (purchase.card.status === "ARCHIVED") {
            throw new ArchivedCardError("Cartões arquivados não podem ser editados.");
        }
        if (purchase.anticipations.length > 0) throw new PurchaseHasAnticipationsError();
        if (input.cardId) {
            await requireActiveCard(
                repository,
                input.cardId,
                "Cartões arquivados não podem receber compras.",
            );
        }

        const installments = input.installments ?? purchase.installments;
        if (input.remainderInstallment && input.remainderInstallment > installments) {
            throw new InvalidRemainderInstallmentError();
        }

        const regenerate =
            input.amount !== undefined ||
            input.installments !== undefined ||
            input.focusMonth !== undefined ||
            input.focusYear !== undefined ||
            input.remainderInstallment !== undefined;
        const amount = input.amount ?? purchase.amount;
        const focus = purchase.entries[0];
        const focusMonth = input.focusMonth ?? focus?.competenceMonth;
        const focusYear = input.focusYear ?? focus?.competenceYear;

        return repository.updatePurchase({
            data: {
                amount,
                ...(input.cardId ? { cardId: input.cardId } : {}),
                ...(input.description !== undefined
                    ? {
                          description: input.description
                              ? normalizeCardText(input.description)
                              : null,
                      }
                    : {}),
                ...(input.title ? { title: normalizeCardText(input.title) } : {}),
                ...(input.purchaseDate
                    ? { purchaseDate: parseCivilDateAtNoon(input.purchaseDate) }
                    : {}),
                ...(regenerate ? { installments } : {}),
            },
            ...(regenerate
                ? {
                      entries: createInstallments({
                          amount,
                          focusMonth: focusMonth as number,
                          focusYear: focusYear as number,
                          installments,
                          remainderInstallment: input.remainderInstallment,
                      }),
                  }
                : {}),
            id: purchase.id,
        });
    });
}

export async function removePurchase(unitOfWork: CardsUnitOfWork, id: string) {
    return unitOfWork.run(async (repository) => {
        const purchase = await requirePurchase(repository, id);
        if (purchase.card.status === "ARCHIVED") {
            throw new ArchivedCardError("Cartões arquivados não podem excluir compras.");
        }
        return repository.deletePurchase(purchase.id);
    });
}
