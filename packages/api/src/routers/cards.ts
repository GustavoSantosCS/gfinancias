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
function normalizeText(value: string) {
    const normalized = value.trim().replace(/\s+/g, " ");
    return normalized.length > 500
        ? normalized.slice(0, 499) + String.fromCodePoint(0x2026)
        : normalized;
}
function dateAtNoon(value: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const year = Number(match?.[1]),
        month = Number(match?.[2]),
        day = Number(match?.[3]);
    const date = new Date(Date.UTC(year, month - 1, day, 12));
    if (
        !match ||
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    )
        throw new TRPCError({ code: "BAD_REQUEST", message: "Data civil inválida." });
    return date;
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
    if (card.status === "ARCHIVED")
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "Cartões arquivados não podem receber compras.",
        });
    return card;
}
function createEntries(
    amount: number,
    installments: number,
    focusMonth: number,
    focusYear: number,
    remainderInstallment?: number,
) {
    const baseAmount = Math.floor(amount / installments),
        remainder = amount - baseAmount * installments;
    const remainderNumber = remainderInstallment ?? installments;
    return Array.from({ length: installments }, (_, index) => {
        const competence = nextCompetence(focusMonth, focusYear, index);
        return {
            amount: baseAmount + (index + 1 === remainderNumber ? remainder : 0),
            competenceMonth: competence.month,
            competenceYear: competence.year,
            number: index + 1,
            total: installments,
        };
    });
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
        if (await ctx.db.card.findUnique({ where: { normalizedName: normalized } }))
            throw new TRPCError({ code: "CONFLICT", message: "Nome já em uso!" });
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
        if (card.status === "ARCHIVED")
            throw new TRPCError({
                code: "FORBIDDEN",
                message: "Cartões arquivados não podem ser editados.",
            });
        const { id, name, ...data } = input;
        const normalized = name ? normalizedName(name) : undefined;
        if (normalized) {
            const existing = await ctx.db.card.findUnique({
                where: { normalizedName: normalized },
            });
            if (existing && existing.id !== id)
                throw new TRPCError({ code: "CONFLICT", message: "Nome já em uso!" });
        }
        return ctx.db.card.update({
            data: {
                ...data,
                ...(name
                    ? { name: name.trim().replace(/\s+/g, " "), normalizedName: normalized }
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
        const purchaseDate = dateAtNoon(input.purchaseDate);
        return ctx.db.cardPurchase.create({
            data: {
                amount: input.amount,
                cardId: input.cardId,
                description: input.description ? normalizeText(input.description) : null,
                title: normalizeText(input.title),
                installments: input.installments,
                purchaseDate,
                entries: {
                    create: createEntries(
                        input.amount,
                        input.installments,
                        input.focusMonth,
                        input.focusYear,
                        input.remainderInstallment,
                    ),
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
                    ...(input.title ? { title: { contains: input.title } } : {}),
                    ...(input.status === "ALL" ? {} : { card: { status: input.status } }),
                },
            },
        });
        return entries.map(({ purchase, ...entry }) => ({
            ...entry,
            card: purchase.card,
            description: purchase.description,
            title: purchase.title,
            purchaseDate: purchase.purchaseDate,
            purchaseAmount: purchase.amount,
        }));
    }),
    getPurchase: publicProcedure.input(purchaseIdSchema).query(async ({ ctx, input }) => {
        const purchase = await ctx.db.cardPurchase.findUnique({
            include: {
                anticipations: { include: { entries: true }, orderBy: { date: "asc" } },
                card: true,
                entries: { orderBy: { number: "asc" } },
            },
            where: input,
        });
        if (!purchase)
            throw new TRPCError({ code: "NOT_FOUND", message: "Compra não encontrada." });
        return { ...purchase, schedule: purchase.entries };
    }),
    anticipate: publicProcedure.input(anticipateSchema).mutation(async ({ ctx, input }) => {
        const purchase = await ctx.db.cardPurchase.findUnique({
            include: { card: true, entries: true },
            where: { id: input.purchaseId },
        });
        if (!purchase)
            throw new TRPCError({ code: "NOT_FOUND", message: "Compra não encontrada." });
        if (purchase.card.status === "ARCHIVED")
            throw new TRPCError({
                code: "FORBIDDEN",
                message: "Cartões arquivados não podem receber antecipações.",
            });
        const date = dateAtNoon(input.date);
        const selected = [...input.selectedNumbers].sort((left, right) => left - right);
        if (selected[0] === 1)
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "A primeira parcela não pode ser antecipada.",
            });
        if (
            selected.some(
                (number, index) => index > 0 && number !== (selected[index - 1] ?? number - 1) + 1,
            )
        )
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "As parcelas devem ser consecutivas.",
            });
        const originals = purchase.entries
            .filter((entry) => entry.kind === "REGULAR" && selected.includes(entry.number))
            .sort((left, right) => left.number - right.number);
        if (originals.length !== selected.length)
            throw new TRPCError({
                code: "CONFLICT",
                message: "Uma ou mais parcelas não estão disponíveis.",
            });
        const originalValues = originals.map((entry) => entry.amount);
        const originalCompetences = originals.map((entry) => ({
            month: entry.competenceMonth,
            year: entry.competenceYear,
        }));
        const originalTotal = originalValues.reduce((sum, value) => sum + value, 0);
        const totalAnticipated = input.values.reduce((sum, value) => sum + value, 0);
        const description = normalizeText(
            purchase.title +
                " - parcelas " +
                selected.join(", ") +
                ", valor original " +
                originalTotal +
                ", valor antecipado " +
                totalAnticipated +
                ", competências " +
                originalCompetences.map((item) => item.month + "/" + item.year).join(", "),
        );
        const snapshot = JSON.stringify({
            selectedNumbers: selected,
            originalCompetences,
            originalValues,
            adjustedValues: input.values,
            originalTotal,
            totalAnticipated,
            mode: input.mode,
            anticipationDate: input.date,
        });
        return ctx.db.$transaction(async (tx) => {
            await tx.cardInstallment.deleteMany({
                where: { id: { in: originals.map((entry) => entry.id) } },
            });
            const anticipation = await tx.cardAnticipation.create({
                data: { date, description, mode: input.mode, purchaseId: purchase.id, snapshot },
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
            include: { anticipations: true, card: true, entries: true },
            where: { id: input.id },
        });
        if (!purchase)
            throw new TRPCError({ code: "NOT_FOUND", message: "Compra não encontrada." });
        if (purchase.card.status === "ARCHIVED")
            throw new TRPCError({
                code: "FORBIDDEN",
                message: "Cartões arquivados não podem ser editados.",
            });
        if (purchase.anticipations.length > 0)
            throw new TRPCError({
                code: "CONFLICT",
                message: "Compras com antecipação não podem ser editadas.",
            });
        if (input.cardId) await requireActiveCard(ctx, input.cardId);
        const installments = input.installments ?? purchase.installments;
        if (input.remainderInstallment && input.remainderInstallment > installments)
            throw new TRPCError({ code: "BAD_REQUEST", message: "Parcela de centavos inválida." });
        const regenerate =
            input.amount !== undefined ||
            input.installments !== undefined ||
            input.focusMonth !== undefined ||
            input.focusYear !== undefined ||
            input.remainderInstallment !== undefined;
        const amount = input.amount ?? purchase.amount;
        const focus = purchase.entries.slice().sort((left, right) => left.number - right.number)[0];
        const focusMonth = input.focusMonth ?? focus?.competenceMonth,
            focusYear = input.focusYear ?? focus?.competenceYear;
        const purchaseDate = input.purchaseDate ? dateAtNoon(input.purchaseDate) : undefined;
        return ctx.db.$transaction(async (tx) => {
            if (regenerate)
                await tx.cardInstallment.deleteMany({ where: { purchaseId: purchase.id } });
            return tx.cardPurchase.update({
                data: {
                    amount,
                    ...(input.cardId ? { cardId: input.cardId } : {}),
                    ...(input.description !== undefined
                        ? {
                              description: input.description
                                  ? normalizeText(input.description)
                                  : null,
                          }
                        : {}),
                    ...(input.title ? { title: normalizeText(input.title) } : {}),
                    ...(purchaseDate ? { purchaseDate } : {}),
                    ...(regenerate
                        ? {
                              installments,
                              entries: {
                                  create: createEntries(
                                      amount,
                                      installments,
                                      focusMonth as number,
                                      focusYear as number,
                                      input.remainderInstallment,
                                  ),
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
        const purchase = await ctx.db.cardPurchase.findUnique({
            include: { card: true },
            where: input,
        });
        if (!purchase)
            throw new TRPCError({ code: "NOT_FOUND", message: "Compra não encontrada." });
        if (purchase.card.status === "ARCHIVED")
            throw new TRPCError({
                code: "FORBIDDEN",
                message: "Cartões arquivados não podem excluir compras.",
            });
        return ctx.db.$transaction((tx) => tx.cardPurchase.delete({ where: input }));
    }),
});
