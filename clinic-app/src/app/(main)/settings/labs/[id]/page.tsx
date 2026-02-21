import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { canManageSystem } from "@/lib/permissions";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { LabRateCreateForm } from "./lab-rate-form";
import { toggleLabRateActive, updateLab } from "../actions";

export const dynamic = "force-dynamic";

export default async function LabDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await requireAuth();
  if (!canManageSystem(currentUser.permissionLevel)) redirect("/dashboard");

  const { id } = await params;
  const lab = await prisma.lab.findUnique({
    where: { id: parseInt(id) },
    include: {
      rates: { orderBy: [{ isActive: "desc" }, { itemCode: "asc" }] },
    },
  });

  if (!lab) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings/labs"><ArrowLeft className="mr-1 h-4 w-4" />Labs</Link>
        </Button>
        <h2 className="text-2xl font-bold">{lab.name}</h2>
        {lab.code != null && <Badge variant="secondary">#{lab.code}</Badge>}
      </div>

      {/* Lab info edit */}
      <Card>
        <CardHeader><CardTitle>Lab Information</CardTitle></CardHeader>
        <CardContent>
          <form action={updateLab} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={lab.id} />
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Name</label>
              <input name="name" defaultValue={lab.name} required className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <input name="contactPhone" defaultValue={lab.contactPhone || ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input name="contactEmail" defaultValue={lab.contactEmail || ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" size="sm">Save</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Rate card */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Rate Card ({lab.rates.length} items)</h3>
        <LabRateCreateForm labId={lab.id} />
        <Card className="mt-3">
          <CardContent className="p-0">
            <div className="divide-y">
              {lab.rates.map((lr) => (
                <div key={lr.id} className={`flex items-center justify-between p-3 text-sm ${!lr.isActive ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-muted-foreground w-8 text-right">{lr.itemCode}</span>
                    <span className="font-medium">{lr.itemName}</span>
                    {!lr.isActive && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span>{"\u20B9"}{lr.rate.toLocaleString("en-IN")}</span>
                    <form action={toggleLabRateActive}>
                      <input type="hidden" name="id" value={lr.id} />
                      <input type="hidden" name="labId" value={lab.id} />
                      <Button size="sm" variant="ghost" type="submit" className="h-7 text-xs">
                        {lr.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
              {lab.rates.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">No rate items</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
