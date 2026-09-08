import db from "@gfinancias/db";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";

type ContextResult = {
    auth: null;
    db: typeof db;
    session: null;
};

export async function createContext({ req }: CreateFastifyContextOptions): Promise<ContextResult> {
    void req;
    return {
        auth: null,
        db,
        session: null,
    };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
