"use client";

import { useState } from "react";
import { Mail } from "../mail";
import { MailProvider } from "../mail/mail-context";

export type Section = "INBOX" | "STARRED" | "SENT" | "ALL_MAIL";

export default function DashboardShell() {
  const [section, setSection] = useState<Section>("INBOX");

  return (
    <MailProvider>
      <div className="flex min-h-screen w-full flex-col bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        <Mail
          defaultLayout={[20, 32, 48]}
          defaultCollapsed={false}
          navCollapsedSize={4}
          currentSection={section}
          setSection={setSection}
          section={section}
          searchQuery=""
        />
      </div>
    </MailProvider>
  );
}
