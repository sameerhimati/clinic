"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { todayString } from "@/lib/validations";

export function CSVExportButton({
  headers,
  rows,
  filename,
}: {
  headers: string[];
  rows: (string | number | null | undefined)[][];
  filename: string;
}) {
  function exportCSV() {
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell ?? ""}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${todayString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={exportCSV}>
      <Download className="mr-2 h-4 w-4" /> Export CSV
    </Button>
  );
}
