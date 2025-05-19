import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const networkRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({
      type: z.enum(["PEOPLE", "COMPANIES"]),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      if (input.type === "PEOPLE") {
        const people = await ctx.db.person.findMany({
          where: { userId },
          orderBy: { lastInteracted: "desc" },
        });
        return people;
      }

      if (input.type === "COMPANIES") {
        const companies = await ctx.db.company.findMany({
          where: { userId },
          orderBy: { lastInteracted: "desc" },
        });
        return companies;
      }

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid type specified",
      });
    }),

  getByIdWithActivity: protectedProcedure
    .input(z.object({
      id: z.string(),
      type: z.enum(["PEOPLE", "COMPANIES"]),
    }))
    .query(async ({ ctx, input }) => {
      if (input.type === "PEOPLE") {
        const person = await ctx.db.person.findUnique({
          where: { id: input.id },
          include: {
            inboundEmails: {
              select: {
                id: true,
                subject: true,
                internalDate: true,
                createdAt: true,
              },
              orderBy: { internalDate: "desc" },
            },
            outboundEmails: {
              select: {
                id: true,
                subject: true,
                internalDate: true,
                createdAt: true,
              },
              orderBy: { internalDate: "desc" },
            },
          },
        });

        if (!person) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Person not found",
          });
        }

        return person;
      }

      if (input.type === "COMPANIES") {
        const company = await ctx.db.company.findUnique({
          where: { id: input.id },
          include: {
            inboundEmails: {
              select: {
                id: true,
                subject: true,
                internalDate: true,
                createdAt: true,
              },
              orderBy: { internalDate: "desc" },
            },
            outboundEmails: {
              select: {
                id: true,
                subject: true,
                internalDate: true,
                createdAt: true,
              },
              orderBy: { internalDate: "desc" },
            },
            people: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        if (!company) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Company not found",
          });
        }

        return company;
      }

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid type specified",
      });
    }),
}); 