import { expect, test } from "@playwright/test";

test("renders the delivery-one dashboard and disables unavailable navigation", async ({ page }) => {
    await page.goto("/");

    await expect(
        page.getByRole("heading", { name: "Seu dinheiro, antes dele ir embora." }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Planejamento", exact: true })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Cartões", exact: true })).toBeEnabled();
    await expect(
        page.getByRole("button", { name: "Objetivos financeiros", exact: true }),
    ).toBeDisabled();
    await expect(page.getByRole("button", { name: "Reservas", exact: true })).toBeDisabled();

    await page.getByRole("button", { name: "Planejamento", exact: true }).click();
    await expect(page.getByRole("heading", { name: /Planejamento de/i })).toBeVisible();
});

test("does not display financial values from the prototype", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText(/8\.158,69/)).not.toBeVisible();
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
