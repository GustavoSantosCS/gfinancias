import { expect, test } from "@playwright/test";

test("styles phase creation as disabled while planning loads", async ({ page }) => {
    await page.route("**/*planning.get*", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 10_000));
        await route.continue();
    });

    await page.goto("/planning");

    const createPhase = page.getByRole("button", { name: "Criar fase" });
    await expect(createPhase).toBeDisabled();
    await expect(createPhase).toHaveCSS("cursor", "not-allowed");
    await expect(createPhase).toHaveCSS("opacity", "0.5");

    await page.waitForTimeout(300);
    const borderColorBeforeHover = await createPhase.evaluate(
        (element) => window.getComputedStyle(element).borderColor,
    );
    await createPhase.hover({ force: true });
    await page.waitForTimeout(300);
    const borderColorAfterHover = await createPhase.evaluate(
        (element) => window.getComputedStyle(element).borderColor,
    );
    expect(borderColorAfterHover).toBe(borderColorBeforeHover);
});

test("creates a phase and an income in the monthly planning", async ({ page }) => {
    await page.goto("/planning");

    await expect(page.getByRole("heading", { name: /Planejamento de/i })).toBeVisible({
        timeout: 30000,
    });
    await expect(page).toHaveURL(/[?&]month=\d{1,2}/);
    await expect(page).toHaveURL(/[?&]year=\d{4}/);
    await expect(page.getByText("GFinanças", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Planejamento", exact: true })).toHaveClass(
        /active/,
    );
    await page.getByRole("button", { name: "Criar fase" }).click();
    const phaseDialog = page.getByRole("dialog", { name: "Nova fase" });
    await phaseDialog.getByLabel("Nome da fase").fill("First half");
    await phaseDialog.getByLabel("Começa no dia").fill("1");
    await phaseDialog.getByLabel("Termina no dia").fill("15");
    await phaseDialog.getByRole("button", { name: "Criar fase" }).click();

    await expect(page.getByRole("tab", { name: /First half/ })).toBeVisible();
    await expect(page).toHaveURL(/[?&]phase=[^&]+/);
    await page.getByRole("button", { name: "Nova entrada" }).click();
    const incomeDialog = page.getByRole("dialog", { name: "Nova entrada" });
    await incomeDialog.getByLabel("Nome").fill("Salary");
    await incomeDialog.getByLabel("Valor").fill("5000");
    await incomeDialog.getByRole("button", { name: "Adicionar entrada" }).click();

    const incomeRow = page.getByRole("button", { name: "Editar Salary" });
    await expect(incomeRow).toContainText("Salary");
    await expect(incomeRow).toContainText(/5\.000,00/);

    await incomeRow.click();
    const editDialog = page.getByRole("dialog", { name: "Editar entrada" });
    await editDialog.getByLabel("Nome").fill("Updated salary");
    await editDialog.getByLabel("Valor").fill("5500");
    await editDialog.getByRole("button", { name: "Salvar alterações" }).click();

    const updatedIncomeRow = page.getByRole("button", { name: "Editar Updated salary" });
    await expect(updatedIncomeRow).toContainText("Updated salary");
    await expect(updatedIncomeRow).toContainText(/5\.500,00/);
});

test("limits phase dates, translates API errors and disables creation for a full month", async ({
    page,
}) => {
    await page.goto("/planning?month=2&year=2030");
    await expect(page.getByRole("heading", { name: "Planejamento de fevereiro" })).toBeVisible({
        timeout: 30_000,
    });

    await page.getByRole("button", { name: "Criar fase" }).click();
    let phaseDialog = page.getByRole("dialog", { name: "Nova fase" });
    const endDayInput = phaseDialog.getByLabel("Termina no dia");
    await expect(endDayInput).toHaveAttribute("max", "28");
    await endDayInput.evaluate((element) => element.removeAttribute("max"));
    await phaseDialog.getByLabel("Nome da fase").fill("Fora do mês");
    await phaseDialog.getByLabel("Começa no dia").fill("1");
    await endDayInput.fill("29");
    await phaseDialog.getByRole("button", { name: "Criar fase" }).click();
    await expect(phaseDialog.getByRole("alert")).toHaveText(
        "As datas da fase devem estar dentro do mês selecionado.",
    );
    await phaseDialog.getByRole("button", { name: "Fechar" }).click();

    await page.getByRole("button", { name: "Criar fase" }).click();
    phaseDialog = page.getByRole("dialog", { name: "Nova fase" });
    await phaseDialog.getByLabel("Nome da fase").fill("Primeira metade");
    await phaseDialog.getByLabel("Começa no dia").fill("1");
    await phaseDialog.getByLabel("Termina no dia").fill("14");
    await phaseDialog.getByRole("button", { name: "Criar fase" }).click();
    await expect(phaseDialog).not.toBeVisible();

    await page.getByRole("button", { name: "Criar fase" }).click();
    phaseDialog = page.getByRole("dialog", { name: "Nova fase" });
    await phaseDialog.getByLabel("Nome da fase").fill("Sobreposta");
    await phaseDialog.getByLabel("Começa no dia").fill("10");
    await phaseDialog.getByLabel("Termina no dia").fill("20");
    await phaseDialog.getByRole("button", { name: "Criar fase" }).click();
    await expect(phaseDialog.getByRole("alert")).toHaveText(
        "As datas da fase não podem se sobrepor a outra fase.",
    );
    await phaseDialog.getByRole("button", { name: "Fechar" }).click();

    await page.getByRole("button", { name: "Criar fase" }).click();
    phaseDialog = page.getByRole("dialog", { name: "Nova fase" });
    await phaseDialog.getByLabel("Nome da fase").fill("Segunda metade");
    await phaseDialog.getByLabel("Começa no dia").fill("15");
    await phaseDialog.getByLabel("Termina no dia").fill("28");
    await phaseDialog.getByRole("button", { name: "Criar fase" }).click();

    await expect(phaseDialog).not.toBeVisible();
    await expect(page.getByRole("main").getByRole("button", { name: "Criar fase" })).toBeDisabled();
});
