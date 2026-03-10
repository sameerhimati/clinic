import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { toTitleCase } from "@/lib/format";
import { NewChainForm } from "./new-chain-form";

export const dynamic = "force-dynamic";

export default async function NewChainPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patientId = parseInt(id);
  const currentUser = await requireAuth();

  if (currentUser.permissionLevel > 3) {
    notFound();
  }

  const [patient, operations, doctors, labRates] = await Promise.all([
    prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, name: true, code: true },
    }),
    prisma.operation.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        category: true,
        defaultMaxFee: true,
        defaultMinFee: true,
        labCostEstimate: true,
        suggestsOperationId: true,
      },
    }),
    prisma.doctor.findMany({
      where: { permissionLevel: { in: [3, 4] }, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.labRate.findMany({
      where: { isActive: true },
      orderBy: [{ labId: "asc" }, { itemName: "asc" }],
      include: { lab: { select: { name: true } } },
    }),
  ]);

  if (!patient) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <Breadcrumbs
        items={[
          { label: "Patients", href: "/patients" },
          { label: toTitleCase(patient.name), href: `/patients/${patient.id}` },
          { label: "New Treatment Chain" },
        ]}
      />
      <div>
        <h2 className="text-2xl font-bold">New Treatment Chain</h2>
        <p className="text-muted-foreground mt-1">
          for{" "}
          <span className="font-medium text-foreground">
            #{patient.code} {toTitleCase(patient.name)}
          </span>
        </p>
      </div>
      <NewChainForm
        patientId={patient.id}
        operations={operations}
        doctors={doctors}
        labRates={labRates.map((lr) => ({
          id: lr.id,
          itemName: lr.itemName,
          rate: lr.rate,
          labName: lr.lab.name,
        }))}
        currentDoctorId={currentUser.id}
      />
    </div>
  );
}
