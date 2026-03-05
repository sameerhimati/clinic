import { format, isToday, isTomorrow, isYesterday } from "date-fns";

/**
 * Title-case a name for display. DB stores uppercase; this is display-only.
 * Preserves abbreviations like "M.S." or "B.D.S."
 */
export function toTitleCase(name: string): string {
  if (!name) return name;
  return name
    .split(" ")
    .map((word) => {
      // Keep abbreviations uppercase: "M.S.", "B.D.S.", etc.
      if (/^[A-Z]\.([A-Z]\.?)*$/.test(word)) return word;
      // Normal word: capitalize first letter, lowercase rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/** "01 Mar 2026" — for lists and tables */
export function formatDate(date: string | Date): string {
  return format(toDate(date), "dd MMM yyyy");
}

/** "01 Mar 2026, 2:30 PM" — for timestamps */
export function formatDateTime(date: string | Date): string {
  return format(toDate(date), "dd MMM yyyy, h:mm a");
}

/** "Today" / "Yesterday" / "Tomorrow" / "Mon, 03 Mar" — for recent dates */
export function formatRelativeDate(date: string | Date): string {
  const d = toDate(date);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEE, dd MMM");
}

/** "Saturday, 1 March 2026" — for dashboard greeting */
export function formatFullDate(date: string | Date): string {
  return format(toDate(date), "EEEE, d MMMM yyyy");
}

/** Get display label for a visit — custom label takes priority */
export function getVisitLabel(visit: { customLabel?: string | null; operation?: { name: string } | null; stepLabel?: string | null }): string {
  return visit.customLabel || visit.operation?.name || "Visit";
}

/** Safely coerce string or Date to Date */
function toDate(date: string | Date): Date {
  if (date instanceof Date) return date;
  // If it's a date-only string (yyyy-MM-dd), append time to avoid timezone shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return new Date(date + "T00:00:00");
  return new Date(date);
}
