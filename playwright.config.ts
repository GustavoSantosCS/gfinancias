import { defineConfig, devices } from "@playwright/test";

const serverPort = Number(process.env.E2E_SERVER_PORT ?? 3000);
const webPort = Number(process.env.E2E_WEB_PORT ?? 3101);
const databaseUrl = process.env.E2E_DATABASE_URL ?? "file:../../.tmp/gfinancias-e2e.db";
const serverUrl = `http://localhost:${serverPort}`;
const webUrl = `http://localhost:${webPort}`;

export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [["list"], ["html", { open: "never" }]],
    use: {
        baseURL: webUrl,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: [
        {
            command: "npm run dev --workspace server",
            url: serverUrl,
            reuseExistingServer: false,
            env: {
                DATABASE_URL: databaseUrl,
                CORS_ORIGIN: webUrl,
                PORT: String(serverPort),
            },
        },
        {
            command: `npm exec --workspace web -- next dev --port ${webPort}`,
            url: webUrl,
            reuseExistingServer: false,
            timeout: 120000,
            env: {
                NEXT_DIST_DIR: `.next-e2e-${webPort}`,
                NEXT_PUBLIC_SERVER_URL: serverUrl,
            },
        },
    ],
});
