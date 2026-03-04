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

export default async function LabReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; labId?: string }>;
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

  const labs = await prisma.lab.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });

  const visits = await prisma.visit.findMany({
    where: {
      visitDate: { gte: fromDate, lte: toDate },
      labId: params.labId ? parseInt(params.labId) : { not: null },
      labRateAmount: { gt: 0 },
    },
    include: {
      patient: { select: { name: true, code: true } },
      operation: { select: { name: true } },
      lab: { select: { name: true } },
      labRate: { select: { itemName: true } },
    },
    orderBy: { visitDate: "asc" },
  });

  // Summary by lab
  const labSummary = new Map<string, { count: number; total: number }>();
  for (const v of visits) {
    const key = v.lab?.name || "Unknown";
    const existing = labSummary.get(key) || { count: 0, total: 0 };
    existing.count++;
    existing.total += v.labRateAmount * v.labQuantity;
    labSummary.set(key, existing);
  }

  const grandTotal = visits.reduce((s, v) => s + v.labRateAmount * v.labQuantity, 0);

  const csvHeaders = ["Date", "Case #", "Patient", "Operation", "Lab", "Item", "Qty", "Rate", "Total"];
  const csvRows = visits.map((v) => [
    new Date(v.visitDate).toLocaleDateString("en-IN"),
    v.caseNo || "",
    toTitleCase(v.patient.name),
    v.operation?.name || "N/A",
    v.lab?.name || "N/A",
    v.labRate?.itemName || "N/A",
    v.labQuantity,
    v.labRateAmount,
    v.labRateAmount * v.labQuantity,
  ]);

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <Breadcrumbs items={[{ label: "Reports", href: "/reports" }, { label: "Lab" }]} />
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Lab Report</h2>
        <div className="flex gap-2 print:hidden">
          <CSVExportButton headers={csvHeaders} rows={csvRows} filename="lab-report" />
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
        <select name="labId" defaultValue={params.labId || ""} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">All Labs</option>
          {labs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <Button type="submit" variant="secondary" size="sm">
          <Search className="mr-2 h-4 w-4" /> Filter
        </Button>
        {(params.from || params.labId) && (
          <Button variant="ghost" size="sm" asChild><Link href="/reports/lab">Clear</Link></Button>
        )}
      </form>

      {labSummary.size > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Summary by Lab</h3>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lab</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from(labSummary.entries())
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
                    <TableCell className="text-right">₹{grandTotal.toLocaleString("en-IN")}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {visits.length > 0 ? (
        <>
          <h3 className="text-lg font-semibold">Detail ({visits.length} entries)</h3>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Case #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead>Lab</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Total</TableHead>
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
                      <TableCell>{v.lab?.name || "N/A"}</TableCell>
                      <TableCell>{v.labRate?.itemName || "N/A"}</TableCell>
                      <TableCell className="text-right">{v.labQuantity}</TableCell>
                      <TableCell className="text-right">₹{v.labRateAmount.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right font-medium">₹{(v.labRateAmount * v.labQuantity).toLocaleString("en-IN")}</TableCell>
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
            No lab work found for the selected period.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
