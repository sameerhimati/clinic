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

export default async function ReceiptsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; paymentMode?: string }>;
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

  const receipts = await prisma.receipt.findMany({
    where: {
      receiptDate: { gte: fromDate, lte: toDate },
      ...(params.paymentMode ? { paymentMode: params.paymentMode } : {}),
    },
    include: {
      visit: {
        select: {
          caseNo: true,
          id: true,
          patient: { select: { name: true, code: true } },
        },
      },
    },
    orderBy: { receiptDate: "asc" },
  });

  // Summary by payment mode
  const modeSummary = new Map<string, { count: number; total: number }>();
  for (const r of receipts) {
    const key = r.paymentMode;
    const existing = modeSummary.get(key) || { count: 0, total: 0 };
    existing.count++;
    existing.total += r.amount;
    modeSummary.set(key, existing);
  }

  const grandTotal = receipts.reduce((s, r) => s + r.amount, 0);

  const csvHeaders = ["Date", "Receipt #", "Case #", "Patient", "Amount", "Payment Mode"];
  const csvRows = receipts.map((r) => [
    new Date(r.receiptDate).toLocaleDateString("en-IN"),
    r.receiptNo || "",
    r.visit.caseNo || "",
    toTitleCase(r.visit.patient.name),
    r.amount,
    r.paymentMode,
  ]);

  const paymentModes = ["Cash", "Card", "Cheque", "NEFT", "UPI"];

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <Breadcrumbs items={[{ label: "Reports", href: "/reports" }, { label: "Receipts" }]} />
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Receipts Report</h2>
        <div className="flex gap-2 print:hidden">
          <CSVExportButton headers={csvHeaders} rows={csvRows} filename="receipts-report" />
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
        <select name="paymentMode" defaultValue={params.paymentMode || ""} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">All Modes</option>
          {paymentModes.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <Button type="submit" variant="secondary" size="sm">
          <Search className="mr-2 h-4 w-4" /> Filter
        </Button>
        {(params.from || params.paymentMode) && (
          <Button variant="ghost" size="sm" asChild><Link href="/reports/receipts">Clear</Link></Button>
        )}
      </form>

      {modeSummary.size > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Summary by Payment Mode</h3>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from(modeSummary.entries()).map(([mode, s]) => (
                    <TableRow key={mode}>
                      <TableCell className="font-medium">{mode}</TableCell>
                      <TableCell className="text-right">{s.count}</TableCell>
                      <TableCell className="text-right">₹{s.total.toLocaleString("en-IN")}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{receipts.length}</TableCell>
                    <TableCell className="text-right">₹{grandTotal.toLocaleString("en-IN")}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {receipts.length > 0 ? (
        <>
          <h3 className="text-lg font-semibold">Detail ({receipts.length} receipts)</h3>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Case #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Mode</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{formatDate(r.receiptDate)}</TableCell>
                      <TableCell>{r.receiptNo || r.id}</TableCell>
                      <TableCell>
                        <Link href={`/visits/${r.visit.id}`} className="hover:underline text-primary">{r.visit.caseNo || r.visit.id}</Link>
                      </TableCell>
                      <TableCell>{toTitleCase(r.visit.patient.name)}</TableCell>
                      <TableCell className="text-right font-medium">₹{r.amount.toLocaleString("en-IN")}</TableCell>
                      <TableCell>{r.paymentMode}</TableCell>
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
            No receipts found for the selected period.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
