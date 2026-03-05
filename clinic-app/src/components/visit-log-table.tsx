"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { toTitleCase, formatDate } from "@/lib/format";
import type { VisitWithRelations } from "@/components/treatment-timeline";

function TeethDisplay({ teethJson }: { teethJson: string | null }) {
  if (!teethJson) return <span className="text-muted-foreground">—</span>;
  try {
    const teeth: number[] = JSON.parse(teethJson);
    if (!teeth.length) return <span className="text-muted-foreground">—</span>;
    return <span className="font-mono text-xs">{teeth.join(", ")}</span>;
  } catch {
    return <span className="text-muted-foreground">—</span>;
  }
}

export function VisitLogTable({
  visits,
  showInternalCosts,
}: {
  visits: VisitWithRelations[];
  showInternalCosts: boolean;
}) {
  // Flatten all visits (root + follow-ups), sorted newest first
  const allVisits: VisitWithRelations[] = [];
  for (const visit of visits) {
    allVisits.push(visit);
    if (visit.followUps) {
      for (const fu of visit.followUps) {
        allVisits.push(fu);
      }
    }
  }
  allVisits.sort(
    (a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
  );

  if (allVisits.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No visits recorded</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Procedure</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tooth</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Doctor</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Amount</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Paid</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Due</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {allVisits.map((visit) => {
              const rate = visit.operationRate || 0;
              const billed = (rate - visit.discount) * (visit.quantity ?? 1);
              const paid = visit.receipts.reduce((s, r) => s + r.amount, 0);
              const due = billed - paid;
              const report = visit.clinicalReports[0] || null;
              const notes = report?.treatmentNotes || report?.diagnosis || report?.complaint || "";
              const truncatedNotes = notes.replace(/\s+/g, " ").trim();
              const displayNotes = truncatedNotes.length > 60 ? truncatedNotes.slice(0, 60) + "..." : truncatedNotes;

              return (
                <tr key={visit.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link href={`/visits/${visit.id}`} className="text-primary hover:underline">
                      {formatDate(visit.visitDate)}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate max-w-[200px]">
                        {visit.stepLabel || visit.operation?.name || visit.customLabel || "Visit"}
                      </span>
                      {visit.visitType === "FOLLOWUP" && (
                        <Badge variant="outline" className="text-[10px] py-0 shrink-0">F/U</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <TeethDisplay teethJson={report?.teethSelected || null} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    {visit.doctor ? `Dr. ${toTitleCase(visit.doctor.name)}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                    {billed > 0 ? `₹${billed.toLocaleString("en-IN")}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                    {paid > 0 ? `₹${paid.toLocaleString("en-IN")}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {due > 0 ? (
                      <span className="text-destructive font-medium tabular-nums">₹{due.toLocaleString("en-IN")}</span>
                    ) : billed > 0 ? (
                      <Badge variant="secondary" className="text-[10px]">Paid</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground text-xs max-w-[200px] truncate">
                    {displayNotes || <span className="text-amber-500 italic">No notes</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
