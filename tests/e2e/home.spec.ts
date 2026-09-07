import { expect, test } from "@playwright/test";

test("connects the home page to the API", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "API Status" })).toBeVisible();
    await expect(page.getByText("Connected", { exact: true })).toBeVisible();
});

test("persists the selected theme after reloading", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Toggle theme" }).click();
    await page.getByRole("menuitem", { name: "Dark", exact: true }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
});
