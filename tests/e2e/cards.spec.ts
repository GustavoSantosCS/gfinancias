import { expect, test } from "@playwright/test";

test("creates a card and a planned purchase", async ({ page }) => {
    await page.goto("/cards?month=9&year=2028");

    await expect(page.getByRole("heading", { name: "Cartões" })).toBeVisible();
    await page.getByRole("button", { name: /Novo cartão/ }).click();
    const cardDialog = page.getByRole("dialog", { name: "Novo cartão" });
    await cardDialog.getByRole("textbox", { name: "Nome" }).fill("Viagem");
    await cardDialog.getByRole("button", { name: "Criar cartão" }).click();
    await expect(page.getByText("Viagem", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /Nova compra/ }).click();
    const purchaseDialog = page.getByRole("dialog", { name: "Nova compra" });
    await purchaseDialog.getByRole("textbox", { name: "Descrição" }).fill("Passagem");
    await purchaseDialog.getByRole("spinbutton", { name: "Valor" }).fill("1200");
    await purchaseDialog.getByRole("button", { name: "Adicionar compra" }).click();

    await expect(page.getByText("Passagem", { exact: true })).toBeVisible();
    await expect(page.getByText("À vista", { exact: true })).toBeVisible();
});

test("navigates from cards to monthly planning through the sidebar", async ({ page }) => {
    await page.goto("/cards?month=9&year=2028");

    await page.getByRole("button", { name: "Planejamento", exact: true }).click();

    await expect(page).toHaveURL("/planning?month=9&year=2028");
});
