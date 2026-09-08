"use client";

import {
    Bell,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    LayoutDashboard,
    Menu,
    Moon,
    MoreHorizontal,
    PiggyBank,
    Sun,
    Target,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@gfinancias/ui/components/button";
import { Input } from "@gfinancias/ui/components/input";
import { Select } from "@gfinancias/ui/components/select";
import { parseAsInteger, parseAsString, useQueryState, useQueryStates } from "nuqs";
import { Suspense, type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";

import { PlanningView } from "@/components/planning-view";
import { Cards } from "@/features/overview/components/cards";
import { Goals } from "@/features/overview/components/goals";
import { Overview } from "@/features/overview/components/overview";
import { Field, Modal } from "@/features/overview/components/primitives";
import type {
    CreditCardAccount,
    CardExpense,
    EditingRecord,
    Expense,
    ExpenseCategory,
    Goal,
    Income,
    IncomeCategory,
    ModalType,
    PlanningPhase,
    Reserve,
    View,
} from "@/features/overview/types";

import { ReservesView } from "@/components/reserves-view";
import { translatePlanningError } from "@/features/planning/utils/api-errors";
import { trpc } from "@/utils/trpc";

const navigation = [
    { id: "overview" as const, label: "Visão geral", icon: LayoutDashboard },
    { id: "planning" as const, label: "Planejamento", icon: CalendarDays },
    { id: "cards" as const, label: "Cartões", icon: CreditCard },
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
export function PrototypeHome({
    cardsContent,
    initialView = "overview",
}: {
    cardsContent?: ReactNode;
    initialView?: View;
}) {
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
        if (next === "cards" || next === "planning") {
            window.location.assign("/" + next + "?month=" + month + "&year=" + year);
            return;
        }
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
                    {view === "cards" &&
                        (cardsContent ?? (
                            <Cards cards={cards} expenses={cardExpenses} onOpen={setModal} />
                        ))}
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
                            <Input
                                autoFocus
                                defaultValue={editingRecord.record.name}
                                id="edit-record-name"
                                name="name"
                                required
                            />
                        </Field>
                        <Field htmlFor="edit-record-category" label="Categoria">
                            <Select
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
                            </Select>
                        </Field>
                        <Field htmlFor="edit-record-amount" label="Valor">
                            <Input
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
                            <Input
                                autoFocus
                                id="income-name"
                                name="name"
                                placeholder="Ex.: Salário"
                                required
                            />
                        </Field>
                        <Field htmlFor="income-category" label="Categoria">
                            <Select
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
                            </Select>
                        </Field>
                        {incomeCategory === "Reserva" && (
                            <div className="reserve-withdrawal">
                                <Field htmlFor="income-reserve" label="Reserva">
                                    <Select
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
                                    </Select>
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
                                <Input
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
                                <Select
                                    defaultValue={String(phases[0]?.id ?? "")}
                                    id="income-phase"
                                    name="phase"
                                >
                                    {phases.map((phase) => (
                                        <option key={phase.id} value={phase.id}>
                                            {phase.name}
                                        </option>
                                    ))}
                                </Select>
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
                            <Input
                                autoFocus
                                id="expense-name"
                                name="name"
                                placeholder="Ex.: Aluguel"
                                required
                            />
                        </Field>
                        <Field htmlFor="expense-category" label="Categoria da saída">
                            <Select
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
                            </Select>
                        </Field>
                        {expenseCategory === "Reserva" && (
                            <div className="reserve-withdrawal">
                                <Field htmlFor="expense-reserve" label="Reserva">
                                    <Select
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
                                    </Select>
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
                                <Input
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
                                <Select
                                    defaultValue={String(phases[0]?.id ?? "")}
                                    id="expense-phase"
                                    name="phase"
                                >
                                    {phases.map((phase) => (
                                        <option key={phase.id} value={phase.id}>
                                            {phase.name}
                                        </option>
                                    ))}
                                </Select>
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
                            <Input
                                autoFocus
                                id="card-description"
                                name="description"
                                placeholder="Ex.: Curso online"
                                required
                            />
                        </Field>
                        <div className="form__row">
                            <Field htmlFor="card-amount" label="Valor">
                                <Input
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
                                <Select defaultValue={cards[0]?.name} id="card-name" name="card">
                                    {cards.map((card) => (
                                        <option key={card.id}>{card.name}</option>
                                    ))}
                                </Select>
                            </Field>
                        </div>
                        <Field htmlFor="card-installments" label="Forma de pagamento">
                            <Select
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
                            </Select>
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
                        <Button className="form__submit" type="submit" variant="primary">
                            Adicionar gasto
                        </Button>
                    </form>
                </Modal>
            )}
            {modal === "newCard" && (
                <Modal onClose={() => setModal(null)} title="Novo cartão">
                    <form className="form" onSubmit={addCard}>
                        <Field htmlFor="new-card-name" label="Nome do cartão">
                            <Input
                                autoFocus
                                id="new-card-name"
                                name="name"
                                placeholder="Ex.: Itaú"
                                required
                            />
                        </Field>
                        <div className="form__row">
                            <Field htmlFor="new-card-limit" label="Limite">
                                <Input
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
                                <Input
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
                                <Input
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
                                <Select defaultValue="purple" id="new-card-color" name="color">
                                    <option value="purple">Roxo</option>
                                    <option value="orange">Laranja</option>
                                </Select>
                            </Field>
                        </div>
                        <Button className="form__submit" type="submit" variant="primary">
                            Criar cartão
                        </Button>
                    </form>
                </Modal>
            )}
            {modal === "phase" && (
                <Modal onClose={() => setModal(null)} title="Nova fase">
                    <form className="form" onSubmit={addPhase}>
                        <Field htmlFor="phase-name" label="Nome da fase">
                            <Input
                                autoFocus
                                defaultValue={`${phases.length + 1}ª fase`}
                                id="phase-name"
                                name="name"
                                required
                            />
                        </Field>
                        <div className="form__row">
                            <Field htmlFor="phase-start" label="Começa no dia">
                                <Input
                                    id="phase-start"
                                    max="31"
                                    min="1"
                                    name="startDay"
                                    required
                                    type="number"
                                />
                            </Field>
                            <Field htmlFor="phase-end" label="Termina no dia">
                                <Input
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
                            <Input
                                autoFocus
                                id="goal-name"
                                name="name"
                                placeholder="Ex.: Investir R$ 10 mil em ações"
                                required
                            />
                        </Field>
                        <div className="form__row">
                            <Field htmlFor="goal-target" label="Valor alvo">
                                <Input
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
                                <Input
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
                            <Input id="goal-deadline" name="deadline" placeholder="Ex.: Dez 2027" />
                        </Field>
                        <Button className="form__submit" type="submit" variant="primary">
                            Criar objetivo
                        </Button>
                    </form>
                </Modal>
            )}
            {modal === "reserve" && (
                <Modal onClose={() => setModal(null)} title="Nova reserva">
                    <form className="form" onSubmit={addReserve}>
                        <Field htmlFor="reserve-name" label="Conta futura">
                            <Input
                                autoFocus
                                id="reserve-name"
                                name="name"
                                placeholder="Ex.: IPVA e licenciamento"
                                required
                            />
                        </Field>
                        <div className="form__row">
                            <Field htmlFor="reserve-target" label="Valor necessário">
                                <Input
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
                                <Input
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
                            <Input id="reserve-due" name="due" placeholder="Ex.: Mar 2027" />
                        </Field>
                        <Button className="form__submit" type="submit" variant="primary">
                            Criar reserva
                        </Button>
                    </form>
                </Modal>
            )}
        </div>
    );
}

export default function Home() {
    return (
        <Suspense fallback={null}>
            <PrototypeHome />
        </Suspense>
    );
}
