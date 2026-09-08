import db from "@gfinancias/db";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";

export async function createContext({ req }: CreateFastifyContextOptions) {
    void req;
    return {
        auth: null,
        db,
        session: null,
    };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
