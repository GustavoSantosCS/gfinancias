import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vite-plus/test";
import { Button } from "@gfinancias/ui/components/button";
import { Input } from "@gfinancias/ui/components/input";

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
