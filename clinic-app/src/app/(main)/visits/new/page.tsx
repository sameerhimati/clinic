import { prisma } from "@/lib/db";
import { createVisit } from "../actions";
import { VisitForm } from "@/components/visit-form";

export default async function NewVisitPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string; followUp?: string }>;
}) {
  const params = await searchParams;

  const [patients, operations, doctors, labs] = await Promise.all([
    prisma.patient.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
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

  // Load parent visit if follow-up
  let parentVisit = null;
  let mode: "new" | "followup" = "new";

  if (params.followUp) {
    const pv = await prisma.visit.findUnique({
      where: { id: parseInt(params.followUp) },
      include: {
        operation: { select: { name: true } },
        doctor: { select: { name: true } },
      },
    });
    if (pv) {
      // Resolve to root parent for flat chain
      const rootId = pv.parentVisitId || pv.id;
      const rootVisit = pv.parentVisitId
        ? await prisma.visit.findUnique({
            where: { id: rootId },
            include: {
              operation: { select: { name: true } },
              doctor: { select: { name: true } },
            },
          })
        : pv;

      if (rootVisit) {
        parentVisit = {
          id: rootVisit.id,
          caseNo: rootVisit.caseNo,
          patientId: rootVisit.patientId,
          operationId: rootVisit.operationId,
          operationName: rootVisit.operation?.name || null,
          doctorId: rootVisit.doctorId,
          doctorName: rootVisit.doctor?.name || null,
        };
        mode = "followup";
      }
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <h2 className="text-2xl font-bold">
        {mode === "followup" ? "New Follow-up Visit" : "New Visit"}
      </h2>
      <VisitForm
        patients={patients}
        operations={operations}
        doctors={doctors}
        labs={labs}
        defaultPatientId={params.patientId ? parseInt(params.patientId) : undefined}
        action={createVisit}
        mode={mode}
        parentVisit={parentVisit}
      />
    </div>
  );
}
