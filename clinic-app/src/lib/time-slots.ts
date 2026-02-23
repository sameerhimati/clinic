export type TimePeriod = "Morning" | "Afternoon" | "Evening" | "Unscheduled";

export const PERIOD_ORDER: TimePeriod[] = ["Morning", "Afternoon", "Evening", "Unscheduled"];

/**
 * Parse a time slot string into minutes since midnight.
 * Supports: "10:00 AM", "2 PM", "14:00", "2:30 PM"
 * Returns null if unparseable.
 */
function parseToMinutes(timeSlot: string): number | null {
  const s = timeSlot.trim();

  // 12-hour: "10:00 AM", "2:30 PM", "2 PM"
  const match12 = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1]);
    const minutes = match12[2] ? parseInt(match12[2]) : 0;
    const isPM = match12[3].toUpperCase() === "PM";
    if (hours === 12) hours = 0;
    if (isPM) hours += 12;
    return hours * 60 + minutes;
  }

  // 24-hour: "14:00", "9:30"
  const match24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1]);
    const minutes = parseInt(match24[2]);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return hours * 60 + minutes;
    }
  }

  return null;
}

/**
 * Classify a time slot string into a period of day.
 */
export function classifyTimeSlot(timeSlot: string | null): TimePeriod {
  if (!timeSlot) return "Unscheduled";
  const lower = timeSlot.trim().toLowerCase();

  // Keyword matches
  if (lower === "morning") return "Morning";
  if (lower === "afternoon") return "Afternoon";
  if (lower === "evening") return "Evening";

  const minutes = parseToMinutes(timeSlot);
  if (minutes === null) return "Unscheduled";

  if (minutes < 720) return "Morning";      // before 12:00 PM
  if (minutes < 1020) return "Afternoon";    // before 5:00 PM
  return "Evening";
}

/**
 * Sort key for ordering appointments within a period.
 * Returns minutes since midnight, or 9999 for unparseable.
 */
export function timeSlotSortKey(timeSlot: string | null): number {
  if (!timeSlot) return 9999;
  const minutes = parseToMinutes(timeSlot);
  return minutes ?? 9999;
}
