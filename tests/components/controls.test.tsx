import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vite-plus/test";
import { Button } from "@gfinancias/ui/components/button";
import { FieldInput } from "@gfinancias/ui/components/field-input";
import { Input } from "@gfinancias/ui/components/input";
import { Select } from "@gfinancias/ui/components/select";

it("submits the value entered through the shared controls", async () => {
    const submit = vi.fn();
    const user = userEvent.setup();
    render(
        <form
            onSubmit={(event) => {
                event.preventDefault();
                submit(new FormData(event.currentTarget).get("description"));
            }}
        >
            <label htmlFor="description">Descrição</label>
            <Input id="description" name="description" />
            <Button type="submit">Salvar</Button>
        </form>,
    );
    await user.type(screen.getByRole("textbox", { name: "Descrição" }), "Aluguel");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(submit).toHaveBeenCalledWith("Aluguel");
});

it("prevents interaction with disabled controls", async () => {
    const click = vi.fn();
    const user = userEvent.setup();
    render(
        <>
            <Input aria-label="Descrição" disabled />
            <Button disabled onClick={click}>
                Salvar
            </Button>
        </>,
    );
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("button")).toBeDisabled();
    await user.click(screen.getByRole("button"));
    expect(click).not.toHaveBeenCalled();
});

it("uses the planning modal visual contract in the shared select", () => {
    render(
        <label>
            Categoria
            <Select defaultValue="SALARY" name="category">
                <option value="SALARY">Salário</option>
                <option value="OTHER">Outros</option>
            </Select>
        </label>,
    );

    const select = screen.getByRole("combobox", { name: "Categoria" });
    expect(select).toHaveClass("modal-select");
    expect(select).toHaveValue("SALARY");
});

it("uses the planning modal field visual contract in shared inputs and labels", () => {
    render(<FieldInput label="Nome" name="name" required />);

    const input = screen.getByRole("textbox", { name: "Nome" });
    expect(input).toHaveClass("modal-input");
    expect(screen.getByText("Nome")).toHaveClass("modal-input-label");
});

it("provides the primary, default, danger, and warning official button states", () => {
    render(
        <>
            <Button variant={"primary" as never}>Salvar</Button>
            <Button variant="default">Novo cartão</Button>
            <Button variant={"danger" as never}>Remover</Button>
            <Button variant={"warning" as never}>Arquivar</Button>
        </>,
    );

    expect(screen.getByRole("button", { name: "Salvar" })).toHaveClass("button--primary");
    expect(screen.getByRole("button", { name: "Novo cartão" })).toHaveClass("button--default");
    expect(screen.getByRole("button", { name: "Remover" })).toHaveClass("button--danger");
    expect(screen.getByRole("button", { name: "Arquivar" })).toHaveClass("button--warning");
});

it("uses Nova fase typography consistently in shared text, number, and select controls", () => {
    render(
        <>
            <Input aria-label="Nome da fase" />
            <Input aria-label="Dia inicial" type="number" />
            <Select aria-label="Categoria">
                <option>Salário</option>
            </Select>
        </>,
    );

    expect(screen.getByRole("textbox", { name: "Nome da fase" })).toHaveClass("text-xs");
    expect(screen.getByRole("spinbutton", { name: "Dia inicial" })).toHaveClass("text-xs");
    expect(screen.getByRole("combobox", { name: "Categoria" })).toHaveClass("text-xs");
});
