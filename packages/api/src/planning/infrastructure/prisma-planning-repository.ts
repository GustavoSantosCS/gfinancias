import type { Context } from "../../context";
import type {
    CreateExpenseInput,
    CreateIncomeInput,
    PhaseInput,
    PlanningPeriod,
    UpdateExpenseInput,
    UpdateIncomeInput,
} from "../contracts";
import type {
    MonthlyPlanning,
    PlannedExpense,
    PlannedIncome,
    PlanningPhase,
    PlanningRepository,
} from "../ports/planning-repository";

type PlanningDatabase = Pick<
    Context["db"],
    "monthlyPlan" | "plannedExpense" | "plannedIncome" | "planningPhase"
>;

export function createPrismaPlanningRepository(db: PlanningDatabase): PlanningRepository {
    return {
        async createExpense(input: CreateExpenseInput): Promise<PlannedExpense> {
            return db.plannedExpense.create({ data: input });
        },

        async createIncome(input: CreateIncomeInput): Promise<PlannedIncome> {
            return db.plannedIncome.create({ data: input });
        },

        async createMonthlyPlan(input: PlanningPeriod) {
            return db.monthlyPlan.create({ data: input });
        },

        async createPhase(input: PhaseInput & { planId: string }): Promise<PlanningPhase> {
            const phase = await db.planningPhase.create({ data: input });
            return { ...phase, expenses: [], incomes: [] };
        },

        async deleteExpense(id: string) {
            await db.plannedExpense.delete({ where: { id } });
        },

        async deleteIncome(id: string) {
            await db.plannedIncome.delete({ where: { id } });
        },

        async deletePhase(id: string) {
            await db.planningPhase.delete({ where: { id } });
        },

        async findExpense(id: string): Promise<PlannedExpense | null> {
            return db.plannedExpense.findUnique({ where: { id } });
        },

        async findIncome(id: string): Promise<PlannedIncome | null> {
            return db.plannedIncome.findUnique({ where: { id } });
        },

        async findMonthlyPlanning(input: PlanningPeriod): Promise<MonthlyPlanning | null> {
            return db.monthlyPlan.findUnique({
                include: {
                    phases: {
                        include: { expenses: true, incomes: true },
                        orderBy: { startDay: "asc" },
                    },
                },
                where: { year_month: input },
            });
        },

        async findPhase(id: string) {
            return db.planningPhase.findUnique({
                select: { endDay: true, id: true, planId: true, startDay: true },
                where: { id },
            });
        },

        async findPhaseIntervals(planId: string) {
            return db.planningPhase.findMany({
                select: { endDay: true, startDay: true },
                where: { planId },
            });
        },

        async findPhaseRecordCount(id: string) {
            const phase = await db.planningPhase.findUnique({
                include: { _count: { select: { expenses: true, incomes: true } } },
                where: { id },
            });
            if (!phase) return null;
            return phase._count.expenses + phase._count.incomes;
        },

        async updateExpense(input: UpdateExpenseInput): Promise<PlannedExpense> {
            const { id, ...data } = input;
            return db.plannedExpense.update({ data, where: { id } });
        },

        async updateIncome(input: UpdateIncomeInput): Promise<PlannedIncome> {
            const { id, ...data } = input;
            return db.plannedIncome.update({ data, where: { id } });
        },
    };
}
