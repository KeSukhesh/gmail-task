"use client";

import React from 'react';
import { cn } from "~/lib/utils";
import { Badge } from "~/app/_components/ui/badge";
import type { Mail } from "./types";
import { safeFormatDistance, truncateText } from "./utils";

interface MailCardProps {
  mail: Mail;
  isSelected: boolean;
  onSelect: () => void;
}

// Utility function to get badge variant
function getBadgeVariantFromLabel(label: string) {
  if (["work"].includes(label.toLowerCase())) {
    return "default";
  }
  if (["personal"].includes(label.toLowerCase())) {
    return "outline";
  }
  return "secondary";
}

const SNIPPET_MAX_LENGTH = 100;

export const MailCard = React.forwardRef<HTMLButtonElement, MailCardProps>(
  ({ mail, isSelected, onSelect }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "flex flex-col items-start gap-2 rounded-lg border p-3 text-left text-sm transition-all hover:bg-accent w-full min-w-0", // Removed overflow-hidden here to see if it helps, can be re-added if needed
          isSelected && "bg-muted"
        )}
        onClick={onSelect}
      >
        <div className="flex items-center w-full min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden mr-2"> {/* Added flex-1 and mr-2 */}
            <div className="font-semibold truncate">{mail.name}</div>
            {!mail.read && (
              <span className="flex h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />
            )}
          </div>
          <div
            className={cn(
              "text-xs flex-shrink-0",
              isSelected ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {safeFormatDistance(mail.date)}
          </div>
        </div>

        <div className="text-xs font-medium truncate w-full">
          {mail.subject}
        </div>

        <div
          className="text-xs text-muted-foreground w-full break-words line-clamp-2" // Using line-clamp for controlled multi-line snippet
        >
          {/* Fallback to text if snippet is empty, then to a placeholder */}
          {truncateText(mail.snippet || mail.text || "No content", SNIPPET_MAX_LENGTH)}
        </div>

        {(mail.labels ?? []).length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mt-1"> {/* Reduced gap and added mt-1 */}
            {(mail.labels ?? []).map((label) => (
              <Badge key={label} variant={getBadgeVariantFromLabel(label)} className="px-1.5 py-0.5 text-[10px]"> {/* Adjusted badge padding and text size */}
                {label}
              </Badge>
            ))}
          </div>
        )}
      </button>
    );
  }
);

MailCard.displayName = "MailCard";