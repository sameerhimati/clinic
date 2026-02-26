"use client";

import { Button } from "@/components/ui/button";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Something went wrong</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          An unexpected error occurred. Please try again or contact support if the problem persists.
        </p>
      </div>
      <Button onClick={reset}>Try Again</Button>
    </div>
  );
}
