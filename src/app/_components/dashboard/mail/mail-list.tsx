"use client";

import { cn } from "~/lib/utils";
import { Badge } from "~/app/_components/ui/badge";
import { ScrollArea } from "~/app/_components/ui/scroll-area";
import type { Mail } from "./types";
import { useMail } from "./mail-context";
import { safeFormatDistance } from "./utils";
import { Loader2 } from "lucide-react";
import React, { useRef, useCallback } from "react";

interface MailListProps {
  items: Mail[];
  isLoading?: boolean;
  onSelect?: (mailId: string) => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage?: () => void;
  isThreadView?: boolean;
}

export function MailList({
  items,
  isLoading,
  onSelect,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  isThreadView = true
}: MailListProps) {
  const [selectedMailId, setSelectedMailId] = useMail();
  const observer = useRef<IntersectionObserver | undefined>(undefined);

  // Group messages by thread if in thread view
  const groupedMessages = React.useMemo(() => {
    if (!isThreadView) return items;

    const threadMap = new Map<string, Mail[]>();
    items.forEach((mail) => {
      const threadId = mail.threadId ?? mail.id;
      const thread = threadMap.get(threadId) ?? [];
      thread.push(mail);
      threadMap.set(threadId, thread);
    });

    // Sort threads by the most recent message
    return Array.from(threadMap.values())
      .map(thread => {
        if (!thread[0]) return null;
        return {
          ...thread[0],
          text: thread.map(m => m.text ?? '').join('\n\n---\n\n'),
          date: thread[0].date ?? new Date().toISOString(),
          snippet: thread.map(m => m.snippet ?? '').join(' | ')
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [items, isThreadView]);

  const lastItemRef = useCallback((node: HTMLButtonElement | null) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage && fetchNextPage) {
        void fetchNextPage();
      }
    }, {
      root: null,
      rootMargin: '100px',
      threshold: 0.1,
    });
    if (node) observer.current.observe(node);
  }, [isLoading, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSelect = React.useCallback((mailId: string) => {
    setSelectedMailId({ selected: mailId });
    onSelect?.(mailId);
  }, [setSelectedMailId, onSelect]);

  return (
    <ScrollArea className="h-[calc(100vh-8rem)]">
      <div className="flex flex-col gap-2 p-4 overflow-hidden">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          groupedMessages.map((item, index) => (
            <button
              key={item.id}
              ref={index === groupedMessages.length - 1 ? lastItemRef : undefined}
              className={cn(
                "flex flex-col items-start gap-2 rounded-lg border p-3 text-left text-sm transition-all hover:bg-accent w-full overflow-hidden",
                selectedMailId === item.id && "bg-muted"
              )}
              onClick={() => handleSelect(item.id)}
            >
              <div className="flex w-full flex-col gap-1 min-w-0">
                <div className="flex items-center w-full">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="font-semibold truncate">{item.name}</div>
                    {!item.read && (
                      <span className="flex h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "ml-auto text-xs flex-shrink-0",
                      selectedMailId === item.id
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {safeFormatDistance(item.date)}
                  </div>
                </div>
                <div className="text-xs font-medium truncate">{item.subject}</div>
              </div>
              <div className="line-clamp-2 text-xs text-muted-foreground w-full">
                {item.snippet ?? ''}
              </div>
              {(item.labels ?? []).length > 0 ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {(item.labels ?? []).map((label) => (
                    <Badge key={label} variant={getBadgeVariantFromLabel(label)}>
                      {label}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </button>
          ))
        )}
        {isFetchingNextPage && (
          <div className="flex h-8 items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function getBadgeVariantFromLabel(label: string) {
  if (["work"].includes(label.toLowerCase())) {
    return "default";
  }

  if (["personal"].includes(label.toLowerCase())) {
    return "outline";
  }

  return "secondary";
}