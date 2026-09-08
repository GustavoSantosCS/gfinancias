import { TRPCError } from "@trpc/server";

import { publicProcedure, router } from "../index";
import {
    createExpenseSchema,
    createIncomeSchema,
    phaseIdSchema,
    phaseSchema,
    planningPeriodSchema,
    updateExpenseSchema,
    updateIncomeSchema,
} from "../planning/contracts";
import { createExpense, removeExpense, updateExpense } from "../planning/application/expenses";
import { createIncome, removeIncome, updateIncome } from "../planning/application/incomes";
import { createPhase } from "../planning/application/create-phase";
import { getMonthlyPlanning } from "../planning/application/get-monthly-planning";
import { removePhase } from "../planning/application/remove-phase";
import {
    ExpenseNotFoundError,
    IncomeNotFoundError,
    InvalidPhaseError,
    PhaseContainsRecordsError,
    PhaseNotFoundError,
} from "../planning/domain/errors";
import { createPrismaPlanningRepository } from "../planning/infrastructure/prisma-planning-repository";

function mapPlanningError(error: unknown): never {
    if (error instanceof InvalidPhaseError) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    }
    if (error instanceof PhaseContainsRecordsError) {
        throw new TRPCError({ code: "CONFLICT", message: error.message });
    }
    if (
        error instanceof PhaseNotFoundError ||
        error instanceof IncomeNotFoundError ||
        error instanceof ExpenseNotFoundError
    ) {
        throw new TRPCError({ code: "NOT_FOUND", message: error.message });
    }
    throw error;
}

async function execute<T>(operation: () => Promise<T>) {
    try {
        return await operation();
    } catch (error) {
        return mapPlanningError(error);
    }
}

export const planningRouter = router({
    get: publicProcedure
        .input(planningPeriodSchema)
        .query(({ ctx, input }) =>
            execute(() => getMonthlyPlanning(createPrismaPlanningRepository(ctx.db), input)),
        ),

    createPhase: publicProcedure
        .input(planningPeriodSchema.merge(phaseSchema))
        .mutation(({ ctx, input }) =>
            execute(() => createPhase(createPrismaPlanningRepository(ctx.db), input)),
        ),

    deletePhase: publicProcedure
        .input(phaseIdSchema)
        .mutation(({ ctx, input }) =>
            execute(() => removePhase(createPrismaPlanningRepository(ctx.db), input.id)),
        ),

    createIncome: publicProcedure
        .input(createIncomeSchema)
        .mutation(({ ctx, input }) =>
            execute(() => createIncome(createPrismaPlanningRepository(ctx.db), input)),
        ),

    updateIncome: publicProcedure
        .input(updateIncomeSchema)
        .mutation(({ ctx, input }) =>
            execute(() => updateIncome(createPrismaPlanningRepository(ctx.db), input)),
        ),

    deleteIncome: publicProcedure
        .input(phaseIdSchema)
        .mutation(({ ctx, input }) =>
            execute(() => removeIncome(createPrismaPlanningRepository(ctx.db), input.id)),
        ),

    createExpense: publicProcedure
        .input(createExpenseSchema)
        .mutation(({ ctx, input }) =>
            execute(() => createExpense(createPrismaPlanningRepository(ctx.db), input)),
        ),

    updateExpense: publicProcedure
        .input(updateExpenseSchema)
        .mutation(({ ctx, input }) =>
            execute(() => updateExpense(createPrismaPlanningRepository(ctx.db), input)),
        ),

    deleteExpense: publicProcedure
        .input(phaseIdSchema)
        .mutation(({ ctx, input }) =>
            execute(() => removeExpense(createPrismaPlanningRepository(ctx.db), input.id)),
        ),
});
