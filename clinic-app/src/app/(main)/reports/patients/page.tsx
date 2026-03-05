import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { canSeePatientDirectory } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatDate, toTitleCase } from "@/lib/format";
import { Search } from "lucide-react";
import { CSVExportButton } from "@/components/csv-export-button";
import { PrintPageButton } from "@/components/print-button";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function PatientDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const currentUser = await requireAuth();
  if (!canSeePatientDirectory(currentUser.permissionLevel)) redirect("/dashboard");

  const params = await searchParams;
  const query = params.q?.trim() || "";

  const patients = await prisma.patient.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query } },
            { mobile: { contains: query } },
            { phone: { contains: query } },
            ...(isNaN(Number(query)) ? [] : [{ code: parseInt(query) }]),
          ],
        }
      : {},
    include: {
      visits: {
        select: {
          id: true,
          visitDate: true,
          operationRate: true,
          discount: true,
          quantity: true,
          receipts: { select: { amount: true } },
        },
      },
    },
    orderBy: { code: "asc" },
    take: 500,
  });

  const rows = patients.map((p) => {
    const totalVisits = p.visits.length;
    const lastVisit = p.visits.length > 0
      ? p.visits.reduce((latest, v) => (v.visitDate > latest.visitDate ? v : latest)).visitDate
      : null;
    const totalBilled = p.visits.reduce((s, v) => s + ((v.operationRate || 0) - v.discount) * (v.quantity ?? 1), 0);
    const totalPaid = p.visits.reduce((s, v) => s + v.receipts.reduce((rs, r) => rs + r.amount, 0), 0);
    const outstanding = totalBilled - totalPaid;

    return {
      id: p.id,
      code: p.code,
      name: toTitleCase(p.name),
      mobile: p.mobile || p.phone || "",
      city: p.city || "",
      lastVisit,
      totalVisits,
      outstanding,
    };
  });

  const csvHeaders = ["Code", "Name", "Mobile", "City", "Last Visit", "Total Visits", "Outstanding"];
  const csvRows = rows.map((r) => [
    r.code || "",
    r.name,
    r.mobile,
    r.city,
    r.lastVisit ? new Date(r.lastVisit).toLocaleDateString("en-IN") : "",
    r.totalVisits,
    r.outstanding,
  ]);

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <Breadcrumbs items={[{ label: "Reports", href: "/reports" }, { label: "Patient Directory" }]} />
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Patient Directory</h2>
        <div className="flex gap-2 print:hidden">
          <CSVExportButton headers={csvHeaders} rows={csvRows} filename="patient-directory" />
          <PrintPageButton />
        </div>
      </div>

      <form className="flex flex-wrap gap-2 print:hidden">
        <Input name="q" placeholder="Search by name, code, or mobile..." defaultValue={query} className="w-72" />
        <Button type="submit" variant="secondary" size="sm">
          <Search className="mr-2 h-4 w-4" /> Search
        </Button>
        {query && (
          <Button variant="ghost" size="sm" asChild><Link href="/reports/patients">Clear</Link></Button>
        )}
      </form>

      {query && <p className="text-sm text-muted-foreground">{rows.length} patients found</p>}

      {rows.length > 0 ? (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead className="hidden md:table-cell print:table-cell">City</TableHead>
                  <TableHead>Last Visit</TableHead>
                  <TableHead className="text-right">Visits</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">
                      <Link href={`/patients/${r.id}`} className="hover:underline text-primary">{r.code}</Link>
                    </TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.mobile}</TableCell>
                    <TableCell className="hidden md:table-cell print:table-cell">{r.city}</TableCell>
                    <TableCell>{r.lastVisit ? formatDate(r.lastVisit) : "-"}</TableCell>
                    <TableCell className="text-right">{r.totalVisits}</TableCell>
                    <TableCell className={`text-right font-medium ${r.outstanding > 0 ? "text-destructive" : ""}`}>
                      {r.outstanding > 0 ? `₹${r.outstanding.toLocaleString("en-IN")}` : r.outstanding < 0 ? `₹${Math.abs(r.outstanding).toLocaleString("en-IN")} CR` : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {query ? "No patients match the search." : "No patients in the system yet."}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
