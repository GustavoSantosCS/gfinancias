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
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";

import { PlanningView } from "@/components/planning-view";

import { PlanningPage } from "@/features/planning/planning-page";
import { ReservesView } from "@/components/reserves-view";

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
type PlanningPhase = { id: number; name: string; startDay: number; endDay: number };
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
type PlannedItem = { id: number; name: string; amount: number; phase: Phase };
type Income = PlannedItem & { category: IncomeCategory };
type Expense = PlannedItem & { category: ExpenseCategory };
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
    { id: "cards" as const, label: "Cartões", icon: CreditCard },
    { id: "goals" as const, label: "Objetivos financeiros", icon: Target },
    { id: "reserves" as const, label: "Reservas", icon: PiggyBank },
];
const initialPhases: PlanningPhase[] = [
    { id: 1, name: "1ª fase", startDay: 1, endDay: 15 },
    { id: 2, name: "2ª fase", startDay: 16, endDay: 31 },
];
const initialCards: CreditCardAccount[] = [
    { id: 1, name: "Nubank", color: "purple", limit: 3000, dueDay: 8, lastDigits: "4821" },
    { id: 2, name: "Inter", color: "orange", limit: 1800, dueDay: 12, lastDigits: "3104" },
];
const initialIncomes: Income[] = [
    { id: 1, name: "Salário previsto 60%", amount: 2902.31, phase: "1ª fase", category: "Salário" },
    { id: 2, name: "Inglês", amount: 258, phase: "1ª fase", category: "Outros" },
    { id: 3, name: "Pagamento de empréstimo", amount: 167, phase: "1ª fase", category: "Outros" },
    { id: 4, name: "Gastos gerais", amount: 700, phase: "1ª fase", category: "Reserva" },
    { id: 5, name: "Pix Crédito Inter", amount: 333, phase: "1ª fase", category: "Outros" },
    { id: 6, name: "Óculos", amount: 143, phase: "1ª fase", category: "Reserva" },
    { id: 7, name: "Academia", amount: 145, phase: "1ª fase", category: "Reserva" },
    { id: 8, name: "Combustível", amount: 200, phase: "1ª fase", category: "Reserva" },
    { id: 9, name: "Salário 40%", amount: 3310.38, phase: "2ª fase", category: "Salário" },
];
const initialExpenses: Expense[] = [
    { id: 1, name: "Internet", amount: 144.99, phase: "1ª fase", category: "Saídas fixas" },
    { id: 2, name: "Inglês", amount: 258, phase: "1ª fase", category: "Saídas fixas" },
    { id: 3, name: "Nubank", amount: 1314.8, phase: "1ª fase", category: "Saídas fixas" },
    { id: 4, name: "Inter", amount: 333, phase: "1ª fase", category: "Saídas fixas" },
    {
        id: 5,
        name: "Energia",
        amount: 750,
        phase: "1ª fase",
        category: "Saídas fixas com valores variáveis",
    },
    {
        id: 6,
        name: "Água e esgoto",
        amount: 90,
        phase: "1ª fase",
        category: "Saídas fixas com valores variáveis",
    },
    { id: 7, name: "Gastos gerais", amount: 300, phase: "1ª fase", category: "Saídas variadas" },
    { id: 8, name: "Combustível", amount: 300, phase: "1ª fase", category: "Saídas variadas" },
    { id: 9, name: "Academia", amount: 145, phase: "1ª fase", category: "Saídas variadas" },
    {
        id: 10,
        name: "Reserva para viagem",
        amount: 300,
        phase: "1ª fase",
        category: "Reserva",
    },
    {
        id: 11,
        name: "Reserva de emergência",
        amount: 900,
        phase: "1ª fase",
        category: "Investimentos",
    },
    { id: 12, name: "Mounjaro", amount: 1750, phase: "2ª fase", category: "Saídas fixas" },
    { id: 13, name: "Inglês", amount: 258, phase: "2ª fase", category: "Saídas variadas" },
    { id: 14, name: "Gastos gerais", amount: 400, phase: "2ª fase", category: "Saídas variadas" },
    { id: 15, name: "Óculos", amount: 143, phase: "2ª fase", category: "Reserva" },
    {
        id: 16,
        name: "Reserva de emergência",
        amount: 750,
        phase: "2ª fase",
        category: "Investimentos",
    },
];
const initialCardExpenses: CardExpense[] = [
    { id: 1, description: "YouTube", amount: 26.9, card: "Nubank", installments: 1 },
    { id: 2, description: "Combustível", amount: 200, card: "Nubank", installments: 1 },
    { id: 3, description: "ChatGPT Plus", amount: 99.9, card: "Nubank", installments: 1 },
    { id: 4, description: "Óculos", amount: 143, card: "Nubank", installments: 3 },
    { id: 5, description: "Academia", amount: 145, card: "Nubank", installments: 1 },
    { id: 6, description: "Gastos gerais", amount: 700, card: "Nubank", installments: 1 },
    { id: 7, description: "Pix Crédito", amount: 333, card: "Inter", installments: 3 },
];
const initialGoals: Goal[] = [
    { id: 1, name: "Reserva de emergência", target: 42000, saved: 8200, deadline: "Dez 2028" },
    {
        id: 2,
        name: "Investir R$ 10 mil em ações",
        target: 10000,
        saved: 2350,
        deadline: "Dez 2027",
    },
];
const initialReserves: Reserve[] = [
    { id: 1, name: "IPVA e licenciamento", target: 1408.07, saved: 704.04, due: "Mar 2027" },
    { id: 2, name: "Seguro anual do carro", target: 2588.64, saved: 647.16, due: "Ago 2027" },
    { id: 3, name: "Manutenção do carro", target: 1800, saved: 600, due: "Jan 2027" },
];
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

