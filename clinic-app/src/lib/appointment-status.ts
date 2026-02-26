/** Appointment status types and valid transitions — shared between server actions and UI */

export type AppointmentStatus =
  | "SCHEDULED"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type StatusTransition = {
  status: AppointmentStatus;
  label: string;
};

/** Valid status transitions with human-readable labels */
export const VALID_TRANSITIONS: Record<string, StatusTransition[]> = {
  SCHEDULED: [
    { status: "ARRIVED", label: "Mark Arrived" },
    { status: "CANCELLED", label: "Cancel" },
    { status: "NO_SHOW", label: "Mark No Show" },
  ],
  ARRIVED: [
    { status: "IN_PROGRESS", label: "Start Visit" },
    { status: "CANCELLED", label: "Cancel" },
  ],
  IN_PROGRESS: [
    { status: "COMPLETED", label: "Complete" },
    { status: "CANCELLED", label: "Cancel" },
  ],
};

/** Get allowed next statuses (status strings only) for server-side validation */
export function getAllowedNextStatuses(currentStatus: string): string[] {
  return (VALID_TRANSITIONS[currentStatus] || []).map((t) => t.status);
}
