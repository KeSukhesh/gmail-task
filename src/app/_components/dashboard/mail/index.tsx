"use client";

import * as React from "react";
import { Search } from "lucide-react";
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
  TabsContent,
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

interface MailProps {
  defaultLayout?: number[];
  defaultCollapsed?: boolean;
  navCollapsedSize: number;
  currentSection: Section;
  setSection: (section: Section) => void;
  section: string;
  searchQuery: string;
}

export function Mail({
  defaultLayout = [20, 32, 48],
  defaultCollapsed = false,
  navCollapsedSize,
  currentSection,
  setSection,
  section,
  searchQuery,
}: MailProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const [selectedMailId] = useMail();

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
  const { data: messages, isLoading: isMessagesLoading } = api.gmail.listMessages.useQuery({
    ...(labelIds ? { labelIds } : {}),
    maxResults: 20,
  }, {
    enabled: !!section,
    refetchInterval: 30000
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

    return {
      id: message.id,
      name,
      email,
      subject: headers.find((h) => h.name === "Subject")?.value ?? "",
      text: message.snippet ?? "",
      date: message.internalDate ? new Date(Number(message.internalDate)).toLocaleDateString() : "",
      snippet: message.snippet ?? "",
      internalDate: message.internalDate ?? "",
      from,
      payload: message.payload,
      labelIds: message.labelIds ?? [],
      labels: (message.labelIds ?? []).map(getLabelName),
      read: !message.labelIds?.includes("UNREAD"),
    };
  }, []);

  const filteredAndTransformedMessages = React.useMemo(() => {
    return (messages?.messages ?? [])
      .filter((message) => {
        if (!message.payload) return false;
        const headers = message.payload.headers ?? [];
        const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
        const from = headers.find((h) => h.name === "From")?.value ?? "";
        return (
          subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          from.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
      .map(transformMessage)
      .filter((message): message is Mail => message !== null);
  }, [messages, searchQuery, transformMessage]);

  const selectedMessage = selectedMessageData ? transformMessage(selectedMessageData) : null;

  return (
    <TooltipProvider delayDuration={0}>
      <ResizablePanelGroup
        direction="horizontal"
        onLayout={(sizes: number[]) => {
          document.cookie = `react-resizable-panels:layout:mail=${JSON.stringify(
            sizes
          )}`;
        }}
        className="h-screen"
      >
        <ResizablePanel
          defaultSize={defaultLayout[0]}
          collapsedSize={navCollapsedSize}
          collapsible={true}
          minSize={15}
          maxSize={20}
          onCollapse={() => {
            setIsCollapsed(true);
            document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(
              true
            )}`;
          }}
          onResize={() => {
            setIsCollapsed(false);
            document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(
              false
            )}`;
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

            <div className="flex flex-1 flex-col overflow-y-auto p-3">
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
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={defaultLayout[1]} minSize={30}>
          <div className="flex h-full flex-col">
            <div className="flex h-14 items-center justify-between border-b px-4">
              <h1 className="text-xl font-bold">{currentSection.charAt(0) + currentSection.slice(1).toLowerCase().replace("_", " ")}</h1>
              <Tabs defaultValue="all">
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
            <div className="flex-1 overflow-auto">
              <div className="bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <form>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search" className="pl-8" />
                  </div>
                </form>
              </div>
              <Tabs defaultValue="all">
                <TabsContent value="all" className="m-0">
                  <MailList
                    items={filteredAndTransformedMessages}
                    isLoading={isMessagesLoading}
                  />
                </TabsContent>
                <TabsContent value="unread" className="m-0">
                  <MailList
                    items={filteredAndTransformedMessages.filter((item) => !item.read)}
                    isLoading={isMessagesLoading}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={defaultLayout[2]} minSize={30}>
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-auto">
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