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
    // Try parsing ISO format first
    if (dateString.includes('-') && dateString.includes('T')) { // A simple check for ISO-like strings
      date = parseISO(dateString);
    } else if (/^\d{2}\/\d{2}\/\d{4}/.test(dateString)) { // Check for DD/MM/YYYY
      const [day, month, year] = dateString.split("/");
      if (day && month && year) {
        // Ensure month is 0-indexed for Date constructor if using new Date(year, month, day)
        // Using YYYY-MM-DD string for new Date() is more reliable
        date = new Date(`${year}-${month}-${day}`);
      } else {
        throw new Error("Invalid DD/MM/YYYY format");
      }
    } else {
      // Fallback to direct parsing, or attempt other common formats if necessary
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) {
      throw new Error("Parsed date is invalid");
    }

    return formatDistanceToNowStrict(date, options);
  } catch (error) {
    console.error("Error parsing date for formatDistance:", dateString, error);
    // Keep your existing fallback for YYYY-MM-DD if you still need it,
    // but the primary parsing should be more robust now.
    const parts = dateString.split("T")[0]?.split("-");
    if (parts && parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      // Assuming the original intention was to display as MM/DD/YYYY if it was YYYY-MM-DD
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    return dateString; // Or a more generic fallback like "Invalid date"
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
