"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { skipToken } from "@tanstack/react-query";

interface GmailMessage {
  id: string;
  snippet?: string;
  internalDate?: string;
  subject?: string;
}

export default function Inbox() {
  // Fetch a list of message IDs/snippets
  const { data, isLoading } = api.gmail.listMessages.useQuery({
    labelIds: ["INBOX"],
    maxResults: 20,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // When an email is selected, fetch the details
  const { data: selectedEmail, isLoading: loadingDetails } =
    api.gmail.getMessage.useQuery(
      selectedId ? { messageId: selectedId, format: "full" } : skipToken,
      { enabled: !!selectedId },
    );

  const emails = data?.messages ?? [];

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="flex h-full">
      <div className="w-96 overflow-y-auto border-r">
        {emails.map((email) => (
          <div
            key={email.id}
            className="flex h-24 cursor-pointer flex-col border-b px-4 py-2 hover:bg-gray-100"
            onClick={() => setSelectedId(email.id ?? null)}
          >
            <div className="mb-1 text-xs text-gray-500">
              {email.internalDate
                ? new Date(Number(email.internalDate)).toLocaleString()
                : ""}
            </div>
            <div className="mb-1 truncate font-semibold">
              {email.subject || "(No subject)"}
            </div>
            <div className="line-clamp-2 text-sm text-gray-600">
              {email.snippet || "No snippet available"}
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-6">
        {selectedId ? (
          loadingDetails ? (
            <div>Loading...</div>
          ) : selectedEmail ? (
            <EmailDetail message={selectedEmail} />
          ) : (
            <div className="text-gray-400">Error loading email</div>
          )
        ) : (
          <div className="text-gray-400">Select an email to view details</div>
        )}
      </div>
    </div>
  );
}

function EmailDetail({ message }: { message: any }) {
  const subject = message?.payload?.headers?.find(
    (h: any) => h.name === "Subject",
  )?.value;

  const from = message?.payload?.headers?.find(
    (h: any) => h.name === "From",
  )?.value;

  // Add more parsing for HTML body as needed
  return (
    <div>
      <div className="mb-2 text-xl font-bold">{subject || "(No subject)"}</div>
      <div className="mb-2 text-xs">{from}</div>
      <div className="mb-2 text-xs">
        {message.internalDate
          ? new Date(Number(message.internalDate)).toLocaleString()
          : ""}
      </div>
      <div className="text-sm">{message.snippet}</div>
    </div>
  );
}
