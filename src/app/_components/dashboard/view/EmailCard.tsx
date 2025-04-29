"use client";

import { Card, CardContent, CardHeader, CardTitle } from "~/app/_components/ui/card";
import type { GmailMessage } from "./EmailView";

interface EmailCardProps {
  email: GmailMessage;
  isSelected: boolean;
  onClick: () => void;
}

export function EmailCard({ email, isSelected, onClick }: EmailCardProps) {
  return (
    <Card 
      className={`cursor-pointer transition-colors hover:bg-gray-50 ${
        isSelected ? "bg-gray-50" : ""
      }`}
      onClick={onClick}
    >
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold truncate">
            {email.subject ?? "(No subject)"}
          </CardTitle>
          <span className="text-xs text-gray-500">
            {email.internalDate
              ? new Date(Number(email.internalDate)).toLocaleString()
              : ""}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-sm text-gray-600 line-clamp-2">
          {email.snippet ?? "No snippet available"}
        </p>
      </CardContent>
    </Card>
  );
} 