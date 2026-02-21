import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function DoctorsPage() {
  const doctors = await prisma.doctor.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      designation: true,
      _count: { select: { visits: true } },
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Doctors</h2>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {doctors.map((doctor) => (
              <div
                key={doctor.id}
                className="flex items-center justify-between p-4"
              >
                <div>
                  <div className="font-medium">{doctor.name}</div>
                  <div className="text-sm text-muted-foreground flex gap-2">
                    {doctor.designation && (
                      <Badge variant="secondary">{doctor.designation.name}</Badge>
                    )}
                    {doctor.commissionPercent > 0 && (
                      <span>Commission: {doctor.commissionPercent}%</span>
                    )}
                    {doctor.commissionRate && doctor.commissionRate > 0 && (
                      <span>Fixed Rate: {"\u20B9"}{doctor.commissionRate}</span>
                    )}
                    {doctor.tdsPercent > 0 && (
                      <span>TDS: {doctor.tdsPercent}%</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary">{doctor._count.visits} visit(s)</Badge>
                  {doctor.mobile && (
                    <div className="text-sm text-muted-foreground mt-1">{doctor.mobile}</div>
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
