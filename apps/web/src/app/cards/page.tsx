import { Suspense } from "react";

import { PrototypeHome } from "@/app/page";
import { CardsPage } from "@/features/cards/cards-page";

export default function Page() {
    return (
        <Suspense
            fallback={
                <main className="main">
                    <p>Carregando cartões…</p>
                </main>
            }
        >
            <PrototypeHome cardsContent={<CardsPage embedded />} initialView="cards" />
        </Suspense>
    );
}
