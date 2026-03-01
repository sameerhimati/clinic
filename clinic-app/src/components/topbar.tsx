"use client";

import { useAuth } from "@/lib/auth-context";
import { PatientSearch } from "@/components/patient-search";
import { QueueIndicator } from "@/components/queue-indicator";

export function Topbar() {
  const { doctor } = useAuth();

  return (
    <header className="sticky top-0 z-40 flex h-12 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 print:hidden">
      <div className="shrink-0 md:ml-0 ml-10">
        <QueueIndicator permissionLevel={doctor.permissionLevel} />
      </div>

      <div className="flex-1 max-w-lg mx-auto">
        <PatientSearch />
      </div>

      {/* Right spacer to keep search centered */}
      <div className="shrink-0 w-8 hidden sm:block" />
    </header>
  );
}
