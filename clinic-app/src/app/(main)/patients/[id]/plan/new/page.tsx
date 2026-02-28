import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { NewPlanForm } from "./new-plan-form";

export const dynamic = "force-dynamic";

export default async function NewPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patientId = parseInt(id);
  const currentUser = await requireAuth();

  const [patient, operations, doctors] = await Promise.all([
    prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, name: true, code: true },
    }),
    prisma.operation.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: { id: true, name: true, category: true },
    }),
    prisma.doctor.findMany({
      where: { permissionLevel: 3, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!patient) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <Breadcrumbs
        items={[
          { label: "Patients", href: "/patients" },
          { label: patient.name, href: `/patients/${patient.id}` },
          { label: "New Treatment Plan" },
        ]}
      />
      <h2 className="text-2xl font-bold">New Treatment Plan</h2>
      <p className="text-muted-foreground">
        for{" "}
        <span className="font-medium text-foreground">
          #{patient.code} {patient.name}
        </span>
      </p>
      <NewPlanForm
        patientId={patient.id}
        operations={operations}
        doctors={doctors}
        currentDoctorId={currentUser.id}
      />
    </div>
  );
}
