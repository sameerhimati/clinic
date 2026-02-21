import { prisma } from "@/lib/db";
import { calculateCommission } from "@/lib/commission";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { ExportCSVButton } from "./export-button";

export const dynamic = "force-dynamic";

export default async function CommissionReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; doctorId?: string }>;
}) {
  const params = await searchParams;
  const doctors = await prisma.doctor.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  if (!params.from || !params.to) {
    // Default to current month
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    params.from = from.toISOString().split("T")[0];
    params.to = to.toISOString().split("T")[0];
  }

  const fromDate = new Date(params.from);
  const toDate = new Date(params.to + "T23:59:59");

  // Get receipts in date range with visit details
  const receiptWhere: Record<string, unknown> = {
    receiptDate: { gte: fromDate, lte: toDate },
  };

  const receipts = await prisma.receipt.findMany({
    where: receiptWhere,
    include: {
      visit: {
        include: {
          patient: { select: { name: true, legacyCode: true } },
          operation: { select: { name: true } },
          doctor: true,
          receipts: {
            where: { receiptDate: { lt: fromDate } },
            select: { amount: true },
          },
        },
      },
    },
    orderBy: { receiptDate: "asc" },
  });

  // Filter by doctor if specified
  const filteredReceipts = params.doctorId
    ? receipts.filter((r) => r.visit.doctorId === parseInt(params.doctorId!))
    : receipts;

  // Calculate commission per receipt
  type CommissionRow = {
    receiptId: number;
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

  const rows: CommissionRow[] = [];
  const doctorTotals = new Map<string, { received: number; labCost: number; commission: number; tds: number; net: number; clinic: number }>();

  for (const receipt of filteredReceipts) {
    const visit = receipt.visit;
    const doctor = visit.doctor;
    if (!doctor || doctor.legacyCode === 0) continue; // skip NONE doctor

    const previousPayments = visit.receipts.reduce((s, r) => s + r.amount, 0);
    const labRate = visit.labRateAmount * visit.labQuantity;

    const result = calculateCommission({
      receivedAmount: receipt.amount,
      labRate,
      previousPayments,
      doctorPercent: visit.doctorCommissionPercent || doctor.commissionPercent,
      doctorRate: doctor.commissionRate,
      tdsPercent: doctor.tdsNew || doctor.tdsPercent,
    });

    rows.push({
      receiptId: receipt.id,
      receiptDate: receipt.receiptDate,
      caseNo: visit.legacyCaseNo,
      patientName: visit.patient.name,
      operationName: visit.operation?.name || "N/A",
      doctorName: doctor.name,
      receivedAmount: receipt.amount,
      labRate,
      doctorPercent: visit.doctorCommissionPercent || doctor.commissionPercent,
      ...result,
    });

    const key = doctor.name;
    const existing = doctorTotals.get(key) || { received: 0, labCost: 0, commission: 0, tds: 0, net: 0, clinic: 0 };
    existing.received += receipt.amount;
    existing.labCost += labRate;
    existing.commission += result.doctorAmount;
    existing.tds += result.tds;
    existing.net += result.netCommission;
    existing.clinic += result.clinicAmount;
    doctorTotals.set(key, existing);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Doctor Commission Report</h2>

      {/* Filters */}
      <form className="flex flex-wrap gap-2">
        <Input name="from" type="date" defaultValue={params.from} className="w-auto" />
        <Input name="to" type="date" defaultValue={params.to} className="w-auto" />
        <select
          name="doctorId"
          defaultValue={params.doctorId || ""}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All Doctors</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary" size="sm">
          <Search className="mr-2 h-4 w-4" /> Generate
        </Button>
      </form>

      {/* Summary Cards */}
      {doctorTotals.size > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Summary</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from(doctorTotals.entries()).map(([name, totals]) => (
              <Card key={name}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Dr. {name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Received</span>
                    <span>{"\u20B9"}{totals.received.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lab Cost</span>
                    <span>{"\u20B9"}{totals.labCost.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Commission</span>
                    <span>{"\u20B9"}{totals.commission.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-destructive">
                    <span>TDS</span>
                    <span>- {"\u20B9"}{totals.tds.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>Net Payable</span>
                    <span>{"\u20B9"}{totals.net.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Clinic Share</span>
                    <span>{"\u20B9"}{totals.clinic.toLocaleString("en-IN")}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Detail Table */}
      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Detail ({rows.length} entries)</h3>
            <ExportCSVButton rows={rows} />
          </div>
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
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Lab</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">TDS</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.receiptId}>
                      <TableCell>{format(new Date(row.receiptDate), "dd/MM/yy")}</TableCell>
                      <TableCell>{row.caseNo || "-"}</TableCell>
                      <TableCell>{row.patientName}</TableCell>
                      <TableCell>{row.operationName}</TableCell>
                      <TableCell>{row.doctorName}</TableCell>
                      <TableCell className="text-right">{row.receivedAmount.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right">{row.labRate > 0 ? row.labRate.toLocaleString("en-IN") : "-"}</TableCell>
                      <TableCell className="text-right">{row.doctorPercent}%</TableCell>
                      <TableCell className="text-right">{row.doctorAmount.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right">{row.tds > 0 ? row.tds.toLocaleString("en-IN") : "-"}</TableCell>
                      <TableCell className="text-right font-medium">{row.netCommission.toLocaleString("en-IN")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {rows.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No commission data for the selected period. Adjust the date range or doctor filter.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
