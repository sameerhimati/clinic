import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { canManageSystem } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LabCreateForm } from "./lab-form";
import { toggleLabActive } from "./actions";

export const dynamic = "force-dynamic";

export default async function LabsPage({
  searchParams,
}: {
  searchParams: Promise<{ showAll?: string }>;
}) {
  const currentUser = await requireAuth();
  if (!canManageSystem(currentUser.permissionLevel)) redirect("/dashboard");
  const { showAll } = await searchParams;
  const showingAll = showAll === "1";

  const labs = await prisma.lab.findMany({
    where: showingAll ? {} : { isActive: true },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { _count: { select: { rates: true } } },
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Settings", href: "/settings" },
        { label: "Labs" },
      ]} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Labs & Lab Rates</h2>
          <span className="text-sm text-muted-foreground">{labs.length} {showingAll ? "total" : "active"}</span>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={showingAll ? "/settings/labs" : "/settings/labs?showAll=1"}>
            {showingAll ? "Active Only" : "Show All"}
          </Link>
        </Button>
      </div>

      <LabCreateForm />

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {labs.map((lab) => (
              <div key={lab.id} className={`flex items-center justify-between p-4 ${!lab.isActive ? "opacity-50" : ""}`}>
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {lab.code != null && <span className="font-mono text-sm text-muted-foreground">#{lab.code}</span>}
                    <Link href={`/settings/labs/${lab.id}`} className="hover:underline">{lab.name}</Link>
                    {!lab.isActive && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {lab._count.rates} rate items
                    {lab.contactPhone && ` · ${lab.contactPhone}`}
                    {lab.contactEmail && ` · ${lab.contactEmail}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/settings/labs/${lab.id}`}>View Rates</Link>
                  </Button>
                  <form action={toggleLabActive}>
                    <input type="hidden" name="id" value={lab.id} />
                    <Button size="sm" variant="ghost" type="submit">
                      {lab.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </form>
                </div>
              </div>
            ))}
            {labs.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">No labs configured</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
