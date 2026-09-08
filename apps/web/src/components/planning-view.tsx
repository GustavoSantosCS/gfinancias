"use client";

import { ArrowDownLeft, CalendarRange, Plus, ReceiptText, Scale } from "lucide-react";
import { useEffect, useState } from "react";

type PlanningPhase = { id: number; name: string; startDay: number; endDay: number };
type IncomeCategory = "Salário" | "Reserva" | "Outros";
type ExpenseCategory =
    | "Saídas fixas"
    | "Saídas fixas com valores variáveis"
    | "Saídas variadas"
    | "Reserva"
    | "Investimentos";

type Income = {
    id: number;
    name: string;
    amount: number;
    phase: string;
    category: IncomeCategory;
};
type Expense = {
    id: number;
    name: string;
    amount: number;
    phase: string;
    category: ExpenseCategory;
};

const incomeCategories: IncomeCategory[] = ["Salário", "Reserva", "Outros"];
const expenseCategories: ExpenseCategory[] = [
    "Saídas fixas",
    "Saídas fixas com valores variáveis",
    "Saídas variadas",
    "Reserva",
    "Investimentos",
];
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function PlanningView({
    incomes,
    expenses,
    phases,
    month,
    year,
    daysInMonth,
    onNewIncome,
    onNewExpense,
    onNewPhase,
}: {
    incomes: Income[];
    expenses: Expense[];
    phases: PlanningPhase[];
    month: string;
    year: number;
    daysInMonth: number;
    onNewIncome: () => void;
    onNewExpense: () => void;
    onNewPhase: () => void;
}) {
    const [activePhase, setActivePhase] = useState(phases[0]?.name ?? "");

    useEffect(() => {
        if (!phases.some((phase) => phase.name === activePhase)) {
            setActivePhase(phases[0]?.name ?? "");
        }
    }, [activePhase, phases]);

    const selectedPhase = phases.find((phase) => phase.name === activePhase) ?? phases[0];
    const visibleIncomes = incomes.filter((item) => item.phase === activePhase);
    const visibleExpenses = expenses.filter((item) => item.phase === activePhase);
    const totalIncome = visibleIncomes.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = visibleExpenses.reduce((sum, item) => sum + item.amount, 0);
    const available = totalIncome - totalExpenses;
    const startDay = String(selectedPhase?.startDay ?? 1).padStart(2, "0");
    const endDay = String(Math.min(selectedPhase?.endDay ?? daysInMonth, daysInMonth)).padStart(
        2,
        "0",
    );

    return (
        <>
            <section className="page-heading compact planning-heading">
                <div>
                    <span className="eyebrow">Plano do mês</span>
                    <h1>Planejamento de {month.toLowerCase()}</h1>
                    <p>Organize cada entrada e dê um destino ao dinheiro antes de gastar.</p>
                </div>
                <div className="heading-actions">
                    <button className="secondary-button" onClick={onNewPhase} type="button">
                        <Plus size={16} /> Criar fase
                    </button>
                    <button className="secondary-button" onClick={onNewExpense} type="button">
                        <Plus size={16} /> Nova saída
                    </button>
                    <button className="primary-button" onClick={onNewIncome} type="button">
                        <Plus size={16} /> Nova entrada
                    </button>
                </div>
            </section>

            <section className="planning-summary" aria-label="Resumo da fase">
                <div className="planning-summary__intro">
                    <span>Resumo</span>
                    <strong>{activePhase}</strong>
                    <small>
                        {month} de {year}
                    </small>
                </div>
                <SummaryMetric
                    icon={<ArrowDownLeft size={19} />}
                    label="Entradas previstas"
                    tone="green"
                    value={totalIncome}
                />
                <SummaryMetric
                    icon={<ReceiptText size={19} />}
                    label="Saídas planejadas"
                    tone="coral"
                    value={totalExpenses}
                />
                <SummaryMetric
                    icon={<Scale size={19} />}
                    label="Livre para planejar"
                    tone={available >= 0 ? "violet" : "coral"}
                    value={available}
                />
            </section>

            <div className="phase-tabs" role="tablist" aria-label="Fases do mês">
                {phases.map((phase) => {
                    const phaseEnd = Math.min(phase.endDay, daysInMonth);
                    const dates =
                        String(phase.startDay).padStart(2, "0") +
                        " — " +
                        String(phaseEnd).padStart(2, "0");
                    return (
                        <button
                            aria-selected={activePhase === phase.name}
                            className={activePhase === phase.name ? "active" : ""}
                            key={phase.id}
                            onClick={() => setActivePhase(phase.name)}
                            role="tab"
                            type="button"
                        >
                            <span>{phase.name}</span>
                            <small>
                                {dates} de {month.slice(0, 3).toLowerCase()}
                            </small>
                        </button>
                    );
                })}
            </div>

            <section className="phase-period">
                <div className="phase-period__icon">
                    <CalendarRange size={20} />
                </div>
                <div>
                    <span>Período da {activePhase.toLowerCase()}</span>
                    <strong>
                        Começa dia {startDay} · termina dia {endDay}
                    </strong>
                </div>
                <small>
                    {month} · {year}
                </small>
            </section>

            <div className="planning-grid">
                <CategoryList
                    categories={incomeCategories}
                    icon={<ArrowDownLeft size={18} />}
                    items={visibleIncomes}
                    title="Entradas"
                    tone="green"
                />
                <CategoryList
                    categories={expenseCategories}
                    icon={<ReceiptText size={18} />}
                    items={visibleExpenses}
                    title="Saídas e destinos"
                    tone="coral"
                />
            </div>
        </>
    );
}

function SummaryMetric({
    icon,
    label,
    tone,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    tone: "green" | "coral" | "violet";
    value: number;
}) {
    return (
        <div className="summary-metric">
            <span className={"summary-metric__icon summary-metric__icon--" + tone}>{icon}</span>
            <div>
                <span>{label}</span>
                <strong>{money.format(value)}</strong>
            </div>
        </div>
    );
}

function CategoryList({
    categories,
    icon,
    items,
    title,
    tone,
}: {
    categories: string[];
    icon: React.ReactNode;
    items: Array<Income | Expense>;
    title: string;
    tone: "green" | "coral";
}) {
    return (
        <section className="panel category-panel">
            <div className="panel__header">
                <div className="list-panel__title">
                    <span className={"quick-actions__icon quick-actions__icon--" + tone}>
                        {icon}
                    </span>
                    <div>
                        <span className="eyebrow">Nesta fase</span>
                        <h2>{title}</h2>
                    </div>
                </div>
                <span className="count-pill">{items.length}</span>
            </div>
            <div className="category-list">
                {categories.map((category) => {
                    const categoryItems = items.filter((item) => item.category === category);
                    const subtotal = categoryItems.reduce((sum, item) => sum + item.amount, 0);
                    return (
                        <div className="category-group" key={category}>
                            <div className="category-group__heading">
                                <span>{category}</span>
                                <strong>{money.format(subtotal)}</strong>
                            </div>
                            {categoryItems.length ? (
                                categoryItems.map((item) => (
                                    <div className="item-row" key={item.id}>
                                        <div>
                                            <strong>{item.name}</strong>
                                            <span>{category}</span>
                                        </div>
                                        <b className={tone === "green" ? "positive" : ""}>
                                            {tone === "green" ? "+ " : "− "}
                                            {money.format(item.amount)}
                                        </b>
                                    </div>
                                ))
                            ) : (
                                <div className="category-group__empty">Nenhum valor planejado</div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
