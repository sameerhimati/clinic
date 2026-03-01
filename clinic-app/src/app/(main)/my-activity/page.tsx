import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, CheckCircle2, Clock, Users, Stethoscope, ClipboardList, GitBranch, IndianRupee } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toTitleCase, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MyActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const currentUser = await requireAuth();
  if (currentUser.permissionLevel !== 3) redirect("/dashboard");

  const params = await searchParams;
  const now = new Date();
  const from = params.from ? new Date(params.from) : startOfMonth(now);
  const to = params.to ? new Date(params.to + "T23:59:59") : endOfMonth(now);
  const id = currentUser.id;

  // Summary counts
  const [totalVisits, newVisits, followUpVisits, examsCompleted, examsPending] = await Promise.all([
    prisma.visit.count({ where: { doctorId: id, visitDate: { gte: from, lte: to } } }),
    prisma.visit.count({ where: { doctorId: id, visitType: "NEW", visitDate: { gte: from, lte: to } } }),
    prisma.visit.count({ where: { doctorId: id, visitType: "FOLLOWUP", visitDate: { gte: from, lte: to } } }),
    prisma.visit.count({ where: { doctorId: id, visitDate: { gte: from, lte: to }, clinicalReports: { some: {} } } }),
    prisma.visit.count({ where: { doctorId: id, visitDate: { gte: from, lte: to }, clinicalReports: { none: {} } } }),
  ]);

  // Recent visits
  const recentVisits = await prisma.visit.findMany({
    where: { doctorId: id, visitDate: { gte: from, lte: to } },
    orderBy: { visitDate: "desc" },
    take: 20,
    include: {
      patient: { select: { id: true, name: true, code: true } },
      operation: { select: { name: true } },
      clinicalReports: { select: { id: true }, take: 1 },
      followUps: { select: { id: true } },
    },
  });

  // Follow-up pipeline: top-level visits with follow-ups
  const pipeline = await prisma.visit.findMany({
    where: {
      doctorId: id,
      parentVisitId: null,
      followUps: { some: {} },
    },
    orderBy: { visitDate: "desc" },
    take: 15,
    include: {
      patient: { select: { id: true, name: true, code: true } },
      operation: { select: { name: true } },
      followUps: {
        orderBy: { visitDate: "desc" },
        take: 1,
        include: { clinicalReports: { select: { id: true }, take: 1 } },
      },
      _count: { select: { followUps: true } },
    },
  });

  // Consultant earnings data (only if isConsultant)
  type EarningsRow = {
    rootVisitId: number;
    patientName: string;
    patientCode: number | null;
    operationName: string;
    doctorFee: number;
    totalPaid: number;
    visitCount: number;
    isComplete: boolean;
  };

  let earningsRows: EarningsRow[] = [];
  let earningsTotals = { totalFees: 0, totalCollected: 0, totalPending: 0 };

  if (currentUser.isConsultant) {
    const earnChains = await prisma.visit.findMany({
      where: {
        doctorId: id,
        parentVisitId: null,
        operation: { doctorFee: { gt: 0 } },
        visitDate: { gte: from, lte: to },
      },
      include: {
        patient: { select: { name: true, code: true } },
        operation: { select: { name: true, doctorFee: true } },
        receipts: { select: { amount: true } },
        clinicalReports: { take: 1, select: { id: true } },
        followUps: {
          include: {
            receipts: { select: { amount: true } },
            clinicalReports: { take: 1, select: { id: true } },
          },
        },
      },
      orderBy: { visitDate: "desc" },
    });

    earningsRows = earnChains.map((root) => {
      const allVisits = [root, ...root.followUps];
      const totalPaid = allVisits.reduce((sum, v) => sum + v.receipts.reduce((s, r) => s + r.amount, 0), 0);
      const stepsWithExam = allVisits.filter((v) => v.clinicalReports.length > 0).length;
      const isComplete = allVisits.length > 1 && stepsWithExam === allVisits.length;
      const doctorFee = root.operation?.doctorFee || 0;

      return {
        rootVisitId: root.id,
        patientName: toTitleCase(root.patient.name),
        patientCode: root.patient.code,
        operationName: root.operation?.name || "N/A",
        doctorFee,
        totalPaid,
        visitCount: allVisits.length,
        isComplete,
      };
    });

    earningsTotals = earningsRows.reduce(
      (acc, row) => ({
        totalFees: acc.totalFees + row.doctorFee,
        totalCollected: acc.totalCollected + Math.min(row.totalPaid, row.doctorFee),
        totalPending: acc.totalPending + Math.max(0, row.doctorFee - row.totalPaid),
      }),
      { totalFees: 0, totalCollected: 0, totalPending: 0 }
    );
  }

  const fromStr = format(from, "yyyy-MM-dd");
  const toStr = format(to, "yyyy-MM-dd");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">My Activity</h2>
        <p className="text-sm text-muted-foreground">
          {formatDate(from)} — {formatDate(to)}
        </p>
      </div>

      {/* Date range filter */}
      <form className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">From</span>
          <Input name="from" type="date" defaultValue={fromStr} className="w-auto" />
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">To</span>
          <Input name="to" type="date" defaultValue={toStr} className="w-auto" />
        </div>
        <Button type="submit" variant="secondary" size="sm">
          <Search className="mr-2 h-4 w-4" /> Filter
        </Button>
        {(params.from || params.to) && (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/my-activity">Clear</Link>
          </Button>
        )}
      </form>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Stethoscope className="h-4 w-4" />
              Total Visits
            </div>
            <div className="text-2xl font-bold mt-1">{totalVisits}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="h-4 w-4" />
              New / Follow-up
            </div>
            <div className="text-2xl font-bold mt-1">
              {newVisits} <span className="text-base font-normal text-muted-foreground">/</span> {followUpVisits}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CheckCircle2 className="h-4 w-4" />
              Notes Written
            </div>
            <div className="text-2xl font-bold mt-1">{examsCompleted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="h-4 w-4" />
              Notes Pending
            </div>
            <div className="text-2xl font-bold mt-1">{examsPending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Consultant Earnings */}
      {currentUser.isConsultant && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <IndianRupee className="h-4 w-4" />
                  Total Fees
                </div>
                <div className="text-2xl font-bold mt-1">₹{earningsTotals.totalFees.toLocaleString("en-IN")}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Collected
                </div>
                <div className="text-2xl font-bold mt-1 text-green-700">₹{earningsTotals.totalCollected.toLocaleString("en-IN")}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <Clock className="h-4 w-4" />
                  Pending
                </div>
                <div className="text-2xl font-bold mt-1 text-amber-700">₹{earningsTotals.totalPending.toLocaleString("en-IN")}</div>
              </CardContent>
            </Card>
          </div>

          {earningsRows.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <IndianRupee className="h-4 w-4" />
                  My Earnings
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Treatment</TableHead>
                      <TableHead className="text-right">Fee</TableHead>
                      <TableHead className="text-right">Collected</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {earningsRows.map((row) => (
                      <TableRow key={row.rootVisitId}>
                        <TableCell>
                          <span className="font-mono text-sm text-muted-foreground">#{row.patientCode}</span>{" "}
                          {row.patientName}
                        </TableCell>
                        <TableCell>
                          {row.operationName}
                          <span className="text-xs text-muted-foreground ml-1">({row.visitCount} visit{row.visitCount !== 1 ? "s" : ""})</span>
                        </TableCell>
                        <TableCell className="text-right font-medium">₹{row.doctorFee.toLocaleString("en-IN")}</TableCell>
                        <TableCell className={`text-right ${row.totalPaid >= row.doctorFee ? "text-green-700" : "text-amber-700"}`}>
                          ₹{row.totalPaid.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.isComplete ? "default" : "secondary"} className="text-xs">
                            {row.isComplete ? "Completed" : "In Progress"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Recent Visits
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {recentVisits.map((visit) => (
              <Link
                key={visit.id}
                href={`/visits/${visit.id}`}
                className="flex items-center justify-between p-4 hover:bg-accent transition-colors"
              >
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">
                      #{visit.patient.code}
                    </span>
                    {toTitleCase(visit.patient.name)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {visit.operation?.name || "Visit"} · {formatDate(visit.visitDate)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={visit.visitType === "NEW" ? "secondary" : "outline"} className="text-xs">
                    {visit.visitType === "FOLLOWUP" ? "F/U" : visit.visitType === "REVIEW" ? "REV" : "NEW"}
                  </Badge>
                  {visit.clinicalReports.length > 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-500" />
                  )}
                </div>
              </Link>
            ))}
            {recentVisits.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">No visits in this period</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Follow-up Pipeline */}
      {pipeline.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Follow-up Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {pipeline.map((visit) => {
                const lastFollowUp = visit.followUps[0];
                const stepCount = visit._count.followUps + 1; // include root visit
                const hasExam = lastFollowUp?.clinicalReports.length > 0;
                return (
                  <Link
                    key={visit.id}
                    href={`/patients/${visit.patient.id}`}
                    className="flex items-center justify-between p-4 hover:bg-accent transition-colors"
                  >
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <span className="font-mono text-sm text-muted-foreground">
                          #{visit.patient.code}
                        </span>
                        {toTitleCase(visit.patient.name)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {visit.operation?.name || "Treatment"} · {stepCount} visit{stepCount !== 1 ? "s" : ""} in chain
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        Last: {formatDate(lastFollowUp?.visitDate || visit.visitDate)}
                      </div>
                      {hasExam ? (
                        <Badge variant="secondary" className="text-xs">Examined</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Pending exam</Badge>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
