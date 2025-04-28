"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { skipToken } from "@tanstack/react-query";
import { EmailView } from "../view/EmailView";

export default function Inbox() {
  const { data, isLoading } = api.gmail.listMessages.useQuery({
    labelIds: ["INBOX"],
    maxResults: 20,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);

  function useMessageQuery(id: string | null) {
    return api.gmail.getMessage.useQuery(
      id ? { messageId: id, format: "full" } : skipToken,
      { enabled: !!id },
    );
  }

  return (
    <EmailView
      emails={data?.messages ?? []}
      selectedId={selectedId}
      onSelect={setSelectedId}
      loading={isLoading}
      useMessageQuery={useMessageQuery}
    />
  );
}
