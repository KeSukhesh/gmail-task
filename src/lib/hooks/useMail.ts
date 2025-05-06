import * as React from "react";
import { api } from "~/trpc/react";
import { skipToken } from "@tanstack/react-query";
import { useMail as useMailContext } from "~/app/_components/dashboard/mail/mail-context";
import type { Mail, MessagePart } from "~/app/_components/dashboard/mail/types";
import { useDebounce } from "./useDebounce";

interface UseMailProps {
  section: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  defaultCollapsed?: boolean;
}

export function useMail({ section, searchQuery, setSearchQuery, defaultCollapsed = false }: UseMailProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const [selectedMailId, setSelectedMailId] = useMailContext();
  const [tabValue, setTabValue] = React.useState("all");
  const [localSearchQuery, setLocalSearchQuery] = React.useState(searchQuery);
  const debouncedSearchQuery = useDebounce(localSearchQuery, 300);

  React.useEffect(() => {
    setSearchQuery(debouncedSearchQuery);
  }, [debouncedSearchQuery, setSearchQuery]);

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

  return {
    isCollapsed,
    setIsCollapsed,
    selectedMailId,
    setSelectedMailId,
    tabValue,
    setTabValue,
    localSearchQuery,
    setLocalSearchQuery,
    isSyncing,
    syncEmails,
    isMessagesLoading,
    filteredMessagesByTab,
    isSelectedMessageLoading,
    selectedMessage,
    handleMailSelect,
  };
}