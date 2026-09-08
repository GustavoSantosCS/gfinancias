import type { Meta, StoryObj } from "@storybook/react";

import { FieldInput } from "../src/components/field-input";

const meta = {
    title: "Componentes/Campo rotulado",
    component: FieldInput,
    args: { label: "Nome", placeholder: "Digite um nome" },
} satisfies Meta<typeof FieldInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { name: "Padrão" };
export const Required: Story = { name: "Obrigatório", args: { required: true } };
export const Filled: Story = { name: "Preenchido", args: { defaultValue: "Cartão principal" } };
