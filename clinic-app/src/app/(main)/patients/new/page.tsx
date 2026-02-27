import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { PatientForm } from "@/components/patient-form";
import { createPatient } from "../actions";
import { requireAuth } from "@/lib/auth";
import { canEditPatients } from "@/lib/permissions";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default async function NewPatientPage() {
  const currentUser = await requireAuth();
  if (!canEditPatients(currentUser.permissionLevel)) redirect("/dashboard");
  const diseases = await prisma.disease.findMany({ orderBy: { id: "asc" } });

  return (
    <div className="max-w-2xl space-y-6">
      <Breadcrumbs items={[
        { label: "Patients", href: "/patients" },
        { label: "Register" },
      ]} />
      <h2 className="text-2xl font-bold">Register New Patient</h2>
      <PatientForm diseases={diseases} action={createPatient} />
    </div>
  );
}
