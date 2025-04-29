"use client";

import { useState } from "react";
import Sidebar from "../sidebar";
import EmailList from "../inbox";
import Navbar from "../navbar";

export type Section = "INBOX" | "STARRED" | "SENT" | "ALL_MAIL";

export default function DashboardShell() {
  const [collapsed, setCollapsed] = useState(true);
  const [section, setSection] = useState<Section>("INBOX");

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      {/* Sidebar */}
      <div
        className={`colors-border-default fixed left-0 top-0 h-screen w-14 border-r ${
          collapsed ? "w-14" : "w-56"
        }`}
      >
        <Sidebar
          isCollapsed={collapsed}
          setCollapsed={setCollapsed}
          activeTab={section}
          setSection={setSection}
        />
      </div>

      {/* Main Content Area */}
      <div className={`flex min-h-screen flex-col ${collapsed ? "ml-14" : "ml-56"}`}>
        {/* Navbar */}
        <header className="border-b sticky top-0 z-20 flex h-14 w-full items-center bg-white">
          <Navbar
            currentSection={section}
          />
        </header>

        {/* Main Content */}
        <main
          className="flex min-w-[480px] flex-1 flex-col overflow-y-auto bg-gray-50 dark:bg-gray-900"
          role="region"
        >
          {section === "INBOX" && <EmailList label={section} />}
          {section === "STARRED" && <EmailList label={section} />}
          {section === "SENT" && <EmailList label={section} />}
          {section === "ALL_MAIL" && <EmailList label={section} />}
        </main>
      </div>
    </div>
  );
}
