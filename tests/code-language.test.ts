import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vite-plus/test";

const script = join(process.cwd(), "scripts/check-code-language.mjs");
const directories: string[] = [];

function review(
    response: unknown,
    source = 'export const title = "Bem-vindo";\n',
    exitCode = 0,
    unstaged?: string,
) {
    const directory = mkdtempSync(join(tmpdir(), "language-hook-test-"));
    directories.push(directory);
    const git = (...args: string[]) => execFileSync("git", args, { cwd: directory });
    git("init", "-q");
    writeFileSync(join(directory, "page.ts"), source);
    git("add", "page.ts");
    if (unstaged) writeFileSync(join(directory, "page.ts"), unstaged);
    const bin = join(directory, "bin");
    mkdirSync(bin);
    const capture = join(directory, "prompt.txt");
    writeFileSync(
        join(bin, "codex"),
        `#!${process.execPath}
const fs = require('node:fs');
fs.writeFileSync(${JSON.stringify(capture)}, fs.readFileSync(0, 'utf8'));
const args = process.argv.slice(2);
fs.writeFileSync(args[args.indexOf('--output-last-message') + 1], ${JSON.stringify(typeof response === "string" ? response : JSON.stringify(response))});
process.exit(${exitCode});
`,
        { mode: 0o755 },
    );
    const result = spawnSync(process.execPath, [script], {
        cwd: directory,
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
        encoding: "utf8",
        timeout: 10000,
    });
    return { result, prompt: () => readFileSync(capture, "utf8") };
}

afterEach(() => {
    for (const directory of directories.splice(0))
        rmSync(directory, { recursive: true, force: true });
});

it("allows Portuguese UI text and sends only staged content for review", () => {
    const { result, prompt } = review(
        { violations: [] },
        undefined,
        0,
        "// unstaged private note\n",
    );
    expect(result.status, result.stderr).toBe(0);
    expect(prompt()).toContain("Bem-vindo");
    expect(prompt()).not.toContain("unstaged private note");
    expect(prompt()).toContain("user-facing");
});

it("blocks Portuguese code or comments reported by Codex", () => {
    const { result } = review(
        {
            violations: [
                {
                    path: "page.ts",
                    line: 1,
                    excerpt: "// Calcula total",
                    reason: "Portuguese comment",
                },
            ],
        },
        "// Calcula total\nexport const total = 1;\n",
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("// Calcula total");
});

it.each(["invalid json", {}, { violations: "invalid" }])(
    "blocks invalid Codex output: %j",
    (response) => {
        expect(review(response).result.status).toBe(1);
    },
);

it("blocks a failed Codex invocation even with a passing response", () => {
    expect(review({ violations: [] }, undefined, 1).result.status).toBe(1);
});
