import type {
    CreateExpenseInput,
    CreateIncomeInput,
    PhaseInput,
    PlanningPeriod,
    UpdateExpenseInput,
    UpdateIncomeInput,
} from "../contracts";

export type PlannedIncome = {
    amount: number;
    category: "SALARY" | "RESERVE" | "OTHER";
    id: string;
    name: string;
    phaseId: string;
};

export type PlannedExpense = {
    amount: number;
    category: "FIXED" | "VARIABLE_FIXED" | "VARIABLE" | "RESERVE" | "INVESTMENT";
    id: string;
    name: string;
    phaseId: string;
};

export type PlanningPhase = {
    endDay: number;
    expenses: PlannedExpense[];
    id: string;
    incomes: PlannedIncome[];
    name: string;
    planId: string;
    startDay: number;
};

export type MonthlyPlanning = {
    id: string | null;
    month: number;
    phases: PlanningPhase[];
    year: number;
};

type MonthlyPlanReference = { id: string; month: number; year: number };
type PhaseReference = { endDay: number; id: string; planId: string; startDay: number };

export interface PlanningRepository {
    createExpense(input: CreateExpenseInput): Promise<PlannedExpense>;
    createIncome(input: CreateIncomeInput): Promise<PlannedIncome>;
    createMonthlyPlan(input: PlanningPeriod): Promise<MonthlyPlanReference>;
    createPhase(input: PhaseInput & { planId: string }): Promise<PlanningPhase>;
    deleteExpense(id: string): Promise<void>;
    deleteIncome(id: string): Promise<void>;
    deletePhase(id: string): Promise<void>;
    findExpense(id: string): Promise<PlannedExpense | null>;
    findIncome(id: string): Promise<PlannedIncome | null>;
    findMonthlyPlanning(input: PlanningPeriod): Promise<MonthlyPlanning | null>;
    findPhase(id: string): Promise<PhaseReference | null>;
    findPhaseIntervals(planId: string): Promise<Array<{ endDay: number; startDay: number }>>;
    findPhaseRecordCount(id: string): Promise<number | null>;
    updateExpense(input: UpdateExpenseInput): Promise<PlannedExpense>;
    updateIncome(input: UpdateIncomeInput): Promise<PlannedIncome>;
}
