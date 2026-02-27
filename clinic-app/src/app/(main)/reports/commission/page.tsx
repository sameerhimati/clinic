import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { calculateCommission } from "@/lib/commission";
import { requireAuth } from "@/lib/auth";
import { canSeeReports } from "@/lib/permissions";
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
import { PrintPageButton } from "@/components/print-button";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { dateToString } from "@/lib/validations";

export const dynamic = "force-dynamic";

export default async function CommissionReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; doctorId?: string; view?: string }>;
}) {
  const currentUser = await requireAuth();
  if (!canSeeReports(currentUser.permissionLevel)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const doctors = await prisma.doctor.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  if (!params.from || !params.to) {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    params.from = dateToString(from);
    params.to = dateToString(to);
  }

  const fromDate = new Date(params.from);
  const toDate = new Date(params.to + "T23:59:59");
  const viewMode = params.view || "receipts";

  // Get receipts in date range with visit details
  const receipts = await prisma.receipt.findMany({
    where: { receiptDate: { gte: fromDate, lte: toDate } },
    include: {
      visit: {
        include: {
          patient: { select: { name: true, code: true } },
          operation: { select: { name: true, doctorFee: true, labCostEstimate: true } },
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

  // Calculate commission per receipt (legacy view)
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
    if (!doctor || doctor.code === 0) continue;

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
      caseNo: visit.caseNo,
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

  // ============================
  // Treatment Chain view data
  // ============================
  // Get all root visits (treatment chains) with receipts in the date range
  const chainVisits = await prisma.visit.findMany({
    where: {
      parentVisitId: null,
      OR: [
        // Root visits with receipts in range
        { receipts: { some: { receiptDate: { gte: fromDate, lte: toDate } } } },
        // Root visits with follow-ups that have receipts in range
        { followUps: { some: { receipts: { some: { receiptDate: { gte: fromDate, lte: toDate } } } } } },
      ],
      ...(params.doctorId ? { doctorId: parseInt(params.doctorId) } : {}),
    },
    include: {
      patient: { select: { name: true, code: true } },
      operation: { select: { name: true, doctorFee: true, labCostEstimate: true } },
      doctor: { select: { name: true, id: true } },
      receipts: { select: { amount: true } },
      clinicalReports: { take: 1, select: { id: true } },
      followUps: {
        include: {
          operation: { select: { name: true, doctorFee: true } },
          doctor: { select: { name: true, id: true } },
          receipts: { select: { amount: true } },
          clinicalReports: { take: 1, select: { id: true } },
        },
        orderBy: { visitDate: "asc" },
      },
    },
    orderBy: { visitDate: "desc" },
  });

  type ChainRow = {
    rootVisitId: number;
    caseNo: number | null;
    patientName: string;
    patientCode: number | null;
    operationName: string;
    doctorName: string;
    doctorFee: number | null;
    labCostEstimate: number | null;
    totalBilled: number;
    totalPaid: number;
    totalLabCost: number;
    visitCount: number;
    stepsWithExam: number;
    isComplete: boolean;
    status: "In Progress" | "Completed";
  };

  const chainRows: ChainRow[] = chainVisits.map((root) => {
    const allVisits = [root, ...root.followUps];
    const totalBilled = allVisits.reduce((sum, v) => sum + (v.operationRate || 0) - (v.discount || 0), 0);
    const totalPaid = allVisits.reduce((sum, v) => sum + v.receipts.reduce((s, r) => s + r.amount, 0), 0);
    const totalLabCost = allVisits.reduce((sum, v) => sum + v.labRateAmount * v.labQuantity, 0);
    const stepsWithExam = allVisits.filter((v) => v.clinicalReports.length > 0).length;
    const isComplete = allVisits.length > 1 && stepsWithExam === allVisits.length;

    return {
      rootVisitId: root.id,
      caseNo: root.caseNo,
      patientName: root.patient.name,
      patientCode: root.patient.code,
      operationName: root.operation?.name || "N/A",
      doctorName: root.doctor?.name || "N/A",
      doctorFee: root.operation?.doctorFee || null,
      labCostEstimate: root.operation?.labCostEstimate || null,
      totalBilled,
      totalPaid,
      totalLabCost,
      visitCount: allVisits.length,
      stepsWithExam,
      isComplete,
      status: isComplete ? "Completed" : "In Progress",
    };
  });

  // Chain summary by doctor
  const chainDoctorTotals = new Map<string, { chains: number; completed: number; totalFees: number; totalCollected: number }>();
  for (const chain of chainRows) {
    const key = chain.doctorName;
    const existing = chainDoctorTotals.get(key) || { chains: 0, completed: 0, totalFees: 0, totalCollected: 0 };
    existing.chains++;
    if (chain.isComplete) existing.completed++;
    existing.totalFees += chain.doctorFee || 0;
    existing.totalCollected += chain.totalPaid;
    chainDoctorTotals.set(key, existing);
  }

  // Build query string for view toggle
  const baseQuery = `from=${params.from}&to=${params.to}${params.doctorId ? `&doctorId=${params.doctorId}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <Breadcrumbs items={[
          { label: "Reports", href: "/reports" },
          { label: "Commission" },
        ]} />
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Doctor Commission Report</h2>
        <div className="flex gap-2 print:hidden">
          <ExportCSVButton rows={rows} />
          <PrintPageButton />
        </div>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-2 print:hidden">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">From</span>
          <Input name="from" type="date" defaultValue={params.from} className="w-auto" />
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">To</span>
          <Input name="to" type="date" defaultValue={params.to} className="w-auto" />
        </div>
        <select
          name="doctorId"
          defaultValue={params.doctorId || ""}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="">All Doctors</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <input type="hidden" name="view" value={viewMode} />
        <Button type="submit" variant="secondary" size="sm">
          <Search className="mr-2 h-4 w-4" /> Filter
        </Button>
        {(params.from || params.to || params.doctorId) && (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reports/commission">Clear</Link>
          </Button>
        )}
      </form>

      {/* View Toggle */}
      <div className="flex gap-1 border rounded-lg p-1 w-fit print:hidden">
        <Link
          href={`/reports/commission?${baseQuery}&view=receipts`}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === "receipts" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
        >
          By Receipt
        </Link>
        <Link
          href={`/reports/commission?${baseQuery}&view=chains`}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === "chains" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
        >
          By Treatment
        </Link>
      </div>

      {viewMode === "receipts" ? (
        <>
          {/* Receipt-based view (legacy) */}
          {doctorTotals.size > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Summary</h3>
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Doctor</TableHead>
                        <TableHead className="text-right">Received</TableHead>
                        <TableHead className="text-right">Lab Cost</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                        <TableHead className="text-right">TDS</TableHead>
                        <TableHead className="text-right font-bold">Net Payable</TableHead>
                        <TableHead className="text-right">Clinic Share</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from(doctorTotals.entries()).map(([name, totals]) => (
                        <TableRow key={name}>
                          <TableCell className="font-medium">Dr. {name}</TableCell>
                          <TableCell className="text-right">{"\u20B9"}{totals.received.toLocaleString("en-IN")}</TableCell>
                          <TableCell className="text-right">{"\u20B9"}{totals.labCost.toLocaleString("en-IN")}</TableCell>
                          <TableCell className="text-right">{"\u20B9"}{totals.commission.toLocaleString("en-IN")}</TableCell>
                          <TableCell className="text-right text-destructive">{totals.tds > 0 ? `-\u20B9${totals.tds.toLocaleString("en-IN")}` : "-"}</TableCell>
                          <TableCell className="text-right font-bold">{"\u20B9"}{totals.net.toLocaleString("en-IN")}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{"\u20B9"}{totals.clinic.toLocaleString("en-IN")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {rows.length > 0 && (
            <>
              <h3 className="text-lg font-semibold">Detail ({rows.length} entries)</h3>
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Case #</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Treatment</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead className="text-right">Received</TableHead>
                        <TableHead className="text-right">Lab</TableHead>
                        <TableHead className="text-right">%</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                        <TableHead className="text-right hidden md:table-cell print:table-cell">TDS</TableHead>
                        <TableHead className="text-right hidden md:table-cell print:table-cell">Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.receiptId}>
                          <TableCell>{format(new Date(row.receiptDate), "dd-MM-yyyy")}</TableCell>
                          <TableCell>{row.caseNo || "-"}</TableCell>
                          <TableCell>{row.patientName}</TableCell>
                          <TableCell>{row.operationName}</TableCell>
                          <TableCell>{row.doctorName}</TableCell>
                          <TableCell className="text-right">{"\u20B9"}{row.receivedAmount.toLocaleString("en-IN")}</TableCell>
                          <TableCell className="text-right">{row.labRate > 0 ? `\u20B9${row.labRate.toLocaleString("en-IN")}` : "-"}</TableCell>
                          <TableCell className="text-right">{row.doctorPercent}%</TableCell>
                          <TableCell className="text-right">{"\u20B9"}{row.doctorAmount.toLocaleString("en-IN")}</TableCell>
                          <TableCell className="text-right hidden md:table-cell print:table-cell">{row.tds > 0 ? `\u20B9${row.tds.toLocaleString("en-IN")}` : "-"}</TableCell>
                          <TableCell className="text-right font-medium hidden md:table-cell print:table-cell">{"\u20B9"}{row.netCommission.toLocaleString("en-IN")}</TableCell>
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
        </>
      ) : (
        <>
          {/* Treatment Chain view */}
          {chainDoctorTotals.size > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Summary by Doctor</h3>
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Doctor</TableHead>
                        <TableHead className="text-right">Treatments</TableHead>
                        <TableHead className="text-right">Completed</TableHead>
                        <TableHead className="text-right">Total Doctor Fees</TableHead>
                        <TableHead className="text-right">Total Collected</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from(chainDoctorTotals.entries()).map(([name, totals]) => (
                        <TableRow key={name}>
                          <TableCell className="font-medium">Dr. {name}</TableCell>
                          <TableCell className="text-right">{totals.chains}</TableCell>
                          <TableCell className="text-right">{totals.completed}</TableCell>
                          <TableCell className="text-right font-bold">{"\u20B9"}{totals.totalFees.toLocaleString("en-IN")}</TableCell>
                          <TableCell className="text-right">{"\u20B9"}{totals.totalCollected.toLocaleString("en-IN")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {chainRows.length > 0 && (
            <>
              <h3 className="text-lg font-semibold">Treatment Chains ({chainRows.length})</h3>
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Case #</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Treatment</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead className="text-right">Visits</TableHead>
                        <TableHead className="text-right">Doctor Fee</TableHead>
                        <TableHead className="text-right">Billed</TableHead>
                        <TableHead className="text-right">Collected</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {chainRows.map((chain) => {
                        const shortfall = (chain.doctorFee || 0) + chain.totalLabCost - chain.totalPaid;
                        return (
                          <TableRow key={chain.rootVisitId}>
                            <TableCell>
                              <Link href={`/visits/${chain.rootVisitId}`} className="hover:underline text-primary">
                                {chain.caseNo || chain.rootVisitId}
                              </Link>
                            </TableCell>
                            <TableCell>{chain.patientName}</TableCell>
                            <TableCell>{chain.operationName}</TableCell>
                            <TableCell>Dr. {chain.doctorName}</TableCell>
                            <TableCell className="text-right">{chain.visitCount}</TableCell>
                            <TableCell className="text-right font-medium">
                              {chain.doctorFee ? `\u20B9${chain.doctorFee.toLocaleString("en-IN")}` : "-"}
                            </TableCell>
                            <TableCell className="text-right">{"\u20B9"}{chain.totalBilled.toLocaleString("en-IN")}</TableCell>
                            <TableCell className="text-right">
                              {"\u20B9"}{chain.totalPaid.toLocaleString("en-IN")}
                              {shortfall > 0 && chain.doctorFee && (
                                <div className="text-xs text-amber-600" title={`Doctor fee (₹${chain.doctorFee.toLocaleString("en-IN")}) + lab (₹${chain.totalLabCost.toLocaleString("en-IN")}) exceeds collected amount`}>
                                  ₹{shortfall.toLocaleString("en-IN")} short
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={chain.isComplete ? "default" : "secondary"} className="text-xs">
                                {chain.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {chainRows.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No treatment chains with payments in the selected period.
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
