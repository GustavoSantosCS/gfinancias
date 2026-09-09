import type { Context } from "../../context";
import type {
    Card,
    CardAnticipation,
    CardPurchase,
    CardPurchaseDetails,
    CardsRepository,
    CardsUnitOfWork,
    CreateAnticipationData,
    CreateCardData,
    CreatePurchaseData,
    MonthlyPurchase,
    NewInstallment,
    UpdateCardData,
    UpdatePurchaseData,
} from "../ports/cards-repository";

type CardsDatabase = Pick<
    Context["db"],
    "card" | "cardAnticipation" | "cardInstallment" | "cardPurchase"
>;
type CardsTransactionDatabase = Pick<Context["db"], "$transaction">;

function entriesData(entries: NewInstallment[]) {
    return entries.map(({ anticipationId, purchaseId, ...entry }) => ({
        ...entry,
        ...(anticipationId ? { anticipationId } : {}),
        ...(purchaseId ? { purchaseId } : {}),
    }));
}

export function createPrismaCardsRepository(db: CardsDatabase): CardsRepository {
    return {
        async createAnticipation(input: CreateAnticipationData): Promise<CardAnticipation> {
            return db.cardAnticipation.create({ data: input });
        },

        async createCard(input: CreateCardData): Promise<Card> {
            return db.card.create({ data: input });
        },

        async createInstallments(input: Array<NewInstallment & { purchaseId: string }>) {
            await db.cardInstallment.createMany({
                data: input.map(({ anticipationId, ...entry }) => ({
                    ...entry,
                    ...(anticipationId ? { anticipationId } : {}),
                })),
            });
        },

        async createPurchase({
            data,
            entries,
        }: {
            data: CreatePurchaseData;
            entries: NewInstallment[];
        }) {
            return db.cardPurchase.create({
                data: { ...data, entries: { create: entriesData(entries) } },
                include: { entries: { orderBy: { number: "asc" } } },
            });
        },

        async deleteCard(id: string): Promise<Card> {
            return db.card.delete({ where: { id } });
        },

        async deletePurchase(id: string): Promise<CardPurchase> {
            return db.cardPurchase.delete({ where: { id } });
        },

        async deleteInstallments(ids: string[]) {
            await db.cardInstallment.deleteMany({ where: { id: { in: ids } } });
        },

        async findCard(id: string): Promise<Card | null> {
            return db.card.findUnique({ where: { id } });
        },

        async findCardByNormalizedName(normalizedName: string): Promise<Card | null> {
            return db.card.findUnique({ where: { normalizedName } });
        },

        async findPurchase(id: string): Promise<CardPurchaseDetails | null> {
            return db.cardPurchase.findUnique({
                include: {
                    anticipations: { include: { entries: true }, orderBy: { date: "asc" } },
                    card: true,
                    entries: { orderBy: { number: "asc" } },
                },
                where: { id },
            });
        },

        async listCards(includeArchived: boolean): Promise<Card[]> {
            return db.card.findMany({
                orderBy: { name: "asc" },
                where: includeArchived ? undefined : { status: "ACTIVE" },
            });
        },

        async listPurchases({ cardId, month, status, title, year }): Promise<MonthlyPurchase[]> {
            const entries = await db.cardInstallment.findMany({
                include: { purchase: { include: { card: true } } },
                orderBy: [{ purchase: { purchaseDate: "desc" } }, { number: "asc" }],
                where: {
                    competenceMonth: month,
                    competenceYear: year,
                    purchase: {
                        ...(cardId ? { cardId } : {}),
                        ...(title ? { title: { contains: title } } : {}),
                        ...(status === "ALL" ? {} : { card: { status } }),
                    },
                },
            });

            return entries.map(({ purchase, ...entry }) => ({
                ...entry,
                card: purchase.card,
                description: purchase.description,
                purchaseAmount: purchase.amount,
                purchaseDate: purchase.purchaseDate,
                title: purchase.title,
            }));
        },

        async updateCard(id: string, data: UpdateCardData): Promise<Card> {
            return db.card.update({ data, where: { id } });
        },

        async updatePurchase({
            data,
            entries,
            id,
        }: {
            data: UpdatePurchaseData;
            entries?: NewInstallment[];
            id: string;
        }) {
            if (entries) await db.cardInstallment.deleteMany({ where: { purchaseId: id } });
            return db.cardPurchase.update({
                data: {
                    ...data,
                    ...(entries ? { entries: { create: entriesData(entries) } } : {}),
                },
                include: { entries: { orderBy: { number: "asc" } } },
                where: { id },
            });
        },
    };
}

export function createPrismaCardsUnitOfWork(db: CardsTransactionDatabase): CardsUnitOfWork {
    return {
        run: (operation) =>
            db.$transaction((transaction) => operation(createPrismaCardsRepository(transaction))),
    };
}
