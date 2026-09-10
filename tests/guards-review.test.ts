import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, expect, it } from "vite-plus/test";

const root = process.cwd();
const runner = join(root, "scripts/guards/run.mjs");
const coverageRunner = join(root, "scripts/guards/check-coverage-regression.mjs");
const directories: string[] = [];
const fixtureEnvironment = { ...process.env };
for (const variable of [
    "GIT_ALTERNATE_OBJECT_DIRECTORIES",
    "GIT_COMMON_DIR",
    "GIT_DIR",
    "GIT_INDEX_FILE",
    "GIT_OBJECT_DIRECTORY",
    "GIT_WORK_TREE",
])
    delete fixtureEnvironment[variable];

function repository(files: Record<string, string>) {
    const directory = mkdtempSync(join(tmpdir(), "gfinancias-review-"));
    directories.push(directory);
    const git = (...args: string[]) =>
        execFileSync("git", args, { cwd: directory, encoding: "utf8", env: fixtureEnvironment });
    git("init", "-q");
    git("config", "user.email", "test@example.com");
    git("config", "user.name", "Review Test");
    for (const [path, content] of Object.entries(files)) {
        mkdirSync(dirname(join(directory, path)), { recursive: true });
        writeFileSync(join(directory, path), content);
    }
    git("add", ".");
    git("commit", "-qm", "Initial fixture");
    return {
        directory,
        git,
        stage(path: string, content: string) {
            mkdirSync(dirname(join(directory, path)), { recursive: true });
            writeFileSync(join(directory, path), content);
            git("add", path);
        },
    };
}

function guard(directory: string, checks: string) {
    const result = spawnSync(
        process.execPath,
        [runner, "--staged", "--format", "json", "--checks", checks],
        { cwd: directory, encoding: "utf8", env: fixtureEnvironment },
    );
    return { result, report: JSON.parse(result.stdout) };
}

afterEach(() => {
    for (const directory of directories.splice(0))
        rmSync(directory, { recursive: true, force: true });
});

it("uses the local main branch and integrates full coverage comparison into CI", () => {
    const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    expect(packageJson.scripts["guard:complexity"]).toContain("--base main");
    expect(packageJson.scripts["guard:contracts"]).toContain("--base main");
    expect(packageJson.scripts["guard:coverage:policy"]).toContain("--base main");
    expect(packageJson.scripts["guard:coverage:full"]).toContain("check-coverage-workflow.mjs");
    expect(packageJson.scripts["test:coverage:backend"]).toContain("--hookTimeout=30000");
    expect(JSON.stringify(packageJson.scripts)).not.toContain("origin/main");

    const workflow = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
    expect(workflow).toContain("fetch-depth: 0");
    expect(workflow).toContain("npm run guard:coverage:full");
    expect(
        readFileSync(join(root, "scripts/guards/check-coverage-workflow.mjs"), "utf8"),
    ).toContain("ensureBackendHookTimeout");
    expect(
        readFileSync(join(root, "scripts/guards/check-coverage-workflow.mjs"), "utf8"),
    ).toContain("routerTestPath");
    expect(readFileSync(join(root, "packages/api/src/routers/cards.test.ts"), "utf8")).toContain(
        "}, 30_000);",
    );
});

it("rejects removed thresholds and Vite coverage includes", () => {
    const fixture = repository({
        "package.json": JSON.stringify({
            scripts: {
                coverage:
                    "vp test --coverage --coverage.thresholds.lines=80 --coverage.include=src/**/*.ts",
            },
        }),
        "vite.config.ts": [
            "export default { test: { coverage: {",
            'include: ["apps/**/*.ts", "packages/**/*.ts"],',
            "thresholds: { lines: 80, branches: 70 },",
            "} } };",
            "",
        ].join("\n"),
    });
    fixture.stage("package.json", JSON.stringify({ scripts: { coverage: "vp test --coverage" } }));
    fixture.stage(
        "vite.config.ts",
        'export default { test: { coverage: { include: ["apps/**/*.ts"], thresholds: { lines: 80 } } } };\n',
    );

    const { result, report } = guard(fixture.directory, "coverage-policy");

    expect(result.status).toBe(1);
    expect(report.violations).toEqual(
        expect.arrayContaining([
            expect.objectContaining({ rule: "coverage/threshold-removed" }),
            expect.objectContaining({ evidence: "packages/**/*.ts" }),
        ]),
    );
});

it("does not count deleted tests or stories as companions", () => {
    const fixture = repository({
        "apps/server/src/health.test.ts": "export const tested = true;\n",
        "apps/server/src/health.ts": "export const health = false;\n",
        "packages/ui/stories/banner.stories.ts": "export default {};\n",
    });
    fixture.stage("apps/server/src/health.ts", "export const health = true;\n");
    fixture.stage("packages/ui/src/components/banner.tsx", "export const Banner = () => null;\n");
    fixture.git("rm", "apps/server/src/health.test.ts");
    fixture.git("rm", "packages/ui/stories/banner.stories.ts");

    const { result, report } = guard(fixture.directory, "test-companion");

    expect(result.status).toBe(1);
    expect(report.violations).toEqual(
        expect.arrayContaining([
            expect.objectContaining({ path: "apps/server/src/health.ts" }),
            expect.objectContaining({ rule: "storybook/story-required" }),
        ]),
    );
});

