import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { canManageSystem } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { DoctorForm } from "@/components/doctor-form";
import { createDoctor } from "../actions";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default async function NewDoctorPage() {
  const currentUser = await requireAuth();
  if (!canManageSystem(currentUser.permissionLevel)) redirect("/dashboard");

  const designations = await prisma.designation.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[
        { label: "Doctors", href: "/doctors" },
        { label: "Add Doctor" },
      ]} />
      <h2 className="text-2xl font-bold">Add Doctor</h2>
      <DoctorForm designations={designations} action={createDoctor} />
    </div>
  );
}
