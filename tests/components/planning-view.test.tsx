import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vite-plus/test";

import { PlanningView } from "../../apps/web/src/components/planning-view";

it("shows only phase creation when the month has no phases", () => {
    render(
        <PlanningView
            activePhaseId={null}
            daysInMonth={30}
            expenses={[]}
            incomes={[]}
            month="Setembro"
            onEditExpense={vi.fn()}
            onEditIncome={vi.fn()}
            onNewExpense={vi.fn()}
            onNewIncome={vi.fn()}
            onNewPhase={vi.fn()}
            onPhaseChange={vi.fn()}
            phases={[]}
            year={2026}
        />,
    );

    expect(screen.getByRole("button", { name: "Criar fase" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Nova saída" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nova entrada" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Resumo da fase")).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Fases do mês" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Entradas" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Saídas e destinos" })).not.toBeInTheDocument();
    expect(
        screen.getByText("Crie a primeira fase para começar o planejamento deste mês."),
    ).toBeVisible();
});

it("keeps the heading and shows a local spinner while loading", () => {
    render(
        <PlanningView
            activePhaseId={null}
            daysInMonth={30}
            expenses={[]}
            incomes={[]}
            isLoading
            month="Setembro"
            onEditExpense={vi.fn()}
            onEditIncome={vi.fn()}
            onNewExpense={vi.fn()}
            onNewIncome={vi.fn()}
            onNewPhase={vi.fn()}
            onPhaseChange={vi.fn()}
            phases={[]}
            year={2026}
        />,
    );

    expect(screen.getByRole("heading", { name: "Planejamento de setembro" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Criar fase" })).toBeDisabled();
    expect(screen.getByRole("status", { name: "Carregando planejamento" })).toHaveClass(
        "panel",
        "planning-loading",
    );
    expect(screen.queryByText("Carregando planejamento…")).not.toBeInTheDocument();
    expect(screen.queryByText("Nenhuma fase cadastrada")).not.toBeInTheDocument();
});

it("disables phase creation only when every day of the month belongs to a phase", () => {
    const props = {
        activePhaseId: "first-phase",
        daysInMonth: 30,
        expenses: [],
        incomes: [],
        month: "Setembro",
        onEditExpense: vi.fn(),
        onEditIncome: vi.fn(),
        onNewExpense: vi.fn(),
        onNewIncome: vi.fn(),
        onNewPhase: vi.fn(),
        onPhaseChange: vi.fn(),
        year: 2026,
    };
    const { rerender } = render(
        <PlanningView
            {...props}
            phases={[
                { endDay: 15, id: "first-phase", name: "First half", startDay: 1 },
                { endDay: 30, id: "second-phase", name: "Second half", startDay: 16 },
            ]}
        />,
    );

    expect(screen.getByRole("button", { name: "Criar fase" })).toBeDisabled();

    rerender(
        <PlanningView
            {...props}
            phases={[
                { endDay: 14, id: "first-phase", name: "First half", startDay: 1 },
                { endDay: 30, id: "second-phase", name: "Second half", startDay: 16 },
            ]}
        />,
    );

    expect(screen.getByRole("button", { name: "Criar fase" })).toBeEnabled();
});

it("requests editing for income and expense records", async () => {
    const editIncome = vi.fn();
    const editExpense = vi.fn();
    const changePhase = vi.fn();
    const user = userEvent.setup();
    const income = {
        amount: 5_000,
        category: "Salário" as const,
        id: "income-id",
        name: "Salary",
        phase: "First half",
    };
    const expense = {
        amount: 150,
        category: "Saídas fixas" as const,
        id: "expense-id",
        name: "Internet",
        phase: "First half",
    };

    render(
        <PlanningView
            activePhaseId="phase-id"
            daysInMonth={30}
            expenses={[expense]}
            incomes={[income]}
            month="Setembro"
            onEditExpense={editExpense}
            onEditIncome={editIncome}
            onNewExpense={vi.fn()}
            onNewIncome={vi.fn()}
            onNewPhase={vi.fn()}
            onPhaseChange={changePhase}
            phases={[{ endDay: 15, id: "phase-id", name: "First half", startDay: 1 }]}
            year={2026}
        />,
    );

    await user.click(screen.getByRole("button", { name: "Editar Salary" }));
    await user.click(screen.getByRole("button", { name: "Editar Internet" }));
    await user.click(screen.getByRole("tab", { name: /First half/ }));

    expect(editIncome).toHaveBeenCalledWith(income);
    expect(editExpense).toHaveBeenCalledWith(expense);
    expect(changePhase).toHaveBeenCalledWith("phase-id");
});
