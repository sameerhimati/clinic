import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { canSeeReports } from "@/lib/permissions";
import { calcBilled, calcPaid, calcBalance } from "@/lib/billing";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { PrintPageButton } from "@/components/print-button";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function OutstandingReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; doctorId?: string }>;
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

  const visitWhere: Record<string, unknown> = {};
  if (params.from || params.to) {
    visitWhere.visitDate = {};
    if (params.from) (visitWhere.visitDate as Record<string, unknown>).gte = new Date(params.from);
    if (params.to) (visitWhere.visitDate as Record<string, unknown>).lte = new Date(params.to + "T23:59:59");
  }
  if (params.doctorId) {
    visitWhere.doctorId = parseInt(params.doctorId);
  }

  const visits = await prisma.visit.findMany({
    where: {
      ...visitWhere,
      operationRate: { gt: 0 },
    },
    include: {
      patient: { select: { id: true, name: true, code: true, mobile: true } },
      operation: { select: { name: true } },
      doctor: { select: { name: true } },
      receipts: { select: { amount: true } },
    },
    orderBy: { visitDate: "desc" },
  });

  // Filter to only outstanding
  const outstanding = visits
    .map((visit) => {
      const billed = calcBilled(visit);
      const paid = calcPaid(visit.receipts);
      const balance = calcBalance(visit, visit.receipts);
      return { ...visit, billed, paid, balance };
    })
    .filter((v) => v.balance > 0);

  const totalOutstanding = outstanding.reduce((s, v) => s + v.balance, 0);

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <Breadcrumbs items={[
          { label: "Reports", href: "/reports" },
          { label: "Outstanding" },
        ]} />
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Outstanding Dues Report</h2>
        <PrintPageButton />
      </div>

      <form className="flex flex-wrap gap-2 print:hidden">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">From</span>
          <Input name="from" type="date" defaultValue={params.from || ""} className="w-auto" />
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">To</span>
          <Input name="to" type="date" defaultValue={params.to || ""} className="w-auto" />
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
        <Button type="submit" variant="secondary" size="sm">
          <Search className="mr-2 h-4 w-4" /> Filter
        </Button>
        {(params.from || params.to || params.doctorId) && (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reports/outstanding">Clear</Link>
          </Button>
        )}
      </form>

      <div className="flex items-center gap-3 text-sm">
        <span className="text-destructive font-bold text-lg">{"\u20B9"}{totalOutstanding.toLocaleString("en-IN")}</span>
        <span className="text-muted-foreground">outstanding across {outstanding.length} {outstanding.length === 1 ? "case" : "cases"}</span>
      </div>

      {outstanding.length > 0 ? (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Case #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Treatment</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead className="text-right">Billed</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="print:hidden"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outstanding.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{format(new Date(row.visitDate), "MMM d, yyyy")}</TableCell>
                    <TableCell>{row.caseNo || row.id}</TableCell>
                    <TableCell>
                      <Link
                        href={`/patients/${row.patient.id}`}
                        className="hover:underline font-medium"
                      >
                        #{row.patient.code} {row.patient.name}
                      </Link>
                    </TableCell>
                    <TableCell>{row.patient.mobile || "-"}</TableCell>
                    <TableCell>{row.operation?.name || "-"}</TableCell>
                    <TableCell>{row.doctor?.name || "-"}</TableCell>
                    <TableCell className="text-right">{"\u20B9"}{row.billed.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right">{"\u20B9"}{row.paid.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      {"\u20B9"}{row.balance.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="print:hidden">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/patients/${row.patient.id}/checkout`}>Pay</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No outstanding dues found for the selected filters.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
