import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Stethoscope,
  IndianRupee,
  AlertCircle,
  UserPlus,
  Plus,
  Receipt,
  ClipboardPlus,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function getAdminDashboardData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    todayVisits,
    todayReceipts,
    totalPatients,
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
    prisma.patient.count(),
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
      where: {
        operationRate: { gt: 0 },
      },
      include: {
        receipts: { select: { amount: true } },
        patient: { select: { name: true, id: true } },
      },
    }),
  ]);

  let totalOutstanding = 0;
  let outstandingCount = 0;
  for (const visit of outstandingVisits) {
    const billed = (visit.operationRate || 0) - visit.discount;
    const paid = visit.receipts.reduce((s, r) => s + r.amount, 0);
    const balance = billed - paid;
    if (balance > 0) {
      totalOutstanding += balance;
      outstandingCount++;
    }
  }

  return {
    todayVisits,
    todayCollections: todayReceipts._sum.amount || 0,
    todayReceiptCount: todayReceipts._count,
    totalPatients,
    totalOutstanding,
    outstandingCount,
    recentVisits,
  };
}

async function getDoctorDashboardData(doctorId: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todayPatients, recentReports] = await Promise.all([
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
    prisma.clinicalReport.findMany({
      where: { doctorId },
      take: 5,
      orderBy: { reportDate: "desc" },
      include: {
        visit: {
          include: {
            patient: { select: { code: true, name: true } },
            operation: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  return { todayPatients, recentReports };
}

export default async function DashboardPage() {
  const doctor = await requireAuth();
  const isDoctor = doctor.permissionLevel === 3;

  if (isDoctor) {
    const data = await getDoctorDashboardData(doctor.id);
    return <DoctorDashboard doctorName={doctor.name} data={data} />;
  }

  const data = await getAdminDashboardData();
  const showOutstanding = doctor.permissionLevel <= 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/patients/new">
            <UserPlus className="mr-2 h-4 w-4" />
            New Patient
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/visits/new">
            <Plus className="mr-2 h-4 w-4" />
            New Visit
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/receipts/new">
            <Receipt className="mr-2 h-4 w-4" />
            New Receipt
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className={`grid gap-4 sm:grid-cols-2 ${showOutstanding ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Today&apos;s Visits
            </CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.todayVisits}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Today&apos;s Collections
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {"\u20B9"}{data.todayCollections.toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.todayReceiptCount} receipt(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Patients
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.totalPatients.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        {showOutstanding && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {"\u20B9"}{data.totalOutstanding.toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-muted-foreground">
                {data.outstandingCount} case(s)
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Visits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.recentVisits.map((visit) => {
              const billed = (visit.operationRate || 0) - visit.discount;
              const paid = visit.receipts.reduce((s, r) => s + r.amount, 0);
              const balance = billed - paid;
              return (
                <div
                  key={visit.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex flex-col gap-0.5">
                    <Link
                      href={`/patients/${visit.patientId}`}
                      className="font-medium hover:underline flex items-center gap-2"
                    >
                      {visit.patient.code && (
                        <span className="font-mono text-sm text-muted-foreground">
                          #{visit.patient.code}
                        </span>
                      )}
                      {visit.patient.name}
                    </Link>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{visit.operation?.name || "N/A"}</span>
                      {visit.doctor && (
                        <>
                          <span>·</span>
                          <span>Dr. {visit.doctor.name}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>{format(new Date(visit.visitDate), "MMM d")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-medium">
                        {"\u20B9"}{billed.toLocaleString("en-IN")}
                      </div>
                      {balance > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          Due: {"\u20B9"}{balance.toLocaleString("en-IN")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Paid
                        </Badge>
                      )}
                    </div>
                    {balance > 0 && (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/patients/${visit.patient.id}/checkout`}>
                          Pay
                        </Link>
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

function DoctorDashboard({
  doctorName,
  data,
}: {
  doctorName: string;
  data: Awaited<ReturnType<typeof getDoctorDashboardData>>;
}) {
  const pendingExams = data.todayPatients.filter((v) => v.clinicalReports.length === 0);
  const completedExams = data.todayPatients.filter((v) => v.clinicalReports.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Good morning, Dr. {doctorName}</h2>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href="/visits/new">
            <Plus className="mr-2 h-4 w-4" />
            New Visit
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/patients">
            <Users className="mr-2 h-4 w-4" />
            Search Patient
          </Link>
        </Button>
      </div>

      {/* My Patients Today */}
      <Card>
        <CardHeader>
          <CardTitle>
            My Patients Today
            {data.todayPatients.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingExams.length} pending
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {data.todayPatients.map((visit) => {
              const hasReport = visit.clinicalReports.length > 0;
              return (
                <div
                  key={visit.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <Link
                      href={`/patients/${visit.patient.id}`}
                      className="font-medium hover:underline flex items-center gap-2"
                    >
                      <span className="font-mono text-sm text-muted-foreground">
                        #{visit.patient.code}
                      </span>
                      {visit.patient.name}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      {visit.operation?.name || "Visit"}
                      {hasReport && " — notes complete"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={hasReport ? "outline" : "default"}
                    asChild
                  >
                    <Link href={`/visits/${visit.id}/examine`}>
                      <ClipboardPlus className="mr-2 h-4 w-4" />
                      {hasReport ? "Edit Notes" : "Examine"}
                    </Link>
                  </Button>
                </div>
              );
            })}
            {data.todayPatients.length === 0 && (
              <div className="py-4 text-center text-muted-foreground">
                No patients assigned to you today
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Clinical Notes */}
      {data.recentReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Clinical Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {data.recentReports.map((report) => (
                <Link
                  key={report.id}
                  href={`/visits/${report.visitId}/examine`}
                  className="block py-3 hover:bg-accent -mx-4 px-4 rounded transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">
                      {format(new Date(report.reportDate), "MMM d")} —{" "}
                      <span className="font-mono">#{report.visit.patient.code}</span>{" "}
                      {report.visit.patient.name} — {report.visit.operation?.name || "Visit"}
                    </div>
                  </div>
                  {report.diagnosis && (
                    <div className="text-sm text-muted-foreground mt-0.5">
                      Dx: {report.diagnosis.length > 80 ? report.diagnosis.substring(0, 80) + "..." : report.diagnosis}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
