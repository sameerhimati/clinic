import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { AppointmentForm } from "@/components/appointment-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{
    patientId?: string;
    doctorId?: string;
    date?: string;
    visitId?: string;
  }>;
}) {
  await requireAuth();
  const params = await searchParams;

  const doctors = await prisma.doctor.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  let defaultPatient = null;
  if (params.patientId) {
    defaultPatient = await prisma.patient.findUnique({
      where: { id: parseInt(params.patientId) },
      select: { id: true, code: true, name: true, salutation: true },
    });
  }

  let defaultReason: string | undefined;
  if (params.visitId) {
    const visit = await prisma.visit.findUnique({
      where: { id: parseInt(params.visitId) },
      include: { operation: { select: { name: true } } },
    });
    if (visit?.operation) {
      defaultReason = `${visit.operation.name} follow-up`;
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Link
        href="/appointments"
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        <ArrowLeft className="h-3 w-3" /> Appointments
      </Link>
      <h2 className="text-2xl font-bold">Schedule Appointment</h2>
      <AppointmentForm
        doctors={doctors}
        defaultPatient={defaultPatient}
        defaultDoctorId={params.doctorId ? parseInt(params.doctorId) : undefined}
        defaultDate={params.date}
        defaultReason={defaultReason}
      />
    </div>
  );
}
