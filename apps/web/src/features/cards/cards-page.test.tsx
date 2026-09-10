import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vite-plus/test";

const { searchParams, useMutation, useQuery, useQueryClient } = vi.hoisted(() => ({
    searchParams: { current: new URLSearchParams("month=9&year=2028") },
    useMutation: vi.fn(),
    useQuery: vi.fn(),
    useQueryClient: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
    skipToken: Symbol("skipToken"),
    useMutation,
    useQuery,
    useQueryClient,
}));

vi.mock("next/navigation", () => ({
    useSearchParams: () => searchParams.current,
}));

vi.mock("@/utils/trpc", () => {
    const mutationOptions = () => ({});
    const queryOptions = (input: unknown) => input;
    const pathKey = () => ["cards"];
    const queryKey = (input: unknown) => ["cards", input];
    return {
        trpc: {
            cards: {
                archive: { mutationOptions },
                create: { mutationOptions },
                createPurchase: { mutationOptions },
                anticipate: { mutationOptions },
                deletePurchase: { mutationOptions },
                getPurchase: { queryKey, pathKey, queryOptions },
                updatePurchase: { mutationOptions },
                delete: { mutationOptions },
                update: { mutationOptions },
                list: { pathKey, queryKey, queryOptions },
                listPurchases: { pathKey, queryKey, queryOptions },
                restore: { mutationOptions },
                pathKey,
            },
        },
    };
});

import { CardsPage } from "./cards-page";

const mutation = {
    error: null,
    isPending: false,
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockRejectedValue(new Error("Falha simulada")),
};
const query = (data: unknown, error: Error | null = null) => ({
    data,
    error,
    isLoading: false,
    refetch: vi.fn(),
});
type QueryState = ReturnType<typeof query>;
let cardsState: QueryState;
let purchasesState: QueryState;
let detailState: QueryState;

beforeEach(() => {
    searchParams.current = new URLSearchParams("month=9&year=2028");
    cardsState = query([]);
    purchasesState = query([]);
    detailState = query(null);
    useMutation.mockReturnValue(mutation);
    useQueryClient.mockReturnValue({
        cancelQueries: vi.fn(),
        invalidateQueries: vi.fn(),
        removeQueries: vi.fn(),
        refetchQueries: vi.fn(),
    });
    useQuery.mockImplementation(
        (input: { enabled?: boolean; includeArchived?: boolean; id?: string } | symbol) =>
            typeof input !== "object"
                ? query(null)
                : "includeArchived" in input
                  ? cardsState
                  : "id" in input
                    ? detailState
                    : input.enabled === false
                      ? query(null)
                      : purchasesState,
    );
});

