import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { logisticsRouter } from "./routers/logistics";

export const appRouter = router({
  system: systemRouter,
  logistics: logisticsRouter,
});

export type AppRouter = typeof appRouter;
