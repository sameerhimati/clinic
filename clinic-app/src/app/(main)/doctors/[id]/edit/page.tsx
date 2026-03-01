import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { requireAuth } from "@/lib/auth";
import { canManageSystem } from "@/lib/permissions";
import { DoctorForm } from "@/components/doctor-form";
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
  });

  if (!doctor) notFound();

  const designations = await prisma.designation.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[
        { label: "Doctors", href: "/doctors" },
        { label: toTitleCase(doctor.name) },
      ]} />
      <h2 className="text-2xl font-bold">Edit Doctor: {toTitleCase(doctor.name)}</h2>
      <DoctorForm doctor={doctor} designations={designations} action={updateDoctor} />
    </div>
  );
}
