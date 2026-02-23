import { prisma } from "@/lib/db";
import { createVisit } from "../actions";
import { VisitForm } from "@/components/visit-form";
import { requireAuth } from "@/lib/auth";
import { canSeeInternalCosts } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewVisitPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string; followUp?: string; appointmentId?: string; doctorId?: string }>;
}) {
  const currentUser = await requireAuth();
  const showInternalCosts = canSeeInternalCosts(currentUser.permissionLevel);
  const params = await searchParams;

  const [operations, doctors, labs] = await Promise.all([
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

  // Load appointment if coming from appointment
  let appointment: { id: number; reason: string | null; date: Date } | null = null;
  if (params.appointmentId) {
    appointment = await prisma.appointment.findUnique({
      where: { id: parseInt(params.appointmentId) },
      select: { id: true, reason: true, date: true },
    });
  }

  let defaultPatient: { id: number; name: string; code: number | null; salutation: string | null } | null = null;
  if (params.patientId) {
    defaultPatient = await prisma.patient.findUnique({
      where: { id: parseInt(params.patientId) },
      select: { id: true, name: true, code: true, salutation: true },
    });
  }

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
        // Fetch patient for follow-up if not already loaded
        if (!defaultPatient) {
          defaultPatient = await prisma.patient.findUnique({
            where: { id: rootVisit.patientId },
            select: { id: true, name: true, code: true, salutation: true },
          });
        }
      }
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <Link
        href={defaultPatient ? `/patients/${defaultPatient.id}` : "/visits"}
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"
      >
        <ArrowLeft className="h-3 w-3" /> {defaultPatient ? defaultPatient.name : "Visits"}
      </Link>
      <h2 className="text-2xl font-bold">
        {mode === "followup" ? "New Follow-up Visit" : "New Visit"}
      </h2>
      {appointment && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-100">Appointment</Badge>
            <span className="text-sm font-medium">
              {appointment.reason || "Appointment"} on {format(new Date(appointment.date), "MMM d, yyyy")}
            </span>
          </div>
        </div>
      )}
      <VisitForm
        operations={operations}
        doctors={doctors}
        labs={labs}
        defaultPatient={defaultPatient}
        defaultDoctorId={params.doctorId ? parseInt(params.doctorId) : undefined}
        action={createVisit}
        mode={mode}
        parentVisit={parentVisit}
        showInternalCosts={showInternalCosts}
        appointmentId={appointment?.id}
      />
    </div>
  );
}
