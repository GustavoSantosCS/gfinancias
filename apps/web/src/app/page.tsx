"use client";

import {
    ArrowDownLeft,
    ArrowUpRight,
    Bell,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    CircleDollarSign,
    CreditCard,
    Flag,
    LayoutDashboard,
    Menu,
    Moon,
    MoreHorizontal,
    PiggyBank,
    Plus,
    ReceiptText,
    Sun,
    Target,
    WalletCards,
    X,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { parseAsInteger, parseAsString, useQueryState, useQueryStates } from "nuqs";
import { Suspense, type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";

import { PlanningView } from "@/components/planning-view";

import { ReservesView } from "@/components/reserves-view";
import { translatePlanningError } from "@/features/planning/utils/api-errors";
import { trpc } from "@/utils/trpc";

type View = "overview" | "planning" | "cards" | "goals" | "reserves";
type ModalType =
    | "income"
    | "expense"
    | "cardExpense"
    | "newCard"
    | "phase"
    | "goal"
    | "reserve"
    | null;
type Phase = string;
type PlanningPhase = { id: string | number; name: string; startDay: number; endDay: number };
type CreditCardAccount = {
    id: number;
    name: string;
    color: "purple" | "orange";
    limit: number;
    dueDay: number;
    lastDigits: string;
};
type IncomeCategory = "Salário" | "Reserva" | "Outros";
type ExpenseCategory =
    | "Saídas fixas"
    | "Saídas fixas com valores variáveis"
    | "Saídas variadas"
    | "Reserva"
    | "Investimentos";
type PlannedItem = { id: string | number; name: string; amount: number; phase: Phase };
type Income = PlannedItem & { category: IncomeCategory };
type Expense = PlannedItem & { category: ExpenseCategory };
type EditingRecord =
    | { kind: "income"; record: Income }
    | { kind: "expense"; record: Expense }
    | null;
type CardExpense = {
    id: number;
    description: string;
    amount: number;
    card: string;
    installments: number;
};
type Goal = { id: number; name: string; target: number; saved: number; deadline: string };
type Reserve = { id: number; name: string; target: number; saved: number; due: string };

const navigation = [
    { id: "overview" as const, label: "Visão geral", icon: LayoutDashboard },
    { id: "planning" as const, label: "Planejamento", icon: CalendarDays },
    { id: "cards" as const, label: "Cartões", icon: CreditCard, unavailable: true },
    { id: "goals" as const, label: "Objetivos financeiros", icon: Target, unavailable: true },
    { id: "reserves" as const, label: "Reservas", icon: PiggyBank, unavailable: true },
];
const initialPhases: PlanningPhase[] = [];
const initialCards: CreditCardAccount[] = [];
const initialIncomes: Income[] = [];
const initialExpenses: Expense[] = [];
const initialCardExpenses: CardExpense[] = [];
const initialGoals: Goal[] = [];
const initialReserves: Reserve[] = [];

const incomeCategoryLabels = { OTHER: "Outros", RESERVE: "Reserva", SALARY: "Salário" } as const;
const incomeApiCategories = {
    OTHER: "OTHER",
    Outros: "OTHER",
    Reserva: "RESERVE",
    Salário: "SALARY",
} as const;
const expenseApiCategories = {
    Investimentos: "INVESTMENT",
    Reserva: "RESERVE",
    "Saídas fixas": "FIXED",
    "Saídas fixas com valores variáveis": "VARIABLE_FIXED",
    "Saídas variadas": "VARIABLE",
} as const;

const expenseCategoryLabels = {
    FIXED: "Saídas fixas",
    INVESTMENT: "Investimentos",
    RESERVE: "Reserva",
    VARIABLE: "Saídas variadas",
    VARIABLE_FIXED: "Saídas fixas com valores variáveis",
} as const;

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
];

function formValue(data: FormData, key: string) {
    const value = data.get(key);
    return typeof value === "string" ? value : "";
}

function amount(value: string) {
    return Number(value.replace(",", ".")) || 0;
}
function Modal({
    title,
    children,
    onClose,
}: {
    title: string;
    children: ReactNode;
    onClose: () => void;
}) {
    useEffect(() => {
        const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
        window.addEventListener("keydown", close);
        return () => window.removeEventListener("keydown", close);
    }, [onClose]);
    return (
        <div
            className="modal-backdrop"
            onMouseDown={(event) => event.target === event.currentTarget && onClose()}
        >
            <section aria-label={title} aria-modal="true" className="modal" role="dialog">
                <div className="modal__header">
                    <div>
                        <span className="eyebrow">Planejamento mensal</span>
                        <h2>{title}</h2>
                    </div>
                    <button
                        aria-label="Fechar"
                        className="icon-button"
                        onClick={onClose}
                        type="button"
                    >
                        <X size={18} />
                    </button>
                </div>
                {children}
            </section>
        </div>
    );
}
function Field({
    children,
    label,
    htmlFor,
}: {
    children: ReactNode;
    label: string;
    htmlFor: string;
}) {
    return (
        <label className="field" htmlFor={htmlFor}>
            <span>{label}</span>
            {children}
        </label>
    );
}
function Progress({
    value,
    tone = "green",
}: {
    value: number;
    tone?: "green" | "violet" | "coral";
}) {
    return (
        <div aria-label={Math.round(value) + "% concluído"} className="progress">
            <span
                className={"progress__fill progress__fill--" + tone}
                style={{ width: Math.min(value, 100) + "%" }}
            />
        </div>
    );
}

export function PrototypeHome({ initialView = "overview" }: { initialView?: View }) {
    const [view, setView] = useState<View>(initialView);
    const [modal, setModal] = useState<ModalType>(null);
    const [editingRecord, setEditingRecord] = useState<EditingRecord>(null);
    const [dark, setDark] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const today = useMemo(() => new Date(), []);
    const [{ month, year }, setPeriod] = useQueryStates(
        {
            month: parseAsInteger.withDefault(today.getMonth() + 1),
            year: parseAsInteger.withDefault(today.getFullYear()),
        },
        { clearOnDefault: false, history: "push" },
    );
    const [activePhaseId, setActivePhaseId] = useQueryState(
        "phase",
        parseAsString.withOptions({ history: "push" }),
    );
    const monthIndex = month - 1;
    const [incomes, setIncomes] = useState(initialIncomes);
    const [expenses, setExpenses] = useState(initialExpenses);
    const [phases, setPhases] = useState(initialPhases);
    const [cards, setCards] = useState(initialCards);
    const [cardExpenses, setCardExpenses] = useState(initialCardExpenses);
    const [cardAmount, setCardAmount] = useState("");
    const [cardInstallments, setCardInstallments] = useState("1");
    const [goals, setGoals] = useState(initialGoals);
    const [reserves, setReserves] = useState(initialReserves);
    const [incomeCategory, setIncomeCategory] = useState<IncomeCategory>("Salário");
    const [incomeReserveId, setIncomeReserveId] = useState(String(initialReserves[0]?.id ?? ""));
    const [incomeAmount, setIncomeAmount] = useState("");
    const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>("Saídas fixas");
    const [expenseReserveId, setExpenseReserveId] = useState(String(initialReserves[0]?.id ?? ""));
    const [expenseAmount, setExpenseAmount] = useState("");
    const planQuery = useQuery(trpc.planning.get.queryOptions({ month, year }));
    const createPhase = useMutation(trpc.planning.createPhase.mutationOptions());
    const createIncome = useMutation(trpc.planning.createIncome.mutationOptions());
    const createExpense = useMutation(trpc.planning.createExpense.mutationOptions());
    const updateIncome = useMutation(trpc.planning.updateIncome.mutationOptions());
    const updateExpense = useMutation(trpc.planning.updateExpense.mutationOptions());

    useEffect(() => {
        const saved = window.localStorage.getItem("gfin-theme");
        const enabled = saved ? saved === "dark" : true;
        setDark(enabled);
        document.documentElement.classList.toggle("dark", enabled);
    }, []);

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        if (!searchParams.has("month") || !searchParams.has("year")) {
            void setPeriod({ month, year }, { history: "replace" });
        }
    }, [month, setPeriod, year]);

    useEffect(() => {
        if (!planQuery.data) return;

        setPhases(
            planQuery.data.phases.map((phase) => ({
                endDay: phase.endDay,
                id: phase.id,
                name: phase.name,
                startDay: phase.startDay,
            })),
        );
        setIncomes(
            planQuery.data.phases.flatMap((phase) =>
                phase.incomes.map((income) => ({
                    amount: income.amount / 100,
                    category: incomeCategoryLabels[income.category],
                    id: income.id,
                    name: income.name,
                    phase: phase.name,
                })),
            ),
        );
        setExpenses(
            planQuery.data.phases.flatMap((phase) =>
                phase.expenses.map((expense) => ({
                    amount: expense.amount / 100,
                    category: expenseCategoryLabels[expense.category],
                    id: expense.id,
                    name: expense.name,
                    phase: phase.name,
                })),
            ),
        );

        const nextPhaseId = planQuery.data.phases.some((phase) => phase.id === activePhaseId)
            ? activePhaseId
            : (planQuery.data.phases[0]?.id ?? null);
        if (nextPhaseId !== activePhaseId) {
            void setActivePhaseId(nextPhaseId, { history: "replace" });
        }
    }, [activePhaseId, planQuery.data, setActivePhaseId]);

    const totals = useMemo(() => {
        const income = incomes.reduce((sum, item) => sum + item.amount, 0);
        const bills = expenses
            .filter((item) =>
                ["Saídas fixas", "Saídas fixas com valores variáveis"].includes(item.category),
            )
            .reduce((sum, item) => sum + item.amount, 0);
        const flexible = expenses
            .filter((item) => item.category === "Saídas variadas")
            .reduce((sum, item) => sum + item.amount, 0);
        const saving = expenses
            .filter((item) => ["Reserva", "Investimentos"].includes(item.category))
            .reduce((sum, item) => sum + item.amount, 0);
        const allocated = expenses.reduce((sum, item) => sum + item.amount, 0);
        return { income, bills, saving, flexible, allocated, available: income - allocated };
    }, [expenses, incomes]);
    const navigate = (next: View) => {
        setView(next);
        setSidebarOpen(false);
    };
    const changeMonth = (direction: number) => {
        let nextMonth = month + direction;
        let nextYear = year;
        if (nextMonth < 1) {
            nextMonth = 12;
            nextYear -= 1;
        } else if (nextMonth > 12) {
            nextMonth = 1;
            nextYear += 1;
        }
        setModal(null);
        setEditingRecord(null);
        void setActivePhaseId(null, { history: "replace" });
        void setPeriod({ month: nextMonth, year: nextYear }, { history: "push" });
    };
    const toggleTheme = () => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
        window.localStorage.setItem("gfin-theme", next ? "dark" : "light");
    };
    const addIncome = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const category = formValue(data, "category") as keyof typeof incomeApiCategories;
        createIncome.mutate(
            {
                amount: Math.round(amount(formValue(data, "amount")) * 100),
                category: incomeApiCategories[category],
                name: formValue(data, "name"),
                phaseId: formValue(data, "phase"),
            },
            {
                onSuccess: async () => {
                    await planQuery.refetch();
                    setIncomeCategory("Salário");
                    setIncomeAmount("");
                    setModal(null);
                },
            },
        );
    };
    const addExpense = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const category = formValue(data, "category") as keyof typeof expenseApiCategories;
        createExpense.mutate(
            {
                amount: Math.round(amount(formValue(data, "amount")) * 100),
                category: expenseApiCategories[category],
                name: formValue(data, "name"),
                phaseId: formValue(data, "phase"),
            },
            {
                onSuccess: async () => {
                    await planQuery.refetch();
                    setExpenseCategory("Saídas fixas");
                    setExpenseAmount("");
                    setModal(null);
                },
            },
        );
    };
    const editRecord = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingRecord) return;

        const data = new FormData(event.currentTarget);
        const baseInput = {
            amount: Math.round(amount(formValue(data, "amount")) * 100),
            id: String(editingRecord.record.id),
            name: formValue(data, "name"),
        };
        const onSuccess = async () => {
            await planQuery.refetch();
            setEditingRecord(null);
        };

        if (editingRecord.kind === "income") {
            const category = formValue(data, "category") as keyof typeof incomeApiCategories;
            updateIncome.mutate(
                { ...baseInput, category: incomeApiCategories[category] },
                { onSuccess },
            );
            return;
        }

        const category = formValue(data, "category") as keyof typeof expenseApiCategories;
        updateExpense.mutate(
            { ...baseInput, category: expenseApiCategories[category] },
            { onSuccess },
        );
    };
    const addCardExpense = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setCardExpenses((items) => [
            ...items,
            {
                id: Date.now(),
                description: formValue(data, "description"),
                amount: amount(formValue(data, "amount")),
                card: formValue(data, "card"),
                installments: Number(formValue(data, "installments")) || 1,
            },
        ]);
        setCardAmount("");
        setCardInstallments("1");
        setModal(null);
        setView("cards");
    };
    const addCard = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setCards((items) => [
            ...items,
            {
                id: Date.now(),
                name: formValue(data, "name"),
                color: formValue(data, "color") as CreditCardAccount["color"],
                limit: amount(formValue(data, "limit")),
                dueDay: Number(formValue(data, "dueDay")),
                lastDigits: formValue(data, "lastDigits"),
            },
        ]);
        setModal(null);
        setView("cards");
    };
    const addPhase = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        createPhase.mutate(
            {
                endDay: Number(formValue(data, "endDay")),
                month,
                name: formValue(data, "name"),
                startDay: Number(formValue(data, "startDay")),
                year,
            },
            {
                onSuccess: async () => {
                    await planQuery.refetch();
                    setModal(null);
                },
            },
        );
    };
    const addGoal = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setGoals((items) => [
            ...items,
            {
                id: Date.now(),
                name: formValue(data, "name"),
                target: amount(formValue(data, "target")),
                saved: amount(formValue(data, "saved")),
                deadline: formValue(data, "deadline") || "Sem prazo",
            },
        ]);
        setModal(null);
        setView("goals");
    };
    const addReserve = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setReserves((items) => [
            ...items,
            {
                id: Date.now(),
                name: formValue(data, "name"),
                target: amount(formValue(data, "target")),
                saved: amount(formValue(data, "saved")),
                due: formValue(data, "due") || "Sem data",
            },
        ]);
        setModal(null);
        setView("reserves");
    };

    const selectedIncomeReserve =
        reserves.find((reserve) => reserve.id === Number(incomeReserveId)) ?? reserves[0];
    const projectedReserveBalance = Math.max(
        (selectedIncomeReserve?.saved ?? 0) - amount(incomeAmount),
        0,
    );
    const selectedExpenseReserve =
        reserves.find((reserve) => reserve.id === Number(expenseReserveId)) ?? reserves[0];
    const projectedReserveDeposit = (selectedExpenseReserve?.saved ?? 0) + amount(expenseAmount);
    const installmentCount = Number(cardInstallments) || 1;
    const installmentAmount = amount(cardAmount) / installmentCount;

    return (
        <div className="app-shell">
            <div
                className={"mobile-scrim " + (sidebarOpen ? "mobile-scrim--visible" : "")}
                onClick={() => setSidebarOpen(false)}
            />
            <aside className={"sidebar " + (sidebarOpen ? "sidebar--open" : "")}>
                <div className="brand">
                    <div className="brand__mark">
                        <span />
                    </div>
                    <div>
                        <strong>GFinanças</strong>
                        <small>Finanças com intenção</small>
                    </div>
                </div>
                <nav aria-label="Navegação principal" className="sidebar__nav">
                    <span className="sidebar__label">Seu planejamento</span>
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                className={view === item.id ? "active" : ""}
                                disabled={item.unavailable}
                                key={item.id}
                                onClick={() => navigate(item.id)}
                                title={item.unavailable ? "Disponível em breve" : undefined}
                                type="button"
                            >
                                <Icon size={19} strokeWidth={1.8} />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>
                <div className="profile">
                    <div className="avatar">GS</div>
                    <div>
                        <strong>Gustavo</strong>
                        <span>Plano pessoal</span>
                    </div>
                    <MoreHorizontal size={18} />
                </div>
            </aside>
            <main className="main">
                <header className="topbar">
                    <button
                        aria-label="Abrir menu"
                        className="icon-button mobile-menu"
                        onClick={() => setSidebarOpen(true)}
                        type="button"
                    >
                        <Menu size={20} />
                    </button>
                    <div className="month-switcher">
                        <button
                            aria-label="Mês anterior"
                            onClick={() => changeMonth(-1)}
                            type="button"
                        >
                            <ChevronLeft size={17} />
                        </button>
                        <span>
                            <CalendarDays size={16} />
                            {months[monthIndex]} {year}
                        </span>
                        <button
                            aria-label="Próximo mês"
                            onClick={() => changeMonth(1)}
                            type="button"
                        >
                            <ChevronRight size={17} />
                        </button>
                    </div>
                    <div className="topbar__actions">
                        <button
                            aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
                            className="icon-button"
                            onClick={toggleTheme}
                            type="button"
                        >
                            {dark ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <div className="notification-wrap">
                            <button
                                aria-label="Notificações"
                                className="icon-button"
                                onClick={() => setNotificationsOpen((value) => !value)}
                                type="button"
                            >
                                <Bell size={18} />
                                <span className="notification-dot" />
                            </button>
                            {notificationsOpen && (
                                <div className="notification-card">
                                    <strong>Seu mês está quase fechado</strong>
                                    <p>Você destinou 99,7% das entradas previstas.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                <div className="content">
                    {view === "overview" && (
                        <Overview
                            totals={totals}
                            onNavigate={navigate}
                            onOpen={() => window.location.assign("/planning")}
                            goals={goals}
                            incomes={incomes}
                            phases={phases}
                        />
                    )}
                    {view === "planning" && (
                        <PlanningView
                            activePhaseId={activePhaseId}
                            daysInMonth={new Date(year, monthIndex + 1, 0).getDate()}
                            errorMessage={planQuery.isError ? planQuery.error.message : null}
                            expenses={expenses}
                            incomes={incomes}
                            isLoading={planQuery.isFetching}
                            month={months[monthIndex]}
                            onEditExpense={(expense) => {
                                updateExpense.reset();
                                setEditingRecord({ kind: "expense", record: expense });
                            }}
                            onEditIncome={(income) => {
                                updateIncome.reset();
                                setEditingRecord({ kind: "income", record: income });
                            }}
                            onNewExpense={() => setModal("expense")}
                            onNewIncome={() => setModal("income")}
                            onNewPhase={() => {
                                createPhase.reset();
                                setModal("phase");
                            }}
                            onPhaseChange={(phaseId) => {
                                void setActivePhaseId(phaseId, { history: "push" });
                            }}
                            phases={phases}
                            year={year}
                        />
                    )}
                    {view === "cards" && (
                        <Cards cards={cards} expenses={cardExpenses} onOpen={setModal} />
                    )}
                    {view === "goals" && <Goals goals={goals} onOpen={setModal} />}
                    {view === "reserves" && (
                        <ReservesView
                            onNewReserve={() => setModal("reserve")}
                            reserves={reserves}
                        />
                    )}
                </div>
            </main>
            {editingRecord && (
                <Modal
                    onClose={() => setEditingRecord(null)}
                    title={editingRecord.kind === "income" ? "Editar entrada" : "Editar saída"}
                >
                    <form className="form" onSubmit={editRecord}>
                        <Field htmlFor="edit-record-name" label="Nome">
                            <input
                                autoFocus
                                defaultValue={editingRecord.record.name}
                                id="edit-record-name"
                                name="name"
                                required
                            />
                        </Field>
                        <Field htmlFor="edit-record-category" label="Categoria">
                            <select
                                defaultValue={editingRecord.record.category}
                                id="edit-record-category"
                                name="category"
                            >
                                {editingRecord.kind === "income" ? (
                                    <>
                                        <option>Salário</option>
                                        <option>Reserva</option>
                                        <option>Outros</option>
                                    </>
                                ) : (
                                    <>
                                        <option>Saídas fixas</option>
                                        <option>Saídas fixas com valores variáveis</option>
                                        <option>Saídas variadas</option>
                                        <option>Reserva</option>
                                        <option>Investimentos</option>
                                    </>
                                )}
                            </select>
                        </Field>
                        <Field htmlFor="edit-record-amount" label="Valor">
                            <input
                                defaultValue={editingRecord.record.amount}
                                id="edit-record-amount"
                                min="0.01"
                                name="amount"
                                required
                                step="0.01"
                                type="number"
                            />
                        </Field>
                        <button
                            className="primary-button form__submit"
                            disabled={updateIncome.isPending || updateExpense.isPending}
                            type="submit"
                        >
                            Salvar alterações
                        </button>
                        {(updateIncome.error || updateExpense.error) && (
                            <p role="alert">
                                {(updateIncome.error || updateExpense.error)?.message}
                            </p>
                        )}
                    </form>
                </Modal>
            )}
            {modal === "income" && (
                <Modal onClose={() => setModal(null)} title="Nova entrada">
                    <form className="form" onSubmit={addIncome}>
                        <Field htmlFor="income-name" label="Nome">
                            <input
                                autoFocus
                                id="income-name"
                                name="name"
                                placeholder="Ex.: Salário"
                                required
                            />
                        </Field>
                        <Field htmlFor="income-category" label="Categoria">
                            <select
                                id="income-category"
                                name="category"
                                onChange={(event) =>
                                    setIncomeCategory(event.target.value as IncomeCategory)
                                }
                                value={incomeCategory}
                            >
                                <option>Salário</option>
                                <option>Reserva</option>
                                <option>Outros</option>
                            </select>
                        </Field>
                        {incomeCategory === "Reserva" && (
                            <div className="reserve-withdrawal">
                                <Field htmlFor="income-reserve" label="Reserva">
                                    <select
                                        id="income-reserve"
                                        name="reserve"
                                        onChange={(event) => setIncomeReserveId(event.target.value)}
                                        required
                                        value={incomeReserveId}
                                    >
                                        {reserves.map((reserve) => (
                                            <option key={reserve.id} value={reserve.id}>
                                                {reserve.name}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <div className="reserve-withdrawal__preview">
                                    <span>O valor será subtraído da Reserva</span>
                                    <strong>
                                        {money.format(selectedIncomeReserve?.saved ?? 0)}
                                        <span aria-hidden="true">→</span>
                                        {money.format(projectedReserveBalance)}
                                    </strong>
                                </div>
                            </div>
                        )}
                        <div className="form__row">
                            <Field htmlFor="income-amount" label="Valor">
                                <input
                                    id="income-amount"
                                    min="0"
                                    name="amount"
                                    onChange={(event) => setIncomeAmount(event.target.value)}
                                    placeholder="0,00"
                                    required
                                    step="0.01"
                                    type="number"
                                    value={incomeAmount}
                                />
                            </Field>
                            <Field htmlFor="income-phase" label="Fase do mês">
                                <select
                                    defaultValue={String(phases[0]?.id ?? "")}
                                    id="income-phase"
                                    name="phase"
                                >
                                    {phases.map((phase) => (
                                        <option key={phase.id} value={phase.id}>
                                            {phase.name}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                        <button
                            className="primary-button form__submit"
                            disabled={createIncome.isPending}
                            type="submit"
                        >
                            Adicionar entrada
                        </button>
                        {createIncome.error && <p role="alert">{createIncome.error.message}</p>}
                    </form>
                </Modal>
            )}
            {modal === "expense" && (
                <Modal onClose={() => setModal(null)} title="Nova saída">
                    <form className="form" onSubmit={addExpense}>
                        <Field htmlFor="expense-name" label="Nome">
                            <input
                                autoFocus
                                id="expense-name"
                                name="name"
                                placeholder="Ex.: Aluguel"
                                required
                            />
                        </Field>
                        <Field htmlFor="expense-category" label="Categoria da saída">
                            <select
                                id="expense-category"
                                name="category"
                                onChange={(event) =>
                                    setExpenseCategory(event.target.value as ExpenseCategory)
                                }
                                value={expenseCategory}
                            >
                                <option>Saídas fixas</option>
                                <option>Saídas fixas com valores variáveis</option>
                                <option>Saídas variadas</option>
                                <option>Reserva</option>
                                <option>Investimentos</option>
                            </select>
                        </Field>
                        {expenseCategory === "Reserva" && (
                            <div className="reserve-withdrawal">
                                <Field htmlFor="expense-reserve" label="Reserva">
                                    <select
                                        id="expense-reserve"
                                        name="reserve"
                                        onChange={(event) =>
                                            setExpenseReserveId(event.target.value)
                                        }
                                        required
                                        value={expenseReserveId}
                                    >
                                        {reserves.map((reserve) => (
                                            <option key={reserve.id} value={reserve.id}>
                                                {reserve.name}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <div className="reserve-withdrawal__preview">
                                    <span>O valor será somando a Reserva</span>
                                    <strong>
                                        {money.format(selectedExpenseReserve?.saved ?? 0)}
                                        <span aria-hidden="true">→</span>
                                        {money.format(projectedReserveDeposit)}
                                    </strong>
                                </div>
                            </div>
                        )}
                        <div className="form__row">
                            <Field htmlFor="expense-amount" label="Valor">
                                <input
                                    id="expense-amount"
                                    min="0"
                                    name="amount"
                                    onChange={(event) => setExpenseAmount(event.target.value)}
                                    placeholder="0,00"
                                    required
                                    step="0.01"
                                    type="number"
                                    value={expenseAmount}
                                />
                            </Field>
                            <Field htmlFor="expense-phase" label="Fase do mês">
                                <select
                                    defaultValue={String(phases[0]?.id ?? "")}
                                    id="expense-phase"
                                    name="phase"
                                >
                                    {phases.map((phase) => (
                                        <option key={phase.id} value={phase.id}>
                                            {phase.name}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                        <button
                            className="primary-button form__submit"
                            disabled={createExpense.isPending}
                            type="submit"
                        >
                            Adicionar saída
                        </button>
                        {createExpense.error && <p role="alert">{createExpense.error.message}</p>}
                    </form>
                </Modal>
            )}
            {modal === "cardExpense" && (
                <Modal onClose={() => setModal(null)} title="Gasto no cartão">
                    <form className="form" onSubmit={addCardExpense}>
                        <Field htmlFor="card-description" label="Descrição">
                            <input
                                autoFocus
                                id="card-description"
                                name="description"
                                placeholder="Ex.: Curso online"
                                required
                            />
                        </Field>
                        <div className="form__row">
                            <Field htmlFor="card-amount" label="Valor">
                                <input
                                    id="card-amount"
                                    min="0"
                                    name="amount"
                                    onChange={(event) => setCardAmount(event.target.value)}
                                    placeholder="0,00"
                                    required
                                    step="0.01"
                                    type="number"
                                    value={cardAmount}
                                />
                            </Field>
                            <Field htmlFor="card-name" label="Cartão">
                                <select defaultValue={cards[0]?.name} id="card-name" name="card">
                                    {cards.map((card) => (
                                        <option key={card.id}>{card.name}</option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                        <Field htmlFor="card-installments" label="Forma de pagamento">
                            <select
                                id="card-installments"
                                name="installments"
                                onChange={(event) => setCardInstallments(event.target.value)}
                                value={cardInstallments}
                            >
                                <option value="1">À vista</option>
                                {Array.from({ length: 11 }, (_, index) => index + 2).map(
                                    (installments) => (
                                        <option key={installments} value={installments}>
                                            {installments} parcelas
                                        </option>
                                    ),
                                )}
                            </select>
                        </Field>
                        {installmentCount > 1 && (
                            <div className="installment-summary">
                                <span>Valor por parcela</span>
                                <strong>
                                    {money.format(installmentAmount)}
                                    <span>por {installmentCount} parcelas</span>
                                </strong>
                            </div>
                        )}
                        <button className="primary-button form__submit" type="submit">
                            Adicionar gasto
                        </button>
                    </form>
                </Modal>
            )}
            {modal === "newCard" && (
                <Modal onClose={() => setModal(null)} title="Novo cartão">
                    <form className="form" onSubmit={addCard}>
                        <Field htmlFor="new-card-name" label="Nome do cartão">
                            <input
                                autoFocus
                                id="new-card-name"
                                name="name"
                                placeholder="Ex.: Itaú"
                                required
                            />
                        </Field>
                        <div className="form__row">
                            <Field htmlFor="new-card-limit" label="Limite">
                                <input
                                    id="new-card-limit"
                                    min="0"
                                    name="limit"
                                    placeholder="0,00"
                                    required
                                    step="0.01"
                                    type="number"
                                />
                            </Field>
                            <Field htmlFor="new-card-due" label="Dia do vencimento">
                                <input
                                    id="new-card-due"
                                    max="31"
                                    min="1"
                                    name="dueDay"
                                    placeholder="10"
                                    required
                                    type="number"
                                />
                            </Field>
                        </div>
                        <div className="form__row">
                            <Field htmlFor="new-card-digits" label="Últimos 4 dígitos">
                                <input
                                    id="new-card-digits"
                                    inputMode="numeric"
                                    maxLength={4}
                                    minLength={4}
                                    name="lastDigits"
                                    pattern="[0-9]{4}"
                                    placeholder="0000"
                                    required
                                />
                            </Field>
                            <Field htmlFor="new-card-color" label="Cor">
                                <select defaultValue="purple" id="new-card-color" name="color">
                                    <option value="purple">Roxo</option>
                                    <option value="orange">Laranja</option>
                                </select>
                            </Field>
                        </div>
                        <button className="primary-button form__submit" type="submit">
                            Criar cartão
                        </button>
                    </form>
                </Modal>
            )}
            {modal === "phase" && (
                <Modal onClose={() => setModal(null)} title="Nova fase">
                    <form className="form" onSubmit={addPhase}>
                        <Field htmlFor="phase-name" label="Nome da fase">
                            <input
                                autoFocus
                                defaultValue={`${phases.length + 1}ª fase`}
                                id="phase-name"
                                name="name"
                                required
                            />
                        </Field>
                        <div className="form__row">
                            <Field htmlFor="phase-start" label="Começa no dia">
                                <input
                                    id="phase-start"
                                    max="31"
                                    min="1"
                                    name="startDay"
                                    required
                                    type="number"
                                />
                            </Field>
                            <Field htmlFor="phase-end" label="Termina no dia">
                                <input
                                    id="phase-end"
                                    max={new Date(year, monthIndex + 1, 0).getDate()}
                                    min="1"
                                    name="endDay"
                                    required
                                    type="number"
                                />
                            </Field>
                        </div>
                        <button
                            className="primary-button form__submit"
                            disabled={createPhase.isPending}
                            type="submit"
                        >
                            Criar fase
                        </button>
                        {createPhase.error && (
                            <p role="alert">{translatePlanningError(createPhase.error.message)}</p>
                        )}
                    </form>
                </Modal>
            )}
            {modal === "goal" && (
                <Modal onClose={() => setModal(null)} title="Novo objetivo">
                    <form className="form" onSubmit={addGoal}>
                        <Field htmlFor="goal-name" label="Nome">
                            <input
                                autoFocus
                                id="goal-name"
                                name="name"
                                placeholder="Ex.: Investir R$ 10 mil em ações"
                                required
                            />
                        </Field>
                        <div className="form__row">
                            <Field htmlFor="goal-target" label="Valor alvo">
                                <input
                                    id="goal-target"
                                    min="0"
                                    name="target"
                                    placeholder="0,00"
                                    required
                                    step="0.01"
                                    type="number"
                                />
                            </Field>
                            <Field htmlFor="goal-saved" label="Valor já guardado">
                                <input
                                    defaultValue="0"
                                    id="goal-saved"
                                    min="0"
                                    name="saved"
                                    required
                                    step="0.01"
                                    type="number"
                                />
                            </Field>
                        </div>
                        <Field htmlFor="goal-deadline" label="Prazo">
                            <input id="goal-deadline" name="deadline" placeholder="Ex.: Dez 2027" />
                        </Field>
                        <button className="primary-button form__submit" type="submit">
                            Criar objetivo
                        </button>
                    </form>
                </Modal>
            )}
            {modal === "reserve" && (
                <Modal onClose={() => setModal(null)} title="Nova reserva">
                    <form className="form" onSubmit={addReserve}>
                        <Field htmlFor="reserve-name" label="Conta futura">
                            <input
                                autoFocus
                                id="reserve-name"
                                name="name"
                                placeholder="Ex.: IPVA e licenciamento"
                                required
                            />
                        </Field>
                        <div className="form__row">
                            <Field htmlFor="reserve-target" label="Valor necessário">
                                <input
                                    id="reserve-target"
                                    min="0"
                                    name="target"
                                    placeholder="0,00"
                                    required
                                    step="0.01"
                                    type="number"
                                />
                            </Field>
                            <Field htmlFor="reserve-saved" label="Já reservado">
                                <input
                                    defaultValue="0"
                                    id="reserve-saved"
                                    min="0"
                                    name="saved"
                                    required
                                    step="0.01"
                                    type="number"
                                />
                            </Field>
                        </div>
                        <Field htmlFor="reserve-due" label="Quando será pago">
                            <input id="reserve-due" name="due" placeholder="Ex.: Mar 2027" />
                        </Field>
                        <button className="primary-button form__submit" type="submit">
                            Criar reserva
                        </button>
                    </form>
                </Modal>
            )}
        </div>
    );
}

function Overview({
    totals,
    onOpen,
    onNavigate,
    goals,
    incomes,
    phases,
}: {
    totals: {
        income: number;
        bills: number;
        saving: number;
        flexible: number;
        allocated: number;
        available: number;
    };
    onOpen: (modal: ModalType) => void;
    onNavigate: (view: View) => void;
    goals: Goal[];
    incomes: Income[];
    phases: PlanningPhase[];
}) {
    const phaseSummaries = phases.map((phase) => {
        const income = incomes
            .filter((item) => item.phase === phase.name)
            .reduce((sum, item) => sum + item.amount, 0);
        return { income, name: phase.name };
    });
    const allocation = [
        { label: "Contas e compromissos", value: totals.bills, color: "violet" },
        { label: "Vida e gastos flexíveis", value: totals.flexible, color: "coral" },
        { label: "Guardar e investir", value: totals.saving, color: "green" },
    ];
    return (
        <>
            <section className="page-heading">
                <div>
                    <span className="eyebrow">Mês sob controle</span>
                    <h1>Seu dinheiro, antes dele ir embora.</h1>
                    <p>Decida o destino de cada valor e atravesse o mês com tranquilidade.</p>
                </div>
                <button
                    className="secondary-button"
                    onClick={() => onNavigate("planning")}
                    type="button"
                >
                    Ver plano completo <ArrowUpRight size={16} />
                </button>
            </section>
            <section className="hero-card">
                <div className="hero-card__main">
                    <span className="hero-card__label">Disponível para planejar</span>
                    <strong>{money.format(totals.available)}</strong>
                    <div className="hero-card__status">
                        <span />
                        Quase tudo tem um destino
                    </div>
                </div>
                <div className="hero-card__summary">
                    <div>
                        <span>Entradas previstas</span>
                        <strong>{money.format(totals.income)}</strong>
                        <small>
                            <ArrowDownLeft size={13} /> valores cadastrados no planejamento
                        </small>
                    </div>
                    <div>
                        <span>Já planejado</span>
                        <strong>{money.format(totals.allocated)}</strong>
                        <small>
                            <ArrowUpRight size={13} /> 99,7% das entradas
                        </small>
                    </div>
                </div>
                <div className="hero-orbit">
                    <span>{Math.round((totals.allocated / totals.income) * 100)}%</span>
                    <small>planejado</small>
                </div>
            </section>
            <section className="quick-actions" aria-label="Ações rápidas">
                <button onClick={() => onOpen("income")} type="button">
                    <span className="quick-actions__icon quick-actions__icon--green">
                        <ArrowDownLeft size={19} />
                    </span>
                    <span>
                        <strong>Nova entrada</strong>
                        <small>Dinheiro que vai chegar</small>
                    </span>
                    <Plus size={17} />
                </button>
                <button onClick={() => onOpen("expense")} type="button">
                    <span className="quick-actions__icon quick-actions__icon--coral">
                        <ReceiptText size={19} />
                    </span>
                    <span>
                        <strong>Nova saída</strong>
                        <small>Conta fixa ou variável</small>
                    </span>
                    <Plus size={17} />
                </button>
                <button onClick={() => onOpen("cardExpense")} type="button">
                    <span className="quick-actions__icon quick-actions__icon--violet">
                        <CreditCard size={19} />
                    </span>
                    <span>
                        <strong>Gasto no cartão</strong>
                        <small>Planeje a próxima fatura</small>
                    </span>
                    <Plus size={17} />
                </button>
            </section>
            <div className="dashboard-grid">
                <section className="panel allocation-panel">
                    <div className="panel__header">
                        <div>
                            <span className="eyebrow">Mapa do dinheiro</span>
                            <h2>Como o mês foi dividido</h2>
                        </div>
                        <button aria-label="Mais opções" className="icon-button" type="button">
                            <MoreHorizontal size={18} />
                        </button>
                    </div>
                    <div className="allocation-chart">
                        <div className="donut">
                            <div>
                                <strong>{money.format(totals.allocated)}</strong>
                                <span>planejados</span>
                            </div>
                        </div>
                        <div className="legend">
                            {allocation.map((item) => (
                                <div key={item.label}>
                                    <span className={"legend__dot legend__dot--" + item.color} />
                                    <p>
                                        <span>{item.label}</span>
                                        <strong>{money.format(item.value)}</strong>
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
                <section className="panel phases-panel">
                    <div className="panel__header">
                        <div>
                            <span className="eyebrow">Ritmo do mês</span>
                            <h2>Planejamento por fase</h2>
                        </div>
                        <button
                            className="text-button"
                            onClick={() => onNavigate("planning")}
                            type="button"
                        >
                            Detalhes <ChevronRight size={15} />
                        </button>
                    </div>
                    <div className="phase-bars">
                        {phaseSummaries.length === 0 && (
                            <p>Nenhuma fase cadastrada para este mês.</p>
                        )}
                        {phaseSummaries.map((phase) => (
                            <div className="phase-row" key={phase.name}>
                                <div>
                                    <strong>{phase.name}</strong>
                                    <span>Entram {money.format(phase.income)}</span>
                                </div>
                                <div className="phase-row__bar">
                                    <span />
                                </div>
                                <b>{money.format(phase.income)}</b>
                            </div>
                        ))}
                    </div>
                    <div className="phase-note">
                        <CircleDollarSign size={18} />
                        <p>
                            <strong>Bom trabalho.</strong> Só falta decidir o destino de{" "}
                            {money.format(totals.available)}.
                        </p>
                    </div>
                </section>
                <section className="panel goals-preview">
                    <div className="panel__header">
                        <div>
                            <span className="eyebrow">O que vem depois</span>
                            <h2>Objetivos em movimento</h2>
                        </div>
                        <button
                            className="text-button"
                            onClick={() => onNavigate("goals")}
                            type="button"
                        >
                            Ver todos <ChevronRight size={15} />
                        </button>
                    </div>
                    {goals.slice(0, 2).map((goal, index) => {
                        const percent = (goal.saved / goal.target) * 100;
                        return (
                            <div className="goal-line" key={goal.id}>
                                <div
                                    className={
                                        "goal-line__icon goal-line__icon--" +
                                        (index ? "violet" : "green")
                                    }
                                >
                                    <Flag size={18} />
                                </div>
                                <div>
                                    <div>
                                        <strong>{goal.name}</strong>
                                        <span>{Math.round(percent)}%</span>
                                    </div>
                                    <Progress tone={index ? "violet" : "green"} value={percent} />
                                    <small>
                                        {money.format(goal.saved)} de {money.format(goal.target)}
                                    </small>
                                </div>
                            </div>
                        );
                    })}
                </section>
            </div>
        </>
    );
}
function Cards({
    cards,
    expenses,
    onOpen,
}: {
    cards: CreditCardAccount[];
    expenses: CardExpense[];
    onOpen: (modal: ModalType) => void;
}) {
    return (
        <>
            <section className="page-heading compact">
                <div>
                    <span className="eyebrow">Próximas faturas</span>
                    <h1>Cartões planejados</h1>
                    <p>Veja o peso de cada compra antes da fatura fechar.</p>
                </div>
                <div className="heading-actions">
                    <button
                        className="secondary-button"
                        onClick={() => onOpen("newCard")}
                        type="button"
                    >
                        <Plus size={16} />
                        Criar cartão
                    </button>
                    <button
                        className="primary-button"
                        onClick={() => onOpen("cardExpense")}
                        type="button"
                    >
                        <Plus size={16} />
                        Adicionar gasto
                    </button>
                </div>
            </section>
            <div className="cards-grid">
                {cards.map((card) => {
                    const total = expenses
                        .filter((item) => item.card === card.name)
                        .reduce((sum, item) => sum + item.amount, 0);
                    return (
                        <article
                            className={"credit-card credit-card--" + card.color}
                            key={card.name}
                        >
                            <div>
                                <span>GFINANÇAS</span>
                                <CreditCard size={22} />
                            </div>
                            <strong>{money.format(total)}</strong>
                            <small>fatura prevista</small>
                            <div className="credit-card__footer">
                                <span>•••• {card.lastDigits}</span>
                                <span>Vence dia {String(card.dueDay).padStart(2, "0")}</span>
                            </div>
                            <Progress
                                tone={card.color === "purple" ? "violet" : "coral"}
                                value={(total / card.limit) * 100}
                            />
                        </article>
                    );
                })}
            </div>
            <section className="panel transactions-panel">
                <div className="panel__header">
                    <div>
                        <span className="eyebrow">Detalhamento</span>
                        <h2>Compras planejadas</h2>
                    </div>
                    <button
                        className="secondary-button"
                        onClick={() => onOpen("cardExpense")}
                        type="button"
                    >
                        <Plus size={15} />
                        Adicionar gasto
                    </button>
                </div>
                <div className="transactions-table">
                    <div className="transactions-table__head">
                        <span>Descrição</span>
                        <span>Cartão</span>
                        <span>Valor</span>
                    </div>
                    {expenses.map((item) => (
                        <div className="transactions-table__row" key={item.id}>
                            <span>
                                <span className="merchant-icon">
                                    <WalletCards size={16} />
                                </span>
                                <span className="transaction-copy">
                                    <span>{item.description}</span>
                                    <small>
                                        {item.installments === 1
                                            ? "À vista"
                                            : item.installments +
                                              "x de " +
                                              money.format(item.amount / item.installments)}
                                    </small>
                                </span>
                            </span>
                            <span>
                                <i
                                    className={item.card === "Nubank" ? "purple-dot" : "orange-dot"}
                                />
                                {item.card}
                            </span>
                            <strong>{money.format(item.amount)}</strong>
                        </div>
                    ))}
                </div>
            </section>
        </>
    );
}

export default function Home() {
    return (
        <Suspense fallback={null}>
            <PrototypeHome />
        </Suspense>
    );
}
function Goals({ goals, onOpen }: { goals: Goal[]; onOpen: (modal: ModalType) => void }) {
    return (
        <>
            <section className="page-heading compact">
                <div>
                    <span className="eyebrow">Construção de patrimônio</span>
                    <h1>Objetivos financeiros</h1>
                    <p>Defina metas maiores e acompanhe quanto falta para cada conquista.</p>
                </div>
                <button className="primary-button" onClick={() => onOpen("goal")} type="button">
                    <Plus size={16} /> Novo objetivo
                </button>
            </section>
            <div className="goals-grid">
                {goals.map((goal, index) => {
                    const percentage = (goal.saved / goal.target) * 100;
                    return (
                        <article className="goal-card" key={goal.id}>
                            <div className={"goal-card__top goal-card__top--" + (index % 3)}>
                                <div className="goal-card__icon">
                                    <Target size={21} />
                                </div>
                                <span>{goal.deadline}</span>
                            </div>
                            <h2>{goal.name}</h2>
                            <div className="goal-card__amount">
                                <strong>{money.format(goal.saved)}</strong>
                                <span>de {money.format(goal.target)}</span>
                            </div>
                            <Progress tone={index % 2 ? "violet" : "green"} value={percentage} />
                            <div className="goal-card__footer">
                                <span>{Math.round(percentage)}% concluído</span>
                                <b>Faltam {money.format(Math.max(goal.target - goal.saved, 0))}</b>
                            </div>
                        </article>
                    );
                })}
                <button className="add-goal-card" onClick={() => onOpen("goal")} type="button">
                    <span>
                        <Plus size={22} />
                    </span>
                    <strong>Novo objetivo financeiro</strong>
                    <small>Defina o próximo passo do seu patrimônio.</small>
                </button>
            </div>
        </>
    );
}
