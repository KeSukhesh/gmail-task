"use client";

import * as React from "react";
import { Search, RefreshCw } from "lucide-react";
import { api } from "~/trpc/react";
import { skipToken } from "@tanstack/react-query";
import { cn } from "../../../../lib/utils";
import { Input } from "../../../../components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../../../../components/ui/resizable";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "../../../../components/ui/tabs";
import { TooltipProvider } from "../../../../components/ui/tooltip";
import { MailDisplay } from "./mail-display";
import { MailList } from "./mail-list";
import type { Mail, MessagePart } from "./types";
import { useMail } from "./mail-context";
import type { Section } from "../wrapper/dashboardWrapper";
import Image from "next/image";
import { Button } from "../../../../components/ui/button";
import { signOut, useSession } from "next-auth/react";
import { useDebounce } from "~/hooks/useDebounce";

interface MailProps {
  defaultLayout?: number[];
  defaultCollapsed?: boolean;
  navCollapsedSize: number;
  currentSection: Section;
  setSection: (section: Section) => void;
  section: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function Mail({
  defaultLayout = [20, 32, 48],
  defaultCollapsed = false,
  navCollapsedSize,
  currentSection,
  setSection,
  section,
  searchQuery,
  setSearchQuery,
}: MailProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const [selectedMailId, setSelectedMailId] = useMail();
  const [tabValue, setTabValue] = React.useState("all");
  const { data: session } = useSession();
  const [localSearchQuery, setLocalSearchQuery] = React.useState(searchQuery);
  const debouncedSearchQuery = useDebounce(localSearchQuery, 300);

  const { mutate: syncEmails, isPending: isSyncing } = api.gmail.syncEmails.useMutation({
    onSuccess: () => {
      console.log("[SYNC] Synced!");
      void refetchMessages();
    },
    onError: (error) => {
      console.error("[SYNC] Failed to sync emails:", error);
    }
  });

  React.useEffect(() => {
    syncEmails();
  }, [syncEmails]);

  React.useEffect(() => {
    setSearchQuery(debouncedSearchQuery);
  }, [debouncedSearchQuery, setSearchQuery]);

  const getLabelId = (section: string): string => {
    switch (section) {
      case "INBOX":
        return "INBOX";
      case "SENT":
        return "SENT";
      case "STARRED":
        return "STARRED";
      case "DRAFT":
        return "DRAFT";
      case "SPAM":
        return "SPAM";
      case "TRASH":
        return "TRASH";
      default:
        return "INBOX";
    }
  };

  const labelIds = section === "ALL_MAIL" ? undefined : [getLabelId(section)];
  const { data: messages, isLoading: isMessagesLoading, refetch: refetchMessages } = api.gmail.listMessages.useQuery({
    ...(labelIds ? { labelIds } : {}),
    maxResults: 20,
    query: searchQuery || undefined,
  }, {
    enabled: !!section
  });

  const { data: selectedMessageData, isLoading: isSelectedMessageLoading } = api.gmail.getMessage.useQuery(
    selectedMailId ? { messageId: selectedMailId, format: "full" } : skipToken,
    { enabled: !!selectedMailId }
  );

  const transformMessage = React.useCallback((message: {
    id?: string | null;
    snippet?: string | null;
    internalDate?: string | null;
    payload?: MessagePart;
    labelIds?: string[] | null;
    html?: string | null;
    text?: string | null;
    htmlUrl?: string | null;
    threadId?: string | null;
    attachments?: Array<{
      id: string;
      filename: string;
      contentType: string;
      size: number;
      url: string;
      cid: string | null;
    }>;
  }): Mail | null => {
    const getLabelName = (labelId: string): string => {
      const labelMap: Record<string, string> = {
        "INBOX": "Inbox",
        "SENT": "Sent",
        "DRAFT": "Draft",
        "SPAM": "Spam",
        "TRASH": "Trash",
        "STARRED": "Starred",
        "IMPORTANT": "Important",
        "UNREAD": "Unread",
      };
      return labelMap[labelId] ?? labelId;
    };

    if (!message.id || !message.payload) return null;
    const headers = message.payload.headers ?? [];
    const from = headers.find((h) => h.name === "From")?.value ?? "";
    const name = from.split("<")[0]?.trim() ?? from;
    const emailMatch = /<([^>]+)>/.exec(from);
    const email = emailMatch?.[1] ?? from;

    // If this is the selected message, consider it read
    const isRead = selectedMailId === message.id || !message.labelIds?.includes("UNREAD");

    return {
      id: message.id,
      name,
      email,
      subject: headers.find((h) => h.name === "Subject")?.value ?? "",
      text: message.text ?? message.snippet ?? "",
      date: message.internalDate ? new Date(Number(message.internalDate)).toLocaleDateString() : "",
      snippet: message.snippet ?? "",
      internalDate: message.internalDate ?? "",
      from,
      payload: message.payload,
      labelIds: message.labelIds ?? [],
      labels: (message.labelIds ?? []).map(getLabelName),
      read: isRead,
      htmlUrl: message.htmlUrl ?? null,
      threadId: message.threadId ?? null,
      attachments: message.attachments ?? [],
    };
  }, [selectedMailId]);

  const filteredAndTransformedMessages = React.useMemo(() => {
    return (messages?.messages ?? [])
      .map(transformMessage)
      .filter((message): message is Mail => message !== null);
  }, [messages, transformMessage]);

  const filteredMessagesByTab = React.useMemo(() => {
    if (tabValue === "unread") {
      return filteredAndTransformedMessages.filter((item) => !item.read);
    }
    return filteredAndTransformedMessages;
  }, [filteredAndTransformedMessages, tabValue]);

  const { mutate: markAsRead } = api.gmail.markAsRead.useMutation({
    onSuccess: () => {
      void refetchMessages();
    },
  });

  const handleMailSelect = React.useCallback((mailId: string) => {
    setSelectedMailId({ selected: mailId });
    markAsRead({ messageId: mailId });
  }, [setSelectedMailId, markAsRead]);

  const selectedMessage = selectedMessageData ? transformMessage(selectedMessageData) : null;
  console.log("selected message formatted", selectedMessage);
  console.log("raw message data", selectedMessageData);
  return (
    <TooltipProvider delayDuration={0}>
      <ResizablePanelGroup
        direction="horizontal"
        onLayout={(sizes: number[]) => {
          document.cookie = `react-resizable-panels:layout:mail=${JSON.stringify(sizes)}`;
        }}
        className="h-full"
      >
        <ResizablePanel
          defaultSize={defaultLayout[0]}
          collapsedSize={navCollapsedSize}
          collapsible={true}
          minSize={15}
          maxSize={20}
          onCollapse={() => {
            setIsCollapsed(true);
            document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(true)}`;
          }}
          onResize={() => {
            setIsCollapsed(false);
            document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(false)}`;
          }}
          className={cn(
            isCollapsed &&
              "min-w-[50px] transition-all duration-300 ease-in-out"
          )}
        >
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

            <div className="flex flex-1 flex-col overflow-y-hidden p-3">
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
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={defaultLayout[1]} minSize={30}>
          <div className="flex h-full flex-col">
            <div className="flex h-14 items-center justify-between border-b px-4">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold">{currentSection.charAt(0) + currentSection.slice(1).toLowerCase().replace("_", " ")}</h1>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => syncEmails()}
                  disabled={isSyncing}
                >
                  <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                  <span>Sync Emails</span>
                </Button>
              </div>
              <Tabs value={tabValue} onValueChange={setTabValue}>
                <TabsList>
                  <TabsTrigger
                    value="all"
                    className="text-zinc-600 dark:text-zinc-200"
                  >
                    All mail
                  </TabsTrigger>
                  <TabsTrigger
                    value="unread"
                    className="text-zinc-600 dark:text-zinc-200"
                  >
                    Unread
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="flex-1 overflow-y-auto bg-[#F9FAFB]">
              <div className="bg-[#F9FAFB] p-4 backdrop-blur">
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      name="search"
                      placeholder="Search emails..." 
                      className="pl-8"
                      value={localSearchQuery}
                      onChange={(e) => setLocalSearchQuery(e.target.value)}
                    />
                  </div>
                </form>
              </div>
              <MailList
                items={filteredMessagesByTab}
                isLoading={isMessagesLoading}
                onSelect={handleMailSelect}
              />
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={defaultLayout[2]} minSize={30}>
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-hidden">
              <MailDisplay
                mail={selectedMessage}
                isLoading={isSelectedMessageLoading}
              />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </TooltipProvider>
  );
}