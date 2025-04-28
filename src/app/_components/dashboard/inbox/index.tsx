"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { skipToken } from "@tanstack/react-query";
import { EmailView } from "../view/EmailView";
import type { GmailMessage } from "../view/EmailView";

export default function EmailList({ label }: { label: string }) {
  const labelIds = label === "ALL_MAIL" ? undefined : [label];
  const { data, isLoading } = api.gmail.listMessages.useQuery({
    ...(labelIds ? { labelIds } : {}),
    maxResults: 20,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);

  function useMessageQuery(id: string | null) {
    const query = api.gmail.getMessage.useQuery(
      id ? { messageId: id, format: "full" } : skipToken,
      { enabled: !!id },
    );

    return {
      data: query.data as GmailMessage | undefined,
      isLoading: query.isLoading,
    };
  }

  const messages: GmailMessage[] = (data?.messages ?? []).map((msg) => ({
    id: msg.id ?? "",
    snippet: msg.snippet,
    internalDate: msg.internalDate,
    subject: msg.subject ?? "",
    from: msg.from ?? "",
    payload: msg.payload as GmailMessage["payload"],
  }));

  return (
    <EmailView
      emails={messages}
      selectedId={selectedId}
      onSelect={setSelectedId}
      loading={isLoading}
      useMessageQuery={useMessageQuery}
    />
  );
}
