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

const fastify = Fastify({
    logger: true,
});

fastify.register(fastifyCors, baseCorsConfig);

fastify.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: {
        router: appRouter,
        createContext,
        onError({ path, error }) {
            console.error(`Error in tRPC handler on path '${path}':`, error);
        },
    } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
});

fastify.get("/", async () => {
    return "OK";
});

fastify.listen({ port: 3000 }, (err) => {
    if (err) {
        fastify.log.error(err);
        process.exit(1);
    }
    console.log("Server running on port 3000");
});
