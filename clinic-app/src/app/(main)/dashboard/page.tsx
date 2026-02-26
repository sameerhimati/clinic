import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  Plus,
  Receipt,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { requireAuth } from "@/lib/auth";
import { canCollectPayments } from "@/lib/permissions";
import { calcBilled, calcPaid, calcBalance } from "@/lib/billing";
import { DoctorScheduleWidget } from "@/components/doctor-schedule-widget";
import { DashboardAppointmentList } from "./dashboard-appointments";

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
    todayAppointments,
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
      take: 5,
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
    prisma.appointment.findMany({
      where: {
        date: { gte: today, lt: tomorrow },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
      orderBy: { createdAt: "asc" },
      include: {
        patient: { select: { id: true, name: true, code: true } },
        doctor: { select: { name: true } },
        visit: { select: { id: true } },
      },
    }),
  ]);

  let totalOutstanding = 0;
  for (const visit of outstandingVisits) {
    const balance = calcBalance(visit, visit.receipts);
    if (balance > 0) totalOutstanding += balance;
  }

  return {
    todayVisits,
    todayCollections: todayReceipts._sum.amount || 0,
    totalOutstanding,
    recentVisits,
    todayAppointments,
  };
}

async function getDoctorDashboardData(doctorId: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayAppointments = await prisma.appointment.findMany({
    where: {
      doctorId,
      date: { gte: today, lt: tomorrow },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
    },
    orderBy: { createdAt: "asc" },
    include: {
      patient: { select: { id: true, name: true, code: true } },
      doctor: { select: { name: true } },
      visit: { select: { id: true } },
    },
  });

  return { todayAppointments };
}


export default async function DashboardPage() {
  const doctor = await requireAuth();
  const isDoctor = doctor.permissionLevel === 3;
  const canCollect = canCollectPayments(doctor.permissionLevel);
  const greeting = getGreeting();

  if (isDoctor) {
    const data = await getDoctorDashboardData(doctor.id);
    return (
      <div className="space-y-4">
        {/* Compact header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h2 className="text-2xl font-bold">{greeting}, Dr. {doctor.name}</h2>
            <span className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</span>
          </div>
          <Button size="sm" asChild>
            <Link href="/visits/new"><Plus className="mr-2 h-4 w-4" />New Visit</Link>
          </Button>
        </div>

        {/* Schedule as hero — the primary content */}
        <DoctorScheduleWidget
          appointments={data.todayAppointments.map((appt) => ({
            id: appt.id,
            patientId: appt.patient.id,
            patientCode: appt.patient.code,
            patientName: appt.patient.name,
            visitId: appt.visit?.id || null,
            timeSlot: appt.timeSlot,
            status: appt.status,
            reason: appt.reason,
          }))}
        />
      </div>
    );
  }

  // Admin/Reception dashboard
  const data = await getAdminDashboardData();

  return (
    <div className="space-y-4">
      {/* Header with inline stats */}
      <div>
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl font-bold">{greeting}, {doctor.name}</h2>
          <span className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <Link href="/visits" className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm hover:bg-accent transition-colors">
            {data.todayVisits} visits today
          </Link>
          <Link href="/reports/commission" className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm text-green-700 hover:bg-accent transition-colors">
            {"\u20B9"}{data.todayCollections.toLocaleString("en-IN")} collected
          </Link>
          {data.totalOutstanding > 0 && (
            <Link href="/reports/outstanding" className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm text-destructive hover:bg-accent transition-colors">
              {"\u20B9"}{data.totalOutstanding.toLocaleString("en-IN")} outstanding
            </Link>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/patients/new"><UserPlus className="mr-2 h-4 w-4" />New Patient</Link>
        </Button>
        <Button asChild>
          <Link href="/visits/new"><Plus className="mr-2 h-4 w-4" />New Visit</Link>
        </Button>
        {canCollect && (
          <Button variant="outline" asChild>
            <Link href="/receipts/new"><Receipt className="mr-2 h-4 w-4" />Receipt</Link>
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href="/appointments/new"><CalendarDays className="mr-2 h-4 w-4" />Schedule</Link>
        </Button>
      </div>

      {/* Today's Appointments — hero section with inline actions */}
      <DashboardAppointmentList
        appointments={data.todayAppointments.map((appt) => ({
          id: appt.id,
          patientId: appt.patient.id,
          patientCode: appt.patient.code,
          patientName: appt.patient.name,
          doctorName: appt.doctor?.name || null,
          visitId: appt.visit?.id || null,
          timeSlot: appt.timeSlot,
          status: appt.status,
          reason: appt.reason,
        }))}
      />

      {/* Recent Visits — de-emphasized */}
      {data.recentVisits.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-muted-foreground text-base font-medium">Recent Visits</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/visits">View All &rarr;</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {data.recentVisits.map((visit) => {
                const billed = calcBilled(visit);
                const balance = calcBalance(visit, visit.receipts);
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
      )}
    </div>
  );
}
