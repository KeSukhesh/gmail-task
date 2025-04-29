"use client";

import { useEffect, useState } from "react";
import { MailProvider } from "../_components/dashboard/mail/mail-context";
import { Mail } from "../_components/dashboard/mail";
import type { Section } from "../_components/dashboard/wrapper/dashboardWrapper";

export default function DashboardPage() {
  const [defaultLayout, setDefaultLayout] = useState<number[] | undefined>(undefined);
  const [defaultCollapsed, setDefaultCollapsed] = useState<boolean | undefined>(undefined);
  const [currentSection, setCurrentSection] = useState<Section>("INBOX");

  useEffect(() => {
    const layout = localStorage.getItem("react-resizable-panels:layout:mail");
    const collapsed = localStorage.getItem("react-resizable-panels:collapsed");

    if (layout) {
      setDefaultLayout(JSON.parse(layout) as number[]);
    }
    if (collapsed) {
      setDefaultCollapsed(JSON.parse(collapsed) as boolean);
    }
  }, []);

  return (
    <MailProvider>
      <div className="hidden flex-col md:flex">
        <Mail
          defaultLayout={defaultLayout}
          defaultCollapsed={defaultCollapsed}
          navCollapsedSize={4}
          currentSection={currentSection}
          setSection={setCurrentSection}
          section={currentSection}
          searchQuery=""
        />
      </div>
    </MailProvider>
  );
}