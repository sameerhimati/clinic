"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { todayString } from "@/lib/validations";

type Row = {
  receiptDate: Date;
  caseNo: number | null;
  patientName: string;
  operationName: string;
  doctorName: string;
  receivedAmount: number;
  labRate: number;
  doctorPercent: number;
  doctorAmount: number;
  tds: number;
  netCommission: number;
  clinicAmount: number;
};

export function ExportCSVButton({ rows }: { rows: Row[] }) {
  function exportCSV() {
    const headers = [
      "Date",
      "Case #",
      "Patient",
      "Operation",
      "Doctor",
      "Received",
      "Lab Cost",
      "Commission %",
      "Commission",
      "TDS",
      "Net Payable",
      "Clinic Share",
    ];

    const csvRows = rows.map((r) => [
      new Date(r.receiptDate).toLocaleDateString("en-IN"),
      r.caseNo || "",
      r.patientName,
      r.operationName,
      r.doctorName,
      r.receivedAmount,
      r.labRate,
      r.doctorPercent,
      r.doctorAmount,
      r.tds,
      r.netCommission,
      r.clinicAmount,
    ]);

    const csv = [headers, ...csvRows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commission-report-${todayString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={exportCSV}>
      <Download className="mr-2 h-4 w-4" /> Export CSV
    </Button>
  );
}
