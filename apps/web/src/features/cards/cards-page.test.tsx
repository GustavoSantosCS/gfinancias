import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

function mockMutationCycle(
    ...results: Array<{ error: Error | null; isPending: boolean; mutate: any }>
) {
    let call = 0;
    useMutation.mockImplementation(() => results[call++ % 6] ?? mutation);
}

function successfulMutation() {
    return {
        error: null,
        isPending: false,
        mutate: vi.fn((_input, callbacks) => void callbacks?.onSuccess?.()),
    };
}

function failedMutation(message: string) {
    return {
        error: null,
        isPending: false,
        mutate: vi.fn((_input, callbacks) => callbacks?.onError?.(new Error(message))),
    };
}

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
    ).not.toContain("text-center");
    expect(screen.getByRole("heading", { name: "Detalhamento" })).toBeTruthy();
    expect(screen.queryByText("Compras da competência")).toBeNull();
    expect(screen.getByPlaceholderText("Pesquisar...")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Estado" })).toBeTruthy();
    expect(screen.getByText("Curso")).toBeTruthy();
    expect(screen.getByText("2/3")).toBeTruthy();
    await user.type(screen.getByPlaceholderText("Pesquisar..."), "curso");
    await user.selectOptions(screen.getByRole("combobox", { name: "Estado" }), "ARCHIVED");
    expect(useQuery).toHaveBeenLastCalledWith({
        description: "curso",
        month: 9,
        status: "ARCHIVED",
        year: 2028,
    });
    await user.click(screen.getByRole("button", { name: /Nova compra/ }));
    expect(screen.getByRole("dialog", { name: "Nova compra" })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Descrição" }));
});

it("submits complete card data and closes the dialog after a successful response", async () => {
    const create = successfulMutation();
    mockMutationCycle(create);
    const user = userEvent.setup();

    render(<CardsPage />);

    await user.click(screen.getByRole("button", { name: "Novo cartão" }));
    await user.type(screen.getByRole("textbox", { name: "Nome" }), "Viagem");
    await user.type(screen.getByRole("spinbutton", { name: "Limite" }), "123.45");
    await user.type(screen.getByRole("spinbutton", { name: "Fechamento" }), "10");
    await user.type(screen.getByRole("spinbutton", { name: "Vencimento" }), "20");
    await user.type(screen.getByRole("textbox", { name: "Últimos dígitos" }), "1234");
    await user.selectOptions(screen.getByRole("combobox", { name: "Bandeira" }), "VISA");
    await user.click(screen.getByRole("button", { name: "Criar cartão" }));

    expect(create.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
            brand: "VISA",
            closingDay: 10,
            dueDay: 20,
            lastDigits: "1234",
            limit: 12_345,
            name: "Viagem",
        }),
        expect.any(Object),
    );
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Novo cartão" })).toBeNull());
});

it("keeps the card form open when the server rejects its data", async () => {
    const create = failedMutation("Nome já em uso!");
    mockMutationCycle(create);
    const user = userEvent.setup();

    render(<CardsPage />);

    await user.click(screen.getByRole("button", { name: "Novo cartão" }));
    await user.type(screen.getByRole("textbox", { name: "Nome" }), "Duplicado");
    await user.click(screen.getByRole("button", { name: "Criar cartão" }));

    expect(create.mutate).toHaveBeenCalledOnce();
    expect(screen.getByRole("dialog", { name: "Novo cartão" })).toBeTruthy();
});

it("submits a purchase and closes its dialog after a successful response", async () => {
    const createPurchase = successfulMutation();
    mockMutationCycle(mutation, createPurchase);
    cardsState = query([{ color: "#0f766e", id: "visa", name: "Visa", status: "ACTIVE" }]);
    const user = userEvent.setup();

    render(<CardsPage />);

    await user.click(screen.getByRole("button", { name: "Nova compra" }));
    await user.type(screen.getByRole("textbox", { name: "Descrição" }), "Passagem");
    await user.type(screen.getByRole("spinbutton", { name: "Valor" }), "12.34");
    await user.selectOptions(screen.getByRole("combobox", { name: "Parcelas" }), "3");
    await user.click(screen.getByRole("button", { name: "Adicionar compra" }));

    expect(createPurchase.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
            amount: 1234,
            cardId: "visa",
            description: "Passagem",
            installments: 3,
            remainderInstallment: 1,
        }),
        expect.any(Object),
    );
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Nova compra" })).toBeNull());
});

