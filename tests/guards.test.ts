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
delete fixtureEnvironment.ALLOW_MARKDOWN_COMMIT;

it("exposes fast, complete, and focused npm commands", () => {
    const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    expect(packageJson.scripts).toEqual(
        expect.objectContaining({
            guard: expect.stringContaining("scripts/guards/run.mjs"),
            "guard:all": expect.stringContaining("--all"),
            "guard:architecture": expect.stringContaining("--checks architecture"),
            "guard:coverage": expect.stringContaining("check-coverage-regression.mjs"),
            "guard:staged": expect.stringContaining("--staged"),
            "test:coverage:backend": expect.stringContaining("coverage/backend"),
            "test:coverage:frontend": expect.stringContaining("coverage/frontend"),
        }),
    );
});

function createRepository(files: Record<string, string>) {
    const directory = mkdtempSync(join(tmpdir(), "gfinancias-guards-"));
    directories.push(directory);
    const git = (...args: string[]) =>
        execFileSync("git", args, { cwd: directory, encoding: "utf8", env: fixtureEnvironment });
    git("init", "-q");
    git("config", "user.email", "test@example.com");
    git("config", "user.name", "Guard Test");
    for (const [path, source] of Object.entries(files)) {
        mkdirSync(dirname(join(directory, path)), { recursive: true });
        writeFileSync(join(directory, path), source);
    }
    git("add", ".");
    git("commit", "-qm", "Initial fixture");
    return {
        directory,
        git,
        stage(path: string, source: string) {
            mkdirSync(dirname(join(directory, path)), { recursive: true });
            writeFileSync(join(directory, path), source);
            git("add", path);
        },
    };
}

function runGuard(directory: string, ...args: string[]) {
    return spawnSync(process.execPath, [runner, ...args], {
        cwd: directory,
        encoding: "utf8",
        env: fixtureEnvironment,
    });
}

afterEach(() => {
    for (const directory of directories.splice(0))
        rmSync(directory, { recursive: true, force: true });
});

it("reports actionable staged diagnostics as JSON", () => {
    const fixture = createRepository({
        "apps/web/src/features/cards/value.ts": "export const value = 1;\n",
    });
    fixture.stage(
        "apps/web/src/features/cards/value.ts",
        [
            'import { db } from "@gfinancias/db";',
            "export const parse = (value: any) => parseFloat(value);",
            'new Intl.NumberFormat("pt-BR", { style: "currency" });',
            'new Date("2028-09-01");',
            'test.only("focused", () => {});',
            "",
        ].join("\n"),
    );

    const result = runGuard(
        fixture.directory,
        "--staged",
        "--format",
        "json",
        "--checks",
        "explicit-any,architecture,test-hygiene,financial-conventions",
    );

    expect(result.status).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report.executionErrors).toEqual([]);
    expect(report.violations.map((item: { rule: string }) => item.rule)).toEqual(
        expect.arrayContaining([
            "typescript/no-explicit-any",
            "architecture/web-no-database",
            "tests/no-focused-tests",
            "finance/no-parse-float",
            "finance/shared-money-format",
            "dates/no-string-date-constructor",
        ]),
    );
    expect(report.violations[0]).toEqual(
        expect.objectContaining({
            column: expect.any(Number),
            evidence: expect.any(String),
            expected: expect.any(String),
            line: expect.any(Number),
            path: "apps/web/src/features/cards/value.ts",
        }),
    );
});

it("includes untracked files when comparing the working tree with a base", () => {
    const fixture = createRepository({ "package.json": '{"type":"module"}\n' });
    mkdirSync(join(fixture.directory, "apps/web/src/features/new-feature"), { recursive: true });
    writeFileSync(
        join(fixture.directory, "apps/web/src/features/new-feature/value.ts"),
        "export const value: any = 1;\n",
    );

    const result = runGuard(
        fixture.directory,
        "--base",
        "HEAD",
        "--format",
        "json",
        "--checks",
        "explicit-any",
    );

    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout).violations).toContainEqual(
        expect.objectContaining({
            path: "apps/web/src/features/new-feature/value.ts",
            rule: "typescript/no-explicit-any",
        }),
    );
});

