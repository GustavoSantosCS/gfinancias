import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";

import { Button } from "../src/components/button";

const meta = {
    title: "Componentes/Botão",
    component: Button,
    args: { children: "Salvar", onClick: fn() },
    argTypes: {
        variant: {
            control: "select",
            options: ["primary", "default", "danger", "warning"],
        },
        disabled: { control: "boolean" },
    },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { name: "Principal", args: { variant: "primary" } };
export const Default: Story = {
    name: "Padrão",
    args: { variant: "default" },
};
export const Danger: Story = {
    name: "Perigo",
    args: { children: "Remover cartão", variant: "danger" },
};
export const Warning: Story = {
    name: "Aviso",
    args: { children: "Arquivar cartão", variant: "warning" },
};
export const Disabled: Story = {
    name: "Desabilitado",
    args: { disabled: true, variant: "primary" },
};
