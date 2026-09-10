#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { renderReport, violation } from "./core.mjs";

const argumentsList = process.argv.slice(2);
const value = (name) => {
    const index = argumentsList.indexOf(name);
    return index >= 0 ? argumentsList[index + 1] : undefined;
};
const basePath = value("--base-summary");
const headPath = value("--head-summary");
const format = value("--format") ?? "human";
const supportedFormats = new Set(["human", "json", "github"]);

try {
    if (!supportedFormats.has(format)) throw new Error(`Unsupported format: ${format}`);
    if (!basePath || !headPath)
        throw new Error("Use --base-summary <path> and --head-summary <path>.");
    const base = JSON.parse(readFileSync(basePath, "utf8"));
    const head = JSON.parse(readFileSync(headPath, "utf8"));
    const violations = [];
    for (const metric of ["statements", "branches", "functions", "lines"]) {
        const previous = base.total?.[metric]?.pct;
        const current = head.total?.[metric]?.pct;
        if (typeof previous !== "number" || typeof current !== "number")
            throw new Error(`Coverage summary does not contain total.${metric}.pct.`);
        if (current < previous)
            violations.push(
                violation({
                    rule: "coverage/no-regression",
                    path: headPath,
                    message: `${metric} coverage decreased: ${previous}% -> ${current}%.`,
                    evidence: `${metric}: ${current}%`,
                    expected: `Keep ${metric} coverage at or above ${previous}%.`,
                }),
            );
    }
    const report = {
        passed: violations.length === 0,
        scope: "coverage",
        checks: ["coverage-regression"],
        violations,
        executionErrors: [],
    };
    process.stdout.write(renderReport(report, format));
    process.exitCode = report.passed ? 0 : 1;
} catch (error) {
    const report = {
        passed: false,
        scope: "coverage",
        checks: ["coverage-regression"],
        violations: [],
        executionErrors: [error instanceof Error ? error.message : String(error)],
    };
    process.stdout.write(renderReport(report, supportedFormats.has(format) ? format : "json"));
    process.exitCode = 2;
}
