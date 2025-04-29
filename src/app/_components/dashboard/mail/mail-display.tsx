"use client";

import { useState, useEffect } from "react";
import {
  Archive,
  ArchiveX,
  Clock,
  Forward,
  MoreVertical,
  Reply,
  ReplyAll,
  Trash2,
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "../../../../components/ui/button";
import { Calendar } from "../../../../components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../../components/ui/dropdown-menu";
import { Label } from "../../../../components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../../components/ui/popover";
import { Separator } from "../../../../components/ui/separator";
import { Switch } from "../../../../components/ui/switch";
import { Textarea } from "../../../../components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../../components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "../../../../components/ui/avatar";
import type { Mail } from "./types";
import { safeFormat } from "./utils";
import { api } from "~/trpc/react";
import { useMail } from "./mail-context";

interface MailDisplayProps {
  mail: Mail | null;
  isLoading?: boolean;
}

export function MailDisplay({ mail, isLoading }: MailDisplayProps) {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [isLoadingHtml, setIsLoadingHtml] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [, setSelectedMailId] = useMail();
  const utils = api.useUtils();

  const { mutate: deleteMessage } = api.gmail.deleteMessage.useMutation({
    onMutate: async (deletedMessage) => {
      // Cancel any outgoing refetches
      await utils.gmail.listMessages.cancel();
      await utils.gmail.getMessage.cancel();

      // Snapshot the previous value
      const previousMessages = utils.gmail.listMessages.getData({});

      // Optimistically update the list
      utils.gmail.listMessages.setData({}, (old) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.filter((msg) => msg.id !== deletedMessage.messageId),
        };
      });

      // Clear the selected message
      setSelectedMailId({ selected: null });

      return { previousMessages };
    },
    onError: (err, deletedMessage, context) => {
      // Revert the optimistic update
      if (context?.previousMessages) {
        utils.gmail.listMessages.setData({}, context.previousMessages);
      }
    },
    onSettled: () => {
      // Sync with server
      void utils.gmail.listMessages.invalidate();
    },
  });

  const { mutate: replyMessage, isPending: isReplyingPending } = api.gmail.replyMessage.useMutation({
    onMutate: () => {
      console.log("Starting reply mutation...");
    },
    onSuccess: (data) => {
      console.log("Reply sent successfully:", data);
      setReplyContent("");
      void utils.gmail.listMessages.invalidate();
    },
    onError: (error) => {
      console.error("Failed to send reply:", error);
    },
  });

  useEffect(() => {
    if (mail?.htmlUrl) {
      setIsLoadingHtml(true);
      fetch(mail.htmlUrl)
        .then((response) => response.text())
        .then((html) => {
          // Process HTML to handle images
          const processedHtml = processHtmlContent(html);
          setHtmlContent(processedHtml);
        })
        .catch((error) => {
          console.error("Error fetching HTML:", error);
          setHtmlContent(null);
        })
        .finally(() => setIsLoadingHtml(false));
    } else {
      setHtmlContent(null);
    }
  }, [mail?.htmlUrl]);

  // Function to process HTML content and handle images
  const processHtmlContent = (html: string): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Handle images
    const images = doc.getElementsByTagName('img');
    for (const img of Array.from(images)) {
      const src = img.getAttribute('src');
      if (src) {
        // Handle data URIs (they're already base64 encoded)
        if (src.startsWith('data:')) {
          continue;
        }
        
        // Handle relative URLs
        if (src.startsWith('/')) {
          img.setAttribute('src', `https://mail.google.com${src}`);
        }
        
        // Handle cid: URLs (inline attachments)
        if (src.startsWith('cid:')) {
          const cid = src.replace('cid:', '');
          // We could fetch the attachment here if needed
          img.setAttribute('src', `data:image/png;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7`); // 1x1 transparent pixel as fallback
        }

        // Add loading and error handling
        img.setAttribute('loading', 'lazy');
        img.setAttribute('onerror', 'this.onerror=null; this.src="data:image/png;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";');
      }
    }

    return doc.documentElement.outerHTML;
  };

  const getInitials = (name: string): string => {
    // Remove quotes and trim whitespace
    const cleanName = name.replace(/["']/g, '').trim();
    // Split by spaces and filter out empty strings
    const words = cleanName.split(/\s+/).filter(Boolean);
    // Take first letter of first two words
    return words.slice(0, 2).map(word => word[0]).join('');
  };

  const handleDelete = () => {
    if (mail) {
      deleteMessage({ messageId: mail.id });
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted, reply content:", replyContent);
    
    if (!mail || !replyContent.trim()) {
      console.log("No mail selected or empty reply content");
      return;
    }
    
    console.log("Sending reply for message:", mail.id);
    replyMessage({
      messageId: mail.id,
      threadId: mail.threadId ?? mail.id,
      content: replyContent.trim(),
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const today = new Date();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center p-2 h-[55]">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" disabled={!mail}>
                <Archive className="h-4 w-4" />
                <span className="sr-only">Archive</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Archive</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" disabled={!mail}>
                <ArchiveX className="h-4 w-4" />
                <span className="sr-only">Move to junk</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Move to junk</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" disabled={!mail} onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Move to trash</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Move to trash</TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="mx-1 h-6" />
          <Tooltip>
            <Popover>
              <PopoverTrigger asChild>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={!mail}>
                    <Clock className="h-4 w-4" />
                    <span className="sr-only">Snooze</span>
                  </Button>
                </TooltipTrigger>
              </PopoverTrigger>
              <PopoverContent className="flex w-[535px] p-0">
                <div className="flex flex-col gap-2 border-r px-2 py-4">
                  <div className="px-4 text-sm font-medium">Snooze until</div>
                  <div className="grid min-w-[250px] gap-1">
                    <Button variant="ghost" className="justify-start font-normal">
                      Later today{" "}
                      <span className="ml-auto text-muted-foreground">
                        {safeFormat(new Date(today.setHours(today.getHours() + 4)), "E, h:m b")}
                      </span>
                    </Button>
                    <Button variant="ghost" className="justify-start font-normal">
                      Tomorrow
                      <span className="ml-auto text-muted-foreground">
                        {safeFormat(new Date(today.setDate(today.getDate() + 1)), "E, h:m b")}
                      </span>
                    </Button>
                    <Button variant="ghost" className="justify-start font-normal">
                      Next week
                      <span className="ml-auto text-muted-foreground">
                        {safeFormat(new Date(today.setDate(today.getDate() + 7)), "E, h:m b")}
                      </span>
                    </Button>
                  </div>
                </div>
                <div className="p-2">
                  <Calendar />
                </div>
              </PopoverContent>
            </Popover>
            <TooltipContent>Snooze</TooltipContent>
          </Tooltip>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" disabled={!mail}>
                <Reply className="h-4 w-4" />
                <span className="sr-only">Reply</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reply</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" disabled={!mail}>
                <ReplyAll className="h-4 w-4" />
                <span className="sr-only">Reply all</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reply all</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" disabled={!mail}>
                <Forward className="h-4 w-4" />
                <span className="sr-only">Forward</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Forward</TooltipContent>
          </Tooltip>
        </div>
        <Separator orientation="vertical" className="mx-2 h-6" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" disabled={!mail}>
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">More</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Mark as unread</DropdownMenuItem>
            <DropdownMenuItem>Star thread</DropdownMenuItem>
            <DropdownMenuItem>Add label</DropdownMenuItem>
            <DropdownMenuItem>Mute thread</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Separator />
      {mail ? (
        <div className="flex flex-1 flex-col">
          <div className="flex items-start p-4">
            <div className="flex items-start gap-4 text-sm">
              <Avatar>
                <AvatarImage alt={mail.name} />
                <AvatarFallback>
                  {getInitials(mail.name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid gap-1">
                <div className="font-semibold">{mail.name}</div>
                <div className="line-clamp-1 text-xs">{mail.subject}</div>
                <div className="line-clamp-1 text-xs">
                  <span className="font-medium">Reply-To:</span> {mail.email}
                </div>
              </div>
            </div>
            {mail.date && (
              <div className="ml-auto text-xs text-muted-foreground">
                {safeFormat(mail.date, "PPpp")}
              </div>
            )}
          </div>
          <Separator />
          <div className="flex-1 whitespace-pre-wrap p-4 text-sm">
            {isLoadingHtml ? (
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : htmlContent ? (
              <div
                className="prose prose-sm max-w-none dark:prose-invert [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:shadow-sm"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            ) : (
              mail.text
            )}
          </div>
          <Separator className="mt-auto" />
          <div className="p-4">
            <form onSubmit={handleReply}>
              <div className="grid gap-4">
                <Textarea
                  className="p-4"
                  placeholder={`Reply ${mail.name}...`}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  disabled={isReplyingPending}
                />
                <div className="flex items-center">
                  <Button
                    type="submit"
                    size="sm"
                    className="ml-auto"
                    disabled={!replyContent.trim() || isReplyingPending}
                  >
                    {isReplyingPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Send"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-muted-foreground">
          No message selected
        </div>
      )}
    </div>
  );
}