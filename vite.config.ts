import { defineConfig } from "vite-plus";

export default defineConfig({
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
