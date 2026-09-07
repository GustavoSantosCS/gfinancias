import fastifyCors from "@fastify/cors";
import { createContext } from "@gfinancias/api/context";
import { appRouter, type AppRouter } from "@gfinancias/api/routers/index";
import { env } from "@gfinancias/env/server";
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from "@trpc/server/adapters/fastify";
import Fastify from "fastify";

const baseCorsConfig = {
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
    maxAge: 86400,
};

export function buildApp() {
    const app = Fastify({ logger: false });

    app.register(fastifyCors, baseCorsConfig);
    app.register(fastifyTRPCPlugin, {
        prefix: "/trpc",
        trpcOptions: {
            router: appRouter,
            createContext,
            onError({ path, error }) {
                app.log.error({ err: error, path }, "tRPC request failed");
            },
        } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
    });
    app.get("/", async () => "OK");

    return app;
}