it("updates a card with all optional fields after a successful response", async () => {
    const update = successfulMutation();
    mockMutationCycle(mutation, mutation, update);
    cardsState = query([
        {
            brand: "VISA",
            closingDay: 4,
            color: "#0f766e",
            dueDay: 14,
            id: "visa",
            lastDigits: "1111",
            limit: 10_000,
            name: "Visa",
            status: "ACTIVE",
        },
    ]);
    const user = userEvent.setup();

    render(<CardsPage />);

    await user.click(screen.getByRole("button", { name: "Editar Visa" }));
    await user.clear(screen.getByRole("textbox", { name: "Nome" }));
    await user.type(screen.getByRole("textbox", { name: "Nome" }), "Visa viagem");
    await user.clear(screen.getByRole("spinbutton", { name: "Limite" }));
    await user.type(screen.getByRole("spinbutton", { name: "Limite" }), "200");
    await user.selectOptions(screen.getByRole("combobox", { name: "Bandeira" }), "ELO");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(update.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ brand: "ELO", id: "visa", limit: 20_000, name: "Visa viagem" }),
        expect.any(Object),
    );
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Editar cartão" })).toBeNull());
});

it("closes the editor after archiving or restoring a card", async () => {
    const archive = successfulMutation();
    mockMutationCycle(mutation, mutation, mutation, archive);
    cardsState = query([{ color: "#0f766e", id: "visa", name: "Visa", status: "ACTIVE" }]);
    const user = userEvent.setup();

    render(<CardsPage />);

    await user.click(screen.getByRole("button", { name: "Editar Visa" }));
    await user.click(screen.getByRole("button", { name: "Arquivar cartão" }));

    expect(archive.mutate).toHaveBeenCalledWith({ id: "visa" }, expect.any(Object));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Editar cartão" })).toBeNull());
});

it("removes a card only after destructive confirmation", async () => {
    const remove = successfulMutation();
    mockMutationCycle(mutation, mutation, mutation, mutation, mutation, remove);
    cardsState = query([{ color: "#0f766e", id: "visa", name: "Visa", status: "ACTIVE" }]);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();

    render(<CardsPage />);

    await user.click(screen.getByRole("button", { name: "Editar Visa" }));
    await user.click(screen.getByRole("button", { name: "Remover cartão" }));

    expect(remove.mutate).toHaveBeenCalledWith({ id: "visa" }, expect.any(Object));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Editar cartão" })).toBeNull());
});

it("supports keyboard filtering and identifies archived-card anticipation entries", () => {
    cardsState = query([
        { color: "#0f766e", id: "visa", name: "Visa", status: "ACTIVE" },
        { color: "#7c3aed", id: "master", name: "Master", status: "ARCHIVED" },
    ]);
    purchasesState = query([
        {
            amount: 5_000,
            card: { id: "visa", name: "Visa", status: "ACTIVE" },
            competenceMonth: 9,
            competenceYear: 2028,
            description: "Curso",
            id: "regular",
            kind: "REGULAR",
            number: 1,
            total: 1,
        },
        {
            amount: 2_000,
            card: { id: "master", name: "Master", status: "ARCHIVED" },
            competenceMonth: 9,
            competenceYear: 2028,
            description: "Mercado",
            id: "anticipated",
            kind: "ANTICIPATION",
            number: 2,
            total: 3,
        },
    ]);

    render(<CardsPage />);

    const visa = screen.getByRole("button", { name: "Filtrar por Visa" });
    fireEvent.keyDown(visa, { key: "x" });
    expect(visa.getAttribute("aria-pressed")).toBe("false");
    fireEvent.keyDown(visa, { key: " " });
    expect(visa.getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByText("Mercado")).toBeNull();
    fireEvent.keyDown(visa, { key: "Enter" });
    expect(screen.getByText("Antecipação")).toBeTruthy();
    expect(screen.getByText("Master (arquivado)")).toBeTruthy();
    expect(screen.getByText("ARQUIVADO")).toBeTruthy();
});

