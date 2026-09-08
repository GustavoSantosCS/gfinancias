#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const extensions = new Set([".js", ".ts", ".json", ".jsx", ".tsx"]);
const ignoredDirectories = new Set([
    ".git",
    "node_modules",
    "dist",
    ".next",
    "out",
    "coverage",
    "storybook-static",
]);
const files = readdirSync(".", { recursive: true, withFileTypes: true })
    .filter(
        (entry) => entry.isFile() && extensions.has(entry.name.slice(entry.name.lastIndexOf("."))),
    )
    .filter((entry) => !entry.parentPath.split("/").some((part) => ignoredDirectories.has(part)))
    .map((entry) => join(entry.parentPath, entry.name));
if (files.length === 0) {
    console.log("No JavaScript, TypeScript or JSON files found.");
    process.exit(0);
}
const command = process.platform === "win32" ? "vp.cmd" : "vp";

function run(args) {
    const result = spawnSync(command, args, { stdio: "inherit" });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("Running lint on JavaScript, TypeScript and JSON files...");
run(["lint", ...files]);
console.log("Formatting JavaScript, TypeScript and JSON files...");
run(["fmt", ...files, "--write"]);
