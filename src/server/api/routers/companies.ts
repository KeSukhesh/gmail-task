import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { z } from "zod";

export const companiesRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.company.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { lastInteracted: "desc" },
    });
  }),

  getByIdWithActivity: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const company = await ctx.db.company.findUnique({
        where: { id: input.id },
      });

      if (!company || company.userId !== ctx.session.user.id) return null;

      const people = await ctx.db.person.findMany({
        where: {
          userId: ctx.session.user.id,
          companyDomain: { in: company.domains },
        },
      });

      const inboundEmails = await ctx.db.email.findMany({
        where: {
          userId: ctx.session.user.id,
          OR: company.domains.map(domain => ({
            from: { contains: `@${domain}` },
          })),
        },
        orderBy: { internalDate: "desc" },
      });

      const outboundEmails = await ctx.db.email.findMany({
        where: {
          userId: ctx.session.user.id,
          labelIds: { has: "SENT" },
          OR: company.domains.map(domain => ({
            snippet: { contains: `@${domain}` },
          })),
        },
        orderBy: { internalDate: "desc" },
      });

      return { company, people, inboundEmails, outboundEmails };
    }),
});
