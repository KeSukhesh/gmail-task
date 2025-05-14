"use client";

import * as React from "react";
import { Mail } from "../mail";
import { Network } from "../network";
import { MailProvider } from "../mail/mail-context";
import { useSession } from "next-auth/react";
import { ComposeModal } from "../mail/compose-modal";
import type { Session } from "next-auth";

export type Section = "INBOX" | "STARRED" | "SENT" | "ALL_MAIL" | "PEOPLE" | "COMPANIES";

export function DashboardWrapper() {
  const [currentSection, setCurrentSection] = React.useState<Section>("INBOX");
  const [isComposeOpen, setIsComposeOpen] = React.useState(false);
  const { data: session } = useSession();

  const isNetworkSection = currentSection === "PEOPLE" || currentSection === "COMPANIES";

  const handleSectionChange = (section: Section) => {
    setCurrentSection(section);
  };

  const handleComposeOpen = () => {
    setIsComposeOpen(true);
  };

  const handleComposeClose = () => {
    setIsComposeOpen(false);
  };

  return (
    <MailProvider>
      <div className="h-[100dvh]">
        {isNetworkSection ? (
          <Network
            type={currentSection}
            currentSection={currentSection}
            setSection={handleSectionChange}
            onComposeClick={handleComposeOpen}
          />
        ) : (
          <Mail
            key={currentSection}
            type={currentSection}
            currentSection={currentSection}
            setSection={handleSectionChange}
            onComposeClick={handleComposeOpen}
          />
        )}
      </div>
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={handleComposeClose}
      />
    </MailProvider>
  );
}
