import { buildApp } from "./app";
import { env } from "@gfinancias/env/server";

const fastify = buildApp();

fastify.listen({ port: env.PORT }, (err) => {
    if (err) {
        fastify.log.error(err);
        process.exit(1);
    }
    console.log(`Server running on port ${env.PORT}`);
});
