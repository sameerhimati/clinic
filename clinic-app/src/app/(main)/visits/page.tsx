import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { format } from "date-fns";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function VisitsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; doctorId?: string; page?: string }>;
}) {
  const currentDoctor = await requireAuth();
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const pageSize = 25;

  // For doctors (permissionLevel 3), default to their own visits unless they explicitly clear it
  const effectiveDoctorId =
    params.doctorId !== undefined
      ? params.doctorId
      : currentDoctor.permissionLevel === 3
        ? String(currentDoctor.id)
        : "";

  const where: Record<string, unknown> = {};
  if (params.from || params.to) {
    where.visitDate = {};
    if (params.from) (where.visitDate as Record<string, unknown>).gte = new Date(params.from);
    if (params.to) (where.visitDate as Record<string, unknown>).lte = new Date(params.to + "T23:59:59");
  }
  if (effectiveDoctorId) {
    where.doctorId = parseInt(effectiveDoctorId);
  }

  const [visits, total, doctors] = await Promise.all([
    prisma.visit.findMany({
      where,
      orderBy: { visitDate: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
      include: {
        patient: { select: { name: true, code: true } },
        operation: { select: { name: true } },
        doctor: { select: { name: true } },
        receipts: { select: { amount: true } },
      },
    }),
    prisma.visit.count({ where }),
    prisma.doctor.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Visits</h2>
        <Button asChild>
          <Link href="/visits/new">
            <Plus className="mr-2 h-4 w-4" />
            New Visit
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-2">
        <Input name="from" type="date" defaultValue={params.from || ""} className="w-auto" />
        <Input name="to" type="date" defaultValue={params.to || ""} className="w-auto" />
        <select
          name="doctorId"
          defaultValue={effectiveDoctorId}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All Doctors</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary" size="sm">
          <Search className="mr-2 h-4 w-4" /> Filter
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">{total} visit(s)</p>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {visits.map((visit) => {
              const billed = (visit.operationRate || 0) - visit.discount;
              const paid = visit.receipts.reduce((s, r) => s + r.amount, 0);
              const balance = billed - paid;
              return (
                <Link
                  key={visit.id}
                  href={`/visits/${visit.id}`}
                  className="flex items-center justify-between p-4 hover:bg-accent transition-colors"
                >
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {visit.patient.code && (
                        <span className="font-mono text-sm text-muted-foreground">
                          #{visit.patient.code}
                        </span>
                      )}
                      {visit.patient.name}
                      <span className="text-muted-foreground font-normal text-sm">
                        Case #{visit.caseNo || visit.id}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {visit.operation?.name || "N/A"} ·{" "}
                      {format(new Date(visit.visitDate), "MMM d, yyyy")}
                      {visit.doctor && ` · Dr. ${visit.doctor.name}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div>{"\u20B9"}{billed.toLocaleString("en-IN")}</div>
                    {balance > 0 ? (
                      <Badge variant="destructive" className="text-xs">
                        Due: {"\u20B9"}{balance.toLocaleString("en-IN")}
                      </Badge>
                    ) : billed > 0 ? (
                      <Badge variant="secondary" className="text-xs">Paid</Badge>
                    ) : null}
                  </div>
                </Link>
              );
            })}
            {visits.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">No visits found</div>
            )}
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/visits?from=${params.from || ""}&to=${params.to || ""}&doctorId=${effectiveDoctorId}&page=${page - 1}`}>
                Previous
              </Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/visits?from=${params.from || ""}&to=${params.to || ""}&doctorId=${effectiveDoctorId}&page=${page + 1}`}>
                Next
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
