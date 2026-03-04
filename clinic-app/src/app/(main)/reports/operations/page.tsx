import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { canSeeReports, canSeeInternalCosts } from "@/lib/permissions";
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

export default async function OperationsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; doctorId?: string; operationId?: string }>;
}) {
  const currentUser = await requireAuth();
  if (!canSeeReports(currentUser.permissionLevel)) redirect("/dashboard");
  const showCosts = canSeeInternalCosts(currentUser.permissionLevel);

  const params = await searchParams;
  if (!params.from || !params.to) {
    const now = new Date();
    params.from = dateToString(new Date(now.getFullYear(), now.getMonth(), 1));
    params.to = dateToString(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  }

  const fromDate = new Date(params.from);
  const toDate = new Date(params.to + "T23:59:59");

  const [doctors, operations] = await Promise.all([
    prisma.doctor.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.operation.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const visits = await prisma.visit.findMany({
    where: {
      visitDate: { gte: fromDate, lte: toDate },
      ...(params.doctorId ? { doctorId: parseInt(params.doctorId) } : {}),
      ...(params.operationId ? { operationId: parseInt(params.operationId) } : {}),
    },
    include: {
      patient: { select: { name: true, code: true } },
      operation: { select: { name: true } },
      doctor: { select: { name: true } },
    },
    orderBy: { visitDate: "asc" },
  });

  // Summary by operation
  const opSummary = new Map<string, { count: number; total: number }>();
  for (const v of visits) {
    const key = v.operation?.name || "N/A";
    const existing = opSummary.get(key) || { count: 0, total: 0 };
    existing.count++;
    existing.total += (v.operationRate || 0) - v.discount;
    opSummary.set(key, existing);
  }

  const csvHeaders = ["Date", "Case #", "Patient", "Operation", "Doctor", "Amount", ...(showCosts ? ["Lab Cost"] : []), "Discount"];
  const csvRows = visits.map((v) => [
    new Date(v.visitDate).toLocaleDateString("en-IN"),
    v.caseNo || "",
    toTitleCase(v.patient.name),
    v.operation?.name || "N/A",
    v.doctor ? toTitleCase(v.doctor.name) : "N/A",
    (v.operationRate || 0) - v.discount,
    ...(showCosts ? [v.labRateAmount * v.labQuantity] : []),
    v.discount,
  ]);

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <Breadcrumbs items={[{ label: "Reports", href: "/reports" }, { label: "Operations" }]} />
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Operations Report</h2>
        <div className="flex gap-2 print:hidden">
          <CSVExportButton headers={csvHeaders} rows={csvRows} filename="operations-report" />
          <PrintPageButton />
        </div>
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
        <select name="doctorId" defaultValue={params.doctorId || ""} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">All Doctors</option>
          {doctors.map((d) => <option key={d.id} value={d.id}>{toTitleCase(d.name)}</option>)}
        </select>
        <select name="operationId" defaultValue={params.operationId || ""} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">All Operations</option>
          {operations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <Button type="submit" variant="secondary" size="sm">
          <Search className="mr-2 h-4 w-4" /> Filter
        </Button>
        {(params.from || params.doctorId || params.operationId) && (
          <Button variant="ghost" size="sm" asChild><Link href="/reports/operations">Clear</Link></Button>
        )}
      </form>

      {opSummary.size > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Summary by Operation</h3>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operation</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from(opSummary.entries())
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([name, s]) => (
                      <TableRow key={name}>
                        <TableCell className="font-medium">{name}</TableCell>
                        <TableCell className="text-right">{s.count}</TableCell>
                        <TableCell className="text-right">₹{s.total.toLocaleString("en-IN")}</TableCell>
                      </TableRow>
                    ))}
                  <TableRow className="font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{visits.length}</TableCell>
                    <TableCell className="text-right">
                      ₹{Array.from(opSummary.values()).reduce((s, v) => s + v.total, 0).toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {visits.length > 0 ? (
        <>
          <h3 className="text-lg font-semibold">Detail ({visits.length} visits)</h3>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Case #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    {showCosts && <TableHead className="text-right">Lab Cost</TableHead>}
                    <TableHead className="text-right">Discount</TableHead>
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
                      <TableCell>{v.doctor ? toTitleCase(v.doctor.name) : "N/A"}</TableCell>
                      <TableCell className="text-right">₹{((v.operationRate || 0) - v.discount).toLocaleString("en-IN")}</TableCell>
                      {showCosts && (
                        <TableCell className="text-right">
                          {v.labRateAmount * v.labQuantity > 0 ? `₹${(v.labRateAmount * v.labQuantity).toLocaleString("en-IN")}` : "-"}
                        </TableCell>
                      )}
                      <TableCell className="text-right">{v.discount > 0 ? `₹${v.discount.toLocaleString("en-IN")}` : "-"}</TableCell>
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
            No operations found for the selected period.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
