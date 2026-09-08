import { publicProcedure, router } from "../index";
import { cardsRouter } from "./cards";
import { planningRouter } from "./planning";

export const appRouter = router({
    healthCheck: publicProcedure.query(() => {
        return "OK";
    }),
    planning: planningRouter,
    cards: cardsRouter,
});
export type AppRouter = typeof appRouter;
