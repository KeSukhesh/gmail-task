import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { z } from "zod";

export const peopleRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.person.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { lastInteracted: "desc" },
    });
  }),

  getByIdWithActivity: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const person = await ctx.db.person.findUnique({
        where: { id: input.id },
      });

      if (!person || person.userId !== ctx.session.user.id) return null;

      const inboundEmails = await ctx.db.email.findMany({
        where: {
          userId: ctx.session.user.id,
          from: { contains: person.email },
        },
        orderBy: { internalDate: "desc" },
      });

      const outboundEmails = await ctx.db.email.findMany({
        where: {
          userId: ctx.session.user.id,
          labelIds: { has: "SENT" },
          snippet: { contains: person.email },
        },
        orderBy: { internalDate: "desc" },
      });

      return { person, inboundEmails, outboundEmails };
    }),
});
