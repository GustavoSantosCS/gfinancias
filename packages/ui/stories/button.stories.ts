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
            options: ["default", "outline", "secondary", "ghost", "destructive", "link"],
        },
        size: { control: "select", options: ["default", "xs", "sm", "lg"] },
        disabled: { control: "boolean" },
    },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { name: "Padrão" };
export const Outline: Story = { name: "Contorno", args: { variant: "outline" } };
export const Destructive: Story = {
    name: "Destrutivo",
    args: { variant: "destructive", children: "Excluir" },
};
export const Disabled: Story = { name: "Desabilitado", args: { disabled: true } };
