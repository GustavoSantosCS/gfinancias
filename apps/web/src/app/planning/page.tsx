import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Button } from "@gfinancias/ui/components/button";

import { PrototypeHome } from "@/app/page";

export default function Page() {
    return (
        <Suspense fallback={<PlanningLoadingFallback />}>
            <PrototypeHome initialView="planning" />
        </Suspense>
    );
}

function PlanningLoadingFallback() {
    return (
        <main className="main">
            <div className="content">
                <section className="page-heading compact planning-heading">
                    <div>
                        <span className="eyebrow">Plano do mês</span>
                        <h1>Planejamento</h1>
                        <p>Organize cada entrada e dê um destino ao dinheiro antes de gastar.</p>
                    </div>
                    <div className="heading-actions">
                        <Button disabled type="button" variant="default">
                            <Plus size={16} /> Criar fase
                        </Button>
                    </div>
                </section>
                <section
                    aria-label="Carregando planejamento"
                    className="panel planning-loading"
                    role="status"
                >
                    <span aria-hidden="true" className="planning-spinner" />
                </section>
            </div>
        </main>
    );
}
