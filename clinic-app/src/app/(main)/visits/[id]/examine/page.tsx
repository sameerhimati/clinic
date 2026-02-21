import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ExaminationForm } from "./examination-form";

export const dynamic = "force-dynamic";

export default async function ExaminePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const visitId = parseInt(id);

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
  });

  // Load active doctors for the doctor dropdown
  const doctors = await prisma.doctor.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          Clinical Examination — Case #{visit.caseNo || visit.id}
        </h2>
        <p className="text-muted-foreground">
          <span className="font-mono">#{visit.patient.code}</span>{" "}
          {visit.patient.salutation && `${visit.patient.salutation}. `}
          {visit.patient.name}
          {visit.patient.gender && ` · ${visit.patient.gender === "M" ? "Male" : "Female"}`}
          {visit.patient.ageAtRegistration && ` · ${visit.patient.ageAtRegistration} yrs`}
        </p>
        <p className="text-sm text-muted-foreground">
          {visit.operation?.name || "Visit"} · {visit.doctor ? `Dr. ${visit.doctor.name}` : "No doctor"} · {format(new Date(visit.visitDate), "MMM d, yyyy")}
        </p>
      </div>

      <ExaminationForm
        visitId={visitId}
        doctors={doctors}
        defaultDoctorId={visit.doctorId}
        existingReport={existingReport ? {
          doctorId: existingReport.doctorId,
          reportDate: format(new Date(existingReport.reportDate), "yyyy-MM-dd"),
          complaint: existingReport.complaint,
          examination: existingReport.examination,
          diagnosis: existingReport.diagnosis,
          treatmentNotes: existingReport.treatmentNotes,
          estimate: existingReport.estimate,
          medication: existingReport.medication,
        } : null}
      />
    </div>
  );
}
