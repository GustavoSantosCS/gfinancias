import { execFileSync, spawnSync } from "node:child_process";
import {
    cpSync,
    mkdtempSync,
    mkdirSync,
    readFileSync,
    rmSync,
    symlinkSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vite-plus/test";
import config from "../vite.config";

const root = process.cwd();
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

function setup(source: string, expected = 42, guardedSource?: string) {
    const directory = mkdtempSync(join(tmpdir(), "gfinances-hook-"));
    directories.push(directory);
    const git = (...args: string[]) =>
        execFileSync("git", args, { cwd: directory, encoding: "utf8", env: fixtureEnvironment });
    git("init", "-q");
    git("config", "user.email", "test@example.com");
    git("config", "user.name", "Hook Test");
    git("config", "core.hooksPath", ".vite-hooks");
    symlinkSync(join(root, "node_modules"), join(directory, "node_modules"), "dir");
    mkdirSync(join(directory, ".vite-hooks"));
    writeFileSync(
        join(directory, ".vite-hooks/pre-commit"),
        readFileSync(join(root, ".vite-hooks/pre-commit")),
        { mode: 0o755 },
    );
    writeFileSync(
        join(directory, "package.json"),
        JSON.stringify({ type: "module", scripts: { staged: "vp staged" } }),
    );
    writeFileSync(
        join(directory, "vite.config.ts"),
        `export default ${JSON.stringify({ staged: config.staged, fmt: config.fmt })};`,
    );
    writeFileSync(join(directory, "value.js"), "export function value() {\n    return 0;\n}\n");
    writeFileSync(
        join(directory, "value.test.js"),
        `import { expect, it } from 'vite-plus/test';\nimport { value } from './value.js';\nit('checks the value', () => expect(value()).toBe(${expected}));\n`,
    );
    writeFileSync(
        join(directory, "unrelated.test.js"),
        "import { it } from 'vite-plus/test';\nit('must not run', () => { throw new Error('unrelated test ran'); });\n",
    );
    mkdirSync(join(directory, "scripts"));
    writeFileSync(join(directory, "scripts/check-code-language.mjs"), "process.exit(0);\n");
    cpSync(join(root, "scripts/guards"), join(directory, "scripts/guards"), {
        recursive: true,
    });
    git("add", ".");
    git("-c", "core.hooksPath=/dev/null", "commit", "-qm", "Initial fixture");
    writeFileSync(join(directory, "value.js"), source);
    git("add", "value.js");
    if (guardedSource) {
        writeFileSync(join(directory, "guarded.ts"), guardedSource);
        git("add", "guarded.ts");
    }
    const result = spawnSync("git", ["hook", "run", "pre-commit"], {
        cwd: directory,
        encoding: "utf8",
        env: fixtureEnvironment,
        timeout: 30000,
    });
    return { directory, result, git };
}

afterEach(() => {
    for (const directory of directories.splice(0))
        rmSync(directory, { recursive: true, force: true });
});

it("formats staged code, runs related tests, and executes the real repository guards", () => {
    const { result, git } = setup("export function value(){\nreturn 42\n}\n");
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(git("show", ":value.js")).toContain("\n    return 42;\n");
}, 40000);

it("blocks the commit when the real guard finds explicit any", () => {
    const { result } = setup(
        "export function value(){\nreturn 42\n}\n",
        42,
        "export const guarded: any = 1;\n",
    );
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toContain("typescript/no-explicit-any");
}, 40000);

it("blocks the commit when a related test fails", () => {
    const { result } = setup("export function value(){\nreturn 43\n}\n");
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toContain("checks the value");
}, 40000);

it("blocks the commit when lint fails", () => {
    const { result } = setup("export function value(){\n const result;\n return 42;\n}\n");
    expect(result.status).not.toBe(0);
}, 40000);
