import { randomUUID } from "node:crypto";
import { test as base, expect } from "@playwright/test";

type CardsFixture = {
    createCard: () => Promise<string>;
    createPurchase: (cardName: string, installments?: number) => Promise<string>;
};

export const test = base.extend<{ cards: CardsFixture }>({
    cards: async ({ page }, use, testInfo) => {
        const createdCards: string[] = [];
        const uniqueName = (kind: string) =>
            `${kind}-${testInfo.workerIndex}-${randomUUID().slice(0, 8)}`;
        try {
            await use({
                createCard: async () => {
                    const name = uniqueName("Cartao");
                    await page.getByRole("button", { name: /Novo cartão/ }).click();
                    const dialog = page.getByRole("dialog", { name: "Novo cartão" });
                    await dialog.getByRole("textbox", { name: "Nome" }).fill(name);
                    createdCards.push(name);
                    await dialog.getByRole("button", { name: "Criar cartão" }).click();
                    await expect(
                        page.getByRole("button", { name: "Filtrar por " + name, exact: true }),
                    ).toBeVisible();
                    return name;
                },
                createPurchase: async (cardName, installments = 1) => {
                    const title = uniqueName("Compra");
                    await page.getByRole("button", { name: /Nova compra/ }).click();
                    const dialog = page.getByRole("dialog", { name: "Nova compra" });
                    await dialog.getByRole("textbox", { name: "Título" }).fill(title);
                    await dialog.getByRole("spinbutton", { name: "Valor" }).fill("1200");
                    await dialog.getByLabel("Data da compra").fill("2028-09-04");
                    await dialog
                        .getByRole("combobox", { name: "Cartão", exact: true })
                        .selectOption({ label: cardName });
                    await dialog
                        .getByRole("combobox", { name: "Parcelas", exact: true })
                        .selectOption(String(installments));
                    await dialog.getByRole("button", { name: "Adicionar compra" }).click();
                    await expect(
                        page.getByRole("button", { name: "Abrir detalhes de " + title }),
                    ).toBeVisible();
                    return title;
                },
            });
        } finally {
            for (const name of createdCards) {
                await page.goto("/cards?month=9&year=2028");
                await expect(
                    page.getByRole("heading", { name: "Cartões", exact: true }),
                ).toBeVisible();
                await expect(page.getByRole("button", { name: /Novo cartão/ })).toBeEnabled();
                const edit = page.getByRole("button", { name: "Editar " + name, exact: true });
                if ((await edit.count()) === 0) continue;
                await edit.scrollIntoViewIfNeeded();
                await edit.click({ force: true });
                page.once("dialog", (dialog) => dialog.accept());
                const remove = page
                    .getByRole("dialog", { name: "Editar cartão" })
                    .getByRole("button", { name: "Remover cartão" });
                await remove.evaluate((button) => (button as HTMLElement).click());
                await expect(edit).toHaveCount(0);
            }
        }
    },
});

export { expect } from "@playwright/test";
