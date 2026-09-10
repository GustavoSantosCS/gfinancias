import { Plus } from "lucide-react";

import { Button } from "@gfinancias/ui/components/button";

export function CardsHeader({
    includeArchived,
    canCreatePurchase,
    onToggleArchived,
    onNewCard,
    onNewPurchase,
}: {
    includeArchived: boolean;
    canCreatePurchase: boolean;
    onToggleArchived: () => void;
    onNewCard: () => void;
    onNewPurchase: () => void;
}) {
    return (
        <section className="page-heading compact">
            <div>
                <span className="eyebrow">Compras planejadas</span>
                <h1>Cartões</h1>
            </div>
            <div className="heading-actions">
                <Button onClick={onToggleArchived} type="button" variant="default">
                    {includeArchived ? "Ocultar arquivados" : "Mostrar arquivados"}
                </Button>
                <Button onClick={onNewCard} type="button" variant="default">
                    <Plus size={16} /> Novo cartão
                </Button>
                <Button
                    disabled={!canCreatePurchase}
                    onClick={onNewPurchase}
                    type="button"
                    variant="primary"
                >
                    <Plus size={16} /> Nova compra
                </Button>
            </div>
        </section>
    );
}
