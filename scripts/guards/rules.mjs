import ts from "typescript";
import { basename, extname } from "node:path";
import { isAddedLine, sourceExtension, violation } from "./core.mjs";

const architectureReference = ".agents/skills/backend-architecture/SKILL.md";
const frontendReference = "docs/arquitetura-frontend.md";

function parse(file) {
    const kind = /\.(?:tsx|jsx)$/.test(file.path) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    return ts.createSourceFile(file.path, file.content, ts.ScriptTarget.Latest, true, kind);
}

function location(source, node) {
    const start = node.getStart(source);
    const point = source.getLineAndCharacterOfPosition(start);
    return { column: point.character + 1, line: point.line + 1 };
}

function evidenceAt(file, line) {
    return file.content.split("\n")[line - 1]?.trim() ?? "";
}

function visit(source, callback) {
    const walk = (node) => {
        callback(node);
        ts.forEachChild(node, walk);
    };
    walk(source);
}

export function checkExplicitAny(files) {
    const violations = [];
    for (const file of files.filter(
        (item) =>
            /\.[cm]?tsx?$/.test(item.path) &&
            item.status !== "D" &&
            !item.path.includes("/generated/"),
    )) {
        const source = parse(file);
        visit(source, (node) => {
            if (node.kind !== ts.SyntaxKind.AnyKeyword) return;
            const point = location(source, node);
            if (!isAddedLine(file, point.line)) return;
            violations.push(
                violation({
                    rule: "typescript/no-explicit-any",
                    path: file.path,
                    ...point,
                    message: "Explicit any was introduced.",
                    evidence: evidenceAt(file, point.line),
                    expected: "Use an inferred, domain, generic, or unknown type.",
                    suggestion: "Infer the type from the public contract whenever possible.",
                }),
            );
        });
    }
    return violations;
}

function architectureImportViolation(file, source, node, rule, message, expected, documentation) {
    const point = location(source, node);
    if (!isAddedLine(file, point.line)) return undefined;
    return violation({
        rule,
        path: file.path,
        ...point,
        message,
        evidence: evidenceAt(file, point.line),
        expected,
        documentation,
    });
}

function importedModule(node) {
    if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
    )
        return node.moduleSpecifier.text;
    if (
        ts.isImportEqualsDeclaration(node) &&
        ts.isExternalModuleReference(node.moduleReference) &&
        node.moduleReference.expression &&
        ts.isStringLiteral(node.moduleReference.expression)
    )
        return node.moduleReference.expression.text;
    if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
            (ts.isIdentifier(node.expression) && node.expression.text === "require")) &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
    )
        return node.arguments[0].text;
    return undefined;
}

