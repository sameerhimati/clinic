"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintPageButton({ label = "Print" }: { label?: string }) {
  return (
    <Button variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}>
      <Printer className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
