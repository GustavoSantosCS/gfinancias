import { TRPCError } from "@trpc/server";

import {
    cardIdSchema,
    cardsListSchema,
    createCardSchema,
    createPurchaseSchema,
    listPurchasesSchema,
    updateCardSchema,
    anticipateSchema,
    purchaseIdSchema,
    updatePurchaseSchema,
} from "../cards/contracts";
import { publicProcedure, router } from "../index";

function normalizedName(name: string) {
    return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

function dateAtNoon(value: string) {
    return new Date(value + "T12:00:00.000Z");
}

function nextCompetence(month: number, year: number, offset: number) {
    const index = month - 1 + offset;
    return { month: (index % 12) + 1, year: year + Math.floor(index / 12) };
}

async function requireCard(ctx: { db: any }, id: string) {
    const card = await ctx.db.card.findUnique({ where: { id } });
    if (!card) throw new TRPCError({ code: "NOT_FOUND", message: "Cartão não encontrado." });
    return card;
}

async function requireActiveCard(ctx: { db: any }, id: string) {
    const card = await requireCard(ctx, id);
    if (card.status === "ARCHIVED") {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "Cartões arquivados não podem receber compras.",
        });
    }
    return card;
}

export const cardsRouter = router({
    list: publicProcedure.input(cardsListSchema).query(({ ctx, input }) =>
        ctx.db.card.findMany({
            orderBy: { name: "asc" },
            where: input.includeArchived ? undefined : { status: "ACTIVE" },
        }),
    ),

    create: publicProcedure.input(createCardSchema).mutation(async ({ ctx, input }) => {
        const normalized = normalizedName(input.name);
        const existing = await ctx.db.card.findUnique({ where: { normalizedName: normalized } });
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Nome já em uso!" });

        return ctx.db.card.create({
            data: {
                ...input,
                name: input.name.trim().replace(/\s+/g, " "),
                normalizedName: normalized,
            },
        });
    }),

    update: publicProcedure.input(updateCardSchema).mutation(async ({ ctx, input }) => {
        const card = await requireCard(ctx, input.id);
        if (card.status === "ARCHIVED") {
            throw new TRPCError({
                code: "FORBIDDEN",
                message: "Cartões arquivados não podem ser editados.",
            });
        }

        const { id, name, ...data } = input;
        const normalized = name ? normalizedName(name) : undefined;
        if (normalized) {
            const existing = await ctx.db.card.findUnique({
                where: { normalizedName: normalized },
            });
            if (existing && existing.id !== id) {
                throw new TRPCError({ code: "CONFLICT", message: "Nome já em uso!" });
            }
        }

        return ctx.db.card.update({
            data: {
                ...data,
                ...(name
                    ? {
                          name: name.trim().replace(/\s+/g, " "),
                          normalizedName: normalized,
                      }
                    : {}),
            },
            where: { id },
        });
    }),

    archive: publicProcedure.input(cardIdSchema).mutation(async ({ ctx, input }) => {
        await requireCard(ctx, input.id);
        return ctx.db.card.update({ data: { status: "ARCHIVED" }, where: input });
    }),

    restore: publicProcedure.input(cardIdSchema).mutation(async ({ ctx, input }) => {
        await requireCard(ctx, input.id);
        return ctx.db.card.update({ data: { status: "ACTIVE" }, where: input });
    }),

    delete: publicProcedure.input(cardIdSchema).mutation(async ({ ctx, input }) => {
        await requireCard(ctx, input.id);
        return ctx.db.card.delete({ where: input });
    }),

    createPurchase: publicProcedure.input(createPurchaseSchema).mutation(async ({ ctx, input }) => {
        await requireActiveCard(ctx, input.cardId);
        const baseAmount = Math.floor(input.amount / input.installments);
        const remainder = input.amount - baseAmount * input.installments;

        return ctx.db.cardPurchase.create({
            data: {
                cardId: input.cardId,
                description: input.description,
                installments: input.installments,
                purchaseDate: dateAtNoon(input.purchaseDate),
                entries: {
                    create: Array.from({ length: input.installments }, (_, index) => {
                        const competence = nextCompetence(input.focusMonth, input.focusYear, index);
                        return {
                            amount:
                                baseAmount +
                                (index + 1 === input.remainderInstallment ? remainder : 0),
                            competenceMonth: competence.month,
                            competenceYear: competence.year,
                            number: index + 1,
                            total: input.installments,
                        };
                    }),
                },
            },
            include: { entries: { orderBy: { number: "asc" } } },
        });
    }),

    listPurchases: publicProcedure.input(listPurchasesSchema).query(async ({ ctx, input }) => {
        const entries = await ctx.db.cardInstallment.findMany({
            include: { purchase: { include: { card: true } } },
            orderBy: [{ purchase: { purchaseDate: "desc" } }, { number: "asc" }],
            where: {
                competenceMonth: input.month,
                competenceYear: input.year,
                purchase: {
                    ...(input.cardId ? { cardId: input.cardId } : {}),
                    ...(input.description ? { description: { contains: input.description } } : {}),
                    ...(input.status === "ALL" ? {} : { card: { status: input.status } }),
                },
            },
        });
        return entries.map(({ purchase, ...entry }) => ({
            ...entry,
            card: purchase.card,
            description: purchase.description,
            purchaseDate: purchase.purchaseDate,
        }));
    }),

    anticipate: publicProcedure.input(anticipateSchema).mutation(async ({ ctx, input }) => {
        const purchase = await ctx.db.cardPurchase.findUnique({
            include: { card: true, entries: true },
            where: { id: input.purchaseId },
        });
        if (!purchase)
            throw new TRPCError({ code: "NOT_FOUND", message: "Compra não encontrada." });
        if (purchase.card.status === "ARCHIVED") {
            throw new TRPCError({
                code: "FORBIDDEN",
                message: "Cartões arquivados não podem receber antecipações.",
            });
        }

        const selected = [...input.selectedNumbers].sort((left, right) => left - right);
        if (selected[0] === 1) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "A primeira parcela não pode ser antecipada.",
            });
        }
        if (
            selected.some(
                (number, index) => index > 0 && number !== (selected[index - 1] ?? number - 1) + 1,
            )
        ) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "As parcelas devem ser consecutivas.",
            });
        }

        const originals = purchase.entries.filter(
            (entry) => entry.kind === "REGULAR" && selected.includes(entry.number),
        );
        if (originals.length !== selected.length) {
            throw new TRPCError({
                code: "CONFLICT",
                message: "Uma ou mais parcelas não estão disponíveis.",
            });
        }

        const snapshot = JSON.stringify({
            anticipatedValues: input.values,
            originalCompetences: originals.map((entry) => ({
                month: entry.competenceMonth,
                year: entry.competenceYear,
            })),
            originalTotal: originals.reduce((total, entry) => total + entry.amount, 0),
            originalValues: originals.map((entry) => entry.amount),
            selectedNumbers: selected,
        });

        return ctx.db.$transaction(async (tx) => {
            await tx.cardInstallment.deleteMany({
                where: { id: { in: originals.map((entry) => entry.id) } },
            });
            const anticipation = await tx.cardAnticipation.create({
                data: {
                    date: dateAtNoon(input.date),
                    mode: input.mode,
                    purchaseId: purchase.id,
                    snapshot,
                },
            });
            const entries =
                input.mode === "GROUPED"
                    ? [
                          {
                              amount: input.values[0] as number,
                              anticipationId: anticipation.id,
                              competenceMonth: input.focusMonth,
                              competenceYear: input.focusYear,
                              kind: "ANTICIPATION" as const,
                              number: selected[0] as number,
                              purchaseId: purchase.id,
                              total: purchase.installments,
                          },
                      ]
                    : originals.map((entry, index) => ({
                          amount: input.values[index] as number,
                          anticipationId: anticipation.id,
                          competenceMonth: input.focusMonth,
                          competenceYear: input.focusYear,
                          kind: "ANTICIPATION" as const,
                          number: entry.number,
                          purchaseId: purchase.id,
                          total: purchase.installments,
                      }));
            await tx.cardInstallment.createMany({ data: entries });
            return tx.cardAnticipation.findUniqueOrThrow({
                include: { entries: { orderBy: { number: "asc" } } },
                where: { id: anticipation.id },
            });
        });
    }),

    updatePurchase: publicProcedure.input(updatePurchaseSchema).mutation(async ({ ctx, input }) => {
        const purchase = await ctx.db.cardPurchase.findUnique({
            include: { anticipations: true, entries: true },
            where: { id: input.id },
        });
        if (!purchase)
            throw new TRPCError({ code: "NOT_FOUND", message: "Compra não encontrada." });
        if (purchase.anticipations.length > 0) {
            throw new TRPCError({
                code: "CONFLICT",
                message: "Compras com antecipação não podem ser editadas.",
            });
        }
        if (input.cardId) await requireActiveCard(ctx, input.cardId);

        const installments = input.installments ?? purchase.installments;
        if (input.remainderInstallment && input.remainderInstallment > installments) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Parcela de centavos inválida." });
        }
        const needsRegeneration =
            input.amount !== undefined ||
            input.installments !== undefined ||
            input.focusMonth !== undefined ||
            input.focusYear !== undefined ||
            input.remainderInstallment !== undefined;
        const oldTotal = purchase.entries.reduce((sum, entry) => sum + entry.amount, 0);
        const amount = input.amount ?? oldTotal;
        const focus = purchase.entries.sort((left, right) => left.number - right.number)[0];
        const focusMonth = input.focusMonth ?? focus?.competenceMonth;
        const focusYear = input.focusYear ?? focus?.competenceYear;
        const remainderInstallment = input.remainderInstallment ?? installments;
        const baseAmount = Math.floor(amount / installments);
        const remainder = amount - baseAmount * installments;

        return ctx.db.$transaction(async (tx) => {
            if (needsRegeneration)
                await tx.cardInstallment.deleteMany({ where: { purchaseId: purchase.id } });
            return tx.cardPurchase.update({
                data: {
                    ...(input.cardId ? { cardId: input.cardId } : {}),
                    ...(input.description ? { description: input.description } : {}),
                    ...(input.purchaseDate ? { purchaseDate: dateAtNoon(input.purchaseDate) } : {}),
                    ...(needsRegeneration
                        ? {
                              installments,
                              entries: {
                                  create: Array.from({ length: installments }, (_, index) => {
                                      const competence = nextCompetence(
                                          focusMonth as number,
                                          focusYear as number,
                                          index,
                                      );
                                      return {
                                          amount:
                                              baseAmount +
                                              (index + 1 === remainderInstallment ? remainder : 0),
                                          competenceMonth: competence.month,
                                          competenceYear: competence.year,
                                          number: index + 1,
                                          total: installments,
                                      };
                                  }),
                              },
                          }
                        : {}),
                },
                include: { entries: { orderBy: { number: "asc" } } },
                where: { id: purchase.id },
            });
        });
    }),

    deletePurchase: publicProcedure.input(purchaseIdSchema).mutation(async ({ ctx, input }) => {
        const purchase = await ctx.db.cardPurchase.findUnique({ where: input });
        if (!purchase)
            throw new TRPCError({ code: "NOT_FOUND", message: "Compra não encontrada." });
        return ctx.db.cardPurchase.delete({ where: input });
    }),
});
