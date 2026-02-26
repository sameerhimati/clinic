import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireAuth } from "@/lib/auth";
import { canCollectPayments, canSeeInternalCosts, canEditPatients, isAdmin as checkIsAdmin } from "@/lib/permissions";
import { calcBilled, calcPaid } from "@/lib/billing";
import { PatientPageClient, type PatientPageData } from "./patient-page-client";
import type { VisitWithRelations } from "@/components/treatment-timeline";
import { todayString } from "@/lib/validations";

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

  const today = todayString();

  const [patient, todayAppointments, futureAppointments, operations, doctors, labs, allDiseases] = await Promise.all([
    prisma.patient.findUnique({
      where: { id: patientId },
      include: {
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
        date: { gte: new Date(today), lt: new Date(new Date(today).getTime() + 86400000) },
        status: { in: ["SCHEDULED", "ARRIVED", "IN_PROGRESS"] },
      },
      include: { doctor: { select: { name: true } }, visit: { select: { id: true } } },
      orderBy: { createdAt: "asc" },
    }),
    // Future appointments (not today)
    prisma.appointment.findMany({
      where: {
        patientId,
        date: { gt: new Date(new Date(today).getTime() + 86400000) },
        status: { in: ["SCHEDULED"] },
      },
      include: { doctor: { select: { name: true } } },
      orderBy: { date: "asc" },
      take: 3,
    }),
    // Operations for Quick Visit
    prisma.operation.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: { id: true, name: true, category: true, defaultMinFee: true },
    }),
    // Doctors for Quick Visit
    prisma.doctor.findMany({
      where: { permissionLevel: 3 },
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
          doctorName: appt.doctor?.name || null,
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

  const pageData: PatientPageData = {
    patient: {
      id: patient.id,
      code: patient.code,
      name: patient.name,
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
      createdAt: patient.createdAt,
      diseases: patient.diseases,
    },
    topLevelVisits: topLevelVisits as VisitWithRelations[],
    totalBilled,
    totalPaid,
    totalBalance,
    visitCount,
    firstVisit,
    lastVisit,
    ageDisplay,
    missingNotesCount,
    todayAppointment,
    futureAppointments: futureAppointments.map(a => ({
      id: a.id,
      date: a.date,
      timeSlot: a.timeSlot,
      doctorName: a.doctor?.name || null,
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
    },
    canCollect,
    showInternalCosts,
    canEdit,
    isAdmin: userIsAdmin,
  };

  return <PatientPageClient data={pageData} />;
}
