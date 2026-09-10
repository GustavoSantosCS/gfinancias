import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ignoredDirectories = new Set([
    ".git",
    ".next",
    "coverage",
    "dist",
    "generated",
    "node_modules",
    "out",
    "playwright-report",
    "storybook-static",
    "test-results",
]);

export function parseArguments(argv) {
    const options = {
        checks: undefined,
        format: "human",
        mode: "staged",
        output: undefined,
        base: undefined,
    };
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        if (argument === "--staged") options.mode = "staged";
        else if (argument === "--all") options.mode = "all";
        else if (argument === "--base") {
            options.mode = "base";
            options.base = argv[++index];
        } else if (argument === "--format") options.format = argv[++index];
        else if (argument === "--output") options.output = argv[++index];
        else if (argument === "--checks") options.checks = new Set(argv[++index].split(","));
        else throw new Error(`Unknown argument: ${argument}`);
    }
    if (!new Set(["human", "json", "github"]).has(options.format))
        throw new Error(`Unsupported format: ${options.format}`);
    if (options.mode === "base" && !options.base) throw new Error("--base requires a Git ref.");
    return options;
}

function git(cwd, args, allowFailure = false) {
    try {
        return execFileSync("git", args, {
            cwd,
            encoding: "utf8",
            env: { ...process.env, GIT_LITERAL_PATHSPECS: "1" },
            maxBuffer: 32 * 1024 * 1024,
        });
    } catch (error) {
        if (allowFailure) return "";
        throw error;
    }
}

function parseChangedPaths(output) {
    const values = output.split("\0").filter(Boolean);
    const changes = [];
    for (let index = 0; index < values.length; index += 2) {
        const status = values[index];
        const path = values[index + 1];
        if (status && path) changes.push({ path, status: status[0] });
    }
    return changes;
}

function addedLinesFromPatch(patch) {
    const lines = new Set();
    for (const line of patch.split("\n")) {
        const match = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
        if (!match) continue;
        const start = Number(match[1]);
        const count = match[2] === undefined ? 1 : Number(match[2]);
        for (let offset = 0; offset < count; offset += 1) lines.add(start + offset);
    }
    return lines;
}

function listAllFiles(cwd, directory = cwd) {
    const files = [];
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
        const absolute = join(directory, entry.name);
        if (entry.isDirectory()) files.push(...listAllFiles(cwd, absolute));
        else files.push(relative(cwd, absolute));
    }
    return files;
}

export function collectScope(cwd, options) {
    if (options.mode === "all") {
        return listAllFiles(cwd).map((path) => {
            const content = readFileSync(join(cwd, path), "utf8");
            return {
                addedLines: new Set(content.split("\n").map((_, index) => index + 1)),
                content,
                oldContent: "",
                path,
                status: "U",
            };
        });
    }

    let diffPrefix;
    let oldRevision;
    if (options.mode === "staged") {
        diffPrefix = ["diff", "--cached"];
        oldRevision = "HEAD";
    } else {
        oldRevision = git(cwd, ["merge-base", options.base, "HEAD"]).trim();
        diffPrefix = ["diff", oldRevision];
    }
    const changes = parseChangedPaths(
        git(cwd, [
            ...diffPrefix,
            "--name-status",
            "-z",
            "--no-renames",
            "--diff-filter=ACMRD",
            "--",
        ]),
    );
    if (options.mode === "base") {
        const known = new Set(changes.map((change) => change.path));
        const untracked = git(cwd, ["ls-files", "--others", "--exclude-standard", "-z"])
            .split("\0")
            .filter(Boolean);
        for (const path of untracked) if (!known.has(path)) changes.push({ path, status: "A" });
    }
    return changes.map(({ path, status }) => {
        const content =
            status === "D"
                ? ""
                : options.mode === "staged"
                  ? git(cwd, ["show", `:${path}`])
                  : readFileSync(join(cwd, path), "utf8");
        const oldContent = status === "A" ? "" : git(cwd, ["show", `${oldRevision}:${path}`], true);
        const patch = git(cwd, [...diffPrefix, "--unified=0", "--no-color", "--", path], true);
        const addedLines = addedLinesFromPatch(patch);
        if (status === "A" && addedLines.size === 0)
            for (const [index] of content.split("\n").entries()) addedLines.add(index + 1);
        return { addedLines, content, oldContent, path, status };
    });
}

export function violation({
    rule,
    path,
    line = 1,
    column = 1,
    message,
    evidence = "",
    expected,
    suggestion,
    documentation,
    severity = "error",
}) {
    return {
        rule,
        severity,
        path,
        line,
        column,
        message,
        evidence,
        expected,
        ...(suggestion ? { suggestion } : {}),
        ...(documentation ? { documentation } : {}),
    };
}

function escapeWorkflow(value) {
    return String(value)
        .replaceAll("%", "%25")
        .replaceAll("\r", "%0D")
        .replaceAll("\n", "%0A")
        .replaceAll(",", "%2C")
        .replaceAll(":", "%3A");
}

export function renderReport(report, format) {
    if (format === "json") return `${JSON.stringify(report, null, 2)}\n`;
    if (format === "github") {
        const annotations = report.violations.map(
            (item) =>
                `::${item.severity} file=${escapeWorkflow(item.path)},line=${item.line},col=${item.column},title=${escapeWorkflow(item.rule)}::${escapeWorkflow(item.message)} Expected: ${escapeWorkflow(item.expected)}`,
        );
        for (const error of report.executionErrors)
            annotations.push(`::error title=guard/execution::${escapeWorkflow(error)}`);
        return annotations.length > 0 ? `${annotations.join("\n")}\n` : "Guard checks passed.\n";
    }
    if (report.violations.length === 0 && report.executionErrors.length === 0)
        return "Guard checks passed.\n";
    const output = [];
    for (const item of report.violations) {
        output.push(
            `${item.path}:${item.line}:${item.column} [${item.rule}] ${item.message}`,
            item.evidence ? `  ${item.evidence}` : "",
            `  Expected: ${item.expected}`,
            item.suggestion ? `  Suggestion: ${item.suggestion}` : "",
            item.documentation ? `  Reference: ${item.documentation}` : "",
        );
    }
    for (const error of report.executionErrors) output.push(`[guard/execution] ${error}`);
    return `${output.filter(Boolean).join("\n")}\n`;
}

export function writeReport(report, options) {
    const rendered = renderReport(report, options.format);
    process.stdout.write(rendered);
    if (options.output) writeFileSync(options.output, `${JSON.stringify(report, null, 2)}\n`);
}

export function sourceExtension(path) {
    return new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"]).has(
        extname(path),
    );
}

export function isAddedLine(file, line) {
    return file.addedLines.has(line);
}
