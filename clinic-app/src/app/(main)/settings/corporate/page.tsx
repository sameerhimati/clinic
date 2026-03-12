import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { canManageRates } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CorporatePartnerList } from "./corporate-list";

export const dynamic = "force-dynamic";

export default async function CorporatePartnersPage() {
  const currentUser = await requireAuth();
  if (!canManageRates(currentUser.permissionLevel, currentUser.isSuperUser)) redirect("/settings");

  const partners = await prisma.corporatePartner.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { patients: true } } },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <Breadcrumbs items={[
        { label: "Settings", href: "/settings" },
        { label: "Corporate Partners" },
      ]} />
      <h2 className="text-2xl font-bold">Corporate Partners</h2>
      <CorporatePartnerList
        partners={partners.map((p) => ({
          id: p.id,
          name: p.name,
          notes: p.notes,
          isActive: p.isActive,
          patientCount: p._count.patients,
        }))}
      />
    </div>
  );
}
