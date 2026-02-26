import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { AppointmentForm } from "@/components/appointment-form";
import { Breadcrumbs } from "@/components/breadcrumbs";

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
  const currentUser = await requireAuth();
  const params = await searchParams;

  const [doctors, rooms] = await Promise.all([
    prisma.doctor.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.room.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

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
    <div className="max-w-3xl space-y-4">
      <Breadcrumbs items={[
        { label: "Appointments", href: "/appointments" },
        { label: "Schedule" },
      ]} />
      <h2 className="text-2xl font-bold">Schedule Appointment</h2>
      <AppointmentForm
        doctors={doctors}
        rooms={rooms}
        defaultPatient={defaultPatient}
        defaultDoctorId={params.doctorId ? parseInt(params.doctorId) : currentUser.permissionLevel === 3 ? currentUser.id : undefined}
        defaultDate={params.date}
        defaultReason={defaultReason}
        permissionLevel={currentUser.permissionLevel}
        currentDoctorName={currentUser.name}
      />
    </div>
  );
}
