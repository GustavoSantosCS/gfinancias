import { describe, expect, it } from "vite-plus/test";

import { buildApp } from "./app";

describe("server application", () => {
    it("serves the health endpoint through Fastify", async () => {
        const app = buildApp();

        try {
            const response = await app.inject({ method: "GET", url: "/" });

            expect(response.statusCode).toBe(200);
            expect(response.body).toBe("OK");
        } finally {
            await app.close();
        }
    });

    it("serves the health check through the tRPC HTTP adapter", async () => {
        const app = buildApp();

        try {
            const response = await app.inject({ method: "GET", url: "/trpc/healthCheck" });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual({ result: { data: "OK" } });
        } finally {
            await app.close();
        }
    });
});
