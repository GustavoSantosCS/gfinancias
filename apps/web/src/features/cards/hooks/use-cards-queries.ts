"use client";

import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { trpc } from "@/utils/trpc";
import type { Period, PurchaseStatus } from "../types";

export function useCardsQueries({
    period,
    includeArchived,
    title,
    status,
    selectedPurchaseId,
}: {
    period: Period;
    includeArchived: boolean;
    title: string;
    status: PurchaseStatus;
    selectedPurchaseId: string | null;
}) {
    const queryClient = useQueryClient();
    const cardsQuery = useQuery(trpc.cards.list.queryOptions({ includeArchived }));
    const purchasesQuery = useQuery(
        trpc.cards.listPurchases.queryOptions({
            title: title || undefined,
            month: period.month,
            status,
            year: period.year,
        }),
    );
    const monthlyPurchasesQuery = useQuery(
        trpc.cards.listPurchases.queryOptions({
            month: period.month,
            status: "ALL",
            year: period.year,
        }),
    );
    const detailQuery = useQuery(
        trpc.cards.getPurchase.queryOptions(
            selectedPurchaseId ? { id: selectedPurchaseId } : skipToken,
        ),
    );
    const retryPage = () =>
        queryClient.refetchQueries({ queryKey: trpc.cards.pathKey(), type: "active" });
    const cards = cardsQuery.data ?? [];
    const activeCards = useMemo(() => cards.filter((card) => card.status === "ACTIVE"), [cards]);
    const monthlySpendingByCard = useMemo(() => {
        const result = new Map<string, number>();
        for (const entry of monthlyPurchasesQuery.data ?? [])
            result.set(entry.card.id, (result.get(entry.card.id) ?? 0) + entry.amount);
        return result;
    }, [monthlyPurchasesQuery.data]);
    const purchases = useMemo(() => {
        const entries = purchasesQuery.data ?? [];
        return entries;
    }, [purchasesQuery.data]);
    return {
        activeCards,
        cards,
        cardsQuery,
        detailQuery,
        monthlyPurchasesQuery,
        monthlySpendingByCard,
        purchases,
        purchasesQuery,
        retryDetail: detailQuery.refetch,
        retryPage,
    };
}
