import { defineConfig } from "vite-plus";

export default defineConfig({
    oxc: { jsx: { runtime: "automatic" } },
    resolve: { alias: { "@": new URL("./apps/web/src", import.meta.url).pathname } },
    test: {
        projects: [
            {
                extends: true,
                test: {
                    name: "node",
                    environment: "node",
                    include: ["tests/**/*.test.ts", "apps/**/*.test.ts", "packages/**/*.test.ts"],
                },
            },
            {
                extends: true,
                test: {
                    name: "react",
                    environment: "jsdom",
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
