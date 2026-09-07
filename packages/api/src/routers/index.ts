import { publicProcedure, router } from "../index";
import { planningRouter } from "./planning";

export const appRouter = router({
    healthCheck: publicProcedure.query(() => {
        return "OK";
    }),
    planning: planningRouter,
});
export type AppRouter = typeof appRouter;
