"use client";

import { Button } from "@gfinancias/ui/components/button";
import { Input } from "@gfinancias/ui/components/input";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";

import { queryClient, trpc } from "@/utils/trpc";

const money = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });
const incomeCategories = [
    ["SALARY", "Salário"],
    ["RESERVE", "Reserva"],
    ["OTHER", "Outros"],
] as const;
const expenseCategories = [
    ["FIXED", "Saída fixa"],
    ["VARIABLE_FIXED", "Saída fixa variável"],
    ["VARIABLE", "Saída variada"],
    ["RESERVE", "Reserva"],
    ["INVESTMENT", "Investimento"],
] as const;

function toCents(value: FormDataEntryValue | null) {
    return Math.round(Number(String(value).replace(",", ".")) * 100);
}

export function PlanningPage() {
    const today = new Date();
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [year, setYear] = useState(today.getFullYear());
    const query = useQuery(trpc.planning.get.queryOptions({ month, year }));
    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: trpc.planning.get.queryKey({ month, year }) });
    const createPhase = useMutation(
        trpc.planning.createPhase.mutationOptions({ onSuccess: invalidate }),
    );
    const createIncome = useMutation(
        trpc.planning.createIncome.mutationOptions({ onSuccess: invalidate }),
    );
    const createExpense = useMutation(
        trpc.planning.createExpense.mutationOptions({ onSuccess: invalidate }),
    );
    const deletePhase = useMutation(
        trpc.planning.deletePhase.mutationOptions({ onSuccess: invalidate }),
    );
    const deleteIncome = useMutation(
        trpc.planning.deleteIncome.mutationOptions({ onSuccess: invalidate }),
    );
    const deleteExpense = useMutation(
        trpc.planning.deleteExpense.mutationOptions({ onSuccess: invalidate }),
    );
    const totals = useMemo(() => {
        const phases = query.data?.phases ?? [];
        const incomes = phases
            .flatMap((phase) => phase.incomes)
            .reduce((total, item) => total + item.amount, 0);
        const expenses = phases
            .flatMap((phase) => phase.expenses)
            .reduce((total, item) => total + item.amount, 0);
        return { expenses, incomes };
    }, [query.data]);

    if (query.isLoading)
        return (
            <main className="main">
                <p>Carregando planejamento…</p>
            </main>
        );
    if (query.isError)
        return (
            <main className="main">
                <p>Não foi possível carregar o planejamento: {query.error.message}</p>
            </main>
        );

    const submitPhase = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        createPhase.mutate(
            {
                endDay: Number(form.get("endDay")),
                month,
                name: String(form.get("name")),
                startDay: Number(form.get("startDay")),
                year,
            },
            { onSuccess: () => formElement.reset() },
        );
    };
    const submitRecord =
        (phaseId: string, kind: "income" | "expense") => (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const formElement = event.currentTarget;
            const form = new FormData(formElement);
            const input = {
                amount: toCents(form.get("amount")),
                category: String(form.get("category")),
                name: String(form.get("name")),
                phaseId,
            };
            if (kind === "income")
                createIncome.mutate(input as never, {
                    onSuccess: () => formElement.reset(),
                });
            else
                createExpense.mutate(input as never, {
                    onSuccess: () => formElement.reset(),
                });
        };

    return (
        <main className="main" aria-live="polite">
            <header className="page-header">
                <div>
                    <span className="eyebrow">Planejamento mensal</span>
                    <h1>
                        Planejamento de {String(month).padStart(2, "0")}/{year}
                    </h1>
                </div>
                <div className="flex gap-2">
                    <Input
                        aria-label="Mês"
                        max="12"
                        min="1"
                        onChange={(event) => setMonth(Number(event.target.value))}
                        type="number"
                        value={month}
                    />
                    <Input
                        aria-label="Ano"
                        onChange={(event) => setYear(Number(event.target.value))}
                        type="number"
                        value={year}
                    />
                </div>
            </header>
            <section className="grid gap-3 md:grid-cols-3">
                <div className="rounded border p-4">
                    <span>Entradas previstas</span>
                    <strong className="block text-xl">{money.format(totals.incomes / 100)}</strong>
                </div>
                <div className="rounded border p-4">
                    <span>Saídas planejadas</span>
                    <strong className="block text-xl">{money.format(totals.expenses / 100)}</strong>
                </div>
                <div className="rounded border p-4">
                    <span>Disponível</span>
                    <strong className="block text-xl">
                        {money.format((totals.incomes - totals.expenses) / 100)}
                    </strong>
                </div>
            </section>
            <section className="mt-6 rounded border p-4">
                <h2>Nova fase</h2>
                <form className="mt-3 grid gap-2 md:grid-cols-4" onSubmit={submitPhase}>
                    <Input name="name" placeholder="Nome da fase" required />
                    <Input
                        min="1"
                        name="startDay"
                        placeholder="Dia inicial"
                        required
                        type="number"
                    />
                    <Input min="1" name="endDay" placeholder="Dia final" required type="number" />
                    <Button disabled={createPhase.isPending} type="submit">
                        Criar fase
                    </Button>
                </form>
                {createPhase.error && <p role="alert">{createPhase.error.message}</p>}
            </section>
            <section className="mt-6 grid gap-4">
                {query.data?.phases.length === 0 && <p>Nenhuma fase criada para este mês.</p>}
                {query.data?.phases.map((phase) => (
                    <article className="rounded border p-4" key={phase.id}>
                        <div className="flex items-center justify-between gap-3">
                            <h2>
                                {phase.name} · dias {phase.startDay}–{phase.endDay}
                            </h2>
                            <Button
                                onClick={() => deletePhase.mutate({ id: phase.id })}
                                size="sm"
                                variant="destructive"
                            >
                                Excluir fase
                            </Button>
                        </div>
                        <div className="mt-4 grid gap-6 lg:grid-cols-2">
                            <RecordSection
                                categories={incomeCategories}
                                items={phase.incomes}
                                onDelete={(id) => deleteIncome.mutate({ id })}
                                onSubmit={submitRecord(phase.id, "income")}
                                title="Entradas"
                            />
                            <RecordSection
                                categories={expenseCategories}
                                items={phase.expenses}
                                onDelete={(id) => deleteExpense.mutate({ id })}
                                onSubmit={submitRecord(phase.id, "expense")}
                                title="Saídas"
                            />
                        </div>
                    </article>
                ))}
            </section>
        </main>
    );
}

function RecordSection({
    categories,
    items,
    onDelete,
    onSubmit,
    title,
}: {
    categories: readonly (readonly [string, string])[];
    items: { amount: number; category: string; id: string; name: string }[];
    onDelete: (id: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    title: string;
}) {
    return (
        <section>
            <h3>{title}</h3>
            <ul>
                {items.map((item) => (
                    <li className="flex justify-between py-1" key={item.id}>
                        <span>
                            {item.name} · {item.category}
                        </span>
                        <span>
                            {money.format(item.amount / 100)}{" "}
                            <Button onClick={() => onDelete(item.id)} size="xs" variant="ghost">
                                Excluir
                            </Button>
                        </span>
                    </li>
                ))}
            </ul>
            <form className="mt-3 grid gap-2 sm:grid-cols-3" onSubmit={onSubmit}>
                <Input name="name" placeholder="Descrição" required />
                <Input
                    min="0.01"
                    name="amount"
                    placeholder="Valor"
                    required
                    step="0.01"
                    type="number"
                />
                <select
                    aria-label={title + " categoria"}
                    defaultValue={categories[0][0]}
                    name="category"
                >
                    {categories.map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
                <Button type="submit">Adicionar</Button>
            </form>
        </section>
    );
}