it("uses the server period when the URL has no period", () => {
    searchParams.current = new URLSearchParams();
    cardsState = query([]);
    purchasesState = query([]);

    render(<CardsPage initialPeriod={{ month: 2, year: 2030 }} />);

    expect(
        useQuery.mock.calls.some(
            ([input]) => typeof input === "object" && input?.month === 2 && input?.year === 2030,
        ),
    ).toBe(true);
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
    cardsState = query([
        {
            brand: "VISA",
            closingDay: 26,
            color: "#0f766e",
            dueDay: 5,
            id: "card-1",
            lastDigits: "0000",
            limit: 111_111,
            name: "Visa",
            status: "ACTIVE",
        },
        {
            color: "#2563eb",
            id: "card-2",
            name: "Minimal",
            status: "ACTIVE",
        },
    ]);
    purchasesState = query([
        {
            amount: 12_345,
            card: { id: "card-1", name: "Visa", status: "ACTIVE" },
            competenceMonth: 9,
            competenceYear: 2028,
            description: "Curso",

            title: "Curso",
            id: "entry-1",
            kind: "REGULAR",
            number: 2,
            purchaseDate: "2028-09-01T12:00:00.000Z",
            total: 3,
        },
    ]);
    const user = userEvent.setup();

    render(<CardsPage />);

    expect(screen.getByRole("button", { name: "Filtrar por Visa" }).textContent).toContain(
        "R$ 1.111,11",
    );
    expect(screen.getByLabelText("Bandeira Visa")).toBeTruthy();
    const brandIcon = screen.getByLabelText("Bandeira Visa");
    expect(brandIcon.parentElement?.className).toContain("credit-card__name-row");
    expect(brandIcon.parentElement?.querySelector("strong")?.textContent).toBe("Visa");
    expect(screen.getByRole("button", { name: "Filtrar por Visa" }).textContent).toContain(
        "•••• 0000",
    );
    const visaCard = screen.getByRole("button", { name: "Filtrar por Visa" });
    expect(visaCard.textContent).toContain("Fechamento: 26/09 - Vencimento: 05/10");
    expect(visaCard.textContent).toContain("Gasto do mês: R$ 123,45");
    expect(visaCard.textContent?.indexOf("Fechamento")).toBeLessThan(
        visaCard.textContent?.indexOf("Gasto do mês") ?? 0,
    );
    const minimalCard = screen.getByRole("button", { name: "Filtrar por Minimal" });
    expect(minimalCard.textContent).toContain("Minimal");
    expect(minimalCard.querySelectorAll(".credit-card__metadata > small")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Abrir detalhes de Curso" }).className).toContain(
        "cursor-pointer",
    );

    expect(
        screen.getByRole("heading", { name: "Detalhamento" }).parentElement?.className,
    ).toContain("transactions-panel__heading");
    expect(
        screen.getByRole("heading", { name: "Detalhamento" }).parentElement?.parentElement
            ?.className,
    ).toContain("transactions-panel__header");
    expect(
        screen.getByRole("heading", { name: "Detalhamento" }).parentElement?.className,
    ).not.toContain("text-center");
    expect(screen.getByRole("heading", { name: "Detalhamento" })).toBeTruthy();
    expect(screen.queryByText("Competência: 09/2028")).toBeNull();
    expect(screen.queryByText("Compras da competência")).toBeNull();
    expect(screen.getByPlaceholderText("Pesquisar...")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pesquisar compras" })).toBeTruthy();
    expect(screen.getByLabelText("Filtros de compras").className).toContain(
        "purchase-filters-card",
    );
    expect(screen.getByLabelText("Filtros de compras").closest(".transactions-panel")).toBeNull();
    expect(screen.getByLabelText("Filtros de compras").getAttribute("style")).toContain(
        "background: transparent",
    );
    expect(screen.getByLabelText("Filtros de compras").getAttribute("style")).toContain(
        "border: 0px",
    );
    expect(screen.getByLabelText("Filtros de compras").getAttribute("style")).toContain(
        "box-shadow: none",
    );
    expect(screen.getByText("Data")).toBeTruthy();
    expect(screen.getByText("01/09/2028")).toBeTruthy();
    expect(screen.queryByText("Competência")).toBeNull();
    expect(screen.getByText("Curso")).toBeTruthy();
    expect(screen.getByText("2/3")).toBeTruthy();
    expect(document.querySelector(".transactions-table__amount")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Nova compra/ }));
    expect(screen.getByRole("textbox", { name: "Título" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Descrição" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Título" }).hasAttribute("required")).toBe(true);
    expect(screen.getByRole("textbox", { name: "Descrição" }).hasAttribute("required")).toBe(false);
    expect(screen.getByRole("textbox", { name: "Título" }).getAttribute("maxlength")).toBe("60");
    const purchaseDialog = screen.getByRole("dialog", { name: "Nova compra" });
    expect(
        Array.from(purchaseDialog.querySelectorAll("input, select, textarea"))
            .at(-1)
            ?.getAttribute("name"),
    ).toBe("description");

    expect(screen.getByRole("dialog", { name: "Nova compra" })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Título" }));
    expect(purchaseDialog.className).toContain("purchase-create-dialog");
    expect(screen.getByRole("textbox", { name: "Descrição" }).tagName).toBe("TEXTAREA");
    expect(screen.getByText("0/500")).toBeTruthy();
    expect(screen.queryByRole("spinbutton", { name: "Qual parcela vai os centavos" })).toBeNull();
    await user.type(screen.getByRole("spinbutton", { name: "Valor" }), "10.01");
    await user.selectOptions(screen.getByRole("combobox", { name: "Parcelas" }), "3");
    expect(screen.getByRole("spinbutton", { name: "Qual parcela vai os centavos" })).toBeTruthy();
    expect(
        screen
            .getByRole("spinbutton", { name: "Qual parcela vai os centavos" })
            .getAttribute("min"),
    ).toBe("1");
    expect(
        screen
            .getByRole("spinbutton", { name: "Qual parcela vai os centavos" })
            .getAttribute("max"),
    ).toBe("3");
});

it("centers the empty purchase state", () => {
    cardsState = query([{ color: "#0f766e", id: "active", name: "Active", status: "ACTIVE" }]);
    purchasesState = query([]);

    render(<CardsPage />);

    expect(screen.getByText("Nenhuma compra nesse cartão").className).toContain(
        "transactions-empty",
    );
});

