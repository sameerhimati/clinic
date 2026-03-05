import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { requireAuth } from "@/lib/auth";
import { canManageSystem } from "@/lib/permissions";
import { DoctorForm } from "@/components/doctor-form";
import { AvailabilityEditor } from "@/components/availability-editor";
import { updateDoctor } from "../../actions";
import { toTitleCase } from "@/lib/format";

export default async function EditDoctorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await requireAuth();
  const { id } = await params;
  const doctorId = parseInt(id);
  const isOwnProfile = currentUser.id === doctorId;

  // Admin/reception can edit any doctor; doctors can only access their own page
  if (!canManageSystem(currentUser.permissionLevel) && !isOwnProfile) redirect("/dashboard");

  const doctor = await prisma.doctor.findUnique({
    where: { id: parseInt(id) },
    include: {
      availability: { orderBy: { dayOfWeek: "asc" } },
    },
  });

  if (!doctor) notFound();

  const [designations, rooms] = await Promise.all([
    prisma.designation.findMany({ orderBy: { name: "asc" } }),
    prisma.room.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);

  // Only show availability for L3 (doctor) accounts
  const showAvailability = doctor.permissionLevel === 3;
  const canEditProfile = canManageSystem(currentUser.permissionLevel);

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[
        ...(canEditProfile ? [{ label: "Doctors", href: "/doctors" }] : []),
        { label: toTitleCase(doctor.name) },
        ...(isOwnProfile && !canEditProfile ? [{ label: "My Schedule" }] : []),
      ]} />
      <h2 className="text-2xl font-bold">
        {isOwnProfile && !canEditProfile ? "My Schedule" : `Edit Doctor: ${toTitleCase(doctor.name)}`}
      </h2>
      {canEditProfile && (
        <DoctorForm doctor={doctor} designations={designations} rooms={rooms} action={updateDoctor} />
      )}
      {showAvailability && (
        <AvailabilityEditor
          doctorId={doctor.id}
          existing={doctor.availability.map((a) => ({
            dayOfWeek: a.dayOfWeek,
            startTime: a.startTime,
            endTime: a.endTime,
          }))}
        />
      )}
    </div>
  );
}
