import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  Receipt,
  CalendarDays,
  Phone,
  CheckCircle2,
  Shield,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { toTitleCase, formatDate, formatFullDate, formatRelativeDate } from "@/lib/format";
import { requireAuth } from "@/lib/auth";
import { canCollectPayments, isAdmin } from "@/lib/permissions";
import { calcBilled, calcPaid, calcBalance } from "@/lib/billing";
import { getDefaultAdvance } from "@/lib/clinic-settings";
import { DoctorScheduleWidget } from "@/components/doctor-schedule-widget";
import { MultiDaySchedule } from "@/components/multi-day-schedule";
import { DashboardAppointmentList } from "./dashboard-appointments";
import { PrescriptionQueue } from "@/components/prescription-queue";
import { ReceptionDashboard } from "./reception-dashboard";

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
    totalOutstandingResult,
    pendingPaymentVisits,
    todayAppointments,
    auditFlagCount,
    visitsByDoctor,
  ] = await Promise.all([
    prisma.visit.count({
      where: { visitDate: { gte: today, lt: tomorrow } },
    }),
    prisma.receipt.aggregate({
      where: { receiptDate: { gte: today, lt: tomorrow } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.$queryRaw<[{ total: number }]>`
      SELECT COALESCE(SUM(v.operationRate - v.discount - COALESCE(r.paid, 0)), 0) as total
      FROM visits v
      LEFT JOIN (SELECT visitId, SUM(amount) as paid FROM receipts GROUP BY visitId) r ON r.visitId = v.id
      WHERE v.operationRate > 0 AND (v.operationRate - v.discount - COALESCE(r.paid, 0)) > 0
    `,
    prisma.visit.findMany({
      where: { operationRate: { gt: 0 } },
      orderBy: { visitDate: "desc" },
      take: 200,
      include: {
        patient: { select: { id: true, name: true, code: true } },
        operation: { select: { name: true } },
        doctor: { select: { name: true } },
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
    prisma.auditLog.count({
      where: {
        severity: "FLAG",
        createdAt: { gte: today },
      },
    }),
    prisma.visit.groupBy({
      by: ["doctorId"],
      where: { visitDate: { gte: today, lt: tomorrow } },
      _count: true,
    }),
  ]);

  const totalOutstanding = Number(totalOutstandingResult[0]?.total ?? 0);

  // Filter to visits with outstanding balance, take top 5
  const pendingPayments = pendingPaymentVisits
    .filter((v) => calcBalance(v, v.receipts) > 0)
    .slice(0, 5);

  // Batch-query financials for today's appointment patients
  const appointmentPatientIds = [...new Set(todayAppointments.map((a) => a.patientId))];
  let totalBilledMap = new Map<number, number>();
  let totalCollectedMap = new Map<number, number>();
  if (appointmentPatientIds.length > 0) {
    const [apptDeposits, apptBilled, apptReceipts] = await Promise.all([
      prisma.patientPayment.groupBy({
        by: ["patientId"],
        where: { patientId: { in: appointmentPatientIds } },
        _sum: { amount: true },
      }),
      prisma.visit.groupBy({
        by: ["patientId"],
        where: { patientId: { in: appointmentPatientIds }, operationRate: { gt: 0 } },
        _sum: { operationRate: true, discount: true },
      }),
      prisma.$queryRaw<{ patientId: number; total: number }[]>`
        SELECT v.patientId, COALESCE(SUM(r.amount), 0) as total
        FROM receipts r JOIN visits v ON r.visitId = v.id
        WHERE v.patientId IN (${Prisma.join(appointmentPatientIds)})
        GROUP BY v.patientId
      `,
    ]);
    const depositsMap = new Map<number, number>();
    const receiptsMap = new Map<number, number>();
    for (const d of apptDeposits) {
      depositsMap.set(d.patientId, d._sum.amount || 0);
    }
    for (const r of apptReceipts) {
      receiptsMap.set(r.patientId, Number(r.total) || 0);
    }
    for (const b of apptBilled) {
      totalBilledMap.set(b.patientId, (b._sum.operationRate || 0) - (b._sum.discount || 0));
    }
    // totalCollected = deposits + receipts
    for (const pid of appointmentPatientIds) {
      totalCollectedMap.set(pid, (depositsMap.get(pid) || 0) + (receiptsMap.get(pid) || 0));
    }
  }

  // No more negative escrow from fulfillments — skip this section
  const negativeEscrowPatients: { id: number; code: number | null; name: string; balance: number }[] = [];

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
    totalCollected: number;
    totalBilled: number;
  }[] = [];

  // Batch-query financials for completed patients
  const completedPatientIds = [...new Set(completedToday.filter(a => a.visit && a.visit.clinicalReports.length > 0).map(a => a.patientId))];
  const checkoutFinancials = new Map<number, { collected: number; billed: number }>();
  if (completedPatientIds.length > 0) {
    const [checkoutDeposits, checkoutBilled, checkoutReceipts] = await Promise.all([
      prisma.patientPayment.groupBy({
        by: ["patientId"],
        where: { patientId: { in: completedPatientIds } },
        _sum: { amount: true },
      }),
      prisma.visit.groupBy({
        by: ["patientId"],
        where: { patientId: { in: completedPatientIds }, operationRate: { gt: 0 } },
        _sum: { operationRate: true, discount: true },
      }),
      prisma.$queryRaw<{ patientId: number; total: number }[]>`
        SELECT v.patientId, COALESCE(SUM(r.amount), 0) as total
        FROM receipts r JOIN visits v ON r.visitId = v.id
        WHERE v.patientId IN (${Prisma.join(completedPatientIds)})
        GROUP BY v.patientId
      `,
    ]);
    const chkDepositsMap = new Map<number, number>();
    const chkReceiptsMap = new Map<number, number>();
    for (const d of checkoutDeposits) {
      chkDepositsMap.set(d.patientId, d._sum.amount || 0);
    }
    for (const r of checkoutReceipts) {
      chkReceiptsMap.set(r.patientId, Number(r.total) || 0);
    }
    for (const b of checkoutBilled) {
      const billed = (b._sum.operationRate || 0) - (b._sum.discount || 0);
      const collected = (chkDepositsMap.get(b.patientId) || 0) + (chkReceiptsMap.get(b.patientId) || 0);
      checkoutFinancials.set(b.patientId, { collected, billed });
    }
  }

  for (const appt of completedToday) {
    if (!appt.visit || appt.visit.clinicalReports.length === 0) continue;

    const financials = checkoutFinancials.get(appt.patientId) || { collected: 0, billed: 0 };
    // Skip patients with nothing billed — nothing to check out
    if (financials.billed <= 0) continue;

    readyForCheckout.push({
      appointmentId: appt.id,
      patientId: appt.patientId,
      patientCode: appt.patient.code,
      patientName: toTitleCase(appt.patient.name),
      doctorName: appt.doctor?.name ? toTitleCase(appt.doctor.name) : null,
      operationName: appt.visit.operation?.name || null,
      visitId: appt.visit.id,
      totalCollected: financials.collected,
      totalBilled: financials.billed,
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

  // Treatment progress completed today
  const todayProgress = await prisma.treatmentPlanItem.findMany({
    where: {
      completedAt: { gte: today, lt: tomorrow },
    },
    include: {
      plan: { select: { title: true, patientId: true, patient: { select: { id: true, code: true, name: true } } } },
      assignedDoctor: { select: { name: true } },
    },
    orderBy: { completedAt: "desc" },
    take: 20,
  });

  // Count of today's patients with outstanding balance
  const patientsWithLowBalance = todayAppointments.filter((a) => {
    const billed = totalBilledMap.get(a.patientId) || 0;
    const collected = totalCollectedMap.get(a.patientId) || 0;
    return billed > 0 && collected < billed;
  }).length;

  // Lab order nudges: plan items needing lab work but no order placed
  const labNudgeItems = await prisma.treatmentPlanItem.findMany({
    where: {
      completedAt: null,
      plan: { status: "ACTIVE" },
      labOrders: { none: {} },
      OR: [
        { estimatedLabCost: { gt: 0 } },
        { operation: { labCostEstimate: { gt: 0 } } },
        { operation: { treatmentSteps: { some: { requiresLabWork: true } } } },
      ],
    },
    include: {
      plan: {
        select: {
          title: true,
          patient: { select: { id: true, code: true, name: true } },
          items: {
            where: { completedAt: { not: null } },
            select: { id: true },
            take: 1,
          },
        },
      },
      operation: { select: { name: true } },
    },
    take: 20,
  });
  // Filter to items where work has started (at least one sibling completed)
  // Then group by patient+plan to avoid duplicate alerts
  const filteredLabItems = labNudgeItems.filter((item) => item.plan.items.length > 0);
  const labNudgeGrouped = new Map<string, {
    planItemId: number;
    patientId: number;
    patientCode: number | null;
    patientName: string;
    planTitle: string;
    stepLabel: string;
    toothNumbers: string | null;
    stepCount: number;
  }>();
  for (const item of filteredLabItems) {
    const key = `${item.plan.patient.id}-${item.planId}`;
    const existing = labNudgeGrouped.get(key);
    if (existing) {
      existing.stepCount += 1;
    } else {
      labNudgeGrouped.set(key, {
        planItemId: item.id,
        patientId: item.plan.patient.id,
        patientCode: item.plan.patient.code,
        patientName: toTitleCase(item.plan.patient.name),
        planTitle: item.plan.title,
        stepLabel: item.label,
        toothNumbers: null,
        stepCount: 1,
      });
    }
  }
  const labNudges = Array.from(labNudgeGrouped.values());

  // Pending lab orders (ORDERED status)
  const pendingLabOrders = await prisma.labOrder.findMany({
    where: { status: "ORDERED" },
    orderBy: { orderedDate: "asc" },
    include: {
      patient: { select: { id: true, code: true, name: true } },
      lab: { select: { name: true } },
      labRate: { select: { itemName: true } },
    },
    take: 20,
  });

  const pendingLabOrdersMapped = pendingLabOrders.map((o) => ({
    id: o.id,
    patientId: o.patient.id,
    patientCode: o.patient.code,
    patientName: toTitleCase(o.patient.name),
    labName: o.lab.name,
    materialName: o.labRate.itemName,
    daysSinceOrdered: Math.floor((now.getTime() - new Date(o.orderedDate).getTime()) / (1000 * 60 * 60 * 24)),
    expectedDate: o.expectedDate ? o.expectedDate.toISOString() : null,
    totalAmount: o.totalAmount,
  }));

  // Rate changes (last 7 days) for L1 dashboard widget
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const rateChanges = await prisma.auditLog.findMany({
    where: {
      action: { in: ["LAB_RATE_CHANGE", "OPERATION_RATE_CHANGE", "LAB_RATE_CREATED"] },
      createdAt: { gte: sevenDaysAgo },
    },
    include: { actor: { select: { name: true } } },
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
    totalCollectedMap,
    totalBilledMap,
    auditFlagCount,
    visitsByDoctor,
    todayProgress,
    patientsWithLowBalance,
    labNudges,
    pendingLabOrders: pendingLabOrdersMapped,
    rateChanges,
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
            <h2 className="text-2xl font-bold">{greeting}, Dr. {toTitleCase(doctor.name)}</h2>
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
            type: appt.type || "CONSULTATION",
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

  // L2 Reception: new two-column dashboard with inline dialogs
  if (doctor.permissionLevel === 2) {
    const [doctorsList, labsList] = await Promise.all([
      prisma.doctor.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.lab.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        include: { rates: { where: { isActive: true }, orderBy: { itemName: "asc" }, select: { id: true, itemName: true, rate: true } } },
      }),
    ]);

    // Build checkout list from completed appointments
    const readyForCheckout = data.readyForCheckout.map((item) => ({
      patientId: item.patientId,
      patientCode: item.patientCode,
      patientName: item.patientName,
      totalCollected: item.totalCollected,
      totalBilled: item.totalBilled,
      operationName: item.operationName,
      doctorName: item.doctorName,
    }));

    return (
      <ReceptionDashboard
        greeting={greeting}
        userName={toTitleCase(doctor.name)}
        dateDisplay={formatFullDate(new Date())}
        todayVisits={data.todayVisits}
        todayCollections={data.todayCollections}
        totalOutstanding={data.totalOutstanding}
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
          totalCollected: data.totalCollectedMap.get(appt.patientId) ?? null,
          totalBilled: data.totalBilledMap.get(appt.patientId) ?? null,
        }))}
        followUpQueue={data.followUpQueue}
        readyForCheckout={readyForCheckout}
        prescriptions={data.pendingPrescriptions.filter((p): p is typeof p & { doctor: { name: string }; visit: { id: number; caseNo: number | null } } => p.doctor !== null && p.visit !== null)}
        doctors={doctorsList}
        labNudges={data.labNudges}
        pendingLabOrders={data.pendingLabOrders}
        labs={labsList}
        defaultAdvance={await getDefaultAdvance()}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with inline stats */}
      <div>
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl font-bold">{greeting}, {toTitleCase(doctor.name)}</h2>
          <span className="text-sm text-muted-foreground">{formatFullDate(new Date())}</span>
        </div>
        {doctor.permissionLevel > 1 && (
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
        )}
      </div>

      {/* L1 Admin: prominent stat cards */}
      {doctor.permissionLevel <= 1 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Link href="/visits" className="block">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Visits Today</div>
                <div className="text-2xl font-bold mt-1">{data.todayVisits}</div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/reports/commission" className="block">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Collections</div>
                <div className="text-2xl font-bold mt-1 text-green-700">{"\u20B9"}{data.todayCollections.toLocaleString("en-IN")}</div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/reports/outstanding" className="block">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Outstanding</div>
                <div className="text-2xl font-bold mt-1 text-destructive">{"\u20B9"}{data.totalOutstanding.toLocaleString("en-IN")}</div>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* L1 Admin: audit flags + staff activity */}
      {doctor.permissionLevel <= 1 && (
        <div className="flex flex-wrap gap-3">
          {data.auditFlagCount > 0 && (
            <Link href="/reports/audit?severity=FLAG" className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-100 transition-colors">
              <Shield className="h-3.5 w-3.5" />
              {data.auditFlagCount} flagged action{data.auditFlagCount !== 1 ? "s" : ""} today
            </Link>
          )}
          {data.visitsByDoctor.length > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm text-muted-foreground">
              Staff: {data.visitsByDoctor.map(v => v._count).reduce((a, b) => a + b, 0)} visits by {data.visitsByDoctor.length} doctor{data.visitsByDoctor.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}

      {/* L1 Admin: Rate Changes This Week */}
      {doctor.permissionLevel <= 1 && data.rateChanges.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Rate Changes This Week
              <Badge variant="secondary" className="text-xs">{data.rateChanges.length}</Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/reports/audit?action=RATE_CHANGE">View All →</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-amber-100">
              {data.rateChanges.map((entry) => {
                const details = entry.details ? JSON.parse(entry.details) : {};
                const isLabRate = entry.action === "LAB_RATE_CHANGE" || entry.action === "LAB_RATE_CREATED";
                return (
                  <div key={entry.id} className="flex items-center justify-between py-2 gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">
                        {details.itemName || details.name || "Unknown"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {entry.action === "LAB_RATE_CREATED" ? (
                          <span>New lab rate: ₹{(details.rate || 0).toLocaleString("en-IN")}</span>
                        ) : isLabRate ? (
                          <span>₹{(details.oldRate || 0).toLocaleString("en-IN")} → ₹{(details.newRate || 0).toLocaleString("en-IN")}</span>
                        ) : (
                          <span>
                            {details.oldFee !== undefined && <>Fee: ₹{(details.oldFee || 0).toLocaleString("en-IN")} → ₹{(details.newFee || 0).toLocaleString("en-IN")}</>}
                            {details.oldDoctorFee !== undefined && <>{details.oldFee !== undefined ? " · " : ""}Dr fee: ₹{(details.oldDoctorFee || 0).toLocaleString("en-IN")} → ₹{(details.newDoctorFee || 0).toLocaleString("en-IN")}</>}
                          </span>
                        )}
                        {" · "}{toTitleCase(entry.actor.name)}
                        {" · "}{formatRelativeDate(entry.createdAt)}
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs shrink-0 ${isLabRate ? "border-violet-200 text-violet-700" : "border-blue-200 text-blue-700"}`}>
                      {isLabRate ? "Lab" : "Tariff"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Balance alerts — above the fold */}
      {(data.patientsWithLowBalance > 0 || data.pendingPayments.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {data.patientsWithLowBalance > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-700">
              {data.patientsWithLowBalance} today{"\u2019"}s patient{data.patientsWithLowBalance !== 1 ? "s" : ""} with no prepaid balance
            </div>
          )}
          {data.pendingPayments.length > 0 && (
            <Link
              href="/reports/outstanding"
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100 transition-colors"
            >
              {data.pendingPayments.length}+ pending payments {"\u2014"} View All
            </Link>
          )}
        </div>
      )}

      {/* Treatment Progress Today */}
      {data.todayProgress.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              Treatment Progress Today
              <Badge variant="secondary" className="text-xs">{data.todayProgress.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-blue-100">
              {data.todayProgress.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 gap-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/patients/${item.plan.patientId}`} className="font-medium hover:underline flex items-center gap-2">
                      <span className="font-mono text-sm text-muted-foreground">#{item.plan.patient.code}</span>
                      <span className="truncate">{toTitleCase(item.plan.patient.name)}</span>
                    </Link>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      <span className="font-medium text-foreground">{item.label}</span>
                      {" \u00b7 "}{item.plan.title}
                      {item.assignedDoctor && ` \u00b7 Dr. ${toTitleCase(item.assignedDoctor.name)}`}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/patients/${item.plan.patientId}/checkout`}>
                      Collect
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(() => {
                      const outstanding = item.totalBilled - item.totalCollected;
                      return outstanding > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          {"\u20B9"}{outstanding.toLocaleString("en-IN")} due
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">
                          Paid up
                        </Badge>
                      );
                    })()}
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
          totalCollected: data.totalCollectedMap.get(appt.patientId) ?? null,
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
                  <Badge variant="outline" className="ml-1.5 text-xs px-1 py-0 text-red-600 border-red-200 bg-red-50">
                    {Math.abs(item.daysUntilDue)}d overdue
                  </Badge>
                )}
                {item.daysUntilDue === 0 && (
                  <Badge variant="outline" className="ml-1.5 text-xs px-1 py-0 text-amber-600 border-amber-200 bg-amber-50">
                    Due today
                  </Badge>
                )}
                {item.daysUntilDue > 0 && (
                  <Badge variant="outline" className="ml-1.5 text-xs px-1 py-0 text-blue-600 border-blue-200 bg-blue-50">
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