it("ignores generated TypeScript sources", () => {
    const fixture = createRepository({ "package.json": '{"type":"module"}\n' });
    fixture.stage("packages/db/prisma/generated/client.ts", "export type Generated = any;\n");

    const result = runGuard(
        fixture.directory,
        "--staged",
        "--format",
        "json",
        "--checks",
        "explicit-any",
    );

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).violations).toEqual([]);
});

it("does not confuse matcher methods with explicit any types", () => {
    const fixture = createRepository({
        "packages/api/src/example.test.ts": "expect.any(String);\n",
    });
    fixture.stage(
        "packages/api/src/example.test.ts",
        "expect.any(String);\nconst value: unknown = 1;\n",
    );

    const result = runGuard(
        fixture.directory,
        "--staged",
        "--format",
        "json",
        "--checks",
        "explicit-any",
    );

    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout).violations).toEqual([]);
});

it("ignores test-control text inside strings and comments", () => {
    const fixture = createRepository({ "tests/example.test.ts": "export const value = 1;\n" });
    fixture.stage(
        "tests/example.test.ts",
        [
            "const example = 'test.only(\"example\", () => {})';",
            "// describe.skip('documented example', () => {});",
            "export const value = example;",
            "",
        ].join("\n"),
    );

    const result = runGuard(
        fixture.directory,
        "--staged",
        "--format",
        "json",
        "--checks",
        "test-hygiene",
    );

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).violations).toEqual([]);
});

it("requires tests and explicit markdown authorization", () => {
    const fixture = createRepository({ "package.json": '{"type":"module"}\n' });
    fixture.stage(
        "packages/api/src/budgets/application/create-budget.ts",
        "export function createBudget() { return 1; }\n",
    );
    fixture.stage("notes.md", "# Notes\n");

    const result = runGuard(
        fixture.directory,
        "--staged",
        "--format",
        "json",
        "--checks",
        "test-companion,markdown-authorization",
    );

    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout).violations.map((item: { rule: string }) => item.rule)).toEqual(
        expect.arrayContaining(["tests/companion-required", "repository/markdown-authorization"]),
    );
});

it("detects removed router procedures and complexity growth against the base", () => {
    const lines = Array.from({ length: 130 }, (_, index) =>
        index < 22 ? `    if (input === ${index}) total += ${index};` : `    total += ${index};`,
    ).join("\n");
    const fixture = createRepository({
        "packages/api/src/routers/budgets.ts": [
            'import { router } from "../index";',
            "export const budgetsRouter = router({ list: {}, create: {} });",
            "",
        ].join("\n"),
        "apps/web/src/features/budgets/large.ts": "export function calculate() { return 1; }\n",
    });
    fixture.stage(
        "packages/api/src/routers/budgets.ts",
        'import { router } from "../index";\nexport const budgetsRouter = router({ list: {} });\n',
    );
    fixture.stage(
        "apps/web/src/features/budgets/large.ts",
        `export function calculate(input = 0) {\n    let total = 0;\n${lines}\n    return total;\n}\n`,
    );

    const result = runGuard(
        fixture.directory,
        "--staged",
        "--format",
        "json",
        "--checks",
        "contract-regression,complexity",
    );

    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout).violations.map((item: { rule: string }) => item.rule)).toEqual(
        expect.arrayContaining([
            "contracts/router-procedure-removed",
            "complexity/function-growth",
            "complexity/cyclomatic-growth",
        ]),
    );
});

it("compares coverage summaries and explains each regression", () => {
    const directory = mkdtempSync(join(tmpdir(), "gfinancias-coverage-"));
    directories.push(directory);
    const base = join(directory, "base.json");
    const head = join(directory, "head.json");
    const summary = (lines: number) => ({
        total: {
            branches: { pct: 90 },
            functions: { pct: 90 },
            lines: { pct: lines },
            statements: { pct: 90 },
        },
    });
    writeFileSync(base, JSON.stringify(summary(90)));
    writeFileSync(head, JSON.stringify(summary(88)));

    const result = spawnSync(
        process.execPath,
        [coverageRunner, "--base-summary", base, "--head-summary", head, "--format", "json"],
        { encoding: "utf8" },
    );

    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout).violations).toContainEqual(
        expect.objectContaining({
            rule: "coverage/no-regression",
            message: expect.stringContaining("90% -> 88%"),
        }),
    );
});

