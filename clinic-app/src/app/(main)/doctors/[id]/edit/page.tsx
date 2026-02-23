import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { canManageSystem } from "@/lib/permissions";
import { DoctorForm } from "@/components/doctor-form";
import { updateDoctor } from "../../actions";

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
      <Link href="/doctors" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
        <ArrowLeft className="h-3 w-3" /> Doctors
      </Link>
      <h2 className="text-2xl font-bold">Edit Doctor — {doctor.name}</h2>
      <DoctorForm doctor={doctor} designations={designations} action={updateDoctor} />
    </div>
  );
}