export function checkArchitecture(files) {
    const violations = [];
    for (const file of files.filter(
        (item) =>
            sourceExtension(item.path) && item.status !== "D" && !item.path.includes("/generated/"),
    )) {
        const source = parse(file);
        visit(source, (node) => {
            const imported = importedModule(node);
            if (imported) {
                let result;
                if (
                    /packages\/api\/src\/[^/]+\/domain\//.test(file.path) &&
                    /^(?:@trpc|@prisma|@gfinancias\/db|fastify|libsql$)|\/(?:infrastructure|routers)(?:\/|$)/.test(
                        imported,
                    )
                )
                    result = architectureImportViolation(
                        file,
                        source,
                        node,
                        "architecture/domain-boundary",
                        "Domain code imports a framework or outer layer.",
                        "Domain modules may depend only on pure domain code and contracts.",
                        architectureReference,
                    );
                else if (
                    /packages\/api\/src\/[^/]+\/application\//.test(file.path) &&
                    /^(?:@trpc|@prisma|@gfinancias\/db|fastify|libsql$)|\/infrastructure(?:\/|$)/.test(
                        imported,
                    )
                )
                    result = architectureImportViolation(
                        file,
                        source,
                        node,
                        "architecture/application-boundary",
                        "Application code imports infrastructure or a transport framework.",
                        "Application use cases must depend on domain contracts and ports.",
                        architectureReference,
                    );
                else if (
                    /packages\/api\/src\/[^/]+\/ports\//.test(file.path) &&
                    /^(?:@prisma|@gfinancias\/db|libsql$)|(?:^|\/)generated(?:\/|$)/.test(imported)
                )
                    result = architectureImportViolation(
                        file,
                        source,
                        node,
                        "architecture/port-prisma-leak",
                        "A port exposes a Prisma-generated dependency.",
                        "Define a use-case-oriented DTO inside the port.",
                        architectureReference,
                    );
                else if (
                    file.path.startsWith("apps/web/") &&
                    /^(?:@gfinancias\/db|@prisma(?:\/|$)|libsql$)/.test(imported)
                )
                    result = architectureImportViolation(
                        file,
                        source,
                        node,
                        "architecture/web-no-database",
                        "Frontend code imports a database dependency.",
                        "Access persisted data through the server using tRPC.",
                        frontendReference,
                    );
                else if (
                    file.path.startsWith("packages/ui/") &&
                    /(?:^|\/)(?:features)(?:\/|$)|^@gfinancias\/api$/.test(imported)
                )
                    result = architectureImportViolation(
                        file,
                        source,
                        node,
                        "architecture/ui-domain-independence",
                        "Shared UI imports a financial feature or API domain.",
                        "Keep shared UI visual and domain-independent.",
                        frontendReference,
                    );
                else if (
                    /apps\/web\/src\/app\/.+\/page\.tsx$/.test(file.path) &&
                    /(?:@tanstack\/react-query|\/utils\/trpc)$/.test(imported)
                )
                    result = architectureImportViolation(
                        file,
                        source,
                        node,
                        "architecture/thin-route",
                        "An App Router page accesses remote state directly.",
                        "Delegate data behavior to the matching feature.",
                        frontendReference,
                    );
                else if (
                    /apps\/web\/src\/features\/[^/]+\/components\//.test(file.path) &&
                    /(?:@tanstack\/react-query|\/utils\/trpc)$/.test(imported)
                )
                    result = architectureImportViolation(
                        file,
                        source,
                        node,
                        "architecture/component-query-boundary",
                        "A presentation component accesses query infrastructure directly.",
                        "Move remote-state behavior to a feature hook.",
                        frontendReference,
                    );
                if (result) violations.push(result);
            }
            if (/packages\/api\/src\/routers\//.test(file.path)) {
                const forbiddenTransaction =
                    ts.isPropertyAccessExpression(node) && node.name.text === "$transaction";
                const directModel =
                    ts.isPropertyAccessExpression(node) &&
                    node.expression.getText(source) === "ctx.db";
                if (forbiddenTransaction || directModel) {
                    const point = location(source, node);
                    if (!isAddedLine(file, point.line)) return;
                    violations.push(
                        violation({
                            rule: "architecture/thin-router",
                            path: file.path,
                            ...point,
                            message:
                                "A router performs persistence or starts a transaction directly.",
                            evidence: evidenceAt(file, point.line),
                            expected:
                                "Compose an infrastructure adapter and call an application use case.",
                            documentation: architectureReference,
                        }),
                    );
                }
            }
        });
    }
    return violations;
}

