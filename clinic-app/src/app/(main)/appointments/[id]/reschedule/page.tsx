import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { AppointmentForm } from "@/components/appointment-form";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { format } from "date-fns";

export default async function RescheduleAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await requireAuth();
  const { id } = await params;
  const appointmentId = parseInt(id);

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { select: { id: true, code: true, name: true, salutation: true } },
    },
  });

  if (!appointment) notFound();
  if (appointment.status !== "SCHEDULED") notFound();

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

  return (
    <div className="max-w-2xl space-y-6">
      <Breadcrumbs items={[
        { label: "Appointments", href: "/appointments" },
        { label: "Reschedule" },
      ]} />
      <h2 className="text-2xl font-bold">Reschedule Appointment</h2>
      <AppointmentForm
        doctors={doctors}
        rooms={rooms}
        defaultPatient={appointment.patient}
        defaultDoctorId={appointment.doctorId || undefined}
        defaultRoomId={appointment.roomId || undefined}
        defaultDate={format(new Date(appointment.date), "yyyy-MM-dd")}
        defaultTimeSlot={appointment.timeSlot || undefined}
        defaultReason={appointment.reason || undefined}
        defaultNotes={appointment.notes || undefined}
        permissionLevel={currentUser.permissionLevel}
        currentDoctorName={currentUser.name}
        appointmentId={appointment.id}
        mode="reschedule"
      />
    </div>
  );
}
