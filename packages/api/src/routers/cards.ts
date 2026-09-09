import { TRPCError } from "@trpc/server";

import { anticipatePurchase } from "../cards/application/anticipations";
import {
    archiveCard,
    createCard,
    listCards,
    removeCard,
    restoreCard,
    updateCard,
} from "../cards/application/cards";
import {
    createPurchase,
    getPurchase,
    listPurchases,
    removePurchase,
    updatePurchase,
} from "../cards/application/purchases";
import {
    ArchivedCardError,
    CardNotFoundError,
    DuplicateCardNameError,
    FirstInstallmentAnticipationError,
    InvalidCivilDateError,
    InvalidRemainderInstallmentError,
    NonConsecutiveInstallmentsError,
    PurchaseHasAnticipationsError,
    PurchaseNotFoundError,
    UnavailableInstallmentError,
} from "../cards/domain/errors";
import {
    createPrismaCardsRepository,
    createPrismaCardsUnitOfWork,
} from "../cards/infrastructure/prisma-cards-repository";
import {
    anticipateSchema,
    cardIdSchema,
    cardsListSchema,
    createCardSchema,
    createPurchaseSchema,
    listPurchasesSchema,
    purchaseIdSchema,
    updateCardSchema,
    updatePurchaseSchema,
} from "../cards/contracts";
import { publicProcedure, router } from "../index";

function mapCardsError(error: unknown): never {
    if (error instanceof CardNotFoundError || error instanceof PurchaseNotFoundError) {
        throw new TRPCError({ code: "NOT_FOUND", message: error.message });
    }
    if (
        error instanceof DuplicateCardNameError ||
        error instanceof PurchaseHasAnticipationsError ||
        error instanceof UnavailableInstallmentError
    ) {
        throw new TRPCError({ code: "CONFLICT", message: error.message });
    }
    if (error instanceof ArchivedCardError) {
        throw new TRPCError({ code: "FORBIDDEN", message: error.message });
    }
    if (
        error instanceof InvalidCivilDateError ||
        error instanceof InvalidRemainderInstallmentError ||
        error instanceof FirstInstallmentAnticipationError ||
        error instanceof NonConsecutiveInstallmentsError
    ) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    }
    throw error;
}

async function execute<T>(operation: () => Promise<T>) {
    try {
        return await operation();
    } catch (error) {
        return mapCardsError(error);
    }
}

export const cardsRouter = router({
    list: publicProcedure
        .input(cardsListSchema)
        .query(({ ctx, input }) =>
            execute(() => listCards(createPrismaCardsRepository(ctx.db), input.includeArchived)),
        ),

    create: publicProcedure
        .input(createCardSchema)
        .mutation(({ ctx, input }) =>
            execute(() => createCard(createPrismaCardsRepository(ctx.db), input)),
        ),

    update: publicProcedure
        .input(updateCardSchema)
        .mutation(({ ctx, input }) =>
            execute(() => updateCard(createPrismaCardsRepository(ctx.db), input)),
        ),

    archive: publicProcedure
        .input(cardIdSchema)
        .mutation(({ ctx, input }) =>
            execute(() => archiveCard(createPrismaCardsRepository(ctx.db), input.id)),
        ),

    restore: publicProcedure
        .input(cardIdSchema)
        .mutation(({ ctx, input }) =>
            execute(() => restoreCard(createPrismaCardsRepository(ctx.db), input.id)),
        ),

    delete: publicProcedure
        .input(cardIdSchema)
        .mutation(({ ctx, input }) =>
            execute(() => removeCard(createPrismaCardsRepository(ctx.db), input.id)),
        ),

    createPurchase: publicProcedure
        .input(createPurchaseSchema)
        .mutation(({ ctx, input }) =>
            execute(() => createPurchase(createPrismaCardsRepository(ctx.db), input)),
        ),

    listPurchases: publicProcedure
        .input(listPurchasesSchema)
        .query(({ ctx, input }) =>
            execute(() => listPurchases(createPrismaCardsRepository(ctx.db), input)),
        ),

    getPurchase: publicProcedure
        .input(purchaseIdSchema)
        .query(({ ctx, input }) =>
            execute(() => getPurchase(createPrismaCardsRepository(ctx.db), input.id)),
        ),

    anticipate: publicProcedure
        .input(anticipateSchema)
        .mutation(({ ctx, input }) =>
            execute(() => anticipatePurchase(createPrismaCardsUnitOfWork(ctx.db), input)),
        ),

    updatePurchase: publicProcedure
        .input(updatePurchaseSchema)
        .mutation(({ ctx, input }) =>
            execute(() => updatePurchase(createPrismaCardsUnitOfWork(ctx.db), input)),
        ),

    deletePurchase: publicProcedure
        .input(purchaseIdSchema)
        .mutation(({ ctx, input }) =>
            execute(() => removePurchase(createPrismaCardsUnitOfWork(ctx.db), input.id)),
        ),
});
