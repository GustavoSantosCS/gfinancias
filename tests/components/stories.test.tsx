import { composeStories } from "@storybook/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vite-plus/test";
import * as buttonStories from "../../packages/ui/stories/button.stories";
import * as inputStories from "../../packages/ui/stories/input.stories";
import * as selectStories from "../../packages/ui/stories/select.stories";

const { Default: DefaultButton, Disabled: DisabledButton } = composeStories(buttonStories);
const { Default: DefaultInput } = composeStories(inputStories);
const { Default: DefaultSelect } = composeStories(selectStories);

it("supports keyboard activation in the default button story", async () => {
    const user = userEvent.setup();
    render(<DefaultButton />);
    await user.tab();
    expect(screen.getByRole("button", { name: "Salvar" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(DefaultButton.args.onClick).toHaveBeenCalledOnce();
});

it("renders the disabled button story without allowing activation", () => {
    render(<DisabledButton />);
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
});

it("allows editing the accessible input story", async () => {
    const user = userEvent.setup();
    render(<DefaultInput />);
    const input = screen.getByRole("textbox", { name: "Descrição" });
    await user.type(input, "Compra do mês");
    expect(input).toHaveValue("Compra do mês");
});

it("renders the shared planning-style select story", () => {
    render(<DefaultSelect />);
    expect(screen.getByRole("combobox", { name: "Categoria" })).toHaveValue("SALARY");
});
