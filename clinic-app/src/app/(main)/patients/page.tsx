import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Search } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const page = parseInt(params.page || "1");
  const pageSize = 25;

  // If query is a pure number, do exact match on code first
  const isNumericQuery = query && /^\d+$/.test(query.trim());

  const where = query
    ? {
        OR: [
          ...(isNumericQuery ? [{ code: parseInt(query) }] : []),
          { name: { contains: query } },
          { mobile: { contains: query } },
          { phone: { contains: query } },
        ],
      }
    : {};

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: isNumericQuery ? { code: "asc" as const } : { createdAt: "desc" as const },
      take: pageSize,
      skip: (page - 1) * pageSize,
      include: {
        _count: { select: { visits: true } },
      },
    }),
    prisma.patient.count({ where }),
  ]);

  // Server already sorts by code for numeric queries — exact match will be first
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Patients</h2>
        <Button asChild>
          <Link href="/patients/new">
            <UserPlus className="mr-2 h-4 w-4" />
            New Patient
          </Link>
        </Button>
      </div>

      {/* Search */}
      <form className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="q"
            placeholder="Search by code, name, or mobile..."
            defaultValue={query}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {query && (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/patients">Clear</Link>
          </Button>
        )}
      </form>

      <p className="text-sm text-muted-foreground">{total} {total === 1 ? "patient" : "patients"} found</p>

      {/* Patient List */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {patients.map((patient) => {
              const isExactMatch = isNumericQuery && patient.code === parseInt(query);
              return (
                <Link
                  key={patient.id}
                  href={`/patients/${patient.id}`}
                  className={`flex items-center justify-between px-4 py-2.5 hover:bg-accent transition-colors ${isExactMatch ? "bg-accent/50" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-primary text-base">
                      #{patient.code}
                    </span>
                    <div>
                      <div className="font-medium">
                        {patient.salutation && `${patient.salutation}. `}
                        {patient.name}
                      </div>
                      <div className="text-sm text-muted-foreground flex flex-wrap gap-2">
                        {patient.mobile && <span>{patient.mobile}</span>}
                        {patient.gender && (
                          <span>{patient.gender === "M" ? "Male" : "Female"}</span>
                        )}
                        {patient.ageAtRegistration && (
                          <span>{patient.ageAtRegistration} yrs</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">
                      {patient._count.visits} {patient._count.visits === 1 ? "visit" : "visits"}
                    </Badge>
                  </div>
                </Link>
              );
            })}
            {patients.length === 0 && (
              <div className="p-8 text-center space-y-3">
                <p className="text-muted-foreground">
                  {query ? `No patients matching "${query}"` : "No patients registered yet"}
                </p>
                {!query && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/patients/new">
                      <UserPlus className="mr-1 h-3.5 w-3.5" />
                      Register First Patient
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/patients?q=${query}&page=${page - 1}`}>
                Previous
              </Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/patients?q=${query}&page=${page + 1}`}>Next</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