export function checkTestHygiene(files) {
    const violations = [];
    for (const file of files.filter(
        (item) =>
            sourceExtension(item.path) && item.status !== "D" && !item.path.includes("/generated/"),
    )) {
        const source = parse(file);
        visit(source, (node) => {
            if (!ts.isCallExpression(node)) return;
            const parts = [];
            const collect = (expression) => {
                if (ts.isIdentifier(expression)) parts.push(expression.text);
                else if (ts.isPropertyAccessExpression(expression)) {
                    collect(expression.expression);
                    parts.push(expression.name.text);
                } else if (ts.isCallExpression(expression)) collect(expression.expression);
            };
            collect(node.expression);
            if (!["describe", "it", "test"].includes(parts[0])) return;
            const modifier = parts.find((part) => ["only", "skip", "todo"].includes(part));
            if (!modifier) return;
            const point = location(source, node);
            if (!isAddedLine(file, point.line)) return;
            violations.push(
                violation({
                    rule:
                        modifier === "only" ? "tests/no-focused-tests" : "tests/no-disabled-tests",
                    path: file.path,
                    ...point,
                    message: `A ${modifier} test was introduced.`,
                    evidence: evidenceAt(file, point.line),
                    expected: "All committed tests must execute in the regular suite.",
                }),
            );
        });
    }
    return violations;
}

export function checkFinancialConventions(files) {
    const violations = [];
    for (const file of files.filter(
        (item) =>
            sourceExtension(item.path) &&
            item.status !== "D" &&
            !item.path.includes("/generated/") &&
            !isTest(item.path),
    )) {
        const source = parse(file);
        visit(source, (node) => {
            const point = location(source, node);
            if (!isAddedLine(file, point.line)) return;
            let details;
            if (
                ts.isCallExpression(node) &&
                ts.isIdentifier(node.expression) &&
                node.expression.text === "parseFloat" &&
                /(?:amount|balance|cent|cost|currency|expense|income|installment|limit|money|price|total|value)/i.test(
                    node.parent.getText(source),
                )
            )
                details = [
                    "finance/no-parse-float",
                    "parseFloat can introduce floating-point money values.",
                    "Parse and transport monetary values as integer cents.",
                ];
            else if (
                ts.isNewExpression(node) &&
                node.expression.getText(source) === "Date" &&
                node.arguments?.[0] &&
                ts.isStringLiteral(node.arguments[0]) &&
                /^\d{4}-\d{2}-\d{2}$/.test(node.arguments[0].text)
            )
                details = [
                    "dates/no-string-date-constructor",
                    "A civil date is passed directly to the Date constructor.",
                    "Use the shared civil-date parser and preserve the noon UTC convention.",
                ];
            else if (
                file.path.includes("/features/") &&
                ts.isNewExpression(node) &&
                node.expression.getText(source) === "Intl.NumberFormat" &&
                node.arguments?.[1] &&
                ts.isObjectLiteralExpression(node.arguments[1]) &&
                node.arguments[1].properties.some(
                    (property) =>
                        ts.isPropertyAssignment(property) &&
                        ((property.name.getText(source) === "style" &&
                            ts.isStringLiteral(property.initializer) &&
                            property.initializer.text === "currency") ||
                            property.name.getText(source) === "currency"),
                )
            )
                details = [
                    "finance/shared-money-format",
                    "A feature creates its own number formatter.",
                    "Use the shared money formatter from the frontend library.",
                ];
            if (!details) return;
            violations.push(
                violation({
                    rule: details[0],
                    path: file.path,
                    ...point,
                    message: details[1],
                    evidence: evidenceAt(file, point.line),
                    expected: details[2],
                    documentation: frontendReference,
                }),
            );
        });
    }
    return violations;
}

function isTest(path) {
    return /(?:^|\/)(?:tests?\/)|\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path);
}

function isProductionSource(path) {
    return sourceExtension(path) && !isTest(path) && !path.includes("/generated/");
}

