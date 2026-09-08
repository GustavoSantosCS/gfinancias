import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [["list"], ["html", { open: "never" }]],
    use: {
        baseURL: "http://localhost:3101",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: [
        {
            command: "npm run dev --workspace server",
            url: "http://localhost:3000",
            reuseExistingServer: false,
            env: {
                DATABASE_URL: "file:/tmp/gfinances-e2e.db",
                CORS_ORIGIN: "http://localhost:3101",
            },
        },
        {
            command: "npm exec --workspace web -- next dev --port 3101",
            url: "http://localhost:3101",
            reuseExistingServer: false,
            timeout: 120000,
            env: { NEXT_PUBLIC_SERVER_URL: "http://localhost:3000" },
        },
    ],
});
