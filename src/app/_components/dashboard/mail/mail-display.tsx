"use client";

import {
  Archive,
  ArchiveX,
  Clock,
  Forward,
  MoreVertical,
  Reply,
  ReplyAll,
  Trash2,
  Paperclip,
  Download,
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { Button } from "~/app/_components/ui/button";
import { Calendar } from "~/app/_components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/app/_components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/app/_components/ui/popover";
import { Separator } from "~/app/_components/ui/separator";
import { Textarea } from "~/app/_components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/app/_components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "~/app/_components/ui/avatar";
import type { Mail } from "./types";
import { safeFormat } from "./utils";
import { useMailDisplay } from "~/lib/hooks/useMailDisplay";

interface MailDisplayProps {
  mail: Mail | null;
  isLoading?: boolean;
}

export function MailDisplay({ mail, isLoading }: MailDisplayProps) {
  const {
    htmlContent,
    isLoadingHtml,
    replyContent,
    setReplyContent,
    formatFileSize,
    getInitials,
  } = useMailDisplay({ mail });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const today = new Date();
  console.log("[DEBUG] Mail:", mail);
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
              <Button variant="ghost" size="icon" disabled={!mail}>
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
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex items-start justify-between p-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-10 w-10">
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
            {mail.internalDate && (
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(mail.internalDate).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: 'numeric',
                  second: 'numeric',
                  hour12: true
                })}
              </div>
            )}
          </div>
          <Separator />
          <div className="flex-1 overflow-y-auto whitespace-pre-wrap p-4 text-sm">
            {isLoadingHtml ? (
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : htmlContent ? (
              <div
                className="w-full overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            ) : (
              mail.text
            )}

            {/* Attachments section */}
            {mail.attachments && mail.attachments.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Paperclip className="h-4 w-4" />
                  Attachments ({mail.attachments.length})
                </div>
                <div className="mt-2 grid gap-2">
                  {mail.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between rounded-lg border p-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">{attachment.filename}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.size)}
                        </div>
                      </div>
                      <a
                        href={attachment.url}
                        download={attachment.filename}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Separator className="mt-auto" />
          <div className="p-4">
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="grid gap-4">
                <Textarea
                  className="p-4"
                  placeholder={`Reply to "${mail.name}"...`}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                />
                <div className="flex items-center">
                  <Button
                    type="submit"
                    size="sm"
                    className="ml-auto"
                    disabled={!replyContent.trim()}
                  >
                    Send
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