it("shows loading and error states", () => {
    cardsState = { data: undefined, error: null, isLoading: true, refetch: vi.fn() };
    purchasesState = { data: undefined, error: null, isLoading: false, refetch: vi.fn() };
    const { rerender } = render(<CardsPage />);
    expect(screen.getByRole("main", { name: "Carregando cartões" })).toBeTruthy();
    expect(screen.queryByText("Detalhamento")).toBeNull();
    expect(screen.queryByText("Competência: 09/2028")).toBeNull();
    expect(screen.queryByPlaceholderText("Pesquisar...")).toBeNull();
    expect(screen.queryByLabelText("Filtros de compras")).toBeNull();

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
    useMutation.mockReturnValue({
        error: null,
        isPending: false,
        mutate,
        mutateAsync: async (input: unknown) => {
            mutate(input);
            throw new Error("Falha simulada");
        },
    });
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

            title: "Curso",
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

            title: "Mercado",
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

it("expands purchase details and exposes edit/delete and anticipation eligibility", async () => {
    cardsState = query([{ color: "#0f766e", id: "active", name: "Active", status: "ACTIVE" }]);
    purchasesState = query([
        {
            amount: 1000,
            card: { id: "active", name: "Active", status: "ACTIVE" },
            competenceMonth: 9,
            competenceYear: 2028,
            description: "Curso",

            title: "Curso",
            id: "entry",
            kind: "REGULAR",
            number: 2,
            purchaseId: "purchase",
            total: 3,
        },
    ]);
    detailState = query({
        amount: 3000,
        card: { id: "active", name: "Active", status: "ACTIVE" },
        description: "Curso",

        title: "Curso",
        id: "purchase",
        installments: 3,
        purchaseDate: "2028-09-01T12:00:00.000Z",
        anticipations: [],
        schedule: [
            {
                amount: 1000,
                competenceMonth: 9,
                competenceYear: 2028,
                id: "one",
                kind: "REGULAR",
                number: 1,
                total: 3,
            },
            {
                amount: 1000,
                competenceMonth: 10,
                competenceYear: 2028,
                id: "two",
                kind: "REGULAR",
                number: 2,
                total: 3,
            },
            {
                amount: 1000,
                competenceMonth: 11,
                competenceYear: 2028,
                id: "three",
                kind: "REGULAR",
                number: 3,
                total: 3,
            },
        ],
    });
    const user = userEvent.setup();
    render(<CardsPage />);
    await user.click(screen.getByRole("button", { name: "Abrir detalhes de Curso" }));
    expect(
        screen.getByRole("button", { name: "Abrir detalhes de Curso" }).querySelector("button"),
    ).toBeNull();
    const detailDialog = screen.getByRole("dialog", { name: "Detalhes da compra: Curso" });
    expect(detailDialog.className).toContain("purchase-detail-dialog");
    expect(detailDialog.querySelector(".purchase-detail__summary")).toBeTruthy();
    expect(detailDialog.querySelector(".purchase-detail__title-actions")).toBeTruthy();
    expect(detailDialog.querySelector(".purchase-detail__description")?.textContent).toContain(
        "DescriçãoCurso",
    );
    expect(detailDialog.querySelector(".purchase-detail__schedule-scroll")).toBeTruthy();
    const editButton = screen.getByRole("button", { name: "Editar compra" });
    const deleteButton = screen.getByRole("button", { name: "Excluir compra" });
    expect(editButton.textContent?.trim()).toBe("");
    expect(editButton.querySelector(".lucide-pencil")).toBeTruthy();
    expect(deleteButton.textContent?.trim()).toBe("");
    expect(deleteButton.querySelector(".lucide-trash")).toBeTruthy();
    expect(editButton.className).toContain("purchase-detail__icon-button");
    expect(editButton.className).toContain("cursor-pointer");
    expect(deleteButton.className).toContain("purchase-detail__icon-button");
    expect(deleteButton.className).toContain("purchase-detail__delete-button");
    expect(editButton.closest(".purchase-detail__title-actions")).toBeTruthy();
    expect(deleteButton.closest(".purchase-detail__title-actions")).toBeTruthy();
    expect(Array.from(detailDialog.querySelectorAll("dt")).map((item) => item.textContent)).toEqual(
        ["Título", "Valor", "Data da compra", "Parcela ou à vista", "Cartão", "Descrição"],
    );
    expect(screen.getByRole("table", { name: "Cronograma de parcelas" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Número da parcela" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Mês" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Valor" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Estado" })).toBeTruthy();
    expect(
        Array.from(detailDialog.querySelectorAll("td")).map((item) => item.textContent),
    ).toContain("Em aberto");
    const anticipationButton = screen.getByRole("button", { name: "Antecipar parcelas" });
    expect(anticipationButton).toBeTruthy();
    expect(anticipationButton.className).toContain("cursor-pointer");
    expect(anticipationButton.closest(".purchase-detail__title-actions")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Antecipar parcela 2" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Editar compra" }));
    const editorDialog = screen.getByRole("dialog", { name: "Editar compra" });
    expect(editorDialog.className).toContain("purchase-form-dialog");
    expect(editorDialog.querySelector('textarea[name="description"]')).toBeTruthy();
    expect(editorDialog.querySelector(".purchase-description-count")?.textContent).toBe("5/500");
    expect(
        Array.from(editorDialog.querySelectorAll('input:not([type="hidden"]), select, textarea'))
            .at(-1)
            ?.getAttribute("name"),
    ).toBe("description");
    expect(editorDialog.querySelector('input[name="amount"]')?.getAttribute("value")).toBe("30");
    expect(editorDialog.querySelector('input[name="purchaseDate"]')).toBeTruthy();
    expect(editorDialog.querySelector('select[name="cardId"]')).toBeTruthy();
    expect(editorDialog.querySelector('select[name="installments"]')).toBeTruthy();
    await user.clear(screen.getByRole("textbox", { name: "Título" }));
    await user.type(screen.getByRole("textbox", { name: "Título" }), "Novo título");
    await user.clear(screen.getByRole("spinbutton", { name: "Valor" }));
    await user.type(screen.getByRole("spinbutton", { name: "Valor" }), "30.01");
    await user.selectOptions(screen.getByRole("combobox", { name: "Parcelas" }), "3");
    expect(screen.getByRole("spinbutton", { name: "Qual parcela vai os centavos" })).toBeTruthy();
    await user.clear(screen.getByRole("textbox", { name: "Descrição" }));
    await user.type(screen.getByRole("textbox", { name: "Descrição" }), "Nova descrição");
    expect(screen.getByText("14/500")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Salvar compra" }));
    await user.click(screen.getByRole("button", { name: "Fechar" }));
    await user.click(screen.getByRole("button", { name: "Abrir detalhes de Curso" }));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Excluir compra" }));
    await user.click(screen.getByRole("button", { name: "Antecipar parcelas" }));
    const anticipationDialog = screen.getByRole("dialog", { name: "Antecipar parcelas" });
    expect(anticipationDialog.className).toContain("anticipation-dialog");
    expect(anticipationDialog.querySelector(".anticipation-parcels-list")).toBeTruthy();
    expect(anticipationDialog.querySelector(".anticipation-parcels-grid")).toBeTruthy();
    expect(anticipationDialog.querySelector(".anticipation-summary")).toBeTruthy();
    expect(anticipationDialog.querySelector(".anticipation-description")).toBeTruthy();
    expect(screen.getByText("Título da compra")).toBeTruthy();
    expect(screen.getByText("Data de antecipação")).toBeTruthy();
    expect(screen.getByText("Valor da parcela de agrupamento")).toBeTruthy();
    expect(
        screen
            .getByRole("spinbutton", { name: "Valor da parcela de agrupamento" })
            .getAttribute("value"),
    ).toBe("20");
    expect(screen.getByText("Valor original da compra")).toBeTruthy();
    expect(screen.getByText("Novo valor total")).toBeTruthy();
    expect(screen.getByText("Desconto da antecipação")).toBeTruthy();
    expect(screen.getByText("Descrição que será criada pelo sistema")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar" }).className).toContain("button--default");
    const installment = screen.getByRole("checkbox", { name: "Parcela 2 de 3" });
    expect(installment.className).toContain("anticipation-parcel-checkbox");
    expect(installment.closest("label")?.className).toContain("anticipation-parcel-option");
    expect(installment.getAttribute("aria-checked")).toBe("true");
    expect(
        screen.getByRole("checkbox", { name: "Parcela 3 de 3" }).getAttribute("aria-checked"),
    ).toBe("true");
    await user.click(installment);
    await user.click(installment);
    await user.selectOptions(screen.getByRole("combobox", { name: "Modo" }), "SEPARATE");
    const separateTable = screen.getByRole("table", { name: "Parcelas antecipadas" });
    expect(separateTable).toBeTruthy();
    expect(anticipationDialog.querySelector(".anticipation-values-scroll")).toBeTruthy();
    expect(
        (screen.getByRole("spinbutton", { name: "Valor parcela 2" }) as HTMLInputElement).value,
    ).toBe("10");
    expect(screen.getByRole("columnheader", { name: "Número da parcela" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Valor da parcela" })).toBeTruthy();
    await user.clear(screen.getByRole("spinbutton", { name: "Valor parcela 2" }));
    await user.type(screen.getByRole("spinbutton", { name: "Valor parcela 2" }), "9");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Modo" }), "GROUPED");
    await user.type(
        screen.getByRole("spinbutton", { name: "Valor da parcela de agrupamento" }),
        "9",
    );
    await user.click(screen.getByRole("button", { name: "Salvar" }));
});

it("renders the loading-safe archive detail state and preserves mutation errors", async () => {
    cardsState = query([
        { color: "#0f766e", id: "archived", name: "Archived", status: "ARCHIVED" },
    ]);
    purchasesState = query([
        {
            amount: 1000,
            card: { id: "archived", name: "Archived", status: "ARCHIVED" },
            competenceMonth: 9,
            competenceYear: 2028,
            description: "History",

            title: "History",
            id: "entry",
            kind: "REGULAR",
            number: 1,
            purchaseId: "purchase",
            total: 1,
        },
    ]);
    detailState = query({
        amount: 1000,
        card: { id: "archived", name: "Archived", status: "ARCHIVED" },
        description: "History",

        title: "History",
        id: "purchase",
        installments: 1,
        purchaseDate: "2028-09-01T12:00:00.000Z",
        anticipations: [],
        schedule: [
            {
                amount: 1000,
                competenceMonth: 9,
                competenceYear: 2028,
                id: "one",
                kind: "REGULAR",
                number: 1,
                total: 1,
            },
        ],
    });
    const user = userEvent.setup();
    render(<CardsPage />);
    await user.click(screen.getByRole("button", { name: "Abrir detalhes de History" }));
    expect(
        (screen.getByRole("button", { name: "Editar compra" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
        (screen.getByRole("button", { name: "Excluir compra" }) as HTMLButtonElement).disabled,
    ).toBe(true);
});

it("supports keyboard card selection and controlled purchase filters", async () => {
    cardsState = query([
        { color: "#0f766e", id: "active", name: "Active", status: "ACTIVE" },
        { color: "#7c3aed", id: "archived", name: "Archived", status: "ARCHIVED" },
    ]);
    purchasesState = query([
        {
            amount: 1000,
            card: { id: "active", name: "Active", status: "ACTIVE" },
            competenceMonth: 9,
            competenceYear: 2028,
            title: "Curso",
            id: "entry",
            kind: "REGULAR",
            number: 1,
            total: 1,
        },
        {
            amount: 2000,
            card: { id: "archived", name: "Archived", status: "ARCHIVED" },
            competenceMonth: 9,
            competenceYear: 2028,
            title: "Histórico",
            id: "archived-entry",
            kind: "REGULAR",
            number: 1,
            total: 1,
        },
    ]);
    const user = userEvent.setup();
    render(<CardsPage />);
    const active = screen.getByRole("button", { name: "Filtrar por Active" });
    active.focus();
    await user.keyboard("{Enter}");
    expect(active.getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByText("Histórico")).toBeNull();
    await user.type(screen.getByRole("textbox", { name: "Pesquisar compras" }), "Curso");
    await user.selectOptions(screen.getByRole("combobox", { name: "Estado" }), "ACTIVE");
    expect(
        (screen.getByRole("textbox", { name: "Pesquisar compras" }) as HTMLInputElement).value,
    ).toBe("Curso");
    expect((screen.getByRole("combobox", { name: "Estado" }) as HTMLSelectElement).value).toBe(
        "ACTIVE",
    );
});

it("keeps archived card actions distinct and handles space-key selection", async () => {
    cardsState = query([
        { color: "#7c3aed", id: "archived", name: "Archived", status: "ARCHIVED" },
    ]);
    purchasesState = query([]);
    const user = userEvent.setup();
    render(<CardsPage />);
    const card = screen.getByRole("button", { name: "Filtrar por Archived" });
    card.focus();
    await user.keyboard(" ");
    expect(card.getAttribute("aria-pressed")).toBe("true");
    await user.click(screen.getByRole("button", { name: "Editar Archived" }));
    expect(screen.getByRole("button", { name: "Restaurar cartão" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Arquivar cartão" })).toBeNull();
});
