import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  Plus,
  Receipt,
  ClipboardPlus,
  Stethoscope,
  IndianRupee,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { requireAuth } from "@/lib/auth";
import { canCollectPayments } from "@/lib/permissions";
import { PatientSearch } from "@/components/patient-search";

export const dynamic = "force-dynamic";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

async function getAdminDashboardData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    todayVisits,
    todayReceipts,
    recentVisits,
    outstandingVisits,
  ] = await Promise.all([
    prisma.visit.count({
      where: { visitDate: { gte: today, lt: tomorrow } },
    }),
    prisma.receipt.aggregate({
      where: { receiptDate: { gte: today, lt: tomorrow } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.visit.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        patient: { select: { id: true, name: true, code: true } },
        operation: { select: { name: true } },
        doctor: { select: { name: true } },
        receipts: { select: { amount: true } },
      },
    }),
    prisma.visit.findMany({
      where: { operationRate: { gt: 0 } },
      include: {
        receipts: { select: { amount: true } },
      },
    }),
  ]);

  let totalOutstanding = 0;
  for (const visit of outstandingVisits) {
    const billed = (visit.operationRate || 0) - visit.discount;
    const paid = visit.receipts.reduce((s, r) => s + r.amount, 0);
    const balance = billed - paid;
    if (balance > 0) totalOutstanding += balance;
  }

  return {
    todayVisits,
    todayCollections: todayReceipts._sum.amount || 0,
    totalOutstanding,
    recentVisits,
  };
}

async function getDoctorDashboardData(doctorId: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todayPatients, recentVisits] = await Promise.all([
    prisma.visit.findMany({
      where: {
        doctorId,
        visitDate: { gte: today, lt: tomorrow },
      },
      include: {
        patient: { select: { id: true, name: true, code: true } },
        operation: { select: { name: true } },
        clinicalReports: { select: { id: true }, take: 1 },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.visit.findMany({
      where: { doctorId },
      take: 10,
      orderBy: { visitDate: "desc" },
      include: {
        patient: { select: { id: true, name: true, code: true } },
        operation: { select: { name: true } },
        clinicalReports: { select: { id: true }, take: 1 },
      },
    }),
  ]);

  return { todayPatients, recentVisits };
}

export default async function DashboardPage() {
  const doctor = await requireAuth();
  const isDoctor = doctor.permissionLevel === 3;
  const canCollect = canCollectPayments(doctor.permissionLevel);
  const greeting = getGreeting();

  if (isDoctor) {
    const data = await getDoctorDashboardData(doctor.id);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{greeting}, Dr. {doctor.name}</h2>
            <p className="text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
          </div>
        </div>

        {/* Large search bar */}
        <div className="max-w-2xl">
          <PatientSearch size="large" />
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/visits/new"><Plus className="mr-2 h-4 w-4" />New Visit</Link>
          </Button>
        </div>

        {/* My Patients Today */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              My Patients Today
              {data.todayPatients.length > 0 && (
                <Badge variant="secondary">
                  {data.todayPatients.filter(v => v.clinicalReports.length === 0).length} pending
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {data.todayPatients.map((visit) => {
                const hasReport = visit.clinicalReports.length > 0;
                return (
                  <div key={visit.id} className="flex items-center justify-between py-3">
                    <div>
                      <Link href={`/patients/${visit.patient.id}`} className="font-medium hover:underline flex items-center gap-2">
                        <span className="font-mono text-sm text-muted-foreground">#{visit.patient.code}</span>
                        {visit.patient.name}
                      </Link>
                      <div className="text-sm text-muted-foreground">
                        {visit.operation?.name || "Visit"}
                        {hasReport && " — notes complete"}
                      </div>
                    </div>
                    <Button size="sm" variant={hasReport ? "outline" : "default"} asChild>
                      <Link href={`/visits/${visit.id}/examine`}>
                        <ClipboardPlus className="mr-2 h-4 w-4" />
                        {hasReport ? "Edit Notes" : "Examine"}
                      </Link>
                    </Button>
                  </div>
                );
              })}
              {data.todayPatients.length === 0 && (
                <div className="py-4 text-center text-muted-foreground">No patients assigned to you today</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Visits */}
        {data.recentVisits.length > 0 && (
          <Card>
            <CardHeader><CardTitle>My Recent Visits</CardTitle></CardHeader>
            <CardContent>
              <div className="divide-y">
                {data.recentVisits.map((visit) => (
                  <Link key={visit.id} href={`/patients/${visit.patient.id}`} className="flex items-center justify-between py-2.5 hover:bg-accent -mx-4 px-4 rounded transition-colors">
                    <div>
                      <span className="font-mono text-sm text-muted-foreground">#{visit.patient.code}</span>{" "}
                      <span className="font-medium">{visit.patient.name}</span>
                      <span className="text-muted-foreground text-sm"> · {visit.operation?.name || "Visit"} · {format(new Date(visit.visitDate), "MMM d")}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Admin/Reception dashboard
  const data = await getAdminDashboardData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{greeting}, {doctor.name}</h2>
          <p className="text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>
      </div>

      {/* Large search bar */}
      <div className="max-w-2xl">
        <PatientSearch size="large" />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/patients/new"><UserPlus className="mr-2 h-4 w-4" />New Patient</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/visits/new"><Plus className="mr-2 h-4 w-4" />New Visit</Link>
        </Button>
        {canCollect && (
          <Button variant="outline" asChild>
            <Link href="/receipts/new"><Receipt className="mr-2 h-4 w-4" />New Receipt</Link>
          </Button>
        )}
      </div>

      {/* Stats row - compact */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2 rounded-lg border px-4 py-2.5">
          <Stethoscope className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Today:</span>
          <span className="font-bold">{data.todayVisits} visits</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border px-4 py-2.5">
          <IndianRupee className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Collections:</span>
          <span className="font-bold">{"\u20B9"}{data.todayCollections.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border px-4 py-2.5">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Outstanding:</span>
          <span className="font-bold text-destructive">{"\u20B9"}{data.totalOutstanding.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* Recent Visits */}
      <Card>
        <CardHeader><CardTitle>Recent Visits</CardTitle></CardHeader>
        <CardContent>
          <div className="divide-y">
            {data.recentVisits.map((visit) => {
              const billed = (visit.operationRate || 0) - visit.discount;
              const paid = visit.receipts.reduce((s, r) => s + r.amount, 0);
              const balance = billed - paid;
              return (
                <div key={visit.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <Link href={`/patients/${visit.patientId}`} className="font-medium hover:underline flex items-center gap-2">
                      <span className="font-mono text-sm text-muted-foreground">#{visit.patient.code}</span>
                      {visit.patient.name}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      {visit.operation?.name || "N/A"}
                      {visit.doctor && ` · Dr. ${visit.doctor.name}`}
                      {" · "}{format(new Date(visit.visitDate), "MMM d")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-sm font-medium">{"\u20B9"}{billed.toLocaleString("en-IN")}</div>
                      {balance > 0 ? (
                        <Badge variant="destructive" className="text-xs">Due: {"\u20B9"}{balance.toLocaleString("en-IN")}</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Paid</Badge>
                      )}
                    </div>
                    {canCollect && balance > 0 && (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/patients/${visit.patient.id}/checkout`}>Pay</Link>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