it("shows server errors and accepts custom or random card colors", async () => {
    const create = { ...failedMutation("Nome já em uso!"), error: new Error("Nome já em uso!") };
    mockMutationCycle(create);
    const user = userEvent.setup();

    render(<CardsPage />);

    await user.click(screen.getByRole("button", { name: "Novo cartão" }));
    fireEvent.change(screen.getByLabelText("Selecionar cor personalizada"), {
        target: { value: "#112233" },
    });
    expect((screen.getByLabelText("Selecionar cor personalizada") as HTMLInputElement).value).toBe(
        "#112233",
    );
    await user.click(screen.getByRole("button", { name: "Gerar cor aleatória" }));
    expect(
        (screen.getByLabelText("Selecionar cor personalizada") as HTMLInputElement).value,
    ).toMatch(/^#[0-9a-f]{6}$/);
    expect(screen.getByRole("alert").textContent).toContain("Nome já em uso!");
});

it("uses purchase defaults when the remainder field is blank and preserves purchase errors", async () => {
    const createPurchase = {
        ...failedMutation("Valor inválido"),
        error: new Error("Valor inválido"),
    };
    mockMutationCycle(mutation, createPurchase);
    cardsState = query([{ color: "#0f766e", id: "visa", name: "Visa", status: "ACTIVE" }]);
    const user = userEvent.setup();

    render(<CardsPage />);

    await user.click(screen.getByRole("button", { name: "Nova compra" }));
    await user.type(screen.getByRole("textbox", { name: "Descrição" }), "Curso");
    await user.type(screen.getByRole("spinbutton", { name: "Valor" }), "10");
    await user.selectOptions(screen.getByRole("combobox", { name: "Parcelas" }), "3");
    await user.clear(screen.getByRole("spinbutton", { name: "Parcela com centavos restantes" }));
    await user.click(screen.getByRole("button", { name: "Adicionar compra" }));

    expect(createPurchase.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ installments: 3, remainderInstallment: 3 }),
        expect.any(Object),
    );
    expect(screen.getByRole("alert").textContent).toContain("Valor inválido");
    expect(screen.getByRole("dialog", { name: "Nova compra" })).toBeTruthy();
});

it("restores an archived card after a successful response", async () => {
    const restore = successfulMutation();
    mockMutationCycle(mutation, mutation, mutation, mutation, restore);
    cardsState = query([{ color: "#7c3aed", id: "master", name: "Master", status: "ARCHIVED" }]);
    const user = userEvent.setup();

    render(<CardsPage />);

    await user.click(screen.getByRole("button", { name: "Editar Master" }));
    await user.click(screen.getByRole("button", { name: "Restaurar cartão" }));

    expect(restore.mutate).toHaveBeenCalledWith({ id: "master" }, expect.any(Object));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Editar cartão" })).toBeNull());
});

it("updates only the name while leaving optional card fields absent", async () => {
    const update = { ...failedMutation("Nome inválido"), error: new Error("Nome inválido") };
    mockMutationCycle(mutation, mutation, update);
    cardsState = query([{ color: "#0f766e", id: "visa", name: "Visa", status: "ACTIVE" }]);
    const user = userEvent.setup();

    render(<CardsPage />);

    await user.click(screen.getByRole("button", { name: "Editar Visa" }));
    await user.clear(screen.getByRole("textbox", { name: "Nome" }));
    await user.type(screen.getByRole("textbox", { name: "Nome" }), "Visa novo");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(update.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ id: "visa", name: "Visa novo" }),
        expect.any(Object),
    );
    expect(screen.getByRole("alert").textContent).toContain("Nome inválido");
});

it("does not remove a card when destructive confirmation is canceled", async () => {
    const remove = successfulMutation();
    mockMutationCycle(mutation, mutation, mutation, mutation, mutation, remove);
    cardsState = query([{ color: "#0f766e", id: "visa", name: "Visa", status: "ACTIVE" }]);
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();

    render(<CardsPage />);

    await user.click(screen.getByRole("button", { name: "Editar Visa" }));
    await user.click(screen.getByRole("button", { name: "Remover cartão" }));

    expect(remove.mutate).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Editar cartão" })).toBeTruthy();
});

it("shows loading and error states", async () => {
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
    await userEvent.setup().click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(cardsState.refetch).toHaveBeenCalledOnce();
    expect(purchasesState.refetch).toHaveBeenCalledOnce();
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
    await user.click(screen.getByRole("button", { name: "Arquivar cartão" }));
    expect(mutate).toHaveBeenCalledWith({ id: "active" }, expect.any(Object));
    expect(screen.getByRole("button", { name: "Remover cartão" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Fechar" }));
    await user.click(screen.getByRole("button", { name: "Editar Archived" }));
    await user.click(screen.getByRole("button", { name: "Restaurar cartão" }));
    expect(mutate).toHaveBeenCalledWith({ id: "archived" }, expect.any(Object));
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

    await user.click(screen.getByRole("button", { name: "Filtrar por Visa" }));
    expect(screen.getByText("Curso")).toBeTruthy();
    expect(screen.queryByText("Mercado")).toBeNull();
    const visa = screen.getByRole("button", { name: "Filtrar por Visa" });
    expect(visa.getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(visa, { key: "Enter" });
    expect(screen.getByText("Mercado")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Editar Visa" }));
    expect(screen.getByRole("dialog", { name: "Editar cartão" })).toBeTruthy();
    expect(screen.queryByText("Sem finais informados")).toBeNull();
});
