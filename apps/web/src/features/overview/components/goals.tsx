import { Plus, Target } from "lucide-react";
import { Button } from "@gfinancias/ui/components/button";
import { Progress } from "./primitives";
import type { Goal, ModalType } from "../types";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function Goals({ goals, onOpen }: { goals: Goal[]; onOpen: (modal: ModalType) => void }) {
    return (
        <>
            <section className="page-heading compact">
                <div>
                    <span className="eyebrow">Construção de patrimônio</span>
                    <h1>Objetivos financeiros</h1>
                    <p>Defina metas maiores e acompanhe quanto falta para cada conquista.</p>
                </div>
                <Button onClick={() => onOpen("goal")} type="button" variant="primary">
                    <Plus size={16} /> Novo objetivo
                </Button>
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
