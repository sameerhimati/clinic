import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
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
    <div className="max-w-2xl space-y-6">
      <Breadcrumbs items={[
        { label: "Patients", href: "/patients" },
        { label: patient.name, href: `/patients/${patientId}` },
        { label: "Edit" },
      ]} />
      <h2 className="text-2xl font-bold">Edit Patient: {patient.name}</h2>
      <PatientForm diseases={diseases} patient={patient} action={boundAction} />
    </div>
  );
}
