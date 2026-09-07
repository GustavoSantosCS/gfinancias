import { expect, test } from "@playwright/test";

test("creates a phase and an income in the monthly planning", async ({ page }) => {
    await page.goto("/planning");

    await expect(page.getByRole("heading", { name: /Planejamento de/i })).toBeVisible({
        timeout: 30000,
    });
    await page.getByPlaceholder("Nome da fase").fill("First half");
    await page.getByPlaceholder("Dia inicial").fill("1");
    await page.getByPlaceholder("Dia final").fill("15");
    await page.getByRole("button", { name: "Criar fase" }).click();

    await expect(page.getByRole("heading", { name: /First half/ })).toBeVisible();
    await page.getByPlaceholder("Descrição").first().fill("Salary");
    await page.getByPlaceholder("Valor").first().fill("5000");
    await page.getByRole("button", { name: "Adicionar" }).first().click();

    await expect(page.getByText(/Salary.*SALARY/).last()).toBeVisible();
    await expect(page.getByText(/Salary.*R\$\s?5\.000,00/).last()).toBeVisible();
});
