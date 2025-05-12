import { format, formatDistanceToNow } from "date-fns";

function parseIfNeeded(input: string | Date): Date {
  if (typeof input === "string" && /^\d{2}\/\d{2}\/\d{4}/.test(input)) {
    const [day, month, year] = input.split("/");
    return new Date(`${year}-${month}-${day}`);
  }
  return new Date(input);
}

export function safeFormat(date: string | Date, formatStr: string): string {
  try {
    return format(parseIfNeeded(date), formatStr);
  } catch {
    return "";
  }
}

export function safeFormatDistance(date: string | Date): string {
  console.log("[DEBUG]", date);
  try {
    return formatDistanceToNow(parseIfNeeded(date), { addSuffix: true });
  } catch {
    return "";
  }
}
