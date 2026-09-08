import { CreditCard, Plus, WalletCards } from "lucide-react";
import { Button } from "@gfinancias/ui/components/button";

import { Progress } from "./primitives";
import type { CreditCardAccount, CardExpense, ModalType } from "../types";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function Cards({
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
                    <Button onClick={() => onOpen("newCard")} type="button" variant="default">
                        <Plus size={16} />
                        Criar cartão
                    </Button>
                    <Button onClick={() => onOpen("cardExpense")} type="button" variant="primary">
                        <Plus size={16} />
                        Adicionar gasto
                    </Button>
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
                    <Button onClick={() => onOpen("cardExpense")} type="button" variant="default">
                        <Plus size={15} />
                        Adicionar gasto
                    </Button>
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
