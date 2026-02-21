import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { PatientForm } from "@/components/patient-form";
import { updatePatient } from "../../actions";

export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
    <div className="max-w-4xl space-y-4">
      <h2 className="text-2xl font-bold">Edit Patient: {patient.name}</h2>
      <PatientForm diseases={diseases} patient={patient} action={boundAction} />
    </div>
  );
}
