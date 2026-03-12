import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireAuth } from "@/lib/auth";
import { canCollectPayments, canSeeInternalCosts, canEditPatients, isAdmin as checkIsAdmin } from "@/lib/permissions";
import { calcBilled, calcPaid } from "@/lib/billing";
import { calcEscrowBalance } from "@/lib/escrow";
import { PatientPageClient, type PatientPageData } from "./patient-page-client";
import type { VisitWithRelations } from "@/components/treatment-timeline";
import { toTitleCase } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patientId = parseInt(id);
  const currentUser = await requireAuth();
  const canCollect = canCollectPayments(currentUser.permissionLevel);
  const showInternalCosts = canSeeInternalCosts(currentUser.permissionLevel);
  const canEdit = canEditPatients(currentUser.permissionLevel);
  const userIsAdmin = checkIsAdmin(currentUser.permissionLevel);

  // Use local midnight for date comparisons (avoids UTC vs IST mismatch)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const [patient, todayAppointments, futureAppointments, pastAppointments, operations, doctors, labs, allDiseases, toothStatuses, toothHistory, treatmentPlans, treatmentChains, clinicalNotes, labOrders] = await Promise.all([
    prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        corporatePartner: { select: { name: true } },
        diseases: { include: { disease: true } },
        visits: {
          orderBy: { visitDate: "desc" },
          include: {
            operation: { select: { name: true } },
            doctor: { select: { id: true, name: true } },
            lab: { select: { name: true } },
            receipts: { select: { id: true, receiptNo: true, amount: true, paymentMode: true, receiptDate: true } },
            clinicalReports: {
              include: {
                doctor: { select: { name: true } },
                addendums: {
                  include: { doctor: { select: { name: true } } },
                  orderBy: { createdAt: "asc" },
                },
              },
              orderBy: { reportDate: "desc" },
              take: 1,
            },
            files: {
              include: { uploadedBy: true },
              orderBy: { createdAt: "desc" },
            },
            followUps: {
              orderBy: { visitDate: "asc" },
              include: {
                operation: { select: { name: true } },
                doctor: { select: { id: true, name: true } },
                lab: { select: { name: true } },
                clinicalReports: {
                  include: {
                    doctor: { select: { name: true } },
                    addendums: {
                      include: { doctor: { select: { name: true } } },
                      orderBy: { createdAt: "asc" },
                    },
                  },
                  orderBy: { reportDate: "desc" },
                  take: 1,
                },
                files: {
                  include: { uploadedBy: true },
                  orderBy: { createdAt: "desc" },
                },
                followUps: { select: { id: true } },
                receipts: { select: { amount: true } },
              },
            },
          },
        },
        files: {
          include: {
            uploadedBy: true,
            visit: { include: { operation: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    // Today's appointments for this patient
    prisma.appointment.findMany({
      where: {
        patientId,
        date: { gte: todayStart, lt: tomorrowStart },
        status: { in: ["SCHEDULED", "ARRIVED", "IN_PROGRESS"] },
      },
      include: { doctor: { select: { name: true } }, visit: { select: { id: true } } },
      orderBy: { createdAt: "asc" },
    }),
    // Future appointments (not today)
    prisma.appointment.findMany({
      where: {
        patientId,
        date: { gte: tomorrowStart },
        status: { in: ["SCHEDULED"] },
      },
      include: { doctor: { select: { name: true } } },
      orderBy: { date: "asc" },
      take: 3,
    }),
    // Past appointments (completed, cancelled, no-show)
    prisma.appointment.findMany({
      where: {
        patientId,
        status: { in: ["COMPLETED", "CANCELLED", "NO_SHOW"] },
      },
      include: { doctor: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 5,
    }),
    // Operations for Quick Visit
    prisma.operation.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: { id: true, name: true, category: true, defaultMinFee: true, labCostEstimate: true, doctorFee: true },
    }),
    // Doctors for Quick Visit + Scheduling (L3 BDS + L4 Consultants)
    prisma.doctor.findMany({
      where: { permissionLevel: { gte: 3 }, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, commissionPercent: true },
    }),
    // Labs for Quick Visit
    prisma.lab.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: { rates: { orderBy: { itemName: "asc" }, select: { id: true, itemName: true, rate: true } } },
    }),
    // All diseases for inline editor
    canEdit ? prisma.disease.findMany({ orderBy: { id: "asc" } }) : Promise.resolve([]),
    // Tooth statuses for dental chart
    prisma.toothStatus.findMany({
      where: { patientId },
      include: {
        finding: { select: { name: true, color: true } },
      },
    }),
    // Tooth status history for per-tooth history modal
    prisma.toothStatusHistory.findMany({
      where: { patientId },
      orderBy: { recordedAt: "desc" },
      include: {
        finding: { select: { name: true } },
        recordedBy: { select: { name: true } },
        visit: { select: { caseNo: true } },
      },
    }),
    // Treatment plans
    prisma.treatmentPlan.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { name: true } },
        items: {
          orderBy: { sortOrder: "asc" },
          include: {
            operation: { select: { name: true } },
            assignedDoctor: { select: { name: true } },
            visit: { select: { id: true, visitDate: true, doctor: { select: { name: true } } } },
            modifiedBy: { select: { name: true } },
            labRate: { select: { itemName: true } },
            appointments: {
              where: { status: { in: ["SCHEDULED", "ARRIVED", "IN_PROGRESS"] } },
              select: { id: true, date: true, status: true, doctor: { select: { name: true } } },
              orderBy: { date: "asc" },
              take: 1,
            },
          },
        },
      },
    }),
    // Treatment chains
    prisma.treatmentChain.findMany({
      where: { patientId },
      orderBy: { createdAt: "asc" },
      include: {
        createdBy: { select: { name: true } },
        plans: {
          orderBy: { chainOrder: "asc" },
          include: {
            createdBy: { select: { name: true } },
            items: {
              orderBy: { sortOrder: "asc" },
              include: {
                operation: { select: { name: true } },
                assignedDoctor: { select: { name: true } },
                visit: { select: { id: true, visitDate: true, doctor: { select: { name: true } } } },
                modifiedBy: { select: { name: true } },
                labRate: { select: { itemName: true } },
                appointments: {
                  where: { status: { in: ["SCHEDULED", "ARRIVED", "IN_PROGRESS"] } },
                  select: { id: true, date: true, status: true, doctor: { select: { name: true } } },
                  orderBy: { date: "asc" },
                  take: 1,
                },
              },
            },
          },
        },
      },
    }),
    // Clinical notes
    prisma.clinicalNote.findMany({
      where: { patientId },
      orderBy: { noteDate: "asc" },
      include: {
        doctor: { select: { name: true } },
        chain: { select: { id: true, title: true } },
      },
    }),
    // Lab orders for this patient (L1/L2 only, but query always — filter in client)
    canCollect ? prisma.labOrder.findMany({
      where: { patientId },
      orderBy: { orderedDate: "desc" },
      include: {
        lab: { select: { name: true } },
        labRate: { select: { itemName: true } },
        createdBy: { select: { name: true } },
        receivedBy: { select: { name: true } },
        planItem: { select: { id: true, label: true } },
      },
    }) : Promise.resolve([]),
  ]);

  if (!patient) notFound();

  // Filter to only top-level visits
  const topLevelVisits = patient.visits.filter((v) => v.parentVisitId === null);

  // Calculate totals
  let totalBilled = 0;
  let totalPaid = 0;
  for (const visit of patient.visits) {
    totalBilled += calcBilled(visit);
    totalPaid += calcPaid(visit.receipts);
  }
  const totalBalance = totalBilled - totalPaid;

  // Escrow balance (deposits)
  const escrowBalance = await calcEscrowBalance(patientId);

  // Unified: totalCollected = receipts + deposits
  const totalCollected = totalPaid + escrowBalance;

  // Visit stats
  const visitCount = patient.visits.length;
  const firstVisit = patient.visits.length > 0 ? patient.visits[patient.visits.length - 1].visitDate : null;
  const lastVisit = patient.visits.length > 0 ? patient.visits[0].visitDate : null;

  // Count visits missing clinical notes
  const missingNotesCount = patient.visits.filter(v => v.clinicalReports.length === 0).length;

  // Calculate age
  let ageDisplay: string | null = null;
  if (patient.dateOfBirth) {
    const now = new Date();
    const dob = new Date(patient.dateOfBirth);
    let age = now.getFullYear() - dob.getFullYear();
    if (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) {
      age--;
    }
    ageDisplay = `${age}/${patient.gender || "?"}`;
  } else if (patient.ageAtRegistration) {
    const regDate = new Date(patient.createdAt);
    const yearsSinceReg = new Date().getFullYear() - regDate.getFullYear();
    const estimatedAge = patient.ageAtRegistration + yearsSinceReg;
    ageDisplay = `~${estimatedAge}/${patient.gender || "?"}`;
  } else if (patient.gender) {
    ageDisplay = patient.gender === "M" ? "Male" : "Female";
  }

  // Pick the most actionable today appointment
  const todayAppointment = todayAppointments.length > 0
    ? (() => {
        const arrived = todayAppointments.find(a => a.status === "ARRIVED");
        const inProgress = todayAppointments.find(a => a.status === "IN_PROGRESS");
        const scheduled = todayAppointments.find(a => a.status === "SCHEDULED");
        const appt = inProgress || arrived || scheduled || todayAppointments[0];
        return {
          id: appt.id,
          status: appt.status,
          visitId: appt.visit?.id || null,
          timeSlot: appt.timeSlot,
          doctorName: appt.doctor?.name ? toTitleCase(appt.doctor.name) : null,
          reason: appt.reason,
        };
      })()
    : null;

  // Flatten receipts
  const receipts = patient.visits.flatMap((visit) =>
    visit.receipts.map((receipt) => ({
      id: receipt.id,
      receiptNo: receipt.receiptNo,
      amount: receipt.amount,
      paymentMode: receipt.paymentMode,
      receiptDate: receipt.receiptDate,
      visitCaseNo: visit.caseNo,
      visitOperationName: visit.operation?.name || null,
    }))
  );

  // Synthesize implicit treatment progress from visits with multi-step operations
  // that have no explicit TreatmentChain/TreatmentPlan records
  const existingPlanVisitIds = new Set(
    treatmentPlans.flatMap((p) => p.items.map((i) => i.visitId).filter(Boolean))
  );
  type MappedChain = {
    id: number;
    title: string;
    toothNumbers: string | null;
    status: string;
    createdByName: string;
    patientId: number;
    plans: {
      id: number;
      title: string;
      status: string;
      notes: string | null;
      createdAt: Date;
      createdByName: string;
      patientId: number;
      chainOrder: number | null;
      estimatedTotal: number | null;
      items: {
        id: number;
        sortOrder: number;
        label: string;
        operationId: number | null;
        operationName: string | null;
        assignedDoctorId: number | null;
        assignedDoctorName: string | null;
        estimatedDayGap: number;
        estimatedCost: number | null;
        estimatedLabCost: number | null;
        labRateName: string | null;
        scheduledDate: Date | null;
        visitId: number | null;
        visitDate: Date | null;
        visitDoctorName: string | null;
        completedAt: Date | null;
        notes: string | null;
        modifiedStatus: string | null;
        modifiedReason: string | null;
        modifiedByName: string | null;
        appointment: { id: number; date: Date; status: string; doctorName: string | null } | null;
      }[];
    }[];
  };
  const implicitChainsMapped: MappedChain[] = [];

  // Find root visits with multi-step operations not already covered by plans
  const rootVisitsWithSteps = topLevelVisits.filter(
    (v) => v.operationId && !existingPlanVisitIds.has(v.id)
  );
  if (rootVisitsWithSteps.length > 0) {
    const operationIds = [...new Set(rootVisitsWithSteps.map((v) => v.operationId!))];
    const stepsForOps = await prisma.treatmentStep.findMany({
      where: { operationId: { in: operationIds } },
      orderBy: { stepNumber: "asc" },
    });
    const stepsByOp = stepsForOps.reduce((acc, s) => {
      if (!acc[s.operationId]) acc[s.operationId] = [];
      acc[s.operationId].push(s);
      return acc;
    }, {} as Record<number, typeof stepsForOps>);

    for (const rootVisit of rootVisitsWithSteps) {
      const opSteps = stepsByOp[rootVisit.operationId!];
      if (!opSteps || opSteps.length < 2) continue; // Only multi-step operations

      // Get all visits in this treatment chain (root + follow-ups)
      const chainVisits = [
        rootVisit,
        ...patient!.visits.filter((v) => v.parentVisitId === rootVisit.id),
      ].sort((a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime());

      const allComplete = chainVisits.length >= opSteps.length;

      implicitChainsMapped.push({
        id: -rootVisit.id,
        title: rootVisit.operation?.name || "Treatment",
        toothNumbers: null,
        status: allComplete ? "COMPLETED" : "ACTIVE",
        createdByName: rootVisit.doctor?.name || "Unknown",
        patientId: patientId,
        plans: [{
          id: -rootVisit.id,
          title: rootVisit.operation?.name || "Treatment",
          status: allComplete ? "COMPLETED" : "ACTIVE",
          notes: null,
          createdAt: rootVisit.visitDate,
          createdByName: rootVisit.doctor?.name || "Unknown",
          patientId: patientId,
          chainOrder: 0,
          estimatedTotal: rootVisit.operationRate || null,
          items: opSteps.map((step, idx) => {
            const matchedVisit = chainVisits[idx] || null;
            return {
              id: -(rootVisit.id * 100 + idx),
              sortOrder: idx,
              label: step.name,
              operationId: rootVisit.operationId,
              operationName: rootVisit.operation?.name || null,
              assignedDoctorId: rootVisit.doctorId,
              assignedDoctorName: rootVisit.doctor?.name || null,
              estimatedDayGap: step.defaultDayGap,
              estimatedCost: idx === 0 ? (rootVisit.operationRate || null) : null,
              estimatedLabCost: null,
              labRateName: null,
              scheduledDate: null,
              visitId: matchedVisit?.id || null,
              visitDate: matchedVisit?.visitDate || null,
              visitDoctorName: matchedVisit?.doctor?.name || null,
              completedAt: matchedVisit ? matchedVisit.visitDate : null,
              notes: null,
              modifiedStatus: null,
              modifiedReason: null,
              modifiedByName: null,
              appointment: null,
            };
          }),
        }],
      });
    }
  }

  const pageData: PatientPageData = {
    patient: {
      id: patient.id,
      code: patient.code,
      name: toTitleCase(patient.name),
      salutation: patient.salutation,
      gender: patient.gender,
      dateOfBirth: patient.dateOfBirth,
      ageAtRegistration: patient.ageAtRegistration,
      bloodGroup: patient.bloodGroup,
      mobile: patient.mobile,
      phone: patient.phone,
      email: patient.email,
      fatherHusbandName: patient.fatherHusbandName,
      occupation: patient.occupation,
      addressLine1: patient.addressLine1,
      addressLine2: patient.addressLine2,
      addressLine3: patient.addressLine3,
      city: patient.city,
      pincode: patient.pincode,
      referringPhysician: patient.referringPhysician,
      physicianPhone: patient.physicianPhone,
      remarks: patient.remarks,
      corporatePartnerName: patient.corporatePartner?.name || null,
      createdAt: patient.createdAt,
      diseases: patient.diseases,
    },
    topLevelVisits: topLevelVisits as VisitWithRelations[],
    totalBilled,
    totalPaid,
    totalBalance,
    escrowBalance,
    totalCollected,
    plannedCost: treatmentPlans
      .filter(p => p.status === "ACTIVE")
      .reduce((sum, p) => sum + (p.estimatedTotal || 0), 0),
    visitCount,
    firstVisit,
    lastVisit,
    ageDisplay,
    missingNotesCount,
    todayAppointment,
    todayAppointments: todayAppointments.map(a => ({
      id: a.id,
      date: a.date,
      timeSlot: a.timeSlot,
      doctorName: a.doctor?.name ? toTitleCase(a.doctor.name) : null,
      reason: a.reason,
      status: a.status,
    })),
    futureAppointments: futureAppointments.map(a => ({
      id: a.id,
      date: a.date,
      timeSlot: a.timeSlot,
      doctorName: a.doctor?.name ? toTitleCase(a.doctor.name) : null,
      status: a.status,
    })),
    pastAppointments: pastAppointments.map(a => ({
      id: a.id,
      date: a.date,
      timeSlot: a.timeSlot,
      doctorName: a.doctor?.name ? toTitleCase(a.doctor.name) : null,
      reason: a.reason,
      status: a.status,
    })),
    files: patient.files as PatientPageData["files"],
    receipts,
    allDiseases,
    operations,
    doctors,
    labs,
    currentUser: {
      id: currentUser.id,
      name: currentUser.name,
      permissionLevel: currentUser.permissionLevel,
      isSuperUser: currentUser.isSuperUser,
    },
    canCollect,
    showInternalCosts,
    canEdit,
    isAdmin: userIsAdmin,
    treatmentPlans: treatmentPlans.filter(p => !p.chainId).map((plan) => ({
      id: plan.id,
      title: plan.title,
      status: plan.status,
      notes: plan.notes,
      createdAt: plan.createdAt,
      createdByName: plan.createdBy.name,
      patientId: plan.patientId,
      estimatedTotal: plan.estimatedTotal,
      items: plan.items.map((item) => {
        const appt = item.appointments[0] || null;
        return {
          id: item.id,
          sortOrder: item.sortOrder,
          label: item.label,
          operationId: item.operationId,
          operationName: item.operation?.name || null,
          assignedDoctorId: item.assignedDoctorId,
          assignedDoctorName: item.assignedDoctor?.name || null,
          estimatedDayGap: item.estimatedDayGap,
          estimatedCost: item.estimatedCost,
          estimatedLabCost: item.estimatedLabCost,
          labRateName: item.labRate?.itemName || null,
          scheduledDate: item.scheduledDate,
          visitId: item.visitId,
          visitDate: item.visit?.visitDate || null,
          visitDoctorName: item.visit?.doctor?.name || null,
          completedAt: item.completedAt,
          notes: item.notes,
          modifiedStatus: item.modifiedStatus || null,
          modifiedReason: item.modifiedReason || null,
          modifiedByName: item.modifiedBy?.name || null,
          appointment: appt ? {
            id: appt.id,
            date: appt.date,
            status: appt.status,
            doctorName: appt.doctor?.name || null,
          } : null,
        };
      }),
    })),
    treatmentChains: [
      ...treatmentChains.map((chain) => ({
        id: chain.id,
        title: chain.title,
        toothNumbers: chain.toothNumbers,
        status: chain.status,
        createdByName: chain.createdBy.name,
        patientId: chain.patientId,
        plans: chain.plans.map((plan) => ({
          id: plan.id,
          title: plan.title,
          status: plan.status,
          notes: plan.notes,
          createdAt: plan.createdAt,
          createdByName: plan.createdBy.name,
          patientId: plan.patientId,
          chainOrder: plan.chainOrder,
          estimatedTotal: plan.estimatedTotal,
          items: plan.items.map((item) => {
            const appt = item.appointments[0] || null;
            return {
              id: item.id,
              sortOrder: item.sortOrder,
              label: item.label,
              operationId: item.operationId,
              operationName: item.operation?.name || null,
              assignedDoctorId: item.assignedDoctorId,
              assignedDoctorName: item.assignedDoctor?.name || null,
              estimatedDayGap: item.estimatedDayGap,
              estimatedCost: item.estimatedCost,
              estimatedLabCost: item.estimatedLabCost,
              labRateName: item.labRate?.itemName || null,
              scheduledDate: item.scheduledDate,
              visitId: item.visitId,
              visitDate: item.visit?.visitDate || null,
              visitDoctorName: item.visit?.doctor?.name || null,
              completedAt: item.completedAt,
              notes: item.notes,
              modifiedStatus: item.modifiedStatus || null,
              modifiedReason: item.modifiedReason || null,
              modifiedByName: item.modifiedBy?.name || null,
              appointment: appt ? {
                id: appt.id,
                date: appt.date,
                status: appt.status,
                doctorName: appt.doctor?.name || null,
              } : null,
            };
          }),
        })),
      })),
      ...implicitChainsMapped,
    ],
    clinicalNotes: clinicalNotes.map((n) => ({
      id: n.id,
      content: n.content,
      noteDate: n.noteDate.toISOString(),
      doctorName: n.doctor.name,
      chainId: n.chainId,
      chainTitle: n.chain?.title || null,
    })),
    toothStatuses: toothStatuses.map((ts) => ({
      toothNumber: ts.toothNumber,
      status: ts.status,
      findingName: ts.finding?.name || null,
      findingColor: ts.finding?.color || null,
    })),
    toothHistory: toothHistory.map((th) => ({
      toothNumber: th.toothNumber,
      status: th.status,
      findingName: th.finding?.name || null,
      doctorName: th.recordedBy.name,
      caseNo: th.visit?.caseNo || null,
      visitId: th.visitId || null,
      recordedAt: th.recordedAt.toISOString(),
    })),
    labOrders: labOrders.map((lo) => ({
      id: lo.id,
      labName: lo.lab.name,
      materialName: lo.labRate.itemName,
      quantity: lo.quantity,
      unitRate: lo.unitRate,
      rateAdjustment: lo.rateAdjustment,
      totalAmount: lo.totalAmount,
      adjustmentNote: lo.adjustmentNote,
      status: lo.status,
      orderedDate: lo.orderedDate.toISOString(),
      expectedDate: lo.expectedDate?.toISOString() || null,
      receivedDate: lo.receivedDate?.toISOString() || null,
      toothNumbers: lo.toothNumbers,
      createdByName: lo.createdBy.name,
      receivedByName: lo.receivedBy?.name || null,
      planItemId: lo.planItem?.id || null,
      planItemLabel: lo.planItem?.label || null,
      notes: lo.notes,
    })),
  };

  return <PatientPageClient data={pageData} />;
}
