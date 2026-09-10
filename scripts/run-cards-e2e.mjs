import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

if (process.env.E2E_DATABASE_URL) {
    console.error(
        "E2E_DATABASE_URL was supplied. Use npm run test:e2e to keep control of that database.",
    );
    process.exitCode = 1;
} else {
    const directory = await mkdtemp(join(tmpdir(), "gfinancias-cards-e2e-"));
    const databaseUrl = `file:${join(directory, "cards.db")}`;
    const env = { ...process.env, DATABASE_URL: databaseUrl, E2E_DATABASE_URL: databaseUrl };
    let activeChild;
    let interrupted = false;
    const interrupt = (signal) => {
        interrupted = true;
        if (activeChild?.pid) {
            if (process.platform === "win32") activeChild.kill(signal);
            else process.kill(-activeChild.pid, signal);
        }
    };
    const onInterrupt = () => interrupt("SIGINT");
    const onTerminate = () => interrupt("SIGTERM");
    process.on("SIGINT", onInterrupt);
    process.on("SIGTERM", onTerminate);
    const run = (command, args) =>
        new Promise((resolve, reject) => {
            if (interrupted) {
                resolve(130);
                return;
            }
            const child = spawn(command, args, {
                detached: process.platform !== "win32",
                env,
                stdio: "inherit",
                shell: process.platform === "win32",
            });
            activeChild = child;
            child.once("error", reject);
            child.once("close", (code, signal) => {
                activeChild = undefined;
                resolve(code ?? (signal ? 130 : 1));
            });
        });
    try {
        const migrationCode = await run("npm", ["run", "db:migrate:deploy"]);
        process.exitCode = migrationCode;
        if (migrationCode === 0) {
            process.exitCode = await run("npx", [
                "playwright",
                "test",
                "tests/e2e/cards.spec.ts",
                "tests/e2e/cards-responsive.spec.ts",
            ]);
        }
    } catch (error) {
        console.error(error);
        process.exitCode = 1;
    } finally {
        process.off("SIGINT", onInterrupt);
        process.off("SIGTERM", onTerminate);
        await rm(directory, { recursive: true, force: true });
    }
}
