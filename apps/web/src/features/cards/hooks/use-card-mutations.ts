"use client";

import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";
import type { CardInput, CardUpdateInput } from "../types";
import { cardsCache } from "./cards-cache";

export function useCardMutations() {
    const cache = cardsCache(useQueryClient());
    const create = useMutation(trpc.cards.create.mutationOptions());
    const update = useMutation(trpc.cards.update.mutationOptions());
    const archive = useMutation(trpc.cards.archive.mutationOptions());
    const restore = useMutation(trpc.cards.restore.mutationOptions());
    const remove = useMutation(trpc.cards.delete.mutationOptions());
    const save = async (input: CardInput | CardUpdateInput) => {
        if ("id" in input) {
            await update.mutateAsync(input);
            await cache.changedCard();
            toast.success("Cartão atualizado.");
        } else {
            await create.mutateAsync(input);
            await cache.cards();
            toast.success("Cartão criado.");
        }
    };
    const archiveCard = async (id: string) => {
        await archive.mutateAsync({ id });
        await cache.changedCard();
    };
    const restoreCard = async (id: string) => {
        await restore.mutateAsync({ id });
        await cache.changedCard();
    };
    const removeCard = async (id: string, closeRelated: () => void) => {
        await remove.mutateAsync({ id });
        closeRelated();
        await cache.removeCard(id);
    };
    return {
        save,
        archiveCard,
        restoreCard,
        removeCard,
        pending:
            create.isPending ||
            update.isPending ||
            archive.isPending ||
            restore.isPending ||
            remove.isPending,
    };
}
