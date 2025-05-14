"use client";

import * as React from "react";
import { Network } from "./index";
import type { Section } from "../wrapper/dashboardWrapper";

interface NetworkWrapperProps {
  currentSection: Section;
  setSection: (section: Section) => void;
  onComposeClick: () => void;
}

export function NetworkWrapper({
  currentSection,
  setSection,
  onComposeClick,
}: NetworkWrapperProps) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <Network
        type={currentSection}
        currentSection={currentSection}
        setSection={setSection}
        onComposeClick={onComposeClick}
      />
    </div>
  );
} 