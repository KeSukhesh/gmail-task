"use client";

import * as React from "react";
import { cn } from "~/lib/utils";
import { Separator } from "~/app/_components/ui/separator";
import { Plus } from "lucide-react";
import { Button } from "~/app/_components/ui/button";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import type { Section } from "../wrapper/dashboardWrapper";

interface NavigationProps {
  currentSection: Section;
  setSection: (section: Section) => void;
  isCollapsed: boolean;
  showCompose?: boolean;
  onComposeClick?: () => void;
}

export function Navigation({
  currentSection,
  setSection,
  isCollapsed,
  showCompose = true,
  onComposeClick,
}: NavigationProps) {
  const { data: session } = useSession();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Image
            src="/lyra-logo.png"
            alt="Lyra Logo"
            width={28}
            height={28}
            className="rounded"
          />
          {!isCollapsed && (
            <span className="text-sm font-medium">LyraMail</span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-auto p-3">
        {showCompose && (
          <Button
            variant="outline"
            className={cn(
              "mb-4 w-full justify-start gap-2",
              isCollapsed ? "px-2" : "px-4"
            )}
            onClick={onComposeClick}
          >
            <Plus className="h-4 w-4" />
            {!isCollapsed && <span>Compose</span>}
          </Button>
        )}
        <Separator className="mb-4" />

        {!isCollapsed && (
          <h3 className="mb-3 px-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            Network
          </h3>
        )}

        <button
          onClick={() => setSection("PEOPLE")}
          className={cn(
            "flex items-center w-full rounded p-3 hover:bg-gray-100 dark:hover:bg-gray-800",
            isCollapsed ? "justify-center" : "gap-2",
            currentSection === "PEOPLE" ? "bg-gray-100 dark:bg-gray-800" : ""
          )}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          {!isCollapsed && <span className="text-sm">People</span>}
        </button>

        <button
          onClick={() => setSection("COMPANIES")}
          className={cn(
            "flex items-center w-full rounded p-3 hover:bg-gray-100 dark:hover:bg-gray-800",
            isCollapsed ? "justify-center" : "gap-2",
            currentSection === "COMPANIES" ? "bg-gray-100 dark:bg-gray-800" : ""
          )}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
          {!isCollapsed && <span className="text-sm">Companies</span>}
        </button>

        <Separator className="my-4" />

        {!isCollapsed && (
          <h3 className="mb-3 px-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            Emails
          </h3>
        )}

        <button
          onClick={() => setSection("INBOX")}
          className={cn(
            "flex items-center w-full rounded p-3 hover:bg-gray-100 dark:hover:bg-gray-800",
            isCollapsed ? "justify-center" : "gap-2",
            currentSection === "INBOX" ? "bg-gray-100 dark:bg-gray-800" : ""
          )}
        >
          <svg width="18" height="18" fill="none">
            <rect
              x="1"
              y="2"
              width="12"
              height="10"
              rx="2.5"
              stroke="#5C5E63"
              strokeWidth="1.1"
            />
            <path
              d="m3.1 4.6.51.535C5.164 6.765 5.94 7.58 6.925 7.59c.984.01 1.778-.787 3.368-2.382L10.9 4.6"
              stroke="#5C5E63"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
          </svg>
          {!isCollapsed && <span className="text-sm">Inbox</span>}
        </button>

        <button
          onClick={() => setSection("STARRED")}
          className={cn(
            "flex items-center w-full rounded p-3 hover:bg-gray-100 dark:hover:bg-gray-800",
            isCollapsed ? "justify-center" : "gap-2",
            currentSection === "STARRED" ? "bg-gray-100 dark:bg-gray-800" : ""
          )}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              stroke="#5C5E63"
              strokeWidth="1.1"
            />
          </svg>
          {!isCollapsed && <span className="text-sm">Starred</span>}
        </button>

        <button
          onClick={() => setSection("SENT")}
          className={cn(
            "flex items-center w-full rounded p-3 hover:bg-gray-100 dark:hover:bg-gray-800",
            isCollapsed ? "justify-center" : "gap-2",
            currentSection === "SENT" ? "bg-gray-100 dark:bg-gray-800" : ""
          )}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
            <path
              d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"
              stroke="#5C5E63"
              strokeWidth="1.1"
            />
          </svg>
          {!isCollapsed && <span className="text-sm">Sent</span>}
        </button>

        <button
          onClick={() => setSection("ALL_MAIL")}
          className={cn(
            "flex items-center w-full rounded p-3 hover:bg-gray-100 dark:hover:bg-gray-800",
            isCollapsed ? "justify-center" : "gap-2",
            currentSection === "ALL_MAIL" ? "bg-gray-100 dark:bg-gray-800" : ""
          )}
        >
          <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
            <rect
              x="1"
              y="1"
              width="12"
              height="12"
              rx="2"
              stroke="#5C5E63"
              strokeWidth="1.1"
            />
            <text x="7" y="5" textAnchor="middle" fontSize="4" fill="#5C5E63">
              A
            </text>
            <text x="7" y="9" textAnchor="middle" fontSize="4" fill="#5C5E63">
              M
            </text>
          </svg>
          {!isCollapsed && <span className="text-sm">All Mail</span>}
        </button>
      </div>

      {/* User Profile Section */}
      <div className="mt-auto border-t border-gray-200 dark:border-gray-700">
        {/* Profile */}
        <div
          className={`flex items-center ${isCollapsed ? "justify-center" : "gap-2"} p-3`}
        >
          {session?.user?.image && (
            <Image
              src={session.user.image}
              alt="Profile"
              width={32}
              height={32}
              className="rounded-full"
            />
          )}
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-medium">{session?.user?.name}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {session?.user?.email}
              </span>
            </div>
          )}
        </div>

        {/* Sign Out Button */}
        <button
          onClick={() => void signOut()}
          className={`flex items-center ${isCollapsed ? "justify-center" : "gap-2"} w-full rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-800`}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
            <path
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              stroke="#5C5E63"
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {!isCollapsed && <span className="text-sm">Sign out</span>}
        </button>
      </div>
    </div>
  );
} 