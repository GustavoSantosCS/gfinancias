import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@gfinancias/ui/components/empty";
import { formatCents } from "@/lib/money";
import { formatCompetence, formatDate } from "@/lib/dates";
import type { PurchaseEntry } from "../types";

export function PurchasesTable({
    purchases,
    onOpen,
}: {
    purchases: PurchaseEntry[];
    onOpen: (id: string) => void;
}) {
    if (!purchases.length)
        return (
            <Empty className="transactions-empty">
                <EmptyHeader>
                    <EmptyTitle className="transactions-empty">
                        Nenhuma compra nesse cartão
                    </EmptyTitle>
                    <EmptyDescription>
                        Selecione outro cartão ou registre uma nova compra.
                    </EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    return (
        <div className="transactions-table">
            <div className="transactions-table__head">
                <span>Título</span>
                <span>Valor</span>
                <span>Parcela</span>
                <span>Data</span>
                <span>Cartão</span>
            </div>
            {purchases.map((entry) => (
                <div
                    aria-expanded={false}
                    aria-label={"Abrir detalhes de " + entry.title}
                    className="transactions-table__row transactions-table__row--interactive cursor-pointer"
                    key={entry.id}
                    onClick={() => onOpen(entry.purchaseId)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onOpen(entry.purchaseId);
                        }
                    }}
                    role="button"
                    tabIndex={0}
                >
                    <span>{entry.title}</span>
                    <strong className="transactions-table__amount">
                        {formatCents(entry.amount)}
                    </strong>
                    <span>
                        {entry.kind === "ANTICIPATION"
                            ? "Antecipação"
                            : entry.total === 1
                              ? "À vista"
                              : entry.number + "/" + entry.total}
                    </span>
                    <span>
                        {entry.purchaseDate
                            ? formatDate(entry.purchaseDate)
                            : formatCompetence(entry.competenceMonth, entry.competenceYear)}
                    </span>
                    <span>
                        {entry.card.name}
                        {entry.card.status === "ARCHIVED" ? " (arquivado)" : ""}
                    </span>
                </div>
            ))}
        </div>
    );
}
