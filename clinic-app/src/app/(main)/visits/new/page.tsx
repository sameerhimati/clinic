import { prisma } from "@/lib/db";
import { createVisit } from "../actions";
import { VisitForm } from "@/components/visit-form";

export default async function NewVisitPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>;
}) {
  const params = await searchParams;

  const [patients, operations, doctors, labs] = await Promise.all([
    prisma.patient.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, legacyCode: true },
    }),
    prisma.operation.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.doctor.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.lab.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        rates: { where: { isActive: true }, orderBy: { itemName: "asc" } },
      },
    }),
  ]);

  return (
    <div className="max-w-3xl space-y-4">
      <h2 className="text-2xl font-bold">New Visit</h2>
      <VisitForm
        patients={patients}
        operations={operations}
        doctors={doctors}
        labs={labs}
        defaultPatientId={params.patientId ? parseInt(params.patientId) : undefined}
        action={createVisit}
      />
    </div>
  );
}
