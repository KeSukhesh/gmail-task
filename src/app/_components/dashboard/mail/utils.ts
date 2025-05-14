import { format, formatDistanceToNowStrict, parseISO } from "date-fns";

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

export function safeFormatDistance(
  dateString?: string | null,
  options?: { addSuffix?: boolean }
): string {
  if (!dateString) {
    return "";
  }
  try {
    let date: Date;

    // Check if it's a numeric string (likely a timestamp in milliseconds)
    if (/^\d+$/.test(dateString)) {
      date = new Date(Number(dateString));
    }
    // Try parsing ISO format (heuristic check)
    else if (dateString.includes('-') && dateString.includes('T')) {
      date = parseISO(dateString);
    }
    // Check for DD/MM/YYYY (heuristic check)
    else if (/^\d{2}\/\d{2}\/\d{4}/.test(dateString)) {
      const [day, month, year] = dateString.split("/");
      if (day && month && year) {
        date = new Date(`${year}-${month}-${day}`); // Safer to construct YYYY-MM-DD
      } else {
        throw new Error("Invalid DD/MM/YYYY format");
      }
    }
    // Fallback for other string formats that new Date() might understand
    else {
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) {
      throw new Error("Parsed date is invalid");
    }

    return formatDistanceToNowStrict(date, options);
  } catch (error) {
    console.error("Error parsing date for formatDistance:", dateString, error);
    // Fallback to original string or a more generic error message
    // The previous YYYY-MM-DD to MM/DD/YYYY fallback might be too specific if formats vary widely
    return "Invalid date"; // Or return dateString if you prefer to show the raw data on error
  }
}

export function truncateText(text: string | null | undefined, maxLength: number): string {
  if (!text) {
    return "";
  }
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + "...";
}
