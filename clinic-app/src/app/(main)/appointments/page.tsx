import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { AppointmentDayView } from "@/components/appointment-day-view";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const currentUser = await requireAuth();
  const params = await searchParams;

  // Locale-safe date handling — avoid .toISOString() UTC shift
  const now = new Date();
  const dateStr = params.date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const nextDay = new Date(y, m - 1, d + 1);

  const [appointments, columnRooms] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        date: { gte: date, lt: nextDay },
      },
      include: {
        patient: { select: { id: true, code: true, name: true, salutation: true } },
        doctor: { select: { id: true, name: true } },
        visit: { select: { id: true, caseNo: true } },
        room: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.room.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  // Doctor columns: doctors with appointments + in-house salaried staff
  const appointmentDoctorIds = new Set(
    appointments.filter((a) => a.doctorId).map((a) => a.doctorId!)
  );

  // In-house staff: commissionPercent=0, no commissionRate, isActive
  // Fallback: permissionLevel <= 1
  let inHouseDoctors = await prisma.doctor.findMany({
    where: {
      isActive: true,
      commissionPercent: 0,
      commissionRate: null,
      name: { not: "NONE" },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  if (inHouseDoctors.length === 0) {
    inHouseDoctors = await prisma.doctor.findMany({
      where: { isActive: true, permissionLevel: { lte: 1 }, name: { not: "NONE" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  // Merge: in-house + any doctors with appointments not already in list
  const columnDoctorMap = new Map<number, { id: number; name: string }>();
  for (const d of inHouseDoctors) columnDoctorMap.set(d.id, d);

  // Also add doctors who have appointments but aren't in-house
  for (const a of appointments) {
    if (a.doctor && !columnDoctorMap.has(a.doctor.id)) {
      columnDoctorMap.set(a.doctor.id, a.doctor);
    }
  }

  const columnDoctors = Array.from(columnDoctorMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Serialize for client
  const serialized = appointments.map((a) => ({
    id: a.id,
    patientId: a.patient.id,
    patientCode: a.patient.code,
    patientName: a.patient.name,
    patientSalutation: a.patient.salutation,
    doctorId: a.doctor?.id || null,
    doctorName: a.doctor?.name || null,
    visitId: a.visit?.id || null,
    roomId: a.room?.id || null,
    roomName: a.room?.name || null,
    timeSlot: a.timeSlot,
    status: a.status,
    reason: a.reason,
    notes: a.notes,
    cancelReason: a.cancelReason,
  }));

  return (
    <AppointmentDayView
      dateStr={dateStr}
      appointments={serialized}
      columnDoctors={columnDoctors}
      columnRooms={columnRooms}
      currentUserId={currentUser.id}
      permissionLevel={currentUser.permissionLevel}
    />
  );
}