export function checkTestCompanion(files) {
    const activeFiles = files.filter((file) => file.status !== "D");
    const changed = new Set(activeFiles.map((file) => file.path));
    const tests = activeFiles.filter((file) => isTest(file.path));
    const violations = [];
    const reported = new Set();
    for (const file of files.filter((item) => isProductionSource(item.path))) {
        let context;
        let covered = true;
        const backend = /^packages\/api\/src\/([^/]+)\//.exec(file.path);
        const router = /^packages\/api\/src\/routers\/([^/.]+)\.ts$/.exec(file.path);
        const frontend = /^apps\/web\/src\/features\/([^/]+)\//.exec(file.path);
        const server = file.path.startsWith("apps/server/src/");
        const database = file.path.startsWith("packages/db/src/");
        if (server) {
            context = "server";
            covered = tests.some((test) => test.path.startsWith("apps/server/src/"));
        } else if (database) {
            context = "database";
            covered = tests.some((test) => test.path.startsWith("packages/db/src/"));
        } else if (backend && backend[1] !== "routers") {
            context = `backend:${backend[1]}`;
            covered = tests.some(
                (test) =>
                    test.path.includes(`/src/${backend[1]}/`) ||
                    test.path.endsWith(`/routers/${backend[1]}.test.ts`),
            );
        } else if (router) {
            context = `backend:${router[1]}`;
            covered = tests.some((test) => test.path.endsWith(`/routers/${router[1]}.test.ts`));
        } else if (frontend) {
            context = `frontend:${frontend[1]}`;
            covered = tests.some((test) => test.path.includes(`/features/${frontend[1]}/`));
        } else if (file.path.startsWith("packages/ui/src/components/")) {
            context = "shared-ui";
            covered = tests.some(
                (test) =>
                    test.path.startsWith("tests/components/") ||
                    test.path.startsWith("packages/ui/"),
            );
            if (file.status === "A") {
                const name = basename(file.path, extname(file.path));
                const story = `packages/ui/stories/${name}.stories.ts`;
                const storyTsx = `${story}x`;
                if (!changed.has(story) && !changed.has(storyTsx)) {
                    violations.push(
                        violation({
                            rule: "storybook/story-required",
                            path: file.path,
                            message:
                                "A shared UI component was added without a matching Storybook story.",
                            evidence: file.path,
                            expected: `Add ${story} or ${storyTsx}.`,
                            documentation: frontendReference,
                        }),
                    );
                }
            }
        } else if (file.path.startsWith("scripts/guards/")) {
            context = "guards";
            covered = changed.has("tests/guards.test.ts");
        } else continue;
        if (!covered && !reported.has(context)) {
            reported.add(context);
            violations.push(
                violation({
                    rule: "tests/companion-required",
                    path: file.path,
                    message: "Production behavior changed without a companion test change.",
                    evidence: file.path,
                    expected: `Add or update an integration test for ${context}.`,
                }),
            );
        }
    }
    return violations;
}

export function checkMarkdownAuthorization(files, environment = process.env) {
    if (environment.ALLOW_MARKDOWN_COMMIT === "1") return [];
    return files
        .filter((file) => file.path.endsWith(".md") && file.status !== "U")
        .map((file) =>
            violation({
                rule: "repository/markdown-authorization",
                path: file.path,
                message: "A Markdown file is staged without explicit authorization.",
                evidence: file.path,
                expected:
                    "Remove the file from the commit or retry with ALLOW_MARKDOWN_COMMIT=1 after authorization.",
            }),
        );
}

