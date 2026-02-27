import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { format } from "date-fns";
import { ExaminationForm } from "./examination-form";
import { requireAuth } from "@/lib/auth";
import { isReportLocked, hoursUntilAutoLock, isAdmin } from "@/lib/permissions";
import { todayString } from "@/lib/validations";

export const dynamic = "force-dynamic";

export default async function ExaminePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const visitId = parseInt(id);
  const currentUser = await requireAuth();

  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: {
      patient: { select: { id: true, code: true, name: true, salutation: true, gender: true, ageAtRegistration: true } },
      operation: { select: { name: true } },
      doctor: { select: { id: true, name: true } },
    },
  });

  if (!visit) notFound();

  // Fetch previous reports in the treatment chain (for follow-up visits)
  let previousReports: {
    visitId: number;
    caseNo: number | null;
    stepLabel: string | null;
    doctorName: string;
    reportDate: string;
    complaint: string | null;
    examination: string | null;
    diagnosis: string | null;
    treatmentNotes: string | null;
    medication: string | null;
    addendums: { content: string; doctorName: string; createdAt: string }[];
  }[] = [];

  if (visit.parentVisitId) {
    // Find the root parent (flat chain — parentVisitId always points to root)
    const rootId = visit.parentVisitId;

    // Fetch all visits in the chain: the root + all siblings sharing the same parent
    const chainVisits = await prisma.visit.findMany({
      where: {
        OR: [
          { id: rootId },
          { parentVisitId: rootId },
        ],
        id: { not: visitId }, // exclude the current visit
      },
      include: {
        doctor: { select: { name: true } },
        clinicalReports: {
          include: {
            doctor: { select: { name: true } },
            addendums: {
              include: { doctor: { select: { name: true } } },
              orderBy: { createdAt: "asc" },
            },
          },
          take: 1,
        },
      },
      orderBy: { visitDate: "asc" },
    });

    previousReports = chainVisits
      .filter((v) => v.clinicalReports.length > 0)
      .map((v) => {
        const r = v.clinicalReports[0];
        return {
          visitId: v.id,
          caseNo: v.caseNo,
          stepLabel: v.stepLabel,
          doctorName: r.doctor.name,
          reportDate: format(new Date(r.reportDate), "MMM d, yyyy"),
          complaint: r.complaint,
          examination: r.examination,
          diagnosis: r.diagnosis,
          treatmentNotes: r.treatmentNotes,
          medication: r.medication,
          addendums: r.addendums.map((a) => ({
            content: a.content,
            doctorName: a.doctor.name,
            createdAt: format(new Date(a.createdAt), "MMM d, yyyy"),
          })),
        };
      });
  }

  // Load existing clinical report if any
  const existingReport = await prisma.clinicalReport.findFirst({
    where: { visitId },
    include: {
      addendums: {
        include: { doctor: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      lockedBy: { select: { name: true } },
      doctor: { select: { name: true } },
    },
  });

  const locked = existingReport ? isReportLocked(existingReport) : false;
  const canUnlock = isAdmin(currentUser.permissionLevel);
  const hoursLeft = existingReport && !locked ? hoursUntilAutoLock(existingReport) : 0;

  // Compute next patient for "Save & Next" (D2)
  // Find today's appointments for this doctor, filter to ARRIVED+SCHEDULED, exclude current patient
  let nextPatientId: number | null = null;
  let nextPatientCode: number | null = null;
  if (currentUser.permissionLevel === 3) {
    const today = todayString();
    const todayDate = new Date(today);
    const tomorrowDate = new Date(todayDate.getTime() + 86400000);

    const queueAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: currentUser.id,
        date: { gte: todayDate, lt: tomorrowDate },
        status: { in: ["ARRIVED", "SCHEDULED"] },
        patientId: { not: visit.patientId },
      },
      include: {
        patient: { select: { id: true, code: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // ARRIVED first, then SCHEDULED
    const arrived = queueAppointments.filter(a => a.status === "ARRIVED");
    const scheduled = queueAppointments.filter(a => a.status === "SCHEDULED");
    const nextAppt = arrived[0] || scheduled[0];
    if (nextAppt) {
      nextPatientId = nextAppt.patient.id;
      nextPatientCode = nextAppt.patient.code;
    }
  }

  const operationName = visit.operation?.name || "Visit";

  return (
    <div className={previousReports.length > 0 ? "space-y-6" : "max-w-3xl space-y-6"}>
      <Breadcrumbs items={[
        { label: "Patients", href: "/patients" },
        { label: visit.patient.name, href: `/patients/${visit.patient.id}` },
        { label: `Case #${visit.caseNo || visit.id}`, href: `/visits/${visitId}` },
        { label: "Examination" },
      ]} />
      <div>
        <h2 className="text-2xl font-bold">
          Clinical Examination — Case #{visit.caseNo || visit.id}
        </h2>
        <p className="text-muted-foreground">
          <span className="font-mono">#{visit.patient.code}</span>{" "}
          {visit.patient.salutation && `${visit.patient.salutation}. `}
          {visit.patient.name}
          {visit.patient.gender && ` \u00b7 ${visit.patient.gender === "M" ? "Male" : "Female"}`}
          {visit.patient.ageAtRegistration && ` \u00b7 ${visit.patient.ageAtRegistration} yrs`}
        </p>
        <p className="text-sm text-muted-foreground">
          {operationName} {"\u00b7"} {visit.doctor ? `Dr. ${visit.doctor.name}` : "No doctor"} {"\u00b7"} {format(new Date(visit.visitDate), "MMM d, yyyy")}
        </p>
      </div>

      <ExaminationForm
        visitId={visitId}
        patientId={visit.patientId}
        defaultDoctorId={visit.doctorId}
        defaultDoctorName={visit.doctor?.name || null}
        existingReport={existingReport ? {
          id: existingReport.id,
          doctorId: existingReport.doctorId,
          doctorName: existingReport.doctor.name,
          reportDate: format(new Date(existingReport.reportDate), "yyyy-MM-dd"),
          complaint: existingReport.complaint,
          examination: existingReport.examination,
          diagnosis: existingReport.diagnosis,
          treatmentNotes: existingReport.treatmentNotes,
          estimate: currentUser.permissionLevel <= 2 ? existingReport.estimate : null,
          medication: existingReport.medication,
        } : null}
        isLocked={locked}
        canUnlock={canUnlock}
        hoursUntilLock={hoursLeft}
        reportId={existingReport?.id ?? null}
        addendums={existingReport?.addendums.map(a => ({
          id: a.id,
          content: a.content,
          createdAt: a.createdAt.toISOString(),
          doctorName: a.doctor.name,
        })) ?? []}
        lockedByName={existingReport?.lockedBy?.name ?? null}
        lockedAt={existingReport?.lockedAt?.toISOString() ?? null}
        permissionLevel={currentUser.permissionLevel}
        nextPatientId={nextPatientId}
        nextPatientCode={nextPatientCode}
        previousReports={previousReports}
        operationName={operationName}
      />
    </div>
  );
}
