import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { syncGmailEmails } from "~/server/gmail/sync";

export const gmailRouter = createTRPCRouter({
  /**
   * List messages from local database
   */
  listMessages: protectedProcedure
    .input(
      z.object({
        labelIds: z.array(z.string()).optional(),
        maxResults: z.number().min(1).max(50).optional(), // can now allow up to 50 since it's local
        query: z.string().optional(), // search subject/from
        pageToken: z.string().optional(), // not implemented yet unless you want real pagination
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const { labelIds, maxResults = 20, query } = input;

      const emails = await ctx.db.email.findMany({
        where: {
          userId: ctx.session.user.id,
          ...(labelIds?.length
            ? {
                labelIds: {
                  hasSome: labelIds,
                },
              }
            : {}),
          ...(query
            ? {
                OR: [
                  { subject: { contains: query, mode: "insensitive" } },
                  { from: { contains: query, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: {
          internalDate: "desc",
        },
        take: maxResults,
      });

      // Transform to match the expected format
      const messages = emails.map(email => ({
        id: email.id,
        snippet: email.snippet,
        internalDate: email.internalDate?.toISOString(),
        payload: {
          headers: [
            { name: "Subject", value: email.subject ?? "" },
            { name: "From", value: email.from ?? "" },
            { name: "Date", value: email.internalDate?.toISOString() ?? "" },
          ],
        },
        labelIds: email.labelIds,
        subject: email.subject ?? "",
        from: email.from ?? "",
        htmlUrl: email.htmlUrl,
        text: email.text,
      }));

      return {
        messages,
        nextPageToken: null, // Not implemented yet
        resultSizeEstimate: messages.length,
      };
    }),

  /**
   * Get full details of a specific message from local database
   */
  getMessage: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
        format: z.enum(["full", "metadata", "minimal", "raw"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const email = await ctx.db.email.findUnique({
        where: {
          id: input.messageId,
          userId: ctx.session.user.id,
        },
      });

      if (!email) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return {
        id: email.id,
        snippet: email.snippet,
        internalDate: email.internalDate?.toISOString(),
        payload: {
          headers: [
            { name: "Subject", value: email.subject ?? "" },
            { name: "From", value: email.from ?? "" },
            { name: "Date", value: email.internalDate?.toISOString() ?? "" },
          ],
        },
        labelIds: email.labelIds,
        htmlUrl: email.htmlUrl,
        text: email.text,
      };
    }),

  /**
   * Send an email (still needs Gmail API)
   */
  sendMessage: protectedProcedure
    .input(
      z.object({
        raw: z.string(), // base64url encoded RFC822 email
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.gmail)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "No Gmail client in context",
        });

      const res = await ctx.gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: input.raw,
        },
      });

      return res.data;
    }),

  /**
   * List labels (still needs Gmail API)
   */
  listLabels: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.gmail)
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "No Gmail client in context",
      });

    const res = await ctx.gmail.users.labels.list({ userId: "me" });
    return res.data.labels ?? [];
  }),

  /**
   * Sync emails from Gmail to local database
   */
  syncEmails: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    await syncGmailEmails(ctx.session.user.id);
    return { success: true };
  }),
});


// import { z } from "zod";
// import { TRPCError } from "@trpc/server";
// import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// export const gmailRouter = createTRPCRouter({
//   /**
//    * List messages from **local database**, not live Gmail
//    */
//   listMessages: protectedProcedure
//     .input(
//       z.object({
//         labelIds: z.array(z.string()).optional(),
//         maxResults: z.number().min(1).max(50).optional(), // can now allow up to 50 since it's local
//         query: z.string().optional(), // search subject/from
//         pageToken: z.string().optional(), // not implemented yet unless you want real pagination
//       }),
//     )
//     .query(async ({ ctx, input }) => {
//       const { labelIds, maxResults = 20, query } = input;

//       const emails = await ctx.db.email.findMany({
//         where: {
//           userId: ctx.session.user.id,
//           ...(labelIds?.length
//             ? {
//                 labelIds: {
//                   hasSome: labelIds,
//                 },
//               }
//             : {}),
//           ...(query
//             ? {
//                 OR: [
//                   { subject: { contains: query, mode: "insensitive" } },
//                   { from: { contains: query, mode: "insensitive" } },
//                 ],
//               }
//             : {}),
//         },
//         orderBy: {
//           internalDate: "desc",
//         },
//         take: maxResults,
//       });

//       return {
//         messages: emails,
//       };
//     }),

//   /**
//    * Get full details of a specific message from **local database**
//    */
//   getMessage: protectedProcedure
//     .input(
//       z.object({
//         messageId: z.string(),
//       }),
//     )
//     .query(async ({ ctx, input }) => {
//       const email = await ctx.db.email.findUnique({
//         where: {
//           id: input.messageId,
//         },
//       });

//       if (!email) {
//         throw new TRPCError({
//           code: "NOT_FOUND",
//           message: "Email not found",
//         });
//       }

//       return email;
//     }),

//   /**
//    * Send email (still uses Gmail live, because you can't send via local db)
//    */
//   sendMessage: protectedProcedure
//     .input(
//       z.object({
//         raw: z.string(), // base64url encoded RFC822 email
//       }),
//     )
//     .mutation(async ({ ctx, input }) => {
//       if (!ctx.gmail)
//         throw new TRPCError({
//           code: "UNAUTHORIZED",
//           message: "No Gmail client in context",
//         });

//       const res = await ctx.gmail.users.messages.send({
//         userId: "me",
//         requestBody: {
//           raw: input.raw,
//         },
//       });

//       return res.data;
//     }),

//   /**
//    * List labels (still uses live Gmail for now — optional later to sync)
//    */
//   listLabels: protectedProcedure.query(async ({ ctx }) => {
//     if (!ctx.gmail)
//       throw new TRPCError({
//           code: "UNAUTHORIZED",
//           message: "No Gmail client in context",
//       });

//     const res = await ctx.gmail.users.labels.list({ userId: "me" });
//     return res.data.labels ?? [];
//   }),
// });
