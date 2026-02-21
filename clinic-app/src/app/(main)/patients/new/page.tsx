import { prisma } from "@/lib/db";
import { PatientForm } from "@/components/patient-form";
import { createPatient } from "../actions";

export default async function NewPatientPage() {
  const diseases = await prisma.disease.findMany({ orderBy: { id: "asc" } });

  return (
    <div className="max-w-4xl space-y-4">
      <h2 className="text-2xl font-bold">Register New Patient</h2>
      <PatientForm diseases={diseases} action={createPatient} />
    </div>
  );
}
