import { Suspense } from "react";

import { PrototypeHome } from "@/app/page";
import { CardsLoading } from "@/features/cards/components/cards-loading";
import { CardsPage } from "@/features/cards/cards-page";

export default function Page() {
    return (
        <Suspense
            fallback={
                <main className="main">
                    <div className="content">
                        <CardsLoading />
                    </div>
                </main>
            }
        >
            <PrototypeHome cardsContent={<CardsPage embedded />} initialView="cards" />
        </Suspense>
    );
}
