"use client";

import { useState } from "react";
import { Mail } from "../mail";
import { MailProvider } from "../mail/mail-context";

export type Section = "INBOX" | "STARRED" | "SENT" | "ALL_MAIL";

// Mock data - replace with real data from your backend
const mockMails = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    subject: "Meeting Tomorrow",
    text: "Hi, just confirming our meeting tomorrow at 10 AM.",
    date: "2024-04-29T10:00:00Z",
    read: false,
    labels: ["work"],
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    subject: "Project Update",
    text: "Here's the latest update on our project...",
    date: "2024-04-28T15:30:00Z",
    read: true,
    labels: ["personal"],
  },
];

export default function DashboardShell() {
  const [section, setSection] = useState<Section>("INBOX");

  return (
    <MailProvider>
      <div className="flex min-h-screen w-full flex-col bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        <Mail
          mails={mockMails}
          defaultLayout={[20, 32, 48]}
          defaultCollapsed={false}
          navCollapsedSize={4}
          currentSection={section}
          setSection={setSection}
        />
      </div>
    </MailProvider>
  );
}
