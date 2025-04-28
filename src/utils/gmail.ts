import { gmail_v1 } from "googleapis";
import { useQuery } from "@tanstack/react-query";
import { api } from "~/trpc/react";

export function useGmailMessages(label?: string) {
  const labelIds = label ? [label] : undefined;

  return useQuery({
    queryKey: ["gmail", "messages", label],
    queryFn: async () => {
      const response = await api.gmail.listMessages.query({
        labelIds,
        maxResults: 20,
      });

      if (!response.messages) {
        return [];
      }

      const messageDetails = await Promise.all(
        response.messages.map(async (msg: { id: string }) => {
          const detail = await api.gmail.getMessage.query({
            messageId: msg.id,
            format: "full",
          });
          return detail;
        }),
      );

      return messageDetails as gmail_v1.Schema$Message[];
    },
    enabled: !!label,
  });
}
