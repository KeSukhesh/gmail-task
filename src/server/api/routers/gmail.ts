import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { syncGmailEmails } from "~/server/gmail/sync";
import type { Attachment } from "~/app/_components/dashboard/mail/types";

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
                  { text: { contains: query, mode: "insensitive" } },
                  { snippet: { contains: query, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: {
          attachments: true,
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
        attachments: email.attachments as Attachment[],
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
        include: {
          attachments: true,
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
        attachments: email.attachments as Attachment[],
      };
    }),

  /**
   * Send an email (WiP)
   */
  // sendMessage: protectedProcedure
  //   .input(
  //     z.object({
  //       raw: z.string(), // base64url encoded RFC822 email
  //     }),
  //   )
  //   .mutation(async ({ ctx, input }) => {
  //     if (!ctx.gmail)
  //       throw new TRPCError({
  //         code: "UNAUTHORIZED",
  //         message: "No Gmail client in context",
  //       });

  //     const res = await ctx.gmail.users.messages.send({
  //       userId: "me",
  //       requestBody: {
  //         raw: input.raw,
  //       },
  //     });

  //     return res.data;
  //   }),

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

  /**
   * Mark an email as read (TODO: fix)
   */
  markAsRead: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentEmail = await ctx.db.email.findUnique({
        where: {
          id: input.messageId,
          userId: ctx.session.user.id,
        },
      });

      if (!currentEmail) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await ctx.db.email.update({
        where: {
          id: input.messageId,
          userId: ctx.session.user.id,
        },
        data: {
          isRead: true,
          labelIds: currentEmail.labelIds.filter((label) => label !== "UNREAD"),
        },
      });

      if (ctx.gmail) {
        try {
          await ctx.gmail.users.messages.modify({
            userId: "me",
            id: input.messageId,
            requestBody: {
              removeLabelIds: ["UNREAD"],
            },
          });
        } catch (error) {
          console.error("Failed to mark email as read in Gmail:", error);
        }
      }

      return { success: true };
    }),

  /**
   * Delete an email from the database
   */
  deleteMessage: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Delete the email from the database
      await ctx.db.email.delete({
        where: {
          id: input.messageId,
          userId: ctx.session.user.id,
        },
      });

      return { success: true };
    }),

  getInfiniteEmails: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().nullish(),
        query: z.string().optional(),
        labelIds: z.array(z.string()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, query, labelIds } = input;
      const userId = ctx.session?.user?.id;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to fetch emails",
        });
      }

      const emails = await ctx.db.email.findMany({
        where: {
          userId,
          ...(query ? {
            OR: [
              { subject: { contains: query, mode: "insensitive" } },
              { snippet: { contains: query, mode: "insensitive" } },
            ],
          } : {}),
          ...(labelIds && labelIds.length > 0 ? {
            labelIds: {
              hasSome: labelIds
            }
          } : {}),
        },
        include: {
          attachments: true,
        },
        orderBy: {
          internalDate: "desc",
        },
        take: limit + 1,
        ...(cursor ? { 
          skip: 1,
          cursor: { id: cursor }
        } : {}),
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (emails.length > limit) {
        const nextItem = emails.pop();
        nextCursor = nextItem!.id;
      }

      return {
        emails,
        nextCursor,
      };
    }),

  /**
   * Reply to an email (TODO: fix)
   */
  // replyMessage: protectedProcedure
  //   .input(
  //     z.object({
  //       messageId: z.string(),
  //       threadId: z.string(),
  //       content: z.string().min(1, "Reply cannot be empty"),
  //     }),
  //   )
  //   .mutation(async ({ ctx, input }) => {
  //     if (!ctx.gmail) {
  //       throw new TRPCError({
  //         code: "UNAUTHORIZED",
  //         message: "No Gmail client in context",
  //       });
  //     }

  //     console.log("Starting reply process for message:", input.messageId);

  //     try {
  //       const originalMessage = await ctx.gmail.users.messages.get({
  //         userId: "me",
  //         id: input.messageId,
  //         format: "metadata",
  //         metadataHeaders: ["Subject", "From", "To", "Cc"],
  //       });

  //       console.log("Got original message:", originalMessage.data);

  //       const headers = originalMessage.data.payload?.headers ?? [];
  //       const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
  //       const from = headers.find((h) => h.name === "From")?.value ?? "";
  //       const to = headers.find((h) => h.name === "To")?.value ?? "";
  //       const cc = headers.find((h) => h.name === "Cc")?.value ?? "";

  //       console.log("Extracted headers:", { subject, from, to, cc });

  //       const emailLines = [
  //         `MIME-Version: 1.0`,
  //         `Content-Type: text/plain; charset="UTF-8"`,
  //         `Content-Transfer-Encoding: 7bit`,
  //         `From: ${ctx.session.user.email}`,
  //         `To: ${to}`,
  //         ...(cc ? [`Cc: ${cc}`] : []),
  //         `Subject: Re: ${subject}`,
  //         `In-Reply-To: ${input.messageId}`,
  //         `References: ${input.messageId}`,
  //         `Thread-Index: ${Buffer.from(input.threadId).toString('base64')}`,
  //         ``,
  //         input.content,
  //       ];

  //       const email = emailLines.join("\r\n");
  //       console.log("Generated email content:", email);

  //       const encodedEmail = Buffer.from(email)
  //         .toString("base64")
  //         .replace(/\+/g, "-")
  //         .replace(/\//g, "_")
  //         .replace(/=+$/, "");

  //       console.log("Sending reply to Gmail API...");
  //       const response = await ctx.gmail.users.messages.send({
  //         userId: "me",
  //         requestBody: {
  //           raw: encodedEmail,
  //           threadId: input.threadId,
  //         },
  //       });

  //       console.log("Gmail API response:", response.data);

  //       await syncGmailEmails(ctx.session.user.id);

  //       return response.data;
  //     } catch (error) {
  //       console.error("Failed to send reply:", error);
  //       throw new TRPCError({
  //         code: "INTERNAL_SERVER_ERROR",
  //         message: "Failed to send reply",
  //       });
  //     }
  //   }),
});
