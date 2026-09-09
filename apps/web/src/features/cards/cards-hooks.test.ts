// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const { useMutation, useQueryClient } = vi.hoisted(() => ({
    useMutation: vi.fn(),
    useQueryClient: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({ useMutation, useQueryClient }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
vi.mock("@/utils/trpc", () => {
    const pathKey = () => ["cards"];
    const queryKey = (input: unknown) => ["cards", input];
    const mutationOptions = () => ({});
    return {
        trpc: {
            cards: {
                archive: { mutationOptions },
                anticipate: { mutationOptions },
                create: { mutationOptions },
                createPurchase: { mutationOptions },
                delete: { mutationOptions },
                deletePurchase: { mutationOptions },
                getPurchase: { pathKey, queryKey },
                list: { pathKey },
                listPurchases: { pathKey },
                restore: { mutationOptions },
                update: { mutationOptions },
                updatePurchase: { mutationOptions },
            },
        },
    };
});

import { cardsCache } from "./hooks/cards-cache";
import { useFormFeedback } from "./hooks/use-form-feedback";
import { useCardMutations } from "./hooks/use-card-mutations";
import { usePurchaseMutations } from "./hooks/use-purchase-mutations";

function client() {
    return {
        cancelQueries: vi.fn().mockResolvedValue(undefined),
        getQueriesData: vi.fn().mockReturnValue([]),
        invalidateQueries: vi.fn().mockResolvedValue(undefined),
        removeQueries: vi.fn(),
    };
}

describe("cards cache policy", () => {
    it("invalidates only the affected families for card and purchase changes", async () => {
        const queryClient = client();
        const cache = cardsCache(queryClient as never);
        await cache.changedPurchase("purchase-1");
        expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["cards"] });
        expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
            queryKey: ["cards", { id: "purchase-1" }],
            exact: true,
        });
        expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(2);
        queryClient.invalidateQueries.mockClear();
        await cache.changedCard();
        expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(3);
    });

    it("removes every cached detail belonging to a deleted card", async () => {
        const queryClient = client();
        queryClient.getQueriesData.mockReturnValue([
            [["cards", { id: "purchase-1" }], { card: { id: "card-1" } }],
            [["cards", { id: "purchase-2" }], { card: { id: "card-2" } }],
        ]);
        await cardsCache(queryClient as never).removeCard("card-1");
        expect(queryClient.cancelQueries).toHaveBeenCalledWith({
            queryKey: ["cards", { id: "purchase-1" }],
            exact: true,
        });
        expect(queryClient.removeQueries).toHaveBeenCalledTimes(1);
        expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(2);
    });
});

describe("form feedback", () => {
    it("focuses the first invalid field and exposes field semantics", () => {
        const { result } = renderHook(() => useFormFeedback());
        const form = document.createElement("form");
        const input = document.createElement("input");
        input.name = "title";
        form.append(input);
        document.body.append(form);
        act(() => result.current.reject({ title: "Título obrigatório" }, form));
        expect(document.activeElement).toBe(input);
        expect(result.current.field("title")).toMatchObject({
            "aria-invalid": true,
            "aria-describedby": "title-error",
        });
        form.remove();
    });

    it("retains server error feedback and prevents duplicate submission", async () => {
        const { result } = renderHook(() => useFormFeedback());
        const form = document.createElement("form");
        let calls = 0;
        await act(async () =>
            result.current.submit({ success: true, data: { id: "x" } }, form, async () => {
                calls += 1;
                throw new Error("Falha do servidor");
            }),
        );
        expect(calls).toBe(1);
        expect(result.current.errors.form).toBe("Falha do servidor");
        expect(result.current.submitting).toBe(false);
    });
});

describe("mutation policies", () => {
    beforeEach(() => {
        useQueryClient.mockReturnValue(client());
        useMutation.mockImplementation(() => ({
            isPending: false,
            mutateAsync: vi.fn().mockResolvedValue(undefined),
        }));
    });

    it("routes card creation and update to different cache policies", async () => {
        const { result } = renderHook(() => useCardMutations());
        await act(async () => result.current.save({ name: "Novo", color: "#123456" }));
        await act(async () =>
            result.current.save({ id: "card-1", name: "Atualizado", color: "#123456" }),
        );
        expect(useQueryClient.mock.results[0].value.invalidateQueries).toHaveBeenCalled();
    });

    it("covers archive, restore, update and anticipation policies", async () => {
        const card = renderHook(() => useCardMutations());
        await act(async () => card.result.current.archiveCard("card-1"));
        await act(async () => card.result.current.restoreCard("card-1"));
        await act(async () => card.result.current.removeCard("card-1", vi.fn()));
        const purchase = renderHook(() => usePurchaseMutations());
        await act(async () =>
            purchase.result.current.save({
                id: "purchase-1",
                title: "Editado",
                amount: 1000,
                cardId: "card-1",
                installments: 1,
                purchaseDate: "2028-09-01",
                focusMonth: 9,
                focusYear: 2028,
            }),
        );
        await act(async () =>
            purchase.result.current.anticipatePurchase({
                purchaseId: "purchase-1",
                date: "2028-09-01",
                focusMonth: 9,
                focusYear: 2028,
                mode: "GROUPED",
                selectedNumbers: [2],
                values: [900],
            }),
        );
    });

    it("closes before removing a purchase from cache", async () => {
        const close = vi.fn();
        const { result } = renderHook(() => usePurchaseMutations());
        await act(async () => result.current.removePurchase("purchase-1", close));
        expect(close).toHaveBeenCalledOnce();
    });
});
