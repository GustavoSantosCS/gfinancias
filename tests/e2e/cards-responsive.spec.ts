import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./cards-fixture";

async function assertPageFits(page: Page) {
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expect(page.getByRole("heading", { name: "Cartões", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Novo cartão/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Nova compra/ })).toBeVisible();
}

async function assertDialogFits(dialog: Locator) {
    await expect(dialog).toBeVisible();
    expect(
        await dialog.evaluate((element) => {
            const bounds = element.getBoundingClientRect();
            const styles = getComputedStyle(element);
            return (
                bounds.left >= 0 &&
                bounds.right <= window.innerWidth &&
                (element.scrollHeight <= element.clientHeight ||
                    /auto|scroll/.test(styles.overflowY))
            );
        }),
    ).toBe(true);
}

test("keeps isolated card flows usable on mobile in both themes", async ({ page, cards }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => localStorage.setItem("gfin-theme", "light"));
    await page.goto("/cards?month=9&year=2028");
    const cardName = await cards.createCard();
    await page.getByRole("button", { name: "Filtrar por " + cardName, exact: true }).click();
    await expect(page.getByText("Nenhuma compra nesse cartão", { exact: true })).toBeVisible();
    await assertPageFits(page);
    const surface = page.locator(".transactions-panel");
    const lightColors = await surface.evaluate((element) => ({
        background: getComputedStyle(element).backgroundColor,
        text: getComputedStyle(element).color,
    }));
    await page.getByRole("button", { name: "Ativar modo escuro" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    const darkColors = await surface.evaluate((element) => ({
        background: getComputedStyle(element).backgroundColor,
        text: getComputedStyle(element).color,
    }));
    expect(darkColors).not.toEqual(lightColors);
    await assertPageFits(page);
    await expect(page.getByText("Nenhuma compra nesse cartão", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Editar " + cardName, exact: true }).click();
    await assertDialogFits(page.getByRole("dialog", { name: "Editar cartão" }));
    await page.keyboard.press("Escape");
    const title = await cards.createPurchase(cardName, 12);
    await page.getByRole("button", { name: "Abrir detalhes de " + title }).click();
    await assertDialogFits(page.getByRole("dialog", { name: "Detalhes da compra: " + title }));
    await page.getByRole("button", { name: "Antecipar parcelas", exact: true }).click();
    const anticipation = page.getByRole("dialog", { name: "Antecipar parcelas", exact: true });
    await assertDialogFits(anticipation);
    const second = anticipation.getByRole("checkbox", { name: "Parcela 2 de 12" });
    await expect(second).toBeChecked();
    await second.click();
    await expect(second).not.toBeChecked();
    await second.click();
    await anticipation.getByRole("combobox", { name: "Modo" }).selectOption("SEPARATE");
    await assertDialogFits(anticipation);
    const scroll = anticipation.locator(".anticipation-values-scroll");
    expect(
        await scroll.evaluate(
            (element) =>
                element.scrollHeight <= element.clientHeight ||
                /auto|scroll/.test(getComputedStyle(element).overflowY),
        ),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Ativar modo claro" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await assertPageFits(page);
});
