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

export default async function DiscountReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
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

  const visits = await prisma.visit.findMany({
    where: {
      visitDate: { gte: fromDate, lte: toDate },
      discount: { gt: 0 },
    },
    include: {
      patient: { select: { name: true, code: true } },
      operation: { select: { name: true } },
      doctor: { select: { name: true } },
    },
    orderBy: { visitDate: "asc" },
  });

  const totalBilled = visits.reduce((s, v) => s + (v.operationRate || 0) * (v.quantity ?? 1), 0);
  const totalDiscount = visits.reduce((s, v) => s + v.discount * (v.quantity ?? 1), 0);
  const totalNet = totalBilled - totalDiscount;

  const csvHeaders = ["Date", "Case #", "Patient", "Operation", "Doctor", "Billed", "Discount", "Net"];
  const csvRows = visits.map((v) => [
    new Date(v.visitDate).toLocaleDateString("en-IN"),
    v.caseNo || "",
    toTitleCase(v.patient.name),
    v.operation?.name || "N/A",
    v.doctor ? toTitleCase(v.doctor.name) : "N/A",
    v.operationRate || 0,
    v.discount,
    ((v.operationRate || 0) - v.discount) * (v.quantity ?? 1),
  ]);

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <Breadcrumbs items={[{ label: "Reports", href: "/reports" }, { label: "Discounts" }]} />
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Discount Report</h2>
        <div className="flex gap-2 print:hidden">
          <CSVExportButton headers={csvHeaders} rows={csvRows} filename="discount-report" />
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
        <Button type="submit" variant="secondary" size="sm">
          <Search className="mr-2 h-4 w-4" /> Filter
        </Button>
        {params.from && (
          <Button variant="ghost" size="sm" asChild><Link href="/reports/discount">Clear</Link></Button>
        )}
      </form>

      {visits.length > 0 && (
        <div className="flex gap-4 text-sm">
          <div className="rounded-lg border px-4 py-2">
            <div className="text-muted-foreground">Total Billed</div>
            <div className="text-lg font-bold">₹{totalBilled.toLocaleString("en-IN")}</div>
          </div>
          <div className="rounded-lg border px-4 py-2 border-amber-200 bg-amber-50/50">
            <div className="text-muted-foreground">Total Discount</div>
            <div className="text-lg font-bold text-amber-700">₹{totalDiscount.toLocaleString("en-IN")}</div>
          </div>
          <div className="rounded-lg border px-4 py-2">
            <div className="text-muted-foreground">Net Amount</div>
            <div className="text-lg font-bold">₹{totalNet.toLocaleString("en-IN")}</div>
          </div>
        </div>
      )}

      {visits.length > 0 ? (
        <>
          <h3 className="text-lg font-semibold">Detail ({visits.length} cases with discounts)</h3>
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
                    <TableHead className="text-right">Billed</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Net</TableHead>
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
                      <TableCell className="text-right">₹{((v.operationRate || 0) * (v.quantity ?? 1)).toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right text-amber-700 font-medium">₹{(v.discount * (v.quantity ?? 1)).toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right font-medium">₹{(((v.operationRate || 0) - v.discount) * (v.quantity ?? 1)).toLocaleString("en-IN")}</TableCell>
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
            No discounted visits found for the selected period.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
