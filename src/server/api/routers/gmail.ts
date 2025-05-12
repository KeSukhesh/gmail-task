import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { syncGmailEmails } from "~/server/gmail/sync";
import MailComposer from "nodemailer/lib/mail-composer";
import { fetchS3Html } from "~/server/s3";

export const gmailRouter = createTRPCRouter({
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
        subject: email.subject ?? "",
        from: email.from ?? "",
        text: email.text ?? "",
        labelIds: email.labelIds,
        htmlUrl: email.htmlUrl,
        threadId: email.threadId,
        attachments: email.attachments,
      };
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

  /**
   * Mark an email as read
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
        emails: emails.map(email => ({
          ...email,
          internalDate: email.internalDate?.toISOString() ?? null,
        })),
        nextCursor,
      };
    }),

  sendEmail: protectedProcedure
    .input(
      z.object({
        to: z.array(z.string().email()),
        cc: z.array(z.string().email()).optional(),
        bcc: z.array(z.string().email()).optional(),
        subject: z.string(),
        text: z.string(),
        html: z.string().optional(),
        inReplyTo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.gmail) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Gmail client not initialized",
        });
      }

      if (!ctx.session.user.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User email is required",
        });
      }

      try {
        const from = ctx.session.user.name
          ? `${ctx.session.user.name} <${ctx.session.user.email}>`
          : ctx.session.user.email;

        const mail = new MailComposer({
          from,
          to: input.to,
          cc: input.cc,
          bcc: input.bcc,
          subject: input.subject,
          text: input.text,
          html: input.html,
          inReplyTo: input.inReplyTo,
          textEncoding: "base64",
        });

        const message = await new Promise<Buffer>((resolve, reject) => {
          const compiled = mail.compile();
          if (!compiled) {
            reject(new Error("Failed to compile email"));
            return;
          }
          compiled.build((err: Error | null, message: Buffer) => {
            if (err) {
              reject(new Error(err.message));
            } else {
              resolve(message);
            }
          });
        });

        // Convert to base64url format for Gmail API
        const encodedEmail = message.toString("base64url");

        const response = await ctx.gmail.users.messages.send({
          userId: "me",
          requestBody: {
            raw: encodedEmail,
          },
        });

        if (!response.data) {
          throw new Error("No response data from Gmail API");
        }

        await syncGmailEmails(ctx.session.user.id);

        return response.data;
      } catch (error) {
        console.error("Error sending email:", error instanceof Error ? error.message : "Unknown error");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send email",
        });
      }
    }),
    getEmailHtml: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const html = await fetchS3Html(input.key);
      return { html };
    }),
});
