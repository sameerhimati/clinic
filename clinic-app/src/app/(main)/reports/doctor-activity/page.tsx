import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { canSeeReports } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatDate, toTitleCase } from "@/lib/format";
import { calcBilled } from "@/lib/billing";
import { Search } from "lucide-react";
import { CSVExportButton } from "@/components/csv-export-button";
import { PrintPageButton } from "@/components/print-button";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { dateToString } from "@/lib/validations";
import { DoctorFilterSelect } from "@/components/doctor-filter-select";

export const dynamic = "force-dynamic";

export default async function DoctorActivityReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; doctorId?: string; view?: string }>;
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
  const viewMode = params.view || "summary";

  const doctors = await prisma.doctor.findMany({
    where: { isActive: true, permissionLevel: 3 },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const selectedDoctorId = params.doctorId ? parseInt(params.doctorId) : null;
  const selectedDoctor = selectedDoctorId ? doctors.find((d) => d.id === selectedDoctorId) : null;

  type VisitRow = {
    id: number;
    caseNo: number | null;
    visitDate: Date;
    operationRate: number | null;
    discount: number;
    quantity: number;
    visitType: string;
    patient: { id: number; name: string; code: number | null };
    operation: { name: string } | null;
    doctor: { name: string } | null;
    parentVisit: {
      doctor: { name: string } | null;
      followUps: { doctor: { name: string } | null }[];
    } | null;
    followUps: { doctor: { name: string } | null }[];
  };

  let visits: VisitRow[] = [];

  if (selectedDoctorId) {
    visits = await prisma.visit.findMany({
      where: {
        visitDate: { gte: fromDate, lte: toDate },
        doctorId: selectedDoctorId,
      },
      include: {
        patient: { select: { id: true, name: true, code: true } },
        operation: { select: { name: true } },
        doctor: { select: { name: true } },
        parentVisit: {
          select: {
            doctor: { select: { name: true } },
            followUps: { select: { doctor: { select: { name: true } } } },
          },
        },
        followUps: { select: { doctor: { select: { name: true } } } },
      },
      orderBy: { visitDate: "asc" },
    });
  }

  // Summary: group by operation name
  type SummaryRow = { operationName: string; count: number; totalAmount: number };
  const summaryMap = new Map<string, SummaryRow>();
  let grandTotalPatients = 0;
  let grandTotalAmount = 0;

  for (const v of visits) {
    const opName = v.operation?.name || "Other";
    const amount = calcBilled(v);
    const existing = summaryMap.get(opName);
    if (existing) {
      existing.count++;
      existing.totalAmount += amount;
    } else {
      summaryMap.set(opName, { operationName: opName, count: 1, totalAmount: amount });
    }
    grandTotalPatients++;
    grandTotalAmount += amount;
  }

  const summaryRows = [...summaryMap.values()].sort((a, b) => b.totalAmount - a.totalAmount);

  // Get chain doctors for detail view
  function getChainDoctors(v: VisitRow): string {
    const names = new Set<string>();
    if (v.doctor?.name) names.add(v.doctor.name);
    if (v.parentVisit?.doctor?.name) names.add(v.parentVisit.doctor.name);
    if (v.parentVisit?.followUps) {
      for (const fu of v.parentVisit.followUps) {
        if (fu.doctor?.name) names.add(fu.doctor.name);
      }
    }
    for (const fu of v.followUps) {
      if (fu.doctor?.name) names.add(fu.doctor.name);
    }
    return [...names].map((n) => `Dr. ${toTitleCase(n)}`).join(" & ");
  }

  // CSV data
  const csvHeaders = viewMode === "summary"
    ? ["Treatment", "No of Patients", "Total Amount"]
    : ["Patient Name", "Date", "Total Amount", "Treatment", "Doctor(s)"];

  const csvRows = viewMode === "summary"
    ? [
        ...summaryRows.map((r) => [r.operationName, r.count, r.totalAmount]),
        ["Grand Total", grandTotalPatients, grandTotalAmount],
      ]
    : visits.map((v) => [
        toTitleCase(v.patient.name),
        new Date(v.visitDate).toLocaleDateString("en-IN"),
        calcBilled(v),
        v.operation?.name || "N/A",
        getChainDoctors(v),
      ]);

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <Breadcrumbs items={[{ label: "Reports", href: "/reports" }, { label: "Doctor Activity" }]} />
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          Doctor Activity
          {selectedDoctor && (
            <span className="text-muted-foreground font-normal text-lg ml-2">
              — Dr. {toTitleCase(selectedDoctor.name)}
            </span>
          )}
        </h2>
        {visits.length > 0 && (
          <div className="flex gap-2 print:hidden">
            <CSVExportButton
              headers={csvHeaders}
              rows={csvRows}
              filename={`doctor-activity-${selectedDoctor?.name || "all"}`}
            />
            <PrintPageButton />
          </div>
        )}
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-2 items-end print:hidden">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">From</span>
          <Input name="from" type="date" defaultValue={params.from} className="w-auto" />
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">To</span>
          <Input name="to" type="date" defaultValue={params.to} className="w-auto" />
        </div>
        <DoctorFilterSelect
          doctors={doctors.map(d => ({ id: d.id, name: d.name }))}
          defaultValue={params.doctorId || ""}
          placeholder="Select Doctor..."
        />
        <input type="hidden" name="view" value={viewMode} />
        <Button type="submit" variant="secondary" size="sm">
          <Search className="mr-2 h-4 w-4" /> Filter
        </Button>
      </form>

      {/* View toggle */}
      {selectedDoctorId && visits.length > 0 && (
        <div className="flex gap-1 print:hidden">
          <Button
            variant={viewMode === "summary" ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link href={`?from=${params.from}&to=${params.to}&doctorId=${selectedDoctorId}&view=summary`}>
              Summary
            </Link>
          </Button>
          <Button
            variant={viewMode === "detail" ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link href={`?from=${params.from}&to=${params.to}&doctorId=${selectedDoctorId}&view=detail`}>
              Detail
            </Link>
          </Button>
        </div>
      )}

      {!selectedDoctorId ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Select a doctor to view their activity report.
          </CardContent>
        </Card>
      ) : visits.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No visits found for Dr. {toTitleCase(selectedDoctor?.name || "")} in the selected period.
          </CardContent>
        </Card>
      ) : viewMode === "summary" ? (
        <>
          {/* Summary stats */}
          <div className="flex gap-4 text-sm">
            <div className="rounded-lg border px-4 py-2">
              <div className="text-muted-foreground">Total Patients</div>
              <div className="text-lg font-bold">{grandTotalPatients}</div>
            </div>
            <div className="rounded-lg border px-4 py-2">
              <div className="text-muted-foreground">Total Amount</div>
              <div className="text-lg font-bold">₹{grandTotalAmount.toLocaleString("en-IN")}</div>
            </div>
            <div className="rounded-lg border px-4 py-2">
              <div className="text-muted-foreground">Procedures</div>
              <div className="text-lg font-bold">{summaryRows.length}</div>
            </div>
          </div>

          {/* Summary table */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Treatment</TableHead>
                    <TableHead className="text-right">No of Patients</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryRows.map((r) => (
                    <TableRow key={r.operationName}>
                      <TableCell>{r.operationName}</TableCell>
                      <TableCell className="text-right">{r.count}</TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{r.totalAmount.toLocaleString("en-IN")}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold border-t-2">
                    <TableCell>Grand Total</TableCell>
                    <TableCell className="text-right">{grandTotalPatients}</TableCell>
                    <TableCell className="text-right">
                      ₹{grandTotalAmount.toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Detail stats */}
          <div className="flex gap-4 text-sm">
            <div className="rounded-lg border px-4 py-2">
              <div className="text-muted-foreground">Total Visits</div>
              <div className="text-lg font-bold">{visits.length}</div>
            </div>
            <div className="rounded-lg border px-4 py-2">
              <div className="text-muted-foreground">Total Amount</div>
              <div className="text-lg font-bold">₹{grandTotalAmount.toLocaleString("en-IN")}</div>
            </div>
          </div>

          {/* Detail table */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead>Treatment</TableHead>
                    <TableHead>Doctor(s)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visits.map((v) => {
                    const amount = calcBilled(v);
                    return (
                      <TableRow key={v.id}>
                        <TableCell>
                          <Link href={`/patients/${v.patient.id}`} className="hover:underline text-primary">
                            {toTitleCase(v.patient.name)}
                          </Link>
                          {v.visitType !== "NEW" && (
                            <Badge variant="outline" className="ml-1.5 text-xs py-0 px-1">
                              {v.visitType}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(v.visitDate)}</TableCell>
                        <TableCell className="text-right font-medium">
                          ₹{amount.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell>{v.operation?.name || "N/A"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {getChainDoctors(v)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="font-bold border-t-2">
                    <TableCell colSpan={2}>Grand Total</TableCell>
                    <TableCell className="text-right">
                      ₹{grandTotalAmount.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