it("materializes Zod omit and pick operations", () => {
    const fixture = repository({
        "packages/api/src/budgets/contracts.ts": [
            'import { z } from "zod";',
            "const fields = z.object({ id: z.string(), amount: z.number(), title: z.string() });",
            "export const budgetSchema = fields;",
            "",
        ].join("\n"),
    });
    fixture.stage(
        "packages/api/src/budgets/contracts.ts",
        [
            'import { z } from "zod";',
            "const fields = z.object({ id: z.string(), amount: z.number(), title: z.string() });",
            "export const budgetSchema = fields.omit({ amount: true }).pick({ id: true });",
            "",
        ].join("\n"),
    );

    const { result, report } = guard(fixture.directory, "contract-regression");

    expect(result.status).toBe(1);
    expect(report.violations.map((item: { evidence: string }) => item.evidence)).toEqual(
        expect.arrayContaining(["budgetSchema.amount", "budgetSchema.title"]),
    );
});

it("checks every new function against complexity limits", () => {
    const decisions = (count: number) =>
        Array.from(
            { length: count },
            (_, index) => `if (value === ${index}) return ${index};`,
        ).join("\n");
    const fixture = repository({
        "apps/web/src/features/example/logic.ts": `export function legacy(value: number) {\n${decisions(25)}\nreturn value;\n}\n`,
    });
    fixture.stage(
        "apps/web/src/features/example/logic.ts",
        [
            `export function legacy(value: number) {\n${decisions(25)}\nreturn value;\n}`,
            `export function added(value: number) {\n${decisions(21)}\nreturn value;\n}`,
            "",
        ].join("\n"),
    );

    const { result, report } = guard(fixture.directory, "complexity");

    expect(result.status).toBe(1);
    expect(report.violations).toContainEqual(
        expect.objectContaining({ evidence: expect.stringContaining("function added") }),
    );
});

it("detects chained focused and disabled test variants", () => {
    const fixture = repository({ "tests/example.test.ts": "export const value = true;\n" });
    fixture.stage(
        "tests/example.test.ts",
        [
            'test.concurrent.only("focused", () => {});',
            'it.each([1]).skip("disabled", () => {});',
            'describe.each([1]).todo("todo", () => {});',
            "",
        ].join("\n"),
    );

    const { result, report } = guard(fixture.directory, "test-hygiene");

    expect(result.status).toBe(1);
    expect(report.violations).toHaveLength(3);
});

it("checks dynamic imports, require, import-equals, and reexports", () => {
    const fixture = repository({ "package.json": '{"type":"module"}\n' });
    fixture.stage(
        "apps/web/src/features/example/dynamic.ts",
        [
            'export { db } from "@gfinancias/db";',
            'export const dynamicDb = import("@gfinancias/db");',
            'export const requiredDb = require("@gfinancias/db");',
            "",
        ].join("\n"),
    );
    fixture.stage(
        "apps/web/src/features/example/import-equals.ts",
        'import database = require("@gfinancias/db");\nexport { database };\n',
    );

    const { result, report } = guard(fixture.directory, "architecture");

    expect(result.status).toBe(1);
    expect(
        report.violations.filter(
            (item: { rule: string }) => item.rule === "architecture/web-no-database",
        ),
    ).toHaveLength(4);
});

it("allows non-financial parsing and number formatting", () => {
    const fixture = repository({
        "apps/web/src/features/theme/display.ts": "export const initial = true;\n",
    });
    fixture.stage(
        "apps/web/src/features/theme/display.ts",
        [
            'export const opacity = parseFloat("0.5");',
            'export const percent = new Intl.NumberFormat("pt-BR", { style: "percent" });',
            "",
        ].join("\n"),
    );

    const { result, report } = guard(fixture.directory, "financial-conventions");

    expect(result.status).toBe(0);
    expect(report.violations).toEqual([]);
});

it("still rejects monetary parsing and local currency formatting", () => {
    const fixture = repository({
        "apps/web/src/features/cards/money.ts": "export const initial = true;\n",
    });
    fixture.stage(
        "apps/web/src/features/cards/money.ts",
        [
            "export const amount = parseFloat(amountText);",
            'export const money = new Intl.NumberFormat("pt-BR", { style: "currency" });',
            "",
        ].join("\n"),
    );

    const { result, report } = guard(fixture.directory, "financial-conventions");

    expect(result.status).toBe(1);
    expect(report.violations).toHaveLength(2);
});

it("counts files with a final newline at the exact limit", () => {
    const fixture = repository({
        "apps/web/src/features/example/large.ts": "export const value = 1;\n",
    });
    fixture.stage("apps/web/src/features/example/large.ts", `${"export {};\n".repeat(400)}`);
    expect(guard(fixture.directory, "complexity").result.status).toBe(0);
    fixture.stage("apps/web/src/features/example/large.ts", `${"export {};\n".repeat(401)}`);
    expect(guard(fixture.directory, "complexity").result.status).toBe(1);
});

it("rejects unknown coverage report formats", () => {
    const directory = mkdtempSync(join(tmpdir(), "gfinancias-coverage-format-"));
    directories.push(directory);
    const summary = join(directory, "summary.json");
    writeFileSync(
        summary,
        JSON.stringify({
            total: Object.fromEntries(
                ["branches", "functions", "lines", "statements"].map((metric) => [
                    metric,
                    { pct: 90 },
                ]),
            ),
        }),
    );
    const result = spawnSync(
        process.execPath,
        [coverageRunner, "--base-summary", summary, "--head-summary", summary, "--format", "xml"],
        { encoding: "utf8" },
    );

    expect(result.status).toBe(2);
    expect(JSON.parse(result.stdout).executionErrors[0]).toContain("Unsupported format");
});
