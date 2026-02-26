import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PatientForm } from "@/components/patient-form";
import { updatePatient } from "../../actions";
import { requireAuth } from "@/lib/auth";
import { canEditPatients } from "@/lib/permissions";

export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await requireAuth();
  if (!canEditPatients(currentUser.permissionLevel)) redirect("/dashboard");
  const { id } = await params;
  const patientId = parseInt(id);

  const [patient, diseases] = await Promise.all([
    prisma.patient.findUnique({
      where: { id: patientId },
      include: { diseases: { select: { diseaseId: true } } },
    }),
    prisma.disease.findMany({ orderBy: { id: "asc" } }),
  ]);

  if (!patient) notFound();

  const boundAction = updatePatient.bind(null, patientId);

  return (
    <div className="max-w-3xl space-y-4">
      <Link href={`/patients/${patientId}`} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
        <ArrowLeft className="h-3 w-3" /> {patient.name}
      </Link>
      <h2 className="text-2xl font-bold">Edit Patient: {patient.name}</h2>
      <PatientForm diseases={diseases} patient={patient} action={boundAction} />
    </div>
  );
}
