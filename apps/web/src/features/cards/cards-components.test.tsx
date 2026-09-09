// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vite-plus/test";
import { CardFormDialog } from "./components/card-form-dialog";
import { CardGrid } from "./components/card-grid";
import { PurchasesTable } from "./components/purchases-table";

describe("card presentation components", () => {
    it("focuses invalid card input and exposes validation feedback", async () => {
        const user = userEvent.setup();
        render(<CardFormDialog onClose={vi.fn()} onSubmit={vi.fn()} pending={false} />);
        await user.click(screen.getByRole("button", { name: "Criar cartão" }));
        expect(screen.getByRole("textbox", { name: "Nome" })).toBeRequired();
    });

    it("renders parser errors for whitespace-only card names", async () => {
        const user = userEvent.setup();
        render(<CardFormDialog onClose={vi.fn()} onSubmit={vi.fn()} pending={false} />);
        await user.type(screen.getByRole("textbox", { name: "Nome" }), "   ");
        await user.click(screen.getByRole("button", { name: "Criar cartão" }));
        expect(screen.getByRole("alert").textContent).toContain("valor válido");
        expect(screen.getByRole("textbox", { name: "Nome" })).toHaveAttribute("aria-invalid", "true");
    });

    it("renders archived card actions and keyboard selection", async () => {
        const onEdit = vi.fn();
        const onSelect = vi.fn();
        render(<CardGrid cards={[{ color: "#123456", id: "archived", name: "Arquivado", status: "ARCHIVED" }]} month={9} selectedCardId={null} spendingByCard={new Map()} onEdit={onEdit} onSelect={onSelect} />);
        const card = screen.getByRole("button", { name: "Filtrar por Arquivado" });
        expect(screen.getByText("ARQUIVADO")).toBeTruthy();
        card.focus();
        await userEvent.setup().keyboard("{Enter}");
        expect(onSelect).toHaveBeenCalledWith("archived");
        await userEvent.setup().click(screen.getByRole("button", { name: "Editar Arquivado" }));
        expect(onEdit).toHaveBeenCalledOnce();
    });

    it("renders the empty purchase table without creating a fake row", () => {
        render(<PurchasesTable purchases={[]} onOpen={vi.fn()} />);
        expect(screen.getByText("Nenhuma compra nesse cartão")).toBeTruthy();
        expect(screen.queryByRole("row")).toBeNull();
    });
});
