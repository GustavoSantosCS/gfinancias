import { defineConfig } from "vite-plus";

export default defineConfig({
    oxc: { jsx: { runtime: "automatic" } },
    resolve: { alias: { "@": new URL("./apps/web/src", import.meta.url).pathname } },
    test: {
        coverage: {
            provider: "v8",
            thresholds: {
                statements: 1.87,
                branches: 2.35,
                functions: 2.12,
                lines: 1.87,
            },
            reporter: ["text-summary", "html", "lcov", "json-summary"],
            include: ["apps/*/src/**/*.{ts,tsx,js,jsx}", "packages/*/src/**/*.{ts,tsx,js,jsx}"],
            exclude: ["**/*.d.ts", "**/*.{test,spec}.{ts,tsx,js,jsx}", "**/generated/**"],
        },
        projects: [
            {
                extends: true,
                test: {
                    name: "node",
                    environment: "node",
                    exclude: ["tests/e2e/**"],
                    include: ["tests/**/*.test.ts", "apps/**/*.test.ts", "packages/**/*.test.ts"],
                },
            },
            {
                extends: true,
                test: {
                    name: "react",
                    environment: "jsdom",
                    exclude: ["tests/e2e/**"],
                    setupFiles: ["./tests/setup-react.ts"],
                    include: [
                        "tests/**/*.test.tsx",
                        "apps/**/*.test.tsx",
                        "packages/**/*.test.tsx",
                    ],
                },
            },
        ],
    },
    lint: {
        ignorePatterns: [
            "storybook-static/**",
            "node_modules/**",
            "**/node_modules/**",
            "apps/web/.next/**",
            "apps/web/out/**",
            "apps/server/dist/**",
            "packages/db/dist/**",
            "packages/db/local.db*",
            "packages/db/prisma/generated/**",
        ],
        options: {
            typeAware: true,
            typeCheck: true,
        },
    },
    fmt: {
        ignorePatterns: [
            "storybook-static/**",
            "node_modules/**",
            "**/node_modules/**",
            "apps/web/.next/**",
            "apps/web/out/**",
            "apps/server/dist/**",
            "packages/db/dist/**",
            "packages/db/local.db*",
            "packages/db/prisma/generated/**",
        ],
        overrides: [
            {
                files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts,json,jsonc,json5}"],
                options: {
                    tabWidth: 4,
                    useTabs: false,
                },
            },
        ],
        singleQuote: false,
        semi: true,
        sortPackageJson: true,
    },
    staged: {
        "*.{js,jsx,mjs,cjs,ts,tsx,mts,cts,vue,svelte,json,jsonc,json5,css,md}": [
            "vp check --fix",
            "vp test related --run --passWithNoTests",
        ],
    },
});
