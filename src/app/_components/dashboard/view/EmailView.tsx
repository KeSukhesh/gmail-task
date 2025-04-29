"use client";

import { EmailCard } from "./EmailCard";

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessagePayload {
  headers?: GmailHeader[];
  body?: {
    data?: string;
  };
  parts?: GmailMessagePayload[];
}

export interface GmailMessage {
  id: string;
  snippet?: string | null;
  internalDate?: string | null;
  subject?: string;
  from?: string;
  payload?: GmailMessagePayload;
}

interface EmailViewProps {
  emails: GmailMessage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
  useMessageQuery: (id: string | null) => {
    data?: GmailMessage;
    isLoading: boolean;
  };
  onSearch?: (query: string) => void;
  searchQuery?: string;
}

export function EmailView({
  emails,
  selectedId,
  onSelect,
  loading = false,
  useMessageQuery,
  onSearch,
  searchQuery = "",
}: EmailViewProps) {
  const { data: selectedEmail, isLoading: loadingDetails } =
    useMessageQuery(selectedId);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="flex h-full">
      <div className="w-96 overflow-y-auto border-r">
        <div className="sticky top-0 z-10 bg-white p-4 border-b">
          <input
            type="text"
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => onSearch?.(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-2 p-4">
          {emails.map((email) => (
            <EmailCard
              key={email.id}
              email={email}
              isSelected={selectedId === email.id}
              onClick={() => onSelect(email.id)}
            />
          ))}
        </div>
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

function EmailDetail({ message }: { message: GmailMessage }) {
  const subject = message?.payload?.headers?.find(
    (h) => h.name === "Subject",
  )?.value;

  const from = message?.payload?.headers?.find((h) => h.name === "From")?.value;

  return (
    <div>
      <div className="mb-2 text-xl font-bold">{subject ?? "(No subject)"}</div>
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
