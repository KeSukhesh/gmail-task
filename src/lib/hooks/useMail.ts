import * as React from "react";
import { api } from "~/trpc/react";
import { skipToken } from "@tanstack/react-query";
import { useMail as useMailContext } from "~/app/_components/dashboard/mail/mail-context";
import type { Mail } from "~/app/_components/dashboard/mail/types";
import type { Email, Attachment } from "@prisma/client";
import { useDebounce } from "./useDebounce";

interface UseMailProps {
  searchQuery?: string;
  section?: string;
  setSearchQuery?: (query: string) => void;
  defaultCollapsed?: boolean;
}

type EmailWithAttachments = Omit<Email, 'internalDate'> & {
  internalDate: string | null;
  attachments?: Attachment[];
};

export function useMail(props?: UseMailProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(props?.defaultCollapsed ?? false);
  const [selectedMailId, setSelectedMailId] = useMailContext();
  const [tabValue, setTabValue] = React.useState("all");
  const [localSearchQuery, setLocalSearchQuery] = React.useState(props?.searchQuery ?? "");
  const debouncedSearchQuery = useDebounce(localSearchQuery, 300);

  // Only include search functionality if props are provided
  const searchProps = React.useMemo(() => props ? {
    searchQuery: props.searchQuery ?? "",
    section: props.section ?? "inbox",
    setSearchQuery: props.setSearchQuery ?? (() => undefined),
  } : undefined, [props]);

  React.useEffect(() => {
    if (searchProps?.setSearchQuery) {
      searchProps.setSearchQuery(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery, searchProps]);

  const { mutate: syncEmailsMutate, isPending: isSyncing } = api.gmail.syncEmails.useMutation({
    onSuccess: () => {
      void refetchMessages();
    },
  });

  React.useEffect(() => {
    syncEmailsMutate();
  }, [syncEmailsMutate]);

  const {
    data: infiniteData,
    isLoading: isMessagesLoading,
    fetchNextPage: fetchNextPageData,
    hasNextPage,
    isFetchingNextPage: isFetchingNextPageData,
    refetch: refetchMessages,
  } = api.gmail.getInfiniteEmails.useInfiniteQuery(
    {
      limit: 20,
      query: searchProps?.searchQuery ?? undefined,
      labelIds: searchProps?.section ? [searchProps.section] : undefined,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: !!searchProps?.section,
      initialCursor: null,
    }
  );

  const emailsData = React.useMemo(() => {
    return infiniteData?.pages.flatMap((page) => page.emails) ?? [];
  }, [infiniteData]);

  const { data: selectedMessageData, isLoading: isSelectedMessageLoading } = api.gmail.getMessage.useQuery(
    selectedMailId ? { messageId: selectedMailId, format: "full" } : skipToken,
    { enabled: !!selectedMailId }
  );

  const transformMessage = React.useCallback(
    (message: EmailWithAttachments) => {
      const labelMap: Record<string, string> = {
        INBOX: "Inbox", SENT: "Sent", DRAFT: "Draft", SPAM: "Spam",
        TRASH: "Trash", STARRED: "Starred", IMPORTANT: "Important", UNREAD: "Unread",
      };

      const labelNames = message.labelIds.map((id) => labelMap[id] ?? id);
      const from = message.from ?? "";
      const nameRegex = /^"?([^"<]+)"?\s*</;
      const emailRegex = /<([^>]+)>/;
      const nameMatch = nameRegex.exec(from);
      const emailMatch = emailRegex.exec(from);
      const name = nameMatch?.[1]?.replace(/^"|"$/g, '').trim() ?? from;
      const email = emailMatch?.[1] ?? from;

      const isRead = !message.labelIds.includes("UNREAD");

      return {
        id: message.id,
        name,
        email,
        subject: message.subject ?? "",
        text: message.text ?? message.snippet ?? "",
        date: message.internalDate ? new Date(message.internalDate).toLocaleDateString() : "",
        snippet: message.snippet ?? "",
        internalDate: message.internalDate ?? "",
        from: message.from ?? "",
        payload: null,
        labelIds: message.labelIds ?? [],
        labels: labelNames,
        read: isRead,
        htmlUrl: message.htmlUrl ?? null,
        threadId: message.threadId ?? null,
        attachments: message.attachments?.map(att => ({
          id: att.id,
          filename: att.filename,
          contentType: att.contentType,
          size: att.size,
          url: att.url,
          cid: att.cid,
        })) ?? [],
      } as Mail;
    },
    []
  );

  const filteredAndTransformedMessages = emailsData
    .map(transformMessage)
    .filter((message): message is Mail => message !== null);

  const filteredMessagesByTab = React.useMemo(() => {
    return tabValue === "unread"
      ? filteredAndTransformedMessages.filter((item) => !item.read)
      : filteredAndTransformedMessages;
  }, [filteredAndTransformedMessages, tabValue]);

  const { mutate: markAsRead } = api.gmail.markAsRead.useMutation({
    onSuccess: () => { void refetchMessages(); },
  });

  const handleMailSelect = React.useCallback((mailId: string) => {
    setSelectedMailId({ selected: mailId });
    markAsRead({ messageId: mailId });
  }, [setSelectedMailId, markAsRead]);

  const selectedMessage = selectedMessageData
    ? transformMessage(selectedMessageData as unknown as EmailWithAttachments)
    : null;

  const handleFetchNextPage = async () => {
    if (hasNextPage) {
      await fetchNextPageData();
    }
  };
  console.log("[MESSAGE]", selectedMessage);
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
    syncEmails: syncEmailsMutate,
    isMessagesLoading,
    filteredMessagesByTab,
    isSelectedMessageLoading,
    selectedMessage,
    handleMailSelect,
    hasNextPage,
    isFetchingNextPage: isFetchingNextPageData,
    fetchNextPage: handleFetchNextPage,
    ...(searchProps ?? {}),
  };
}

export function useComposeMail() {
  const utils = api.useUtils();

  const sendEmail = api.gmail.sendEmail.useMutation({
    onSuccess: () => {
      void utils.gmail.invalidate();
    },
  });

  return {
    sendEmail,
  };
}
