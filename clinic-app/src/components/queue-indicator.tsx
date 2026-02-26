"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export function QueueIndicator({ permissionLevel }: { permissionLevel: number }) {
  const router = useRouter();
  const [counts, setCounts] = useState<{ arrived: number; inProgress: number } | null>(null);

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/queue-count");
      if (res.ok) {
        setCounts(await res.json());
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    // Only show for L1/L2
    if (permissionLevel > 2) return;

    fetchCounts();

    // Poll every 60 seconds
    const interval = setInterval(fetchCounts, 60_000);

    // Refresh on tab focus
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        fetchCounts();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [permissionLevel, fetchCounts]);

  if (permissionLevel > 2 || !counts) return null;
  if (counts.arrived === 0 && counts.inProgress === 0) return null;

  const parts: string[] = [];
  if (counts.arrived > 0) parts.push(`${counts.arrived} waiting`);
  if (counts.inProgress > 0) parts.push(`${counts.inProgress} in progress`);

  return (
    <button
      onClick={() => router.push("/appointments")}
      className="hidden sm:inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
      </span>
      {parts.join(" · ")}
    </button>
  );
}
