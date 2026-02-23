import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { PatientForm } from "@/components/patient-form";
import { createPatient } from "../actions";
import { requireAuth } from "@/lib/auth";
import { canEditPatients } from "@/lib/permissions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewPatientPage() {
  const currentUser = await requireAuth();
  if (!canEditPatients(currentUser.permissionLevel)) redirect("/dashboard");
  const diseases = await prisma.disease.findMany({ orderBy: { id: "asc" } });

  return (
    <div className="max-w-4xl space-y-4">
      <Link href="/patients" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
        <ArrowLeft className="h-3 w-3" /> Patients
      </Link>
      <h2 className="text-2xl font-bold">Register New Patient</h2>
      <PatientForm diseases={diseases} action={createPatient} />
    </div>
  );
}
