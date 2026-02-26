import { prisma } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { canManageSystem } from "@/lib/permissions";
import { toggleDoctorActive } from "./actions";
import { roleName } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DoctorsPage() {
  const currentUser = await requireAuth();
  if (!canManageSystem(currentUser.permissionLevel)) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }
  const doctors = await prisma.doctor.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      designation: true,
      _count: { select: { visits: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Doctors</h2>
        {(
          <Button asChild>
            <Link href="/doctors/new"><Plus className="mr-2 h-4 w-4" />Add Doctor</Link>
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {doctors.map((doctor) => (
              <div
                key={doctor.id}
                className={`flex items-center justify-between p-4 ${!doctor.isActive ? "opacity-50" : ""}`}
              >
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {doctor.code != null && (
                      <span className="font-mono text-sm text-muted-foreground">#{doctor.code}</span>
                    )}
                    {doctor.name}
                    {!doctor.isActive && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground flex flex-wrap gap-2">
                    {doctor.designation && <Badge variant="secondary">{doctor.designation.name}</Badge>}
                    {doctor.commissionPercent > 0 && <span>Commission: {doctor.commissionPercent}%</span>}
                    {doctor.commissionRate != null && doctor.commissionRate > 0 && (
                      <span>Fixed: {"\u20B9"}{doctor.commissionRate}</span>
                    )}
                    {doctor.tdsPercent > 0 && <span>TDS: {doctor.tdsPercent}%</span>}
                    <span>{roleName(doctor.permissionLevel)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{doctor._count.visits} {doctor._count.visits === 1 ? "visit" : "visits"}</Badge>
                  {doctor.mobile && (
                    <span className="text-sm text-muted-foreground hidden sm:inline">{doctor.mobile}</span>
                  )}
                  {(
                    <>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/doctors/${doctor.id}/edit`}>Edit</Link>
                      </Button>
                      <form action={toggleDoctorActive}>
                        <input type="hidden" name="id" value={doctor.id} />
                        <Button size="sm" variant="ghost" type="submit">
                          {doctor.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
