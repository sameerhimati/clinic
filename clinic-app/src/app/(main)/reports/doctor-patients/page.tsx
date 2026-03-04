import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { canSeeReports } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatDate, toTitleCase } from "@/lib/format";
import { Search } from "lucide-react";
import { CSVExportButton } from "@/components/csv-export-button";
import { PrintPageButton } from "@/components/print-button";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { dateToString } from "@/lib/validations";

export const dynamic = "force-dynamic";

export default async function DoctorPatientsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; doctorId?: string }>;
}) {
  const currentUser = await requireAuth();
  if (!canSeeReports(currentUser.permissionLevel)) redirect("/dashboard");

  const params = await searchParams;
  if (!params.from || !params.to) {
    const now = new Date();
    params.from = dateToString(new Date(now.getFullYear(), now.getMonth(), 1));
    params.to = dateToString(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  }

  const fromDate = new Date(params.from);
  const toDate = new Date(params.to + "T23:59:59");

  const doctors = await prisma.doctor.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const selectedDoctorId = params.doctorId ? parseInt(params.doctorId) : null;
  const selectedDoctor = selectedDoctorId ? doctors.find((d) => d.id === selectedDoctorId) : null;

  let visits: {
    id: number;
    caseNo: number | null;
    visitDate: Date;
    operationRate: number | null;
    discount: number;
    patient: { name: string; code: number | null };
    operation: { name: string } | null;
  }[] = [];

  if (selectedDoctorId) {
    visits = await prisma.visit.findMany({
      where: {
        visitDate: { gte: fromDate, lte: toDate },
        doctorId: selectedDoctorId,
      },
      include: {
        patient: { select: { name: true, code: true } },
        operation: { select: { name: true } },
      },
      orderBy: { visitDate: "asc" },
    });
  }

  const totalAmount = visits.reduce((s, v) => s + ((v.operationRate || 0) - v.discount), 0);

  const csvHeaders = ["Date", "Case #", "Patient", "Operation", "Amount"];
  const csvRows = visits.map((v) => [
    new Date(v.visitDate).toLocaleDateString("en-IN"),
    v.caseNo || "",
    toTitleCase(v.patient.name),
    v.operation?.name || "N/A",
    (v.operationRate || 0) - v.discount,
  ]);

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <Breadcrumbs items={[{ label: "Reports", href: "/reports" }, { label: "Doctor-Patient" }]} />
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          Doctor-Patient Report
          {selectedDoctor && <span className="text-muted-foreground font-normal text-lg ml-2">— Dr. {toTitleCase(selectedDoctor.name)}</span>}
        </h2>
        {visits.length > 0 && (
          <div className="flex gap-2 print:hidden">
            <CSVExportButton headers={csvHeaders} rows={csvRows} filename={`doctor-patients-${selectedDoctor?.name || ""}`} />
            <PrintPageButton />
          </div>
        )}
      </div>

      <form className="flex flex-wrap gap-2 print:hidden">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">From</span>
          <Input name="from" type="date" defaultValue={params.from} className="w-auto" />
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">To</span>
          <Input name="to" type="date" defaultValue={params.to} className="w-auto" />
        </div>
        <select name="doctorId" defaultValue={params.doctorId || ""} className="h-9 rounded-md border border-input bg-background px-3 text-sm" required>
          <option value="">Select Doctor...</option>
          {doctors.map((d) => <option key={d.id} value={d.id}>{toTitleCase(d.name)}</option>)}
        </select>
        <Button type="submit" variant="secondary" size="sm">
          <Search className="mr-2 h-4 w-4" /> Filter
        </Button>
      </form>

      {!selectedDoctorId ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Select a doctor to view their patient visits.
          </CardContent>
        </Card>
      ) : visits.length > 0 ? (
        <>
          <div className="flex gap-4 text-sm">
            <div className="rounded-lg border px-4 py-2">
              <div className="text-muted-foreground">Total Visits</div>
              <div className="text-lg font-bold">{visits.length}</div>
            </div>
            <div className="rounded-lg border px-4 py-2">
              <div className="text-muted-foreground">Total Amount</div>
              <div className="text-lg font-bold">₹{totalAmount.toLocaleString("en-IN")}</div>
            </div>
          </div>

          <h3 className="text-lg font-semibold">Visits ({visits.length})</h3>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Case #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visits.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>{formatDate(v.visitDate)}</TableCell>
                      <TableCell>
                        <Link href={`/visits/${v.id}`} className="hover:underline text-primary">{v.caseNo || v.id}</Link>
                      </TableCell>
                      <TableCell>{toTitleCase(v.patient.name)}</TableCell>
                      <TableCell>{v.operation?.name || "N/A"}</TableCell>
                      <TableCell className="text-right font-medium">₹{((v.operationRate || 0) - v.discount).toLocaleString("en-IN")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No visits found for Dr. {toTitleCase(selectedDoctor?.name || "")} in the selected period.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
