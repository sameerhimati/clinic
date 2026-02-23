export const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: "Scheduled", className: "border-blue-300 text-blue-700 bg-blue-50" },
  ARRIVED: { label: "Arrived", className: "border-amber-300 text-amber-700 bg-amber-50" },
  IN_PROGRESS: { label: "In Progress", className: "border-blue-400 text-blue-800 bg-blue-100" },
  COMPLETED: { label: "Completed", className: "border-green-300 text-green-700 bg-green-50" },
  CANCELLED: { label: "Cancelled", className: "border-gray-300 text-gray-500 bg-gray-50 line-through" },
  NO_SHOW: { label: "No Show", className: "border-red-300 text-red-700 bg-red-50" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, className: "" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
