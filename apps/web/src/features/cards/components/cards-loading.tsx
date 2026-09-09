import { Plus } from "lucide-react";

import { Button } from "@gfinancias/ui/components/button";
import { Skeleton } from "@gfinancias/ui/components/skeleton";

export function CardsLoading() {
    return (
        <>
            <section className="page-heading compact">
                <div>
                    <span className="eyebrow">Compras planejadas</span>
                    <h1>Cartões</h1>
                </div>
                <div className="heading-actions">
                    <Button disabled type="button">
                        Mostrar arquivados
                    </Button>
                    <Button disabled type="button">
                        <Plus size={16} /> Novo cartão
                    </Button>
                    <Button disabled type="button" variant="primary">
                        <Plus size={16} /> Nova compra
                    </Button>
                </div>
            </section>
            <section
                aria-label="Carregando cartões cadastrados"
                className="cards-grid"
                role="status"
            >
                {Array.from({ length: 3 }, (_, index) => (
                    <article className="credit-card" key={index}>
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-7 w-32" />
                        <Skeleton className="h-3 w-24" />
                    </article>
                ))}
            </section>
            <section
                aria-label="Carregando compras"
                className="panel transactions-panel"
                role="status"
            >
                <Skeleton className="h-8 w-40" />
                <Skeleton className="mt-4 h-40 w-full" />
            </section>
        </>
    );
}
