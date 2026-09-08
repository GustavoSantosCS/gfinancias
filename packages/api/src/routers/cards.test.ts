import { execFileSync } from "node:child_process";

import db from "@gfinancias/db";
import { beforeAll, beforeEach, describe, expect, it } from "vite-plus/test";

import { appRouter } from "./index";

const caller = appRouter.createCaller({
    auth: null,
    db,
    session: null,
});

beforeAll(() => {
    execFileSync("../../node_modules/.bin/prisma", ["migrate", "deploy"], {
        cwd: "packages/db",
        env: process.env,
        stdio: "pipe",
    });
});

beforeEach(async () => {
    await db.cardInstallment.deleteMany();
    await db.cardAnticipation.deleteMany();
    await db.cardPurchase.deleteMany();
    await db.card.deleteMany();
});

describe("cards router", () => {
    it("creates a card and returns it as active", async () => {
        const card = await caller.cards.create({
            brand: "VISA",
            closingDay: 5,
            color: "#0f766e",
            dueDay: 12,
            lastDigits: "1234",
            limit: 500_000,
            name: "Main card",
        });

        expect(card).toMatchObject({
            brand: "VISA",
            closingDay: 5,
            color: "#0f766e",
            dueDay: 12,
            lastDigits: "1234",
            limit: 500_000,
            name: "Main card",
            status: "ACTIVE",
        });

        await expect(
            caller.cards.create({ color: "#ffffff", name: "  main   CARD " }),
        ).rejects.toMatchObject({ message: "Nome já em uso!" });
    });

    it("creates all installments in the focused month sequence and preserves cents", async () => {
        const card = await caller.cards.create({ color: "#0f766e", name: "Travel" });

        const purchase = await caller.cards.createPurchase({
            amount: 10_001,
            cardId: card.id,
            description: "Flight",
            focusMonth: 11,
            focusYear: 2028,
            installments: 3,
            purchaseDate: "2028-11-03",
            remainderInstallment: 3,
        });

        expect(purchase.entries).toEqual([
            expect.objectContaining({
                amount: 3333,
                competenceMonth: 11,
                competenceYear: 2028,
                number: 1,
                total: 3,
            }),
            expect.objectContaining({
                amount: 3333,
                competenceMonth: 12,
                competenceYear: 2028,
                number: 2,
                total: 3,
            }),
            expect.objectContaining({
                amount: 3335,
                competenceMonth: 1,
                competenceYear: 2029,
                number: 3,
                total: 3,
            }),
        ]);

        const month = await caller.cards.listPurchases({ month: 12, year: 2028 });
        expect(month).toHaveLength(1);
        expect(month[0]).toMatchObject({ description: "Flight", number: 2, total: 3 });
    });
    it("replaces selected consecutive later installments with an anticipation", async () => {
        const card = await caller.cards.create({ color: "#312e81", name: "Installments" });
        const purchase = await caller.cards.createPurchase({
            amount: 30_000,
            cardId: card.id,
            description: "Notebook",
            focusMonth: 1,
            focusYear: 2028,
            installments: 3,
            purchaseDate: "2028-01-01",
            remainderInstallment: 1,
        });

        const anticipation = await caller.cards.anticipate({
            date: "2028-01-15",
            focusMonth: 1,
            focusYear: 2028,
            mode: "GROUPED",
            purchaseId: purchase.id,
            selectedNumbers: [2, 3],
            values: [9_000],
        });

        expect(anticipation.entries).toHaveLength(1);
        expect(anticipation.entries[0]).toMatchObject({
            amount: 9_000,
            competenceMonth: 1,
            competenceYear: 2028,
            kind: "ANTICIPATION",
        });
        expect(await db.cardInstallment.count({ where: { purchaseId: purchase.id } })).toBe(2);
        await expect(
            caller.cards.anticipate({
                date: "2028-01-15",
                focusMonth: 1,
                focusYear: 2028,
                mode: "GROUPED",
                purchaseId: purchase.id,
                selectedNumbers: [1],
                values: [10_000],
            }),
        ).rejects.toMatchObject({ message: "A primeira parcela não pode ser antecipada." });
    });

    it("archives, restores and cascades card deletion without accepting archived purchases", async () => {
        const card = await caller.cards.create({ color: "#9333ea", name: "Archive" });
        const purchase = await caller.cards.createPurchase({
            amount: 12_000,
            cardId: card.id,
            description: "Subscription",
            focusMonth: 4,
            focusYear: 2028,
            installments: 1,
            purchaseDate: "2028-04-03",
            remainderInstallment: 1,
        });

        await caller.cards.archive({ id: card.id });
        expect(await caller.cards.list({ includeArchived: false })).toEqual([]);
        expect(await caller.cards.list({ includeArchived: true })).toEqual([
            expect.objectContaining({ id: card.id, status: "ARCHIVED" }),
        ]);
        await expect(
            caller.cards.createPurchase({
                amount: 1_000,
                cardId: card.id,
                description: "Blocked",
                focusMonth: 4,
                focusYear: 2028,
                installments: 1,
                purchaseDate: "2028-04-03",
                remainderInstallment: 1,
            }),
        ).rejects.toMatchObject({ message: "Cartões arquivados não podem receber compras." });

        await caller.cards.restore({ id: card.id });
        await caller.cards.delete({ id: card.id });
        expect(await db.cardPurchase.count({ where: { id: purchase.id } })).toBe(0);
        expect(await db.cardInstallment.count()).toBe(0);
    });

    it("regenerates an editable purchase and locks it after anticipation", async () => {
        const card = await caller.cards.create({ color: "#2563eb", name: "Editable" });
        const purchase = await caller.cards.createPurchase({
            amount: 20_000,
            cardId: card.id,
            description: "Phone",
            focusMonth: 6,
            focusYear: 2028,
            installments: 2,
            purchaseDate: "2028-06-01",
            remainderInstallment: 2,
        });
        const edited = await caller.cards.updatePurchase({
            amount: 30_000,
            focusMonth: 7,
            focusYear: 2028,
            id: purchase.id,
            installments: 3,
            remainderInstallment: 3,
        });
        expect(edited.entries).toEqual([
            expect.objectContaining({ amount: 10_000, competenceMonth: 7, number: 1, total: 3 }),
            expect.objectContaining({ amount: 10_000, competenceMonth: 8, number: 2, total: 3 }),
            expect.objectContaining({ amount: 10_000, competenceMonth: 9, number: 3, total: 3 }),
        ]);

        await caller.cards.anticipate({
            date: "2028-07-02",
            focusMonth: 7,
            focusYear: 2028,
            mode: "GROUPED",
            purchaseId: purchase.id,
            selectedNumbers: [2],
            values: [9_000],
        });
        await expect(
            caller.cards.updatePurchase({ description: "Locked", id: purchase.id }),
        ).rejects.toMatchObject({ message: "Compras com antecipação não podem ser editadas." });
    });

    it("updates active cards and rejects editing archived cards", async () => {
        const card = await caller.cards.create({ color: "#111111", name: "Original" });
        const updated = await caller.cards.update({
            color: "#222222",
            id: card.id,
            name: " Updated card ",
        });
        expect(updated).toMatchObject({ color: "#222222", name: "Updated card" });

        await caller.cards.archive({ id: card.id });
        await expect(caller.cards.update({ id: card.id, name: "Blocked" })).rejects.toMatchObject({
            message: "Cartões arquivados não podem ser editados.",
        });
    });

    it("supports filtered monthly entries and separate anticipations", async () => {
        const first = await caller.cards.create({ color: "#115e59", name: "First" });
        const second = await caller.cards.create({ color: "#7c2d12", name: "Second" });
        const purchase = await caller.cards.createPurchase({
            amount: 12_000,
            cardId: first.id,
            description: "Market",
            focusMonth: 10,
            focusYear: 2028,
            installments: 3,
            purchaseDate: "2028-10-02",
            remainderInstallment: 3,
        });
        await caller.cards.createPurchase({
            amount: 1_000,
            cardId: second.id,
            description: "Taxi",
            focusMonth: 10,
            focusYear: 2028,
            installments: 1,
            purchaseDate: "2028-10-03",
            remainderInstallment: 1,
        });

        expect(
            await caller.cards.listPurchases({
                cardId: first.id,
                description: "Mark",
                month: 10,
                status: "ACTIVE",
                year: 2028,
            }),
        ).toHaveLength(1);

        const anticipation = await caller.cards.anticipate({
            date: "2028-10-03",
            focusMonth: 10,
            focusYear: 2028,
            mode: "SEPARATE",
            purchaseId: purchase.id,
            selectedNumbers: [2, 3],
            values: [3_500, 3_000],
        });
        expect(anticipation.entries).toEqual([
            expect.objectContaining({ amount: 3_500, kind: "ANTICIPATION", number: 2 }),
            expect.objectContaining({ amount: 3_000, kind: "ANTICIPATION", number: 3 }),
        ]);

        await expect(
            caller.cards.anticipate({
                date: "2028-10-03",
                focusMonth: 10,
                focusYear: 2028,
                mode: "GROUPED",
                purchaseId: purchase.id,
                selectedNumbers: [2, 3],
                values: [6_000],
            }),
        ).rejects.toMatchObject({ message: "Uma ou mais parcelas não estão disponíveis." });
    });

    it("rejects nonconsecutive anticipation selections", async () => {
        const card = await caller.cards.create({ color: "#64748b", name: "Rules" });
        const purchase = await caller.cards.createPurchase({
            amount: 40_000,
            cardId: card.id,
            description: "Rules",
            focusMonth: 1,
            focusYear: 2028,
            installments: 4,
            purchaseDate: "2028-01-01",
            remainderInstallment: 4,
        });
        await expect(
            caller.cards.anticipate({
                date: "2028-01-02",
                focusMonth: 1,
                focusYear: 2028,
                mode: "GROUPED",
                purchaseId: purchase.id,
                selectedNumbers: [2, 4],
                values: [20_000],
            }),
        ).rejects.toMatchObject({ message: "As parcelas devem ser consecutivas." });
    });
});
