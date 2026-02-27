import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { canManageSystem } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OperationCreateForm } from "./operation-form";
import { OperationInlineEdit } from "./operation-inline-edit";
import { TreatmentStepsEditor } from "./treatment-steps-editor";
import { toggleOperationActive } from "./actions";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  const currentUser = await requireAuth();
  if (!canManageSystem(currentUser.permissionLevel)) redirect("/dashboard");

  const operations = await prisma.operation.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: {
      treatmentSteps: { orderBy: { stepNumber: "asc" } },
    },
  });

  // Group by category
  const grouped = new Map<string, typeof operations>();
  for (const op of operations) {
    const cat = op.category || "Other";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(op);
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Settings", href: "/settings" },
        { label: "Treatments" },
      ]} />
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Treatments & Tariff</h2>
      </div>

      {/* Add new operation */}
      <OperationCreateForm categories={Array.from(grouped.keys())} />

      {/* Operations by category */}
      {Array.from(grouped.entries()).map(([category, ops]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">{category}</h3>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {ops.map((op) => (
                  <div key={op.id} className={`p-3 text-sm ${!op.isActive ? "opacity-50" : ""}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-muted-foreground w-8 text-right">{op.code}</span>
                        <span className="font-medium">{op.name}</span>
                        {!op.isActive && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                        {op.treatmentSteps.length > 0 && (
                          <Badge variant="secondary" className="text-xs">{op.treatmentSteps.length} steps</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <OperationInlineEdit id={op.id} currentFee={op.defaultMinFee} />
                        <form action={toggleOperationActive}>
                          <input type="hidden" name="id" value={op.id} />
                          <Button size="sm" variant="ghost" type="submit" className="h-7 text-xs">
                            {op.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </form>
                      </div>
                    </div>
                    <TreatmentStepsEditor
                      operationId={op.id}
                      operationName={op.name}
                      initialSteps={op.treatmentSteps.map((s) => ({
                        name: s.name,
                        description: s.description || "",
                        defaultDayGap: s.defaultDayGap,
                      }))}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