function functionMetrics(content, path) {
    if (!content) return { fileLines: 0, functions: new Map() };
    const source = parse({ content, path });
    const functions = new Map();
    const isFunction = (node) =>
        ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node);
    const identity = (node, line) => {
        if (node.name) return node.name.getText(source);
        if (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name))
            return node.parent.name.text;
        if (ts.isPropertyAssignment(node.parent)) return node.parent.name.getText(source);
        return `<anonymous:${line}>`;
    };
    const cyclomaticComplexity = (root) => {
        let complexity = 1;
        const walk = (node) => {
            if (node !== root && isFunction(node)) return;
            if (
                ts.isIfStatement(node) ||
                ts.isForStatement(node) ||
                ts.isForInStatement(node) ||
                ts.isForOfStatement(node) ||
                ts.isWhileStatement(node) ||
                ts.isDoStatement(node) ||
                ts.isConditionalExpression(node) ||
                ts.isCatchClause(node) ||
                ts.isCaseClause(node)
            )
                complexity += 1;
            if (
                ts.isBinaryExpression(node) &&
                [
                    ts.SyntaxKind.AmpersandAmpersandToken,
                    ts.SyntaxKind.BarBarToken,
                    ts.SyntaxKind.QuestionQuestionToken,
                ].includes(node.operatorToken.kind)
            )
                complexity += 1;
            ts.forEachChild(node, walk);
        };
        walk(root);
        return complexity;
    };
    visit(source, (node) => {
        if (!isFunction(node)) return;
        const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
        const endLine = source.getLineAndCharacterOfPosition(node.end).line + 1;
        functions.set(identity(node, line), {
            complexity: cyclomaticComplexity(node),
            line,
            lines: endLine - line + 1,
        });
    });
    const segments = content.split("\n");
    const fileLines = content.endsWith("\n") ? segments.length - 1 : segments.length;
    return { fileLines, functions };
}

export function checkComplexity(files) {
    const violations = [];
    for (const file of files.filter(
        (item) =>
            isProductionSource(item.path) &&
            /^(?:apps|packages)\//.test(item.path) &&
            item.status !== "D",
    )) {
        const current = functionMetrics(file.content, file.path);
        const previous = functionMetrics(file.oldContent, file.path);
        if (current.fileLines > 400 && current.fileLines > previous.fileLines)
            violations.push(
                violation({
                    rule: "complexity/file-growth",
                    path: file.path,
                    message:
                        file.status === "U"
                            ? `File has ${current.fileLines} lines.`
                            : `File size grew from ${previous.fileLines} to ${current.fileLines} lines.`,
                    evidence: file.path,
                    expected:
                        "Keep production files at or below 400 lines, or reduce them relative to the base.",
                }),
            );
        for (const [name, metric] of current.functions) {
            const oldMetric = previous.functions.get(name);
            if (metric.complexity > 20 && (!oldMetric || metric.complexity > oldMetric.complexity))
                violations.push(
                    violation({
                        rule: "complexity/cyclomatic-growth",
                        path: file.path,
                        line: metric.line,
                        message: oldMetric
                            ? `Function ${name} complexity grew from ${oldMetric.complexity} to ${metric.complexity}.`
                            : `Function ${name} has cyclomatic complexity ${metric.complexity}.`,
                        evidence: evidenceAt(file, metric.line),
                        expected:
                            "Keep function cyclomatic complexity at or below 20, or reduce it relative to the base.",
                    }),
                );
            if (metric.lines > 120 && (!oldMetric || metric.lines > oldMetric.lines))
                violations.push(
                    violation({
                        rule: "complexity/function-growth",
                        path: file.path,
                        line: metric.line,
                        message: oldMetric
                            ? `Function ${name} grew from ${oldMetric.lines} to ${metric.lines} lines.`
                            : `Function ${name} has ${metric.lines} lines.`,
                        evidence: evidenceAt(file, metric.line),
                        expected:
                            "Keep functions at or below 120 lines, or reduce them relative to the base.",
                    }),
                );
        }
    }
    return violations;
}

