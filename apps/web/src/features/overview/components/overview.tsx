import {
    ArrowDownLeft,
    ArrowUpRight,
    ChevronRight,
    CircleDollarSign,
    CreditCard,
    Flag,
    MoreHorizontal,
    Plus,
    ReceiptText,
} from "lucide-react";
import { Button } from "@gfinancias/ui/components/button";

import { Progress } from "./primitives";
import type { Goal, Income, ModalType, PlanningPhase, View } from "../types";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function Overview({
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
                <Button onClick={() => onNavigate("planning")} type="button" variant="default">
                    Ver plano completo <ArrowUpRight size={16} />
                </Button>
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
