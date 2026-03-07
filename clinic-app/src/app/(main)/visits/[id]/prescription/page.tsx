import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { toTitleCase, formatDate, formatDateTime } from "@/lib/format";
import { requireAuth } from "@/lib/auth";
import { Pill, Printer, Check } from "lucide-react";
import { MarkPrintedButton } from "./mark-printed-button";

export const dynamic = "force-dynamic";

export default async function PrescriptionViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await requireAuth();
  const { id } = await params;
  const visitId = parseInt(id);

  const prescriptions = await prisma.prescription.findMany({
    where: { visitId },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      doctor: { select: { name: true } },
      patient: { select: { id: true, code: true, name: true } },
      printedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (prescriptions.length === 0) notFound();

  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    select: { caseNo: true, patientId: true, patient: { select: { name: true } } },
  });
  if (!visit) notFound();

  const canMarkPrinted = currentUser.permissionLevel <= 2;

  return (
    <div className="max-w-3xl space-y-6">
      <Breadcrumbs items={[
        { label: toTitleCase(visit.patient.name), href: `/patients/${visit.patientId}` },
        { label: `Case #${visit.caseNo || visitId}`, href: `/visits/${visitId}` },
        { label: "Prescriptions" },
      ]} />

      {prescriptions.map((rx) => (
        <Card key={rx.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Pill className="h-4 w-4" />
                Prescription
              </CardTitle>
              {rx.isPrinted ? (
                <Badge variant="outline" className="text-green-700 border-green-300">
                  <Check className="h-3 w-3 mr-1" />
                  Printed
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-700 border-amber-300">
                  Pending
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href={`/visits/${visitId}/prescription/print?rxId=${rx.id}`}>
                  <Printer className="mr-1 h-3.5 w-3.5" />
                  Print
                </Link>
              </Button>
              {canMarkPrinted && !rx.isPrinted && (
                <MarkPrintedButton prescriptionId={rx.id} />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground">
              By Dr. {toTitleCase(rx.doctor.name)} · {formatDateTime(rx.createdAt)}
              {rx.isPrinted && rx.printedBy && (
                <> · Printed by {toTitleCase(rx.printedBy.name)} on {formatDateTime(rx.printedAt!)}</>
              )}
            </div>

            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-1.5 font-medium text-xs w-8">#</th>
                    <th className="text-left px-3 py-1.5 font-medium text-xs">Drug</th>
                    <th className="text-left px-3 py-1.5 font-medium text-xs">Frequency</th>
                    <th className="text-left px-3 py-1.5 font-medium text-xs">Duration</th>
                    <th className="text-left px-3 py-1.5 font-medium text-xs">Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {rx.items.map((item, idx) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium">
                        {item.drug}
                        {item.dosage && <span className="text-muted-foreground font-normal ml-1">{item.dosage}</span>}
                      </td>
                      <td className="px-3 py-2">{item.frequency || "—"}</td>
                      <td className="px-3 py-2">{item.duration || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{item.instructions || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rx.notes && (
              <div className="text-sm">
                <span className="text-muted-foreground font-medium">Notes: </span>
                {rx.notes}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
