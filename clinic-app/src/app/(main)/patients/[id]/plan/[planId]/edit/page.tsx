import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { toTitleCase } from "@/lib/format";
import { NewPlanForm } from "../../new/new-plan-form";

export const dynamic = "force-dynamic";

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string; planId: string }>;
}) {
  const { id, planId: planIdStr } = await params;
  const patientId = parseInt(id);
  const planId = parseInt(planIdStr);
  const currentUser = await requireAuth();

  if (currentUser.permissionLevel > 3) {
    notFound();
  }

  const [patient, plan, operations, doctors] = await Promise.all([
    prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, name: true, code: true },
    }),
    prisma.treatmentPlan.findUnique({
      where: { id: planId },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            label: true,
            operationId: true,
            assignedDoctorId: true,
            estimatedDayGap: true,
            notes: true,
            visitId: true,
            completedAt: true,
          },
        },
      },
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

  if (!patient || !plan || plan.patientId !== patientId) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <Breadcrumbs
        items={[
          { label: "Patients", href: "/patients" },
          { label: toTitleCase(patient.name), href: `/patients/${patient.id}` },
          { label: "Edit Treatment Plan" },
        ]}
      />
      <h2 className="text-2xl font-bold">Edit Treatment Plan</h2>
      <p className="text-muted-foreground">
        for{" "}
        <span className="font-medium text-foreground">
          #{patient.code} {toTitleCase(patient.name)}
        </span>
      </p>
      <NewPlanForm
        patientId={patient.id}
        operations={operations}
        doctors={doctors}
        currentDoctorId={currentUser.id}
        existingPlan={{
          id: plan.id,
          title: plan.title,
          items: plan.items.map((item) => ({
            id: item.id,
            label: item.label,
            operationId: item.operationId,
            assignedDoctorId: item.assignedDoctorId,
            estimatedDayGap: item.estimatedDayGap,
            notes: item.notes,
            visitId: item.visitId,
          })),
        }}
      />
    </div>
  );
}
