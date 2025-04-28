"use client";

import { useState } from "react";
import Sidebar from "../sidebar";
import Inbox from "../inbox";

export type Section = "inbox" | "starred" | "sent";

export default function DashboardShell() {
  const [collapsed, setCollapsed] = useState(true);
  const [section, setSection] = useState<Section>("inbox");

  return (
    <div className="flex min-h-screen w-full bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      {/* Sidebar */}
      <div
        className={`colors-border-default relative h-screen overflow-visible border-r shadow-md transition-all duration-300 ${
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

      {/* Main Content */}
      <main
        className="flex min-w-[480px] flex-1 flex-col overflow-y-auto bg-gray-50 dark:bg-gray-900"
        role="region"
      >
        {section === "inbox" && <Inbox />}
      </main>
    </div>
  );
}
