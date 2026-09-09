import type { QueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import type { PurchaseDetail } from "../types";

export function cardsCache(client: QueryClient) {
    const cards = () => client.invalidateQueries({ queryKey: trpc.cards.list.pathKey() });
    const purchases = () =>
        client.invalidateQueries({ queryKey: trpc.cards.listPurchases.pathKey() });
    const changedCard = () =>
        Promise.all([
            cards(),
            purchases(),
            client.invalidateQueries({
                queryKey: trpc.cards.getPurchase.pathKey(),
                refetchType: "active",
            }),
        ]);
    const changedPurchase = (id: string) =>
        Promise.all([
            purchases(),
            client.invalidateQueries({
                queryKey: trpc.cards.getPurchase.queryKey({ id }),
                exact: true,
            }),
        ]);
    const removePurchase = async (id: string) => {
        const queryKey = trpc.cards.getPurchase.queryKey({ id });
        await client.cancelQueries({ queryKey, exact: true });
        client.removeQueries({ queryKey, exact: true });
    };
    const removeCard = async (cardId: string) => {
        const details = client.getQueriesData<PurchaseDetail>({
            queryKey: trpc.cards.getPurchase.pathKey(),
        });
        for (const [queryKey, detail] of details) {
            if (detail?.card.id !== cardId) continue;
            await client.cancelQueries({ queryKey, exact: true });
            client.removeQueries({ queryKey, exact: true });
        }
        await Promise.all([cards(), purchases()]);
    };
    return { cards, purchases, changedCard, changedPurchase, removePurchase, removeCard };
}
