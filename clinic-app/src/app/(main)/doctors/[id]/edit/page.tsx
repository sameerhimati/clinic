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
  if (!canManageSystem(currentUser.permissionLevel)) redirect("/dashboard");

  const { id } = await params;
  const doctor = await prisma.doctor.findUnique({
    where: { id: parseInt(id) },
    include: {
      availability: { orderBy: { dayOfWeek: "asc" } },
    },
  });

  if (!doctor) notFound();

  const designations = await prisma.designation.findMany({ orderBy: { name: "asc" } });

  // Only show availability for L3 (doctor) accounts
  const showAvailability = doctor.permissionLevel === 3;

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[
        { label: "Doctors", href: "/doctors" },
        { label: toTitleCase(doctor.name) },
      ]} />
      <h2 className="text-2xl font-bold">Edit Doctor: {toTitleCase(doctor.name)}</h2>
      <DoctorForm doctor={doctor} designations={designations} action={updateDoctor} />
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
