"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface GmailMessage {
  id: string;
  snippet: string;
  internalDate: string;
  payload: any;
}

export default function Inbox() {
  const { data: session } = useSession();
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<GmailMessage | null>(null);

  useEffect(() => {
    if (!session) return;
    fetch("/api/gmail")
      .then((res) => res.json())
      .then((data) => setEmails(data.messages ?? []));
  }, [session]);

  if (!session) return <div>Loading...</div>;

  return (
    <div className="flex h-full">
      <div className="w-96 overflow-y-auto border-r">
        {emails.map((email) => (
          <div
            key={email.id}
            className="cursor-pointer border-b px-4 py-2 hover:bg-gray-100"
            onClick={() => setSelectedEmail(email)}
          >
            <div className="text-xs text-gray-500">
              {new Date(Number(email.internalDate)).toLocaleString()}
            </div>
            <div className="font-semibold">{getSubject(email.payload)}</div>
            <div className="truncate text-sm text-gray-600">
              {email.snippet}
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-6">
        {selectedEmail ? (
          <div>
            <div className="mb-2 text-xl font-bold">
              {getSubject(selectedEmail.payload)}
            </div>
            <div className="mb-2 text-xs">
              {new Date(Number(selectedEmail.internalDate)).toLocaleString()}
            </div>
            <div className="text-sm">{selectedEmail.snippet}</div>
            {/* For more, parse payload.body for HTML/plaintext */}
          </div>
        ) : (
          <div className="text-gray-400">Select an email to view details</div>
        )}
      </div>
    </div>
  );
}

function getSubject(payload: any) {
  const subjectHeader = payload?.headers?.find(
    (h: any) => h.name === "Subject",
  );
  return subjectHeader?.value || "(No subject)";
}
