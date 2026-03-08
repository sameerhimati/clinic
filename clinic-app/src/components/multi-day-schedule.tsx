"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, CalendarDays } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { toTitleCase } from "@/lib/format";

type FutureDayAppointment = {
  id: number;
  patientId: number;
  patientCode: number | null;
  patientName: string;
  timeSlot: string | null;
  status: string;
  reason: string | null;
};

type FutureDay = {
  date: string; // ISO date string
  label: string; // "Mon, 10 Mar"
  appointments: FutureDayAppointment[];
};

export function MultiDaySchedule({ days }: { days: FutureDay[] }) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  if (days.length === 0) return null;

  function toggleDay(date: string) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <CalendarDays className="h-4 w-4" />
          Upcoming Schedule
          <Badge variant="secondary" className="text-xs">
            {days.reduce((sum, d) => sum + d.appointments.length, 0)} appointments
          </Badge>
        </h3>
      </div>
      {days.map((day) => {
        const isExpanded = expandedDays.has(day.date);
        return (
          <div key={day.date}>
            <button
              type="button"
              onClick={() => toggleDay(day.date)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-accent/50 transition-colors border-b text-sm"
            >
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className="font-medium">{day.label}</span>
                <Badge variant="outline" className="text-xs">
                  {day.appointments.length}
                </Badge>
              </div>
            </button>
            {isExpanded && (
              <div className="divide-y bg-muted/20">
                {day.appointments.map((appt) => (
                  <Link
                    key={appt.id}
                    href={`/patients/${appt.patientId}`}
                    className="flex items-center justify-between px-6 py-2 text-sm hover:bg-accent/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">#{appt.patientCode}</span>
                        <span className="font-medium truncate">{toTitleCase(appt.patientName)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {appt.timeSlot && <span>{appt.timeSlot} · </span>}
                        {appt.reason || "Appointment"}
                      </div>
                    </div>
                    <StatusBadge status={appt.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
