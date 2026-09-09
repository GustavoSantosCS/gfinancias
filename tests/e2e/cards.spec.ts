import { expect, test } from "./cards-fixture";

test("creates a card and a planned purchase", async ({ page, cards }) => {
    await page.goto("/cards?month=9&year=2028");
    await expect(page.getByRole("heading", { name: "Cartões", exact: true })).toBeVisible();
    const cardName = await cards.createCard();
    const title = await cards.createPurchase(cardName);
    const purchase = page.getByRole("button", { name: "Abrir detalhes de " + title });
    await expect(purchase).toContainText(cardName);
    await expect(purchase).toContainText("À vista");
});
