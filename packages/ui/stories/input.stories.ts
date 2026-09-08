import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "../src/components/input";

const meta = {
    title: "Componentes/Campo de texto",
    component: Input,
    args: { "aria-label": "Descrição", placeholder: "Digite uma descrição" },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { name: "Padrão" };
export const Filled: Story = { name: "Preenchido", args: { defaultValue: "Aluguel" } };
export const Disabled: Story = { name: "Desabilitado", args: { disabled: true } };
export const Invalid: Story = { name: "Inválido", args: { "aria-invalid": true } };
