import { expect, test } from "@playwright/test";

test("opens the monthly planning from the dashboard", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /Planejamento de/i })).toBeVisible();

    await expect(page.getByRole("button", { name: "Criar fase" })).toBeVisible();
});

test("persists the dark theme after reloading", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.getByRole("button", { name: "Ativar modo claro" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    await page.getByRole("button", { name: "Ativar modo escuro" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
});
