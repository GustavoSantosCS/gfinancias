import { Suspense } from "react";

import { PrototypeHome } from "@/app/page";
import { CardsLoading } from "@/features/cards/components/cards-loading";
import { CardsPage } from "@/features/cards/cards-page";
import { currentPeriod } from "@/lib/dates";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

function parsePeriod(searchParams: Awaited<SearchParams>) {
    const fallback = currentPeriod();
    const month = Number(firstValue(searchParams.month));
    const year = Number(firstValue(searchParams.year));
    return {
        month: month >= 1 && month <= 12 ? month : fallback.month,
        year: year >= 1 ? year : fallback.year,
    };
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
    const initialPeriod = parsePeriod(await searchParams);
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
            <PrototypeHome
                cardsContent={<CardsPage embedded initialPeriod={initialPeriod} />}
                initialPeriod={initialPeriod}
                initialView="cards"
            />
        </Suspense>
    );
}