it("reports backend boundaries once and requires server integration tests", () => {
    const fixture = createRepository({ "package.json": '{"type":"module"}\n' });
    fixture.stage(
        "packages/api/src/budgets/domain/policy.ts",
        'import { db } from "@gfinancias/db";\nexport const value = db;\n',
    );
    fixture.stage(
        "packages/api/src/routers/budgets.ts",
        "export const list = ({ ctx }: any) => ctx.db.budget.findMany();\n",
    );
    fixture.stage("apps/server/src/health.ts", "export const health = () => true;\n");

    const result = runGuard(
        fixture.directory,
        "--staged",
        "--format",
        "json",
        "--checks",
        "architecture,test-companion",
    );

    expect(result.status).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report.violations).toContainEqual(
        expect.objectContaining({ rule: "architecture/domain-boundary" }),
    );
    expect(
        report.violations.filter(
            (item: { rule: string }) => item.rule === "architecture/thin-router",
        ),
    ).toHaveLength(1);
    expect(report.violations).toContainEqual(
        expect.objectContaining({
            path: "apps/server/src/health.ts",
            rule: "tests/companion-required",
        }),
    );
});

it("resolves schema fields declared through local constants", () => {
    const fixture = createRepository({
        "packages/api/src/budgets/contracts.ts": [
            'import { z } from "zod";',
            "const fields = z.object({ id: z.string(), amount: z.number() });",
            "export const budgetSchema = validates(fields);",
            "",
        ].join("\n"),
    });
    fixture.stage(
        "packages/api/src/budgets/contracts.ts",
        [
            'import { z } from "zod";',
            "const fields = z.object({ id: z.string() });",
            "export const budgetSchema = validates(fields);",
            "",
        ].join("\n"),
    );

    const result = runGuard(
        fixture.directory,
        "--staged",
        "--format",
        "json",
        "--checks",
        "contract-regression",
    );

    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout).violations).toContainEqual(
        expect.objectContaining({
            evidence: "budgetSchema.amount",
            rule: "contracts/schema-field-removed",
        }),
    );
});

it("detects coverage policy and schema field regressions", () => {
    const fixture = createRepository({
        "package.json": JSON.stringify({
            scripts: {
                backend:
                    "vp test run --coverage --coverage.thresholds.lines=80 --coverage.include=src/**/*.ts",
                frontend: "vp test run --coverage --coverage.thresholds.lines=90",
            },
        }),
        "packages/api/src/budgets/contracts.ts":
            'import { z } from "zod";\nexport const budgetSchema = z.object({ id: z.string(), amount: z.number() }).refine(Boolean);\n',
    });
    fixture.stage(
        "package.json",
        JSON.stringify({
            scripts: {
                backend: "vp test run --coverage --coverage.thresholds.lines=70",
                frontend: "vp test run --coverage --coverage.thresholds.lines=90",
            },
        }),
    );
    fixture.stage(
        "packages/api/src/budgets/contracts.ts",
        'import { z } from "zod";\nexport const budgetSchema = z.object({ id: z.string() }).refine(Boolean);\n',
    );

    const result = runGuard(
        fixture.directory,
        "--staged",
        "--format",
        "json",
        "--checks",
        "coverage-policy,contract-regression",
    );

    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout).violations.map((item: { rule: string }) => item.rule)).toEqual(
        expect.arrayContaining([
            "coverage/threshold-reduced",
            "coverage/include-removed",
            "contracts/schema-field-removed",
        ]),
    );
});

it("does not treat existing Markdown as an unauthorized change during an audit", () => {
    const fixture = createRepository({ "README.md": "# Existing documentation\n" });
    const result = runGuard(
        fixture.directory,
        "--all",
        "--format",
        "json",
        "--checks",
        "markdown-authorization",
    );
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).violations).toEqual([]);
});

it("emits GitHub workflow annotations", () => {
    const fixture = createRepository({ "value.ts": "export const value = 1;\n" });
    fixture.stage("value.ts", "export const value: any = 1;\n");

    const result = runGuard(
        fixture.directory,
        "--staged",
        "--format",
        "github",
        "--checks",
        "explicit-any",
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("::error file=value.ts,line=1,col=21");
    expect(result.stdout).toContain("typescript/no-explicit-any");
});
