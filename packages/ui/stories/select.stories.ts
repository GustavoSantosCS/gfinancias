import type { Meta, StoryObj } from "@storybook/react";
import { createElement } from "react";

import { Select } from "../src/components/select";

const meta = {
    title: "Componentes/Seleção",
    component: Select,
    args: { "aria-label": "Categoria", defaultValue: "SALARY" },
    render: (args) =>
        createElement(
            Select,
            args,
            createElement("option", { value: "SALARY" }, "Salário"),
            createElement("option", { value: "OTHER" }, "Outros"),
        ),
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { name: "Padrão" };
export const Disabled: Story = { name: "Desabilitado", args: { disabled: true } };
