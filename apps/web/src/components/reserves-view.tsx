"use client";

import { CalendarClock, PiggyBank, Plus, ReceiptText, Wallet } from "lucide-react";

type Reserve = {
    id: number;
    name: string;
    target: number;
    saved: number;
    due: string;
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function ReservesView({
    reserves,
    onNewReserve,
}: {
    reserves: Reserve[];
    onNewReserve: () => void;
}) {
    const totalTarget = reserves.reduce((sum, reserve) => sum + reserve.target, 0);
    const totalSaved = reserves.reduce((sum, reserve) => sum + reserve.saved, 0);
    const percentage = totalTarget ? (totalSaved / totalTarget) * 100 : 0;

    return (
        <>
            <section className="page-heading compact reserves-heading">
                <div>
                    <span className="eyebrow">Contas que ainda vão chegar</span>
                    <h1>Reservas para meses futuros</h1>
                    <p>Separe aos poucos o dinheiro de despesas previstas e proteja o orçamento.</p>
                </div>
                <button className="primary-button" onClick={onNewReserve} type="button">
                    <Plus size={16} /> Nova reserva
                </button>
            </section>

            <section className="reserve-summary">
                <div className="reserve-summary__message">
                    <span className="reserve-summary__icon">
                        <CalendarClock size={21} />
                    </span>
                    <div>
                        <span>Planejamento antecipado</span>
                        <strong>Reservas suavizam contas maiores ao longo dos meses.</strong>
                    </div>
                </div>
                <div className="reserve-summary__metric">
                    <span>Total necessário</span>
                    <strong>{money.format(totalTarget)}</strong>
                </div>
                <div className="reserve-summary__metric">
                    <span>Já reservado</span>
                    <strong>{money.format(totalSaved)}</strong>
                </div>
                <div className="reserve-summary__progress">
                    <div>
                        <span>Progresso geral</span>
                        <strong>{Math.round(percentage)}%</strong>
                    </div>
                    <div className="reserve-progress">
                        <span style={{ width: Math.min(percentage, 100) + "%" }} />
                    </div>
                </div>
            </section>

            <div className="reserve-plan-grid">
                {reserves.map((reserve, index) => {
                    const progress = reserve.target ? (reserve.saved / reserve.target) * 100 : 0;
                    const missing = Math.max(reserve.target - reserve.saved, 0);
                    return (
                        <article className="reserve-plan-card" key={reserve.id}>
                            <div className="reserve-plan-card__top">
                                <span
                                    className={
                                        "reserve-plan-card__icon reserve-plan-card__icon--" +
                                        (index % 3)
                                    }
                                >
                                    {index % 2 ? <ReceiptText size={20} /> : <Wallet size={20} />}
                                </span>
                                <span className="reserve-plan-card__date">
                                    <CalendarClock size={13} /> {reserve.due}
                                </span>
                            </div>
                            <span className="eyebrow">Conta futura</span>
                            <h2>{reserve.name}</h2>
                            <div className="reserve-plan-card__amount">
                                <strong>{money.format(reserve.saved)}</strong>
                                <span>de {money.format(reserve.target)}</span>
                            </div>
                            <div className="reserve-progress">
                                <span style={{ width: Math.min(progress, 100) + "%" }} />
                            </div>
                            <div className="reserve-plan-card__footer">
                                <span>{Math.round(progress)}% separado</span>
                                <strong>Faltam {money.format(missing)}</strong>
                            </div>
                        </article>
                    );
                })}
                <button className="add-reserve-card" onClick={onNewReserve} type="button">
                    <span>
                        <PiggyBank size={22} />
                    </span>
                    <strong>Planejar conta futura</strong>
                    <small>Defina o valor e quando ele será usado.</small>
                </button>
            </div>
        </>
    );
}
