import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { publicProcedure, router } from "../index";
import type { Context } from "../context";
import { assertPhaseIsValid } from "../planning/rules";

type Database = Context["db"];
const monthInput = z.object({
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(2100),
});
const phaseInput = z.object({
    endDay: z.number().int().min(1).max(31),
    name: z.string().trim().min(1).max(80),
    startDay: z.number().int().min(1).max(31),
});
const incomeCategory = z.enum(["SALARY", "RESERVE", "OTHER"]);
const expenseCategory = z.enum(["FIXED", "VARIABLE_FIXED", "VARIABLE", "RESERVE", "INVESTMENT"]);
const recordInput = z.object({
    amount: z.number().int().positive(),
    name: z.string().trim().min(1).max(120),
});

async function getPlanOrThrow(db: Database, planId: string) {
    const plan = await db.monthlyPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Monthly plan was not found" });
    return plan;
}

async function getPlan(db: Database, year: number, month: number) {
    return db.monthlyPlan.upsert({
        create: { month, year },
        update: {},
        where: { year_month: { month, year } },
    });
}

export const planningRouter = router({
    get: publicProcedure.input(monthInput).query(async ({ ctx, input }) => {
        const plan = await getPlan(ctx.db, input.year, input.month);
        return ctx.db.monthlyPlan.findUniqueOrThrow({
            include: {
                phases: {
                    include: { expenses: true, incomes: true },
                    orderBy: { startDay: "asc" },
                },
            },
            where: { id: plan.id },
        });
    }),

    createPhase: publicProcedure
        .input(monthInput.merge(phaseInput))
        .mutation(async ({ ctx, input }) => {
            const plan = await getPlan(ctx.db, input.year, input.month);
            const existing = await ctx.db.planningPhase.findMany({
                select: { endDay: true, startDay: true },
                where: { planId: plan.id },
            });
            try {
                assertPhaseIsValid({
                    candidate: input,
                    existing,
                    month: input.month,
                    year: input.year,
                });
            } catch (error) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: error instanceof Error ? error.message : "Invalid phase",
                });
            }
            return ctx.db.planningPhase.create({
                data: { ...phaseInput.parse(input), planId: plan.id },
            });
        }),

    deletePhase: publicProcedure
        .input(z.object({ id: z.string().cuid() }))
        .mutation(async ({ ctx, input }) => {
            const phase = await ctx.db.planningPhase.findUnique({
                include: { _count: { select: { expenses: true, incomes: true } } },
                where: { id: input.id },
            });
            if (!phase) throw new TRPCError({ code: "NOT_FOUND", message: "Phase was not found" });
            if (phase._count.expenses + phase._count.incomes > 0) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "A phase with records cannot be deleted",
                });
            }
            await ctx.db.planningPhase.delete({ where: { id: input.id } });
        }),

    createIncome: publicProcedure
        .input(recordInput.extend({ category: incomeCategory, phaseId: z.string().cuid() }))
        .mutation(async ({ ctx, input }) => {
            await getPlanOrThrow(
                ctx.db,
                (await ctx.db.planningPhase.findUniqueOrThrow({ where: { id: input.phaseId } }))
                    .planId,
            );
            return ctx.db.plannedIncome.create({ data: input });
        }),

    updateIncome: publicProcedure
        .input(recordInput.extend({ category: incomeCategory, id: z.string().cuid() }))
        .mutation(({ ctx, input }) =>
            ctx.db.plannedIncome.update({
                data: recordInput.extend({ category: incomeCategory }).parse(input),
                where: { id: input.id },
            }),
        ),

    deleteIncome: publicProcedure
        .input(z.object({ id: z.string().cuid() }))
        .mutation(({ ctx, input }) => ctx.db.plannedIncome.delete({ where: input })),

    createExpense: publicProcedure
        .input(recordInput.extend({ category: expenseCategory, phaseId: z.string().cuid() }))
        .mutation(({ ctx, input }) => ctx.db.plannedExpense.create({ data: input })),

    updateExpense: publicProcedure
        .input(recordInput.extend({ category: expenseCategory, id: z.string().cuid() }))
        .mutation(({ ctx, input }) =>
            ctx.db.plannedExpense.update({
                data: recordInput.extend({ category: expenseCategory }).parse(input),
                where: { id: input.id },
            }),
        ),

    deleteExpense: publicProcedure
        .input(z.object({ id: z.string().cuid() }))
        .mutation(({ ctx, input }) => ctx.db.plannedExpense.delete({ where: input })),
});
