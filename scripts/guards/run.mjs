#!/usr/bin/env node
import { collectScope, parseArguments, writeReport } from "./core.mjs";
import { checks } from "./rules.mjs";

let options;
try {
    options = parseArguments(process.argv.slice(2));
    const requested = options.checks ?? new Set(Object.keys(checks));
    for (const name of requested) if (!checks[name]) throw new Error(`Unknown check: ${name}`);
    const files = collectScope(process.cwd(), options);
    const violations = [];
    for (const name of requested) violations.push(...checks[name](files));
    violations.sort(
        (left, right) =>
            left.path.localeCompare(right.path) ||
            left.line - right.line ||
            left.column - right.column,
    );
    const report = {
        passed: violations.length === 0,
        scope: options.mode,
        checks: [...requested],
        violations,
        executionErrors: [],
    };
    writeReport(report, options);
    process.exitCode = report.passed ? 0 : 1;
} catch (error) {
    const report = {
        passed: false,
        scope: options?.mode ?? "unknown",
        checks: options?.checks ? [...options.checks] : [],
        violations: [],
        executionErrors: [error instanceof Error ? error.message : String(error)],
    };
    writeReport(report, options ?? { format: "human" });
    process.exitCode = 2;
}
