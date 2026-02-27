import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, CheckCircle2, Clock, Users, Stethoscope, ClipboardList, GitBranch } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

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

  const fromStr = format(from, "yyyy-MM-dd");
  const toStr = format(to, "yyyy-MM-dd");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">My Activity</h2>
        <p className="text-sm text-muted-foreground">
          {format(from, "dd-MM-yyyy")} — {format(to, "dd-MM-yyyy")}
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
                    {visit.patient.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {visit.operation?.name || "Visit"} · {format(new Date(visit.visitDate), "dd-MM-yyyy")}
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
                        {visit.patient.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {visit.operation?.name || "Treatment"} · {stepCount} visit{stepCount !== 1 ? "s" : ""} in chain
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        Last: {format(new Date(lastFollowUp?.visitDate || visit.visitDate), "dd MMM")}
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
