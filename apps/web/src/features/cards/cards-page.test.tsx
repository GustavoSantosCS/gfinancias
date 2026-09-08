import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vite-plus/test";

const { useMutation, useQuery } = vi.hoisted(() => ({ useMutation: vi.fn(), useQuery: vi.fn() }));

vi.mock("@tanstack/react-query", () => ({
    useMutation,
    useQuery,
}));

vi.mock("next/navigation", () => ({
    useSearchParams: () => new URLSearchParams("month=9&year=2028"),
}));

vi.mock("@/utils/trpc", () => {
    const mutationOptions = () => ({});
    return {
        trpc: {
            cards: {
                archive: { mutationOptions },
                create: { mutationOptions },
                createPurchase: { mutationOptions },
                delete: { mutationOptions },
                update: { mutationOptions },
                list: { queryOptions: (input: unknown) => input },
                listPurchases: { queryOptions: (input: unknown) => input },
                restore: { mutationOptions },
            },
        },
    };
});

import { CardsPage } from "./cards-page";

const mutation = { error: null, isPending: false, mutate: vi.fn() };
const query = (data: unknown) => ({ data, error: null, isLoading: false, refetch: vi.fn() });
let cardsState: any;
let purchasesState: any;

beforeEach(() => {
    cardsState = query([]);
    purchasesState = query([]);
    useMutation.mockReturnValue(mutation);
    useQuery.mockImplementation((input: { includeArchived?: boolean }) =>
        "includeArchived" in input ? cardsState : purchasesState,
    );
});

it("shows an empty state and opens the accessible card form", async () => {
    cardsState = query([]);
    purchasesState = query([]);
    const user = userEvent.setup();

    render(<CardsPage />);

    expect(screen.getByRole("status").className).toContain("planning-empty");
    expect(screen.getByRole("status").textContent).toContain("Nenhum cartão cadastrado");
    expect(screen.queryByRole("heading", { name: "Compras da competência" })).toBeNull();
    await user.click(screen.getByRole("button", { name: /Novo cartão/ }));
    expect(screen.getByRole("dialog", { name: "Novo cartão" })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Nome" }));
    await user.click(screen.getByRole("button", { name: "Usar cor #2563eb" }));
    expect((screen.getByLabelText("Selecionar cor personalizada") as HTMLInputElement).value).toBe(
        "#2563eb",
    );
});

it("shows monthly entries and opens the purchase form for active cards", async () => {
    cardsState = query([{ color: "#0f766e", id: "card-1", name: "Visa", status: "ACTIVE" }]);
    purchasesState = query([
        {
            amount: 12_345,
            card: { name: "Visa", status: "ACTIVE" },
            competenceMonth: 9,
            competenceYear: 2028,
            description: "Curso",
            id: "entry-1",
            kind: "REGULAR",
            number: 2,
            total: 3,
        },
    ]);
    const user = userEvent.setup();

    render(<CardsPage />);

    expect(
        screen.getByRole("heading", { name: "Detalhamento" }).parentElement?.className,
    ).toContain("transactions-panel__heading");
    expect(
        screen.getByRole("heading", { name: "Detalhamento" }).parentElement?.className,
    ).toContain("text-center");
    expect(screen.getByRole("heading", { name: "Detalhamento" })).toBeTruthy();
    expect(screen.getByText("Compras da competência").className).toContain(
        "transactions-panel__description",
    );
    expect(screen.getByText("Curso")).toBeTruthy();
    expect(screen.getByText("2/3")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Nova compra/ }));
    expect(screen.getByRole("dialog", { name: "Nova compra" })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Descrição" }));
});

it("shows loading and error states", () => {
    cardsState = { data: undefined, error: null, isLoading: true, refetch: vi.fn() };
    purchasesState = { data: undefined, error: null, isLoading: false, refetch: vi.fn() };
    const { rerender } = render(<CardsPage />);
    expect(screen.getByRole("main", { name: "Carregando cartões" })).toBeTruthy();

    cardsState = {
        data: undefined,
        error: new Error("failed"),
        isLoading: false,
        refetch: vi.fn(),
    };
    purchasesState = { data: undefined, error: null, isLoading: false, refetch: vi.fn() };
    rerender(<CardsPage />);
    expect(screen.getByRole("alert").textContent).toContain(
        "Não foi possível carregar os cartões.",
    );
});

it("submits both forms and exposes archive lifecycle actions", async () => {
    const mutate = vi.fn();
    useMutation.mockReturnValue({ error: null, isPending: false, mutate });
    cardsState = query([
        { color: "#0f766e", id: "active", name: "Active", status: "ACTIVE" },
        { color: "#7c3aed", id: "archived", name: "Archived", status: "ARCHIVED" },
    ]);
    purchasesState = query([]);
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();

    render(<CardsPage />);

    await user.click(screen.getByRole("button", { name: "Editar Active" }));
    expect(screen.getByRole("button", { name: "Arquivar cartão" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remover cartão" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Fechar" }));
    await user.click(screen.getByRole("button", { name: "Editar Archived" }));
    expect(screen.getByRole("button", { name: "Restaurar cartão" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Fechar" }));
    await user.click(screen.getByRole("button", { name: "Mostrar arquivados" }));

    await user.click(screen.getByRole("button", { name: /Novo cartão/ }));
    await user.type(screen.getByRole("textbox", { name: "Nome" }), "Novo");
    await user.click(screen.getByRole("button", { name: "Criar cartão" }));

    await user.click(screen.getByRole("button", { name: "Fechar" }));
    await user.click(screen.getByRole("button", { name: /Nova compra/ }));
    await user.type(screen.getByRole("textbox", { name: "Descrição" }), "Curso");
    await user.type(screen.getByRole("spinbutton", { name: "Valor" }), "100");
    await user.click(screen.getByRole("button", { name: "Adicionar compra" }));

    expect(mutate).toHaveBeenCalled();
});

it("opens the editor when a highlighted card is clicked", async () => {
    cardsState = query([
        { color: "#0f766e", id: "visa", name: "Visa", status: "ACTIVE" },
        { color: "#7c3aed", id: "master", name: "Master", status: "ACTIVE" },
    ]);
    purchasesState = query([
        {
            amount: 12_345,
            card: { id: "visa", name: "Visa", status: "ACTIVE" },
            competenceMonth: 9,
            competenceYear: 2028,
            description: "Curso",
            id: "visa-entry",
            kind: "REGULAR",
            number: 1,
            total: 1,
        },
        {
            amount: 4_000,
            card: { id: "master", name: "Master", status: "ACTIVE" },
            competenceMonth: 9,
            competenceYear: 2028,
            description: "Mercado",
            id: "master-entry",
            kind: "REGULAR",
            number: 1,
            total: 1,
        },
    ]);
    const user = userEvent.setup();

    render(<CardsPage />);

    await user.click(screen.getByRole("button", { name: "Editar Visa" }));
    expect(screen.getByRole("dialog", { name: "Editar cartão" })).toBeTruthy();
    expect(screen.queryByText("Sem finais informados")).toBeNull();
});
