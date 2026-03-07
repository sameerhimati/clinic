import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { canManageSystem } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FindingsEditor } from "./findings-editor";

export const dynamic = "force-dynamic";

export default async function FindingsPage() {
  const currentUser = await requireAuth();
  const isFullAdmin = canManageSystem(currentUser.permissionLevel);
  const isL3Super = currentUser.permissionLevel === 3 && currentUser.isSuperUser;
  if (!isFullAdmin && !isL3Super) redirect("/dashboard");

  const findings = await prisma.toothFinding.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { toothStatuses: true } } },
  });

  const categories = [...new Set(findings.map((f) => f.category).filter(Boolean))] as string[];

  return (
    <div className="max-w-2xl space-y-6">
      <Breadcrumbs items={[
        { label: "Settings", href: "/settings" },
        { label: "Dental Findings" },
      ]} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Dental Findings</h2>
          <span className="text-sm text-muted-foreground">{findings.length} total</span>
        </div>
      </div>

      <FindingsEditor findings={findings} categories={categories} />
    </div>
  );
}
