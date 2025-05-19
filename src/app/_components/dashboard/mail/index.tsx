"use client";

import * as React from "react";
import { Search, RefreshCw } from "lucide-react";
import { cn } from "~/lib/utils";
import { Input } from "~/app/_components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "~/app/_components/ui/tabs";
import { TooltipProvider } from "~/app/_components/ui/tooltip";
import { MailDisplay } from "./mail-display";
import { MailList } from "./mail-list";
import type { Section } from "../wrapper/dashboardWrapper";
import { Button } from "~/app/_components/ui/button";
import { useMail } from "~/lib/hooks/useMail";
import { Switch } from "~/app/_components/ui/switch";
import { Navigation } from "../shared/navigation";

interface MailProps {
  type: Section;
  currentSection: Section;
  setSection: (section: Section) => void;
  onComposeClick: () => void;
}

export function Mail({
  type,
  currentSection,
  setSection,
  onComposeClick,
}: MailProps) {
  const [isNavCollapsed] = React.useState(false);
  const [isThreadView, setIsThreadView] = React.useState(true);
  const [localSearchQuery, setLocalSearchQuery] = React.useState("");
  const [isMailListCollapsed, setIsMailListCollapsed] = React.useState(false);

  const {
    tabValue,
    setTabValue,
    syncEmails,
    isMessagesLoading,
    isSyncing,
    filteredMessagesByTab,
    isSelectedMessageLoading,
    selectedMessage,
    handleMailSelect,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useMail({
    section: type,
    searchQuery: localSearchQuery,
    setSearchQuery: setLocalSearchQuery,
  });

  const handleSectionChange = (section: Section) => {
    setSection(section);
  };

  return (
    <div className="flex h-full">
      <div className="w-64 border-r">
        <Navigation
          currentSection={currentSection}
          setSection={handleSectionChange}
          isCollapsed={isNavCollapsed}
          showCompose={true}
          onComposeClick={onComposeClick}
        />
      </div>
      <div className="flex-1">
        <TooltipProvider delayDuration={0}>
          <div key={type} className="flex h-full items-stretch bg-background">
            <div
              className={cn(
                "flex flex-col h-full transition-all duration-300 ease-in-out relative border-r dark:border-slate-700 flex-shrink-0",
                selectedMessage && isMailListCollapsed
                  ? "w-0 opacity-0 p-0 border-r-0"
                  : "w-[400px]"
              )}
            >
              {!(selectedMessage && isMailListCollapsed) && (
                <>
                  <div className="flex h-14 items-center justify-between px-4 border-b">
                    <h1 className="text-xl font-bold">
                      {type === "INBOX"
                        ? "Inbox"
                        : type === "STARRED"
                        ? "Starred"
                        : type === "SENT"
                        ? "Sent"
                        : "All Mail"}
                    </h1>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 flex-shrink-0"
                      onClick={() => syncEmails()}
                      disabled={isSyncing}
                    >
                      <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                      <span>Sync Data</span>
                    </Button>
                  </div>
                  <div className="px-4 py-2 dark:bg-gray-800/50">
                    <form className="w-full">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search"
                          className="pl-8 bg-white w-full"
                          value={localSearchQuery}
                          onChange={(e) => setLocalSearchQuery(e.target.value)}
                        />
                      </div>
                    </form>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2 border-b">
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {isThreadView ? "Thread View" : "Message View"}
                      </span>
                      <Switch
                        checked={isThreadView}
                        onCheckedChange={setIsThreadView}
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <MailList
                      key={`${type}-list`}
                      items={filteredMessagesByTab}
                      isLoading={isMessagesLoading}
                      onSelect={handleMailSelect}
                      hasNextPage={hasNextPage}
                      isFetchingNextPage={isFetchingNextPage}
                      fetchNextPage={fetchNextPage}
                      isThreadView={isThreadView}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto">
                <MailDisplay
                  mail={selectedMessage}
                  isLoading={isSelectedMessageLoading}
                  isMailListCollapsed={isMailListCollapsed}
                  onToggleMailList={() => setIsMailListCollapsed(!isMailListCollapsed)}
                />
              </div>
            </div>
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}