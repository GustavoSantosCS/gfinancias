import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const adapterConstructor = vi.fn();
const clientConstructor = vi.fn();

vi.mock("@gfinancias/env/server", () => ({
    env: { DATABASE_URL: "file:/tmp/gfinancias-db-test.db" },
}));
vi.mock("@prisma/adapter-libsql", () => ({
    PrismaLibSql: adapterConstructor,
}));
vi.mock("../prisma/generated/client", () => ({
    PrismaClient: clientConstructor,
}));

describe("Prisma client factory", () => {
    beforeEach(() => {
        adapterConstructor.mockReset();
        clientConstructor.mockReset();
        adapterConstructor.mockImplementation(function MockAdapter() {
            return { adapter: true };
        });
        clientConstructor.mockImplementation(function MockClient() {
            return { client: true };
        });
    });

    it("creates a client with the configured LibSQL adapter", async () => {
        const { createPrismaClient } = await import("./index");

        const client = createPrismaClient();

        expect(adapterConstructor).toHaveBeenCalledWith({
            url: "file:/tmp/gfinancias-db-test.db",
        });
        expect(clientConstructor).toHaveBeenCalledWith({ adapter: { adapter: true } });
        expect(client).toEqual({ client: true });
    });
});
