import type { CreateCardInput, UpdateCardInput } from "../contracts";
import { ArchivedCardError, CardNotFoundError, DuplicateCardNameError } from "../domain/errors";
import { normalizeCardName } from "../domain/card-policy";
import type { CardsRepository, CardsUnitOfWork } from "../ports/cards-repository";

async function requireCard(repository: CardsRepository, id: string) {
    const card = await repository.findCard(id);
    if (!card) throw new CardNotFoundError();
    return card;
}

export async function listCards(repository: CardsRepository, includeArchived: boolean) {
    return repository.listCards(includeArchived);
}

export async function createCard(unitOfWork: CardsUnitOfWork, input: CreateCardInput) {
    return unitOfWork.run(async (repository) => {
        const { displayName, normalizedName } = normalizeCardName(input.name);
        if (await repository.findCardByNormalizedName(normalizedName)) {
            throw new DuplicateCardNameError();
        }

        return repository.createCard({ ...input, name: displayName, normalizedName });
    });
}

export async function updateCard(unitOfWork: CardsUnitOfWork, input: UpdateCardInput) {
    return unitOfWork.run(async (repository) => {
        const card = await requireCard(repository, input.id);
        if (card.status === "ARCHIVED") {
            throw new ArchivedCardError("Cartões arquivados não podem ser editados.");
        }

        const { id, name, ...data } = input;
        if (!name) return repository.updateCard(id, data);

        const { displayName, normalizedName } = normalizeCardName(name);
        const existing = await repository.findCardByNormalizedName(normalizedName);
        if (existing && existing.id !== id) throw new DuplicateCardNameError();

        return repository.updateCard(id, { ...data, name: displayName, normalizedName });
    });
}

export async function archiveCard(unitOfWork: CardsUnitOfWork, id: string) {
    return unitOfWork.run(async (repository) => {
        await requireCard(repository, id);
        return repository.updateCard(id, { status: "ARCHIVED" });
    });
}

export async function restoreCard(unitOfWork: CardsUnitOfWork, id: string) {
    return unitOfWork.run(async (repository) => {
        await requireCard(repository, id);
        return repository.updateCard(id, { status: "ACTIVE" });
    });
}

export async function removeCard(unitOfWork: CardsUnitOfWork, id: string) {
    return unitOfWork.run(async (repository) => {
        await requireCard(repository, id);
        return repository.deleteCard(id);
    });
}

export async function requireActiveCard(repository: CardsRepository, id: string, message: string) {
    const card = await requireCard(repository, id);
    if (card.status === "ARCHIVED") throw new ArchivedCardError(message);
    return card;
}
