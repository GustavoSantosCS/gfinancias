"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";
import type { PurchaseInput, PurchaseUpdateInput, AnticipationInput } from "../types";
import { cardsCache } from "./cards-cache";

export function usePurchaseMutations() {
    const cache = cardsCache(useQueryClient());
    const create = useMutation(trpc.cards.createPurchase.mutationOptions());
    const update = useMutation(trpc.cards.updatePurchase.mutationOptions());
    const remove = useMutation(trpc.cards.deletePurchase.mutationOptions());
    const anticipate = useMutation(trpc.cards.anticipate.mutationOptions());
    const save = async (input: PurchaseInput | PurchaseUpdateInput) => {
        if ("id" in input) {
            await update.mutateAsync(input);
            await cache.changedPurchase(input.id);
            toast.success("Compra atualizada.");
        } else {
            await create.mutateAsync(input);
            await cache.purchases();
            toast.success("Compra criada.");
        }
    };
    const anticipatePurchase = async (input: AnticipationInput) => {
        await anticipate.mutateAsync(input);
        await cache.changedPurchase(input.purchaseId);
        toast.success("Antecipação registrada.");
    };
    const removePurchase = async (id: string, closeRelated: () => void) => {
        await remove.mutateAsync({ id });
        closeRelated();
        await cache.removePurchase(id);
        await cache.purchases();
        toast.success("Compra excluída.");
    };
    return {
        save,
        anticipatePurchase,
        removePurchase,
        pending: create.isPending || update.isPending || remove.isPending || anticipate.isPending,
    };
}
