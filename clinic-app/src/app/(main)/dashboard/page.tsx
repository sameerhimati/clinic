import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  Receipt,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { toTitleCase, formatDate, formatFullDate } from "@/lib/format";
import { requireAuth } from "@/lib/auth";
import { canCollectPayments } from "@/lib/permissions";
import { calcBilled, calcPaid, calcBalance } from "@/lib/billing";
import { DoctorScheduleWidget } from "@/components/doctor-schedule-widget";
import { DashboardAppointmentList } from "./dashboard-appointments";
import { PrescriptionQueue } from "@/components/prescription-queue";

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
    pendingPaymentVisits,
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
      where: { operationRate: { gt: 0 } },
      orderBy: { visitDate: "desc" },
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

  // Filter to visits with outstanding balance, take top 5
  const pendingPayments = pendingPaymentVisits
    .filter((v) => calcBalance(v, v.receipts) > 0)
    .slice(0, 5);

  // Pending prescriptions
  const pendingPrescriptions = await prisma.prescription.findMany({
    where: { isPrinted: false },
    include: {
      patient: { select: { id: true, code: true, name: true } },
      doctor: { select: { name: true } },
      visit: { select: { id: true, caseNo: true } },
      items: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return {
    todayVisits,
    todayCollections: todayReceipts._sum.amount || 0,
    totalOutstanding,
    pendingPayments,
    todayAppointments,
    pendingPrescriptions,
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
  const isDoctor = doctor.permissionLevel >= 3;
  const isConsultant = doctor.permissionLevel === 4;
  const canCollect = canCollectPayments(doctor.permissionLevel);
  const greeting = getGreeting();

  if (isDoctor) {
    const data = await getDoctorDashboardData(doctor.id);
    return (
      <div className="space-y-4">
        {/* Compact header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h2 className="text-2xl font-bold">{greeting}, {isConsultant ? "" : "Dr. "}{toTitleCase(doctor.name)}</h2>
            <span className="text-sm text-muted-foreground">{formatFullDate(new Date())}</span>
          </div>
        </div>

        {/* Schedule as hero — the primary content */}
        <DoctorScheduleWidget
          appointments={data.todayAppointments.map((appt) => ({
            id: appt.id,
            patientId: appt.patient.id,
            patientCode: appt.patient.code,
            patientName: toTitleCase(appt.patient.name),
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
          <h2 className="text-2xl font-bold">{greeting}, {toTitleCase(doctor.name)}</h2>
          <span className="text-sm text-muted-foreground">{formatFullDate(new Date())}</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
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
      <div className="flex flex-wrap gap-2 items-center">
        <Button asChild>
          <Link href="/patients/new"><UserPlus className="mr-2 h-4 w-4" />New Patient</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/appointments/new"><CalendarDays className="mr-2 h-4 w-4" />Schedule</Link>
        </Button>
        {canCollect && (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/receipts/new"><Receipt className="mr-2 h-4 w-4" />Receipt</Link>
          </Button>
        )}
      </div>

      {/* Today's Appointments — hero section with inline actions */}
      <DashboardAppointmentList
        appointments={data.todayAppointments.map((appt) => ({
          id: appt.id,
          patientId: appt.patient.id,
          patientCode: appt.patient.code,
          patientName: toTitleCase(appt.patient.name),
          doctorName: appt.doctor?.name ? toTitleCase(appt.doctor.name) : null,
          visitId: appt.visit?.id || null,
          timeSlot: appt.timeSlot,
          status: appt.status,
          reason: appt.reason,
        }))}
      />

      {/* Prescription Queue — pending for print */}
      <PrescriptionQueue prescriptions={data.pendingPrescriptions} />

      {/* Pending Payments — actionable for reception */}
      {data.pendingPayments.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium">Pending Payments</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/reports/outstanding">View All &rarr;</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {data.pendingPayments.map((visit) => {
                const billed = calcBilled(visit);
                const balance = calcBalance(visit, visit.receipts);
                return (
                  <div key={visit.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <Link href={`/patients/${visit.patientId}`} className="font-medium hover:underline flex items-center gap-2">
                        <span className="font-mono text-sm text-muted-foreground">#{visit.patient.code}</span>
                        {toTitleCase(visit.patient.name)}
                      </Link>
                      <div className="text-sm text-muted-foreground">
                        {visit.operation?.name || "N/A"}
                        {visit.doctor && ` · Dr. ${toTitleCase(visit.doctor.name)}`}
                        {" · "}{formatDate(visit.visitDate)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <Badge variant="destructive" className="text-xs">Due: {"\u20B9"}{balance.toLocaleString("en-IN")}</Badge>
                      </div>
                      {canCollect && (
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/patients/${visit.patient.id}/checkout`}>Collect</Link>
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
