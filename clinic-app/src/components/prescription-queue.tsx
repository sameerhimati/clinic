import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pill, Printer } from "lucide-react";
import { toTitleCase, formatDateTime } from "@/lib/format";

type PendingRx = {
  id: number;
  createdAt: Date;
  patient: { id: number; code: number | null; name: string };
  doctor: { name: string };
  visit: { id: number; caseNo: number | null };
  items: { id: number }[];
};

export function PrescriptionQueue({ prescriptions }: { prescriptions: PendingRx[] }) {
  if (prescriptions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Pill className="h-4 w-4" />
          Prescriptions to Print
          <Badge variant="secondary" className="text-xs">{prescriptions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {prescriptions.map((rx) => (
            <Link
              key={rx.id}
              href={`/visits/${rx.visit.id}/prescription/print?rxId=${rx.id}`}
              className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 hover:bg-accent transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    #{rx.patient.code} {toTitleCase(rx.patient.name)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Case #{rx.visit.caseNo || rx.visit.id}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Dr. {toTitleCase(rx.doctor.name)} · {rx.items.length} item{rx.items.length !== 1 ? "s" : ""} · {formatDateTime(rx.createdAt)}
                </div>
              </div>
              <Printer className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
