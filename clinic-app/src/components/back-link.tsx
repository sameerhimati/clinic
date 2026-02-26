"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

export function BackLink({
  fallbackHref,
  fallbackLabel,
}: {
  fallbackHref: string;
  fallbackLabel: string;
}) {
  const router = useRouter();
  const [hasHistory, setHasHistory] = useState(false);

  useEffect(() => {
    setHasHistory(window.history.length > 2);
  }, []);

  return (
    <button
      onClick={() => {
        if (hasHistory) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"
    >
      <ArrowLeft className="h-3 w-3" />
      {hasHistory ? "Back" : fallbackLabel}
    </button>
  );
}
