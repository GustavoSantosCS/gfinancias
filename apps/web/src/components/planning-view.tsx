"use client";

import { ArrowDownLeft, CalendarRange, Plus, ReceiptText, Scale } from "lucide-react";
import { Button } from "@gfinancias/ui/components/button";

type PlanningPhase = { id: string | number; name: string; startDay: number; endDay: number };
type IncomeCategory = "Salário" | "Reserva" | "Outros";
type ExpenseCategory =
    | "Saídas fixas"
    | "Saídas fixas com valores variáveis"
    | "Saídas variadas"
    | "Reserva"
    | "Investimentos";

type Income = {
    id: string | number;
    name: string;
    amount: number;
    phase: string;
    category: IncomeCategory;
};
type Expense = {
    id: string | number;
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
    activePhaseId,
    incomes,
    expenses,
    phases,
    isLoading = false,
    errorMessage,
    month,
    year,
    daysInMonth,
    onNewIncome,
    onNewExpense,
    onNewPhase,
    onPhaseChange,
    onEditIncome,
    onEditExpense,
}: {
    activePhaseId: string | null;
    incomes: Income[];
    expenses: Expense[];
    phases: PlanningPhase[];
    isLoading?: boolean;
    errorMessage?: string | null;
    month: string;
    year: number;
    daysInMonth: number;
    onNewIncome: () => void;
    onNewExpense: () => void;
    onNewPhase: () => void;
    onPhaseChange: (phaseId: string) => void;
    onEditIncome: (income: Income) => void;
    onEditExpense: (expense: Expense) => void;
}) {
    const selectedPhase = phases.find((phase) => String(phase.id) === activePhaseId) ?? phases[0];
    const activePhase = selectedPhase?.name ?? "";
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
    const hasAvailableDays = Array.from({ length: daysInMonth }, (_, index) => index + 1).some(
        (day) => !phases.some((phase) => phase.startDay <= day && phase.endDay >= day),
    );
    const disableCreatePhase = isLoading || !hasAvailableDays;

    if (isLoading || errorMessage) {
        return (
            <>
                <PlanningHeading
                    disableCreatePhase={disableCreatePhase}
                    month={month}
                    onNewPhase={onNewPhase}
                />
                {isLoading ? (
                    <section
                        aria-label="Carregando planejamento"
                        className="panel planning-loading"
                        role="status"
                    >
                        <span aria-hidden="true" className="planning-spinner" />
                    </section>
                ) : (
                    <section className="panel planning-error" role="alert">
                        <p>Não foi possível carregar o planejamento: {errorMessage}</p>
                    </section>
                )}
            </>
        );
    }

    if (phases.length === 0) {
        return (
            <>
                <PlanningHeading
                    disableCreatePhase={disableCreatePhase}
                    month={month}
                    onNewPhase={onNewPhase}
                />
                <section className="panel planning-empty" role="status">
                    <CalendarRange size={24} />
                    <div>
                        <h2>Nenhuma fase cadastrada</h2>
                        <p>Crie a primeira fase para começar o planejamento deste mês.</p>
                    </div>
                </section>
            </>
        );
    }

    return (
        <>
            <PlanningHeading
                disableCreatePhase={disableCreatePhase}
                month={month}
                onNewPhase={onNewPhase}
            >
                <>
                    <Button onClick={onNewExpense} type="button" variant="default">
                        <Plus size={16} /> Nova saída
                    </Button>
                    <Button onClick={onNewIncome} type="button" variant="primary">
                        <Plus size={16} /> Nova entrada
                    </Button>
                </>
            </PlanningHeading>

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
                            aria-selected={String(phase.id) === activePhaseId}
                            className={String(phase.id) === activePhaseId ? "active" : ""}
                            key={phase.id}
                            onClick={() => onPhaseChange(String(phase.id))}
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
                    onEdit={onEditIncome}
                    title="Entradas"
                    tone="green"
                />
                <CategoryList
                    categories={expenseCategories}
                    icon={<ReceiptText size={18} />}
                    items={visibleExpenses}
                    onEdit={onEditExpense}
                    title="Saídas e destinos"
                    tone="coral"
                />
            </div>
        </>
    );
}

function PlanningHeading({
    children,
    disableCreatePhase = false,
    month,
    onNewPhase,
}: {
    children?: React.ReactNode;
    disableCreatePhase?: boolean;
    month: string;
    onNewPhase: () => void;
}) {
    return (
        <section className="page-heading compact planning-heading">
            <div>
                <span className="eyebrow">Plano do mês</span>
                <h1>Planejamento de {month.toLowerCase()}</h1>
                <p>Organize cada entrada e dê um destino ao dinheiro antes de gastar.</p>
            </div>
            <div className="heading-actions">
                <button
                    className="secondary-button"
                    disabled={disableCreatePhase}
                    onClick={onNewPhase}
                    type="button"
                >
                    <Plus size={16} /> Criar fase
                </button>
                {children}
            </div>
        </section>
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

function CategoryList<T extends Income | Expense>({
    categories,
    icon,
    items,
    onEdit,
    title,
    tone,
}: {
    categories: string[];
    icon: React.ReactNode;
    items: T[];
    onEdit: (item: T) => void;
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
                                    <button
                                        aria-label={"Editar " + item.name}
                                        className="item-row item-row--editable"
                                        key={item.id}
                                        onClick={() => onEdit(item)}
                                        type="button"
                                    >
                                        <div>
                                            <strong>{item.name}</strong>
                                            <span>{category}</span>
                                        </div>
                                        <div className="item-row__actions">
                                            <b className={tone === "green" ? "positive" : ""}>
                                                {tone === "green" ? "+ " : "− "}
                                                {money.format(item.amount)}
                                            </b>
                                        </div>
                                    </button>
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
