"use client";

import * as React from "react";
import { Separator } from "~/app/_components/ui/separator";
import { Navigation } from "../shared/navigation";
import type { Section } from "../wrapper/dashboardWrapper";

interface NetworkProps {
  type: Section;
  currentSection: Section;
  setSection: (section: Section) => void;
  onComposeClick: () => void;
}

export function Network({ type, currentSection, setSection, onComposeClick }: NetworkProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const handleSectionChange = (section: Section) => {
    setSection(section);
  };

  return (
    <div className="flex h-full">
      <div className="w-64 border-r">
        <Navigation
          currentSection={currentSection}
          setSection={handleSectionChange}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          showCompose={true}
          onComposeClick={onComposeClick}
        />
      </div>
      <div className="flex-1">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">
              {type === "PEOPLE" ? "People" : "Companies"}
            </h1>
          </div>
        </div>
        <Separator />
        <div className="flex-1 p-4">
          {/* Table will be added here later */}
        </div>
      </div>
    </div>
  );
}