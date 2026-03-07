import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { canSchedule } from "@/lib/permissions";
import { notFound, redirect } from "next/navigation";
import { AppointmentForm } from "@/components/appointment-form";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { format } from "date-fns";

export default async function RescheduleAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await requireAuth();
  if (!canSchedule(currentUser.permissionLevel)) redirect("/appointments");
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

  const [doctorsRaw, rooms, availability] = await Promise.all([
    prisma.doctor.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, defaultRoomId: true },
    }),
    prisma.room.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    prisma.doctorAvailability.findMany({
      select: { doctorId: true, dayOfWeek: true, startTime: true, endTime: true },
    }),
  ]);

  const doctors = doctorsRaw.map(({ defaultRoomId, ...d }) => d);
  const doctorDefaultRooms: Record<number, number> = {};
  for (const d of doctorsRaw) {
    if (d.defaultRoomId) doctorDefaultRooms[d.id] = d.defaultRoomId;
  }

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
        doctorAvailability={availability}
        doctorDefaultRooms={doctorDefaultRooms}
      />
    </div>
  );
}