function PrototypeHome() {
    const [view, setView] = useState<View>("overview");
    const [modal, setModal] = useState<ModalType>(null);
    const [dark, setDark] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [monthIndex, setMonthIndex] = useState(10);
    const [year, setYear] = useState(2026);
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

    useEffect(() => {
        const saved = window.localStorage.getItem("gfin-theme");
        const enabled = saved ? saved === "dark" : true;
        setDark(enabled);
        document.documentElement.classList.toggle("dark", enabled);
    }, []);
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
    const changeMonth = (direction: number) =>
        setMonthIndex((current) => {
            const next = current + direction;
            if (next < 0) {
                setYear((value) => value - 1);
                return 11;
            }
            if (next > 11) {
                setYear((value) => value + 1);
                return 0;
            }
            return next;
        });
    const toggleTheme = () => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
        window.localStorage.setItem("gfin-theme", next ? "dark" : "light");
    };
    const addIncome = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const entryAmount = amount(formValue(data, "amount"));
        const category = formValue(data, "category") as IncomeCategory;
        if (category === "Reserva") {
            const reserveId = Number(formValue(data, "reserve"));
            setReserves((items) =>
                items.map((reserve) =>
                    reserve.id === reserveId
                        ? { ...reserve, saved: Math.max(reserve.saved - entryAmount, 0) }
                        : reserve,
                ),
            );
        }
        setIncomes((items) => [
            ...items,
            {
                id: Date.now(),
                name: formValue(data, "name"),
                amount: entryAmount,
                phase: formValue(data, "phase") as Phase,
                category,
            },
        ]);
        setIncomeCategory("Salário");
        setIncomeAmount("");
        setModal(null);
        setView("planning");
    };
    const addExpense = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const plannedAmount = amount(formValue(data, "amount"));
        const category = formValue(data, "category") as ExpenseCategory;
        if (category === "Reserva") {
            const reserveId = Number(formValue(data, "reserve"));
            setReserves((items) =>
                items.map((reserve) =>
                    reserve.id === reserveId
                        ? { ...reserve, saved: reserve.saved + plannedAmount }
                        : reserve,
                ),
            );
        }
        setExpenses((items) => [
            ...items,
            {
                id: Date.now(),
                name: formValue(data, "name"),
                amount: plannedAmount,
                phase: formValue(data, "phase") as Phase,
                category,
            },
        ]);
        setExpenseCategory("Saídas fixas");
        setExpenseAmount("");
        setModal(null);
        setView("planning");
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
        setPhases((items) => [
            ...items,
            {
                id: Date.now(),
                name: formValue(data, "name"),
                startDay: Number(formValue(data, "startDay")),
                endDay: Number(formValue(data, "endDay")),
            },
        ]);
        setModal(null);
        setView("planning");
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
                                key={item.id}
                                onClick={() => navigate(item.id)}
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
                            onOpen={setModal}
                            goals={goals}
                        />
                    )}
                    {view === "planning" && (
                        <PlanningView
                            daysInMonth={new Date(year, monthIndex + 1, 0).getDate()}
                            expenses={expenses}
                            incomes={incomes}
                            month={months[monthIndex]}
                            onNewExpense={() => setModal("expense")}
                            onNewIncome={() => setModal("income")}
                            onNewPhase={() => setModal("phase")}
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
                                    defaultValue={phases[0]?.name}
                                    id="income-phase"
                                    name="phase"
                                >
                                    {phases.map((phase) => (
                                        <option key={phase.id}>{phase.name}</option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                        <button className="primary-button form__submit" type="submit">
                            Adicionar entrada
                        </button>
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
                                    defaultValue={phases[0]?.name}
                                    id="expense-phase"
                                    name="phase"
                                >
                                    {phases.map((phase) => (
                                        <option key={phase.id}>{phase.name}</option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                        <button className="primary-button form__submit" type="submit">
                            Adicionar saída
                        </button>
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
                                    max="31"
                                    min="1"
                                    name="endDay"
                                    required
                                    type="number"
                                />
                            </Field>
                        </div>
                        <button className="primary-button form__submit" type="submit">
                            Criar fase
                        </button>
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
}) {
    const allocation = [
        { label: "Contas e compromissos", value: totals.bills, color: "violet" },
        { label: "Vida e gastos flexíveis", value: totals.flexible, color: "coral" },
        { label: "Guardar e investir", value: totals.saving, color: "green" },
    ];
    return (
        <>
            <section className="page-heading">
                <div>
                    <span className="eyebrow">Novembro sob controle</span>
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
                            <ArrowDownLeft size={13} /> dividido em 2 fases
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
                        <div className="phase-row">
                            <div>
                                <strong>1ª fase</strong>
                                <span>Entram {money.format(4848.31)}</span>
                            </div>
                            <div className="phase-row__bar">
                                <span />
                            </div>
                            <b>{money.format(12.52)}</b>
                        </div>
                        <div className="phase-row">
                            <div>
                                <strong>2ª fase</strong>
                                <span>Entram {money.format(3310.38)}</span>
                            </div>
                            <div className="phase-row__bar">
                                <span />
                            </div>
                            <b>{money.format(9.38)}</b>
                        </div>
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
    return <PlanningPage />;
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
