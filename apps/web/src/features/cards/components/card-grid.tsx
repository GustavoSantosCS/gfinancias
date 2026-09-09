import { CreditCard, Pencil } from "lucide-react";

import { Button } from "@gfinancias/ui/components/button";
import { formatOptionalCents } from "@/lib/money";
import type { Card } from "../types";
import { billingDates } from "../utils/card-display";
import { CardBrandIcon } from "./card-brand-icon";

export function CardGrid({
    cards,
    month,
    selectedCardId,
    spendingByCard,
    onEdit,
    onSelect,
}: {
    cards: Card[];
    month: number;
    selectedCardId: string | null;
    spendingByCard: Map<string, number>;
    onEdit: (card: Card) => void;
    onSelect: (id: string) => void;
}) {
    if (!cards.length) return <section aria-label="Cartões cadastrados" className="cards-grid" />;
    return (
        <section aria-label="Cartões cadastrados" className="cards-grid">
            {cards.map((card) => {
                const selected = selectedCardId === card.id;
                const dates = billingDates(month, card.closingDay, card.dueDay);
                return (
                    <article
                        aria-label={"Filtrar por " + card.name}
                        aria-pressed={selected}
                        className={"credit-card" + (selected ? " credit-card--selected" : "")}
                        key={card.id}
                        onClick={() => onSelect(card.id)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                onSelect(card.id);
                            }
                        }}
                        role="button"
                        style={{ backgroundColor: card.color, color: "#fff" }}
                        tabIndex={0}
                    >
                        <div>
                            {card.status === "ARCHIVED" && <span>ARQUIVADO</span>}
                            <CreditCard size={22} />
                        </div>
                        <div className="credit-card__name-row">
                            <strong>{card.name}</strong>
                            {card.brand && <CardBrandIcon brand={card.brand} />}
                        </div>
                        <div className="credit-card__metadata">
                            <small>{formatOptionalCents(card.limit)}</small>
                            <small>{card.lastDigits ? "•••• " + card.lastDigits : "\u00a0"}</small>
                            <small>
                                {dates
                                    ? "Fechamento: " + dates.closing + " - Vencimento: " + dates.due
                                    : "\u00a0"}
                            </small>
                            <small>
                                {spendingByCard.get(card.id)
                                    ? "Gasto do mês: " +
                                      formatOptionalCents(spendingByCard.get(card.id))
                                    : "\u00a0"}
                            </small>
                        </div>
                        <Button
                            aria-label={"Editar " + card.name}
                            className="credit-card__edit"
                            onClick={(event) => {
                                event.stopPropagation();
                                onEdit(card);
                            }}
                            size="icon"
                            type="button"
                            variant="ghost"
                        >
                            <Pencil size={15} />
                        </Button>
                    </article>
                );
            })}
        </section>
    );
}
