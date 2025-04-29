import { format, formatDistanceToNow } from "date-fns";

export function safeFormat(date: string | Date, formatStr: string): string {
  try {
    return format(new Date(date), formatStr);
  } catch {
    return "";
  }
}

export function safeFormatDistance(date: string | Date): string {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return "";
  }
} 