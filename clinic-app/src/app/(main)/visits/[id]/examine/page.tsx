import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { ExaminationForm } from "./examination-form";
import { requireAuth } from "@/lib/auth";
import { isReportLocked, hoursUntilAutoLock, isAdmin } from "@/lib/permissions";

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

  return (
    <div className="max-w-3xl space-y-6">
      <Link href={`/visits/${visitId}`} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
        <ArrowLeft className="h-3 w-3" /> Case #{visit.caseNo || visit.id}
      </Link>
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
          {visit.operation?.name || "Visit"} {"\u00b7"} {visit.doctor ? `Dr. ${visit.doctor.name}` : "No doctor"} {"\u00b7"} {format(new Date(visit.visitDate), "MMM d, yyyy")}
        </p>
      </div>

      <ExaminationForm
        visitId={visitId}
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
      />
    </div>
  );
}
