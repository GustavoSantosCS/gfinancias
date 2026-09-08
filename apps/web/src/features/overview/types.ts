export type View = "overview" | "planning" | "cards" | "goals" | "reserves";
export type ModalType =
    | "income"
    | "expense"
    | "cardExpense"
    | "newCard"
    | "phase"
    | "goal"
    | "reserve"
    | null;
export type Phase = string;
export type PlanningPhase = { id: string | number; name: string; startDay: number; endDay: number };
export type CreditCardAccount = {
    id: number;
    name: string;
    color: "purple" | "orange";
    limit: number;
    dueDay: number;
    lastDigits: string;
};
export type IncomeCategory = "Salário" | "Reserva" | "Outros";
export type ExpenseCategory =
    | "Saídas fixas"
    | "Saídas fixas com valores variáveis"
    | "Saídas variadas"
    | "Reserva"
    | "Investimentos";
export type PlannedItem = { id: string | number; name: string; amount: number; phase: Phase };
export type Income = PlannedItem & { category: IncomeCategory };
export type Expense = PlannedItem & { category: ExpenseCategory };
export type EditingRecord =
    | { kind: "income"; record: Income }
    | { kind: "expense"; record: Expense }
    | null;
export type CardExpense = {
    id: number;
    description: string;
    amount: number;
    card: string;
    installments: number;
};
export type Goal = { id: number; name: string; target: number; saved: number; deadline: string };
export type Reserve = { id: number; name: string; target: number; saved: number; due: string };
