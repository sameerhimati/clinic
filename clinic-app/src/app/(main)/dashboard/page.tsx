import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  Receipt,
  CalendarDays,
  Phone,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { toTitleCase, formatDate, formatFullDate } from "@/lib/format";
import { requireAuth } from "@/lib/auth";
import { canCollectPayments } from "@/lib/permissions";
import { calcBilled, calcPaid, calcBalance } from "@/lib/billing";
import { DoctorScheduleWidget } from "@/components/doctor-schedule-widget";
import { MultiDaySchedule } from "@/components/multi-day-schedule";
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
        patient: { select: { id: true, name: true, code: true, diseases: { include: { disease: { select: { name: true } } } } } },
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

  // Negative escrow patients
  const allPatientPayments = await prisma.patientPayment.groupBy({
    by: ["patientId"],
    _sum: { amount: true },
  });
  const allFulfillments = await prisma.escrowFulfillment.groupBy({
    by: ["patientId"],
    _sum: { amount: true },
  });
  const fulfillmentMap = new Map(allFulfillments.map((f) => [f.patientId, f._sum.amount || 0]));
  const negativeEscrowPatientIds = allPatientPayments
    .filter((p) => {
      const deposits = p._sum.amount || 0;
      const fulfilled = fulfillmentMap.get(p.patientId) || 0;
      return deposits - fulfilled < 0;
    })
    .map((p) => p.patientId);

  let negativeEscrowPatients: { id: number; code: number | null; name: string; balance: number }[] = [];
  if (negativeEscrowPatientIds.length > 0) {
    const patients = await prisma.patient.findMany({
      where: { id: { in: negativeEscrowPatientIds } },
      select: { id: true, code: true, name: true },
    });
    negativeEscrowPatients = patients.map((p) => {
      const dep = allPatientPayments.find((pp) => pp.patientId === p.id)?._sum.amount || 0;
      const ful = fulfillmentMap.get(p.id) || 0;
      return { id: p.id, code: p.code, name: toTitleCase(p.name), balance: dep - ful };
    });
  }

  // Follow-up queue: patients with active plans where next item has no appointment and is overdue
  const activePlans = await prisma.treatmentPlan.findMany({
    where: { status: "ACTIVE" },
    include: {
      patient: { select: { id: true, code: true, name: true, mobile: true, phone: true } },
      items: {
        orderBy: { sortOrder: "asc" },
        include: {
          appointments: { where: { status: { notIn: ["CANCELLED", "NO_SHOW"] } }, take: 1 },
        },
      },
    },
  });
  const followUpQueue: {
    patientId: number;
    patientCode: number | null;
    patientName: string;
    phone: string | null;
    treatmentTitle: string;
    nextStep: string;
    daysUntilDue: number; // negative = overdue, 0 = today, positive = upcoming
    planId: number;
  }[] = [];
  const now = new Date();
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  for (const plan of activePlans) {
    // Find last completed item and next uncompleted item
    const items = [...plan.items].sort((a, b) => a.sortOrder - b.sortOrder);
    let lastCompletedDate: Date | null = null;
    let nextItem: typeof items[0] | null = null;
    for (let i = 0; i < items.length; i++) {
      if (items[i].completedAt) {
        lastCompletedDate = items[i].completedAt;
      } else if (!nextItem) {
        nextItem = items[i];
      }
    }
    if (!nextItem || !lastCompletedDate) continue;
    // Has appointment already? Skip
    if (nextItem.appointments && nextItem.appointments.length > 0) continue;
    // Calculate due date: lastCompleted + estimatedDayGap
    const dueDate = new Date(lastCompletedDate);
    dueDate.setDate(dueDate.getDate() + nextItem.estimatedDayGap);
    // Include if overdue, due today, or due within 7 days
    if (dueDate > sevenDaysFromNow) continue;
    const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    followUpQueue.push({
      patientId: plan.patient.id,
      patientCode: plan.patient.code,
      patientName: toTitleCase(plan.patient.name),
      phone: plan.patient.mobile || plan.patient.phone || null,
      treatmentTitle: plan.title,
      nextStep: nextItem.label,
      daysUntilDue,
      planId: plan.id,
    });
  }
  // Sort: overdue first (most overdue at top), then upcoming
  followUpQueue.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  // Ready for checkout — completed appointments today with clinical reports
  const completedToday = await prisma.appointment.findMany({
    where: {
      date: { gte: today, lt: tomorrow },
      status: "COMPLETED",
    },
    include: {
      patient: { select: { id: true, code: true, name: true } },
      doctor: { select: { name: true } },
      visit: {
        select: {
          id: true,
          operationRate: true,
          discount: true,
          operation: { select: { name: true } },
          workDone: { select: { id: true, toothNumber: true, operation: { select: { name: true } } } },
          clinicalReports: { select: { id: true }, take: 1 },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Filter to only those with a clinical report (exam was actually done)
  const readyForCheckout: {
    appointmentId: number;
    patientId: number;
    patientCode: number | null;
    patientName: string;
    doctorName: string | null;
    operationName: string | null;
    visitId: number | null;
    workDoneSummary: string;
    escrowBalance: number;
  }[] = [];

  for (const appt of completedToday) {
    if (!appt.visit || appt.visit.clinicalReports.length === 0) continue;

    // Calculate escrow balance for this patient
    const [deposits, fulfilled] = await Promise.all([
      prisma.patientPayment.aggregate({
        where: { patientId: appt.patientId },
        _sum: { amount: true },
      }),
      prisma.escrowFulfillment.aggregate({
        where: { patientId: appt.patientId },
        _sum: { amount: true },
      }),
    ]);
    const escrowBalance = (deposits._sum.amount || 0) - (fulfilled._sum.amount || 0);

    const workDone = appt.visit.workDone;
    const workSummary = workDone.length > 0
      ? workDone.map((w) => {
          const tooth = w.toothNumber ? ` (#${w.toothNumber})` : "";
          return `${w.operation.name}${tooth}`;
        }).join(", ")
      : "";

    readyForCheckout.push({
      appointmentId: appt.id,
      patientId: appt.patientId,
      patientCode: appt.patient.code,
      patientName: toTitleCase(appt.patient.name),
      doctorName: appt.doctor?.name ? toTitleCase(appt.doctor.name) : null,
      operationName: appt.visit.operation?.name || null,
      visitId: appt.visit.id,
      workDoneSummary: workSummary,
      escrowBalance,
    });
  }

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
    negativeEscrowPatients,
    followUpQueue,
    readyForCheckout,
  };
}

async function getDoctorDashboardData(doctorId: number, isConsultant: boolean) {
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
      patient: { select: { id: true, name: true, code: true, diseases: { include: { disease: { select: { name: true } } } } } },
      doctor: { select: { name: true } },
      visit: {
        select: {
          id: true,
          clinicalReports: {
            select: { complaint: true },
            orderBy: { reportDate: "desc" as const },
            take: 1,
          },
        },
      },
      planItem: {
        select: { label: true },
      },
    },
  });

  // For consultants: next 7 days of appointments
  let futureAppointments: typeof todayAppointments = [];
  if (isConsultant) {
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    futureAppointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        date: { gte: tomorrow, lt: weekFromNow },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
      orderBy: { date: "asc" },
      include: {
        patient: { select: { id: true, name: true, code: true, diseases: { include: { disease: { select: { name: true } } } } } },
        doctor: { select: { name: true } },
        visit: {
          select: {
            id: true,
            clinicalReports: {
              select: { complaint: true },
              orderBy: { reportDate: "desc" as const },
              take: 1,
            },
          },
        },
        planItem: {
          select: { label: true },
        },
      },
    });
  }

  return { todayAppointments, futureAppointments };
}


