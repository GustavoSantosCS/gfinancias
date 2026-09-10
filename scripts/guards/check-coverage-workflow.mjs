#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
    copyFileSync,
    existsSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderReport, violation } from "./core.mjs";

const argumentsList = process.argv.slice(2);
const value = (name, fallback) => {
    const index = argumentsList.lastIndexOf(name);
    return index >= 0 ? argumentsList[index + 1] : fallback;
};
const base = value("--base", "main");
const format = value("--format", "human");
const supportedFormats = new Set(["human", "json", "github"]);
const root = process.cwd();
const temporaryRoot = mkdtempSync(join(tmpdir(), "gfinancias-coverage-comparison-"));
const baseWorktree = join(temporaryRoot, "base");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
let worktreeCreated = false;

function run(command, args, cwd, output = "inherit") {
    const result = spawnSync(command, args, {
        cwd,
        stdio: output,
        encoding: output === "pipe" ? "utf8" : undefined,
        env: {
            ...process.env,
            CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:3001",
            DATABASE_URL: process.env.DATABASE_URL ?? `file:${join(temporaryRoot, "coverage.db")}`,
            NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000",
        },
    });
    if (result.error || result.status !== 0)
        throw new Error(
            `${command} ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}.`,
        );
}

function ensureBackendHookTimeout(directory) {
    const packagePath = join(directory, "package.json");
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
    const command = packageJson.scripts?.["test:coverage:backend"];
    if (typeof command !== "string") throw new Error("Missing backend coverage script.");
    if (!command.includes("--hookTimeout=30000")) {
        packageJson.scripts["test:coverage:backend"] = command.replace(
            "vp test run ",
            "vp test run --hookTimeout=30000 ",
        );
        writeFileSync(packagePath, JSON.stringify(packageJson, null, 4) + "\n");
    }
}

function summaryPath(directory, area) {
    const separated = join(directory, "coverage", area, "coverage-summary.json");
    const legacy = join(directory, "coverage", "coverage-summary.json");
    if (existsSync(separated)) return separated;
    if (existsSync(legacy)) return legacy;
    throw new Error(`Coverage summary was not generated for ${area} in ${directory}.`);
}

try {
    if (!supportedFormats.has(format)) throw new Error(`Unsupported format: ${format}`);
    run("git", ["worktree", "add", "--detach", baseWorktree, base], root);
    worktreeCreated = true;
    run(npm, ["ci"], baseWorktree);
    ensureBackendHookTimeout(baseWorktree);

    for (const area of ["frontend", "backend"]) {
        const argumentsForArea = ["run", `test:coverage:${area}`];
        run(npm, argumentsForArea, baseWorktree);
        copyFileSync(summaryPath(baseWorktree, area), join(temporaryRoot, `base-${area}.json`));
    }
    for (const area of ["frontend", "backend"]) run(npm, ["run", `test:coverage:${area}`], root);

    const violations = [];
    for (const area of ["frontend", "backend"]) {
        const baseSummary = JSON.parse(
            readFileSync(join(temporaryRoot, `base-${area}.json`), "utf8"),
        );
        const headSummary = JSON.parse(readFileSync(summaryPath(root, area), "utf8"));
        for (const metric of ["statements", "branches", "functions", "lines"]) {
            const previous = baseSummary.total?.[metric]?.pct;
            const current = headSummary.total?.[metric]?.pct;
            if (typeof previous !== "number" || typeof current !== "number")
                throw new Error(`Missing ${area} coverage metric: ${metric}.`);
            if (current < previous)
                violations.push(
                    violation({
                        rule: "coverage/no-regression",
                        path: summaryPath(root, area),
                        message: `${area} ${metric} coverage decreased: ${previous}% -> ${current}%.`,
                        evidence: `${area}.${metric}: ${current}%`,
                        expected: `Keep ${area} ${metric} coverage at or above ${previous}%.`,
                    }),
                );
        }
    }
    const report = {
        passed: violations.length === 0,
        scope: "coverage-workflow",
        checks: ["frontend-coverage-regression", "backend-coverage-regression"],
        violations,
        executionErrors: [],
    };
    process.stdout.write(renderReport(report, format));
    process.exitCode = report.passed ? 0 : 1;
} catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
} finally {
    if (worktreeCreated)
        spawnSync("git", ["worktree", "remove", "--force", baseWorktree], {
            cwd: root,
            stdio: "ignore",
        });
    rmSync(temporaryRoot, { recursive: true, force: true });
}
