"use client";

import type { Mail } from "./types";
import { useMail } from "./mail-context";
import { Loader2 } from "lucide-react";
import React, { useRef, useCallback } from "react";
import { MailCard } from "./mail-card";

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
    // <ScrollArea className="h-full max-w-full"> // ScrollArea removed
      <div className="flex flex-col gap-2 p-4 w-full h-full overflow-y-auto">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          groupedMessages.map((item, index) => (
            <MailCard
              key={item.id} // Use item.id for the key
              ref={index === groupedMessages.length - 1 ? lastItemRef : undefined}
              mail={item}
              isSelected={selectedMailId === item.id}
              onSelect={() => handleSelect(item.id)}
            />
          ))
        )}
        {isFetchingNextPage && (
          <div className="flex h-8 items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
  );
}
