import { api } from "~/trpc/react";
import { useState } from "react";
import type { Mail } from "~/app/_components/dashboard/mail/types";
import { skipToken } from "@tanstack/react-query";

interface UseMailDisplayProps {
  mail: Mail | null;
}

export function useMailDisplay({ mail }: UseMailDisplayProps) {
  const [replyContent, setReplyContent] = useState("");

  const { data, isLoading } = api.gmail.getEmailHtml.useQuery(
    mail?.htmlUrl
      ? { key: mail.htmlUrl.replace(/^.*\/(emails\/.*\.html)$/, "$1") }
      : skipToken,
    { enabled: !!mail?.htmlUrl }
  );

  const htmlContent = (data?.html) ?? null;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getInitials = (name: string): string => {
    const cleanName = name.replace(/["']/g, '').trim();
    const words = cleanName.split(/\s+/).filter(Boolean);
    return words.slice(0, 2).map(word => word[0]).join('');
  };

  return {
    htmlContent,
    isLoadingHtml: isLoading,
    replyContent,
    setReplyContent,
    formatFileSize,
    getInitials,
  } as const;
}
