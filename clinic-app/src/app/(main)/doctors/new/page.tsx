import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { canManageSystem } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { DoctorForm } from "@/components/doctor-form";
import { createDoctor } from "../actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewDoctorPage() {
  const currentUser = await requireAuth();
  if (!canManageSystem(currentUser.permissionLevel)) redirect("/dashboard");

  const designations = await prisma.designation.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-4">
      <Link href="/doctors" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
        <ArrowLeft className="h-3 w-3" /> Doctors
      </Link>
      <h2 className="text-2xl font-bold">Add Doctor</h2>
      <DoctorForm designations={designations} action={createDoctor} />
    </div>
  );
}
