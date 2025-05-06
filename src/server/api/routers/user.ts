import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const userRouter = createTRPCRouter({
  getUser: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) {
      throw new Error("Not authenticated");
    }

    return ctx.session.user;
  }),
});