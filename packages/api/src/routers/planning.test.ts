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
    await db.plannedIncome.deleteMany();
    await db.plannedExpense.deleteMany();
    await db.planningPhase.deleteMany();
    await db.monthlyPlan.deleteMany();
});

describe("planning router", () => {
    it("creates an empty plan, then persists phase income and expense records", async () => {
        const plan = await caller.planning.get({ month: 2, year: 2028 });
        expect(plan.phases).toEqual([]);

        const phase = await caller.planning.createPhase({
            endDay: 15,
            month: 2,
            name: "First half",
            startDay: 1,
            year: 2028,
        });
        await caller.planning.createIncome({
            amount: 500_000,
            category: "SALARY",
            name: "Salary",
            phaseId: phase.id,
        });
        await caller.planning.createExpense({
            amount: 90_000,
            category: "FIXED",
            name: "Internet",
            phaseId: phase.id,
        });

        const saved = await caller.planning.get({ month: 2, year: 2028 });
        expect(saved.phases[0]).toMatchObject({
            endDay: 15,
            expenses: [{ amount: 90_000, category: "FIXED", name: "Internet" }],
            incomes: [{ amount: 500_000, category: "SALARY", name: "Salary" }],
            name: "First half",
            startDay: 1,
        });
    });

    it("rejects phases that overlap existing dates", async () => {
        await caller.planning.createPhase({
            endDay: 15,
            month: 2,
            name: "First half",
            startDay: 1,
            year: 2028,
        });

        await expect(
            caller.planning.createPhase({
                endDay: 20,
                month: 2,
                name: "Overlap",
                startDay: 10,
                year: 2028,
            }),
        ).rejects.toMatchObject({ message: "Phase dates cannot overlap" });
    });
});