function routerProcedures(content, path) {
    if (!content) return new Set();
    const source = parse({ content, path });
    const names = new Set();
    visit(source, (node) => {
        if (!ts.isCallExpression(node) || node.expression.getText(source) !== "router") return;
        const object = node.arguments[0];
        if (!object || !ts.isObjectLiteralExpression(object)) return;
        for (const property of object.properties) {
            if (
                (ts.isPropertyAssignment(property) || ts.isMethodDeclaration(property)) &&
                property.name
            )
                names.add(property.name.getText(source).replaceAll(/["']/g, ""));
        }
    });
    return names;
}

function exportedSchemaFields(content, path) {
    if (!content) return new Map();
    const source = parse({ content, path });
    const declarations = new Map();
    for (const statement of source.statements)
        if (ts.isVariableStatement(statement))
            for (const declaration of statement.declarationList.declarations)
                if (ts.isIdentifier(declaration.name) && declaration.initializer)
                    declarations.set(declaration.name.text, declaration.initializer);

    const objectKeys = (node) =>
        node && ts.isObjectLiteralExpression(node)
            ? new Set(
                  node.properties
                      .map((property) => property.name?.getText(source).replaceAll(/["']/g, ""))
                      .filter(Boolean),
              )
            : new Set();
    const evaluate = (node, visited = new Set()) => {
        if (!node || visited.has(node)) return undefined;
        visited.add(node);
        if (ts.isIdentifier(node) && declarations.has(node.text))
            return evaluate(declarations.get(node.text), visited);
        if (ts.isPropertyAccessExpression(node)) return evaluate(node.expression, visited);
        if (!ts.isCallExpression(node)) return undefined;
        if (ts.isPropertyAccessExpression(node.expression)) {
            const operation = node.expression.name.text;
            if (operation === "object") return objectKeys(node.arguments[0]);
            const base = evaluate(node.expression.expression, visited);
            if (base) {
                const fields = objectKeys(node.arguments[0]);
                if (operation === "omit")
                    return new Set([...base].filter((field) => !fields.has(field)));
                if (operation === "pick")
                    return new Set([...base].filter((field) => fields.has(field)));
                if (["extend", "safeExtend"].includes(operation))
                    return new Set([...base, ...fields]);
                if (["merge", "and"].includes(operation)) {
                    const merged = evaluate(node.arguments[0], visited);
                    return new Set([...base, ...(merged ?? [])]);
                }
                return new Set(base);
            }
        }
        for (const argument of node.arguments) {
            const fields = evaluate(argument, visited);
            if (fields) return fields;
        }
        return undefined;
    };

    const schemas = new Map();
    for (const statement of source.statements) {
        if (
            !ts.isVariableStatement(statement) ||
            !statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
        )
            continue;
        for (const declaration of statement.declarationList.declarations) {
            if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
            const fields = evaluate(declaration.initializer);
            if (fields) schemas.set(declaration.name.text, fields);
        }
    }
    return schemas;
}

export function checkContractRegression(files) {
    const violations = [];
    for (const file of files) {
        if (/packages\/api\/src\/routers\/[^/]+\.ts$/.test(file.path)) {
            const before = routerProcedures(file.oldContent, file.path);
            const after = routerProcedures(file.content, file.path);
            for (const name of before)
                if (!after.has(name))
                    violations.push(
                        violation({
                            rule: "contracts/router-procedure-removed",
                            path: file.path,
                            message: `Public router procedure ${name} was removed.`,
                            evidence: name,
                            expected:
                                "Preserve public procedures during refactoring or obtain explicit authorization.",
                        }),
                    );
        }
        if (file.path.endsWith("/contracts.ts")) {
            const before = exportedSchemaFields(file.oldContent, file.path);
            const after = exportedSchemaFields(file.content, file.path);
            for (const [schema, fields] of before) {
                if (!after.has(schema))
                    violations.push(
                        violation({
                            rule: "contracts/schema-removed",
                            path: file.path,
                            message: `Exported schema ${schema} was removed.`,
                            evidence: schema,
                            expected:
                                "Preserve public schemas during refactoring or obtain explicit authorization.",
                        }),
                    );
                else
                    for (const field of fields)
                        if (!after.get(schema).has(field))
                            violations.push(
                                violation({
                                    rule: "contracts/schema-field-removed",
                                    path: file.path,
                                    message: `Field ${field} was removed from ${schema}.`,
                                    evidence: `${schema}.${field}`,
                                    expected:
                                        "Preserve public input fields during refactoring or obtain explicit authorization.",
                                }),
                            );
            }
        }
    }
    return violations;
}

function coverageConfiguration(content, path) {
    const thresholds = new Map();
    const includes = new Set();
    if (path === "package.json") {
        const packageJson = JSON.parse(content || "{}");
        for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
            if (typeof command !== "string") continue;
            for (const match of command.matchAll(
                /--coverage\.thresholds\.(lines|statements|functions|branches)=(\d+(?:\.\d+)?)/g,
            ))
                thresholds.set(`${name}:${match[1]}`, Number(match[2]));
            for (const match of command.matchAll(/--coverage\.include=([^\s"']+)/g))
                includes.add(`${name}:${match[1]}`);
        }
        return { includes, thresholds };
    }
    if (!content) return { includes, thresholds };
    const source = parse({ content, path });
    const propertyName = (property) => property.name?.getText(source).replaceAll(/["']/g, "");
    visit(source, (node) => {
        if (
            !ts.isPropertyAssignment(node) ||
            propertyName(node) !== "coverage" ||
            !ts.isObjectLiteralExpression(node.initializer)
        )
            return;
        for (const property of node.initializer.properties) {
            if (!ts.isPropertyAssignment(property)) continue;
            const name = propertyName(property);
            if (name === "thresholds" && ts.isObjectLiteralExpression(property.initializer))
                for (const threshold of property.initializer.properties) {
                    if (
                        ts.isPropertyAssignment(threshold) &&
                        ["lines", "statements", "functions", "branches"].includes(
                            propertyName(threshold),
                        ) &&
                        ts.isNumericLiteral(threshold.initializer)
                    )
                        thresholds.set(
                            `vite:${propertyName(threshold)}`,
                            Number(threshold.initializer.text),
                        );
                }
            if (name === "include" && ts.isArrayLiteralExpression(property.initializer))
                for (const element of property.initializer.elements)
                    if (ts.isStringLiteral(element)) includes.add(`vite:${element.text}`);
        }
    });
    return { includes, thresholds };
}

export function checkCoveragePolicy(files) {
    const violations = [];
    for (const file of files.filter(
        (item) => item.path === "package.json" || item.path.endsWith("vite.config.ts"),
    )) {
        const before = coverageConfiguration(file.oldContent, file.path);
        const after = coverageConfiguration(file.content, file.path);
        for (const [metric, value] of before.thresholds) {
            if (!after.thresholds.has(metric))
                violations.push(
                    violation({
                        rule: "coverage/threshold-removed",
                        path: file.path,
                        message: `${metric} threshold was removed.`,
                        evidence: metric,
                        expected: "Keep every existing coverage threshold.",
                    }),
                );
            else if (after.thresholds.get(metric) < value)
                violations.push(
                    violation({
                        rule: "coverage/threshold-reduced",
                        path: file.path,
                        message: `${metric} threshold decreased from ${value}% to ${after.thresholds.get(metric)}%.`,
                        evidence: metric,
                        expected: "Coverage thresholds must never decrease.",
                    }),
                );
        }
        for (const include of before.includes)
            if (!after.includes.has(include))
                violations.push(
                    violation({
                        rule: "coverage/include-removed",
                        path: file.path,
                        message: "A coverage include was removed.",
                        evidence: include.slice(include.indexOf(":") + 1),
                        expected: "Keep existing production coverage scope or expand it.",
                    }),
                );
    }
    return violations;
}

export const checks = {
    "explicit-any": checkExplicitAny,
    architecture: checkArchitecture,
    "test-hygiene": checkTestHygiene,
    "financial-conventions": checkFinancialConventions,
    "test-companion": checkTestCompanion,
    "markdown-authorization": checkMarkdownAuthorization,
    complexity: checkComplexity,
    "contract-regression": checkContractRegression,
    "coverage-policy": checkCoveragePolicy,
};