export default async function DashboardPage() {
  const doctor = await requireAuth();
  const isDoctor = doctor.permissionLevel >= 3;
  const isConsultant = doctor.permissionLevel === 4;
  const canCollect = canCollectPayments(doctor.permissionLevel);
  const greeting = getGreeting();

  if (isDoctor) {
    const data = await getDoctorDashboardData(doctor.id, isConsultant);
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
            medicalAlerts: appt.patient.diseases.map((d) => d.disease.name),
            chiefComplaint: appt.visit?.clinicalReports?.[0]?.complaint?.slice(0, 40) || null,
            planStep: appt.planItem?.label || null,
          }))}
        />

        {/* Multi-day schedule for consultants */}
        {isConsultant && data.futureAppointments.length > 0 && (() => {
          const dayMap = new Map<string, { date: string; label: string; appointments: { id: number; patientId: number; patientCode: number | null; patientName: string; timeSlot: string | null; status: string; reason: string | null }[] }>();
          for (const appt of data.futureAppointments) {
            const d = new Date(appt.date);
            const key = d.toISOString().split("T")[0];
            if (!dayMap.has(key)) {
              dayMap.set(key, {
                date: key,
                label: d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
                appointments: [],
              });
            }
            dayMap.get(key)!.appointments.push({
              id: appt.id,
              patientId: appt.patient.id,
              patientCode: appt.patient.code,
              patientName: toTitleCase(appt.patient.name),
              timeSlot: appt.timeSlot,
              status: appt.status,
              reason: appt.reason,
            });
          }
          return <MultiDaySchedule days={Array.from(dayMap.values())} />;
        })()}
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

      {/* Ready for Checkout — patients done today, need payment/scheduling */}
      {data.readyForCheckout.length > 0 && (
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Ready for Checkout
              <Badge variant="secondary" className="text-xs">{data.readyForCheckout.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-green-100">
              {data.readyForCheckout.map((item) => (
                <div key={item.appointmentId} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/patients/${item.patientId}`} className="font-medium hover:underline flex items-center gap-2">
                      <span className="font-mono text-sm text-muted-foreground">#{item.patientCode}</span>
                      <span className="truncate">{item.patientName}</span>
                    </Link>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {item.operationName || "Visit"}
                      {item.doctorName && ` · Dr. ${item.doctorName}`}
                      {item.workDoneSummary && (
                        <span className="text-foreground font-medium"> · {item.workDoneSummary}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.escrowBalance < 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {"\u20B9"}{Math.abs(item.escrowBalance).toLocaleString("en-IN")} due
                      </Badge>
                    )}
                    {item.escrowBalance >= 0 && (
                      <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">
                        {"\u20B9"}{item.escrowBalance.toLocaleString("en-IN")} bal
                      </Badge>
                    )}
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/patients/${item.patientId}/checkout`}>
                        Checkout {"\u2192"}
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
          medicalAlerts: appt.patient.diseases.map((d) => d.disease.name),
        }))}
      />

      {/* Follow-up Queue */}
      {data.followUpQueue.length > 0 && (() => {
        const overdue = data.followUpQueue.filter((i) => i.daysUntilDue < 0);
        const dueToday = data.followUpQueue.filter((i) => i.daysUntilDue === 0);
        const upcoming = data.followUpQueue.filter((i) => i.daysUntilDue > 0);
        const renderItem = (item: typeof data.followUpQueue[0]) => (
          <div key={`${item.patientId}-${item.planId}`} className="flex items-center justify-between py-2.5 gap-3">
            <div className="min-w-0 flex-1">
              <Link href={`/patients/${item.patientId}`} className="font-medium hover:underline flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">#{item.patientCode}</span>
                <span className="truncate">{item.patientName}</span>
              </Link>
              <div className="text-xs text-muted-foreground mt-0.5">
                {item.treatmentTitle} — <span className="font-medium text-foreground">{item.nextStep}</span>
                {item.daysUntilDue < 0 && (
                  <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0 text-red-600 border-red-200 bg-red-50">
                    {Math.abs(item.daysUntilDue)}d overdue
                  </Badge>
                )}
                {item.daysUntilDue === 0 && (
                  <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0 text-amber-600 border-amber-200 bg-amber-50">
                    Due today
                  </Badge>
                )}
                {item.daysUntilDue > 0 && (
                  <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0 text-blue-600 border-blue-200 bg-blue-50">
                    In {item.daysUntilDue}d
                  </Badge>
                )}
              </div>
              {item.phone && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  <Phone className="inline h-3 w-3 mr-0.5" />{item.phone}
                </div>
              )}
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/appointments/new?patientId=${item.patientId}`}>
                <CalendarDays className="mr-1 h-3.5 w-3.5" />
                Schedule
              </Link>
            </Button>
          </div>
        );
        return (
          <Card className="border-amber-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Phone className="h-4 w-4 text-amber-600" />
                Follow-up Queue
                <span className="text-xs font-normal text-muted-foreground">({data.followUpQueue.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {(overdue.length > 0 || dueToday.length > 0) && (
                <div>
                  {(overdue.length > 0 || dueToday.length > 0) && (
                    <div className="text-xs font-semibold text-red-600 uppercase tracking-wider pb-1">Overdue</div>
                  )}
                  <div className="divide-y">
                    {[...overdue, ...dueToday].slice(0, 5).map(renderItem)}
                  </div>
                </div>
              )}
              {upcoming.length > 0 && (
                <div className={overdue.length > 0 || dueToday.length > 0 ? "pt-3 mt-3 border-t" : ""}>
                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider pb-1">Coming Up</div>
                  <div className="divide-y">
                    {upcoming.slice(0, 5).map(renderItem)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Negative Escrow Patients — prominent warning */}
      {data.negativeEscrowPatients.length > 0 && (
        <Card className="border-red-300 bg-red-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold text-red-700 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-700 text-sm font-bold">{data.negativeEscrowPatients.length}</span>
              Escrow Deficit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-red-100">
              {data.negativeEscrowPatients.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5">
                  <Link href={`/patients/${p.id}`} className="font-medium hover:underline flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">#{p.code}</span>
                    {p.name}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-red-700 font-semibold text-sm tabular-nums">
                      {"\u20B9"}{Math.abs(p.balance).toLocaleString("en-IN")}
                    </span>
                    <Button size="sm" variant="destructive" asChild>
                      <Link href={`/patients/${p.id}/checkout`}>Collect</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
