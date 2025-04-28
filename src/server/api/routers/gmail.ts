import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// Basic message shape for UI typing (expand as needed)
const MessageSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  labelIds: z.array(z.string()).optional(),
  snippet: z.string().optional(),
});

export const gmailRouter = createTRPCRouter({
  /**
   * List messages in user's inbox (can add labelId, search, pagination, etc.)
   */
  listMessages: protectedProcedure
    .input(
      z.object({
        labelIds: z.array(z.string()).optional(),
        maxResults: z.number().min(1).max(20).optional(), // Lower to avoid quota issues!
        query: z.string().optional(),
        pageToken: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.gmail)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "No Gmail client in context",
        });

      // 1. Fetch message IDs
      const listRes = await ctx.gmail.users.messages.list({
        userId: "me",
        labelIds: input.labelIds,
        maxResults: input.maxResults ?? 10,
        q: input.query,
        pageToken: input.pageToken,
      });

      const messages = listRes.data.messages ?? [];

      // 2. Fetch metadata for each message (use "metadata" or "minimal" for speed)
      const detailedMessages = await Promise.all(
        messages.map(async (msg) => {
          if (!ctx.gmail)
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "No Gmail client in context",
            });
          const msgRes = await ctx.gmail.users.messages.get({
            userId: "me",
            id: msg.id!,
            format: "metadata", // or "full" for the body
            metadataHeaders: ["Subject", "From", "Date"],
          });
          return {
            id: msg.id!,
            snippet: msgRes.data.snippet,
            internalDate: msgRes.data.internalDate,
            payload: msgRes.data.payload,
            // You can include subject/from directly for speed
            subject:
              msgRes.data.payload?.headers?.find((h) => h.name === "Subject")
                ?.value ?? "",
            from:
              msgRes.data.payload?.headers?.find((h) => h.name === "From")
                ?.value ?? "",
          };
        }),
      );

      return {
        messages: detailedMessages,
        nextPageToken: listRes.data.nextPageToken,
        resultSizeEstimate: listRes.data.resultSizeEstimate,
      };
    }),

  /**
   * Get full details of a specific message
   */
  getMessage: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
        format: z.enum(["full", "metadata", "minimal", "raw"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.gmail)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "No Gmail client in context",
        });

      const res = await ctx.gmail.users.messages.get({
        userId: "me",
        id: input.messageId,
        format: input.format ?? "full",
      });

      return res.data;
    }),

  /**
   * Send an email
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
   * List labels (for sidebar/tagging UI)
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
});
