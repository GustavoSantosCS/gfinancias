import { Suspense } from "react";
import { Plus } from "lucide-react";

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
                        <button className="secondary-button" disabled type="button">
                            <Plus size={16} /> Criar fase
                        </button>
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
