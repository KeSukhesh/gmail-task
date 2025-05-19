import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { gmailRouter } from "./routers/gmail";
import { userRouter } from "./routers/user";
import { peopleRouter } from "./routers/people";
import { companiesRouter } from "./routers/companies";
import { networkRouter } from "./routers/network";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  gmail: gmailRouter,
  user: userRouter,
  people: peopleRouter,
  companies: companiesRouter,
  network: networkRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
