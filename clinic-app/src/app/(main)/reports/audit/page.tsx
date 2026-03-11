import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatDate, toTitleCase } from "@/lib/format";
import { Search } from "lucide-react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { dateToString } from "@/lib/validations";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  LARGE_DISCOUNT: "Large Discount",
  OPERATION_RATE_CHANGE: "Operation Rate Change",
  LAB_RATE_CHANGE: "Lab Rate Change",
  LAB_RATE_CREATED: "Lab Rate Created",
  PLAN_CANCELLED: "Plan Cancelled",
  PLAN_MODIFIED: "Plan Modified",
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; severity?: string; actorId?: string; page?: string }>;
}) {
  const currentUser = await requireAuth();
  if (!isAdmin(currentUser.permissionLevel)) redirect("/dashboard");

  const params = await searchParams;
  if (!params.from || !params.to) {
    const now = new Date();
    params.from = dateToString(new Date(now.getFullYear(), now.getMonth(), 1));
    params.to = dateToString(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  }

  const fromDate = new Date(params.from);
  const toDate = new Date(params.to + "T23:59:59");

  const where: Record<string, unknown> = {
    createdAt: { gte: fromDate, lte: toDate },
  };
  if (params.severity && params.severity !== "ALL") {
    where.severity = params.severity;
  }
  if (params.actorId) {
    const actorId = parseInt(params.actorId);
    if (!isNaN(actorId)) where.actorId = actorId;
  }

  const page = parseInt(params.page || "1");
  const pageSize = 50;

  const [entries, totalCount, doctors] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    prisma.auditLog.count({ where }),
    prisma.doctor.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);
  const flaggedCount = entries.filter((e) => e.severity === "FLAG").length;
  const uniqueActors = new Set(entries.map((e) => e.actorId)).size;

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <Breadcrumbs items={[{ label: "Reports", href: "/reports" }, { label: "Audit Log" }]} />
      </div>
      <h2 className="text-2xl font-bold">Audit Log</h2>

      {/* Filter bar */}
      <form className="flex flex-wrap gap-2 items-end print:hidden">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">From</span>
          <Input name="from" type="date" defaultValue={params.from} className="w-auto" />
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">To</span>
          <Input name="to" type="date" defaultValue={params.to} className="w-auto" />
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Severity</span>
          <Select name="severity" defaultValue={params.severity || "ALL"}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="FLAG">Flagged</SelectItem>
              <SelectItem value="INFO">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Actor</span>
          <Select name="actorId" defaultValue={params.actorId || "ALL"}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              {doctors.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {toTitleCase(d.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" variant="secondary" size="sm">
          <Search className="mr-2 h-4 w-4" /> Filter
        </Button>
        {(params.severity || params.actorId) && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/reports/audit?from=${params.from}&to=${params.to}`}>Clear</Link>
          </Button>
        )}
      </form>

      {/* Summary cards */}
      <div className="flex gap-4 text-sm">
        <div className="rounded-lg border px-4 py-2">
          <div className="text-muted-foreground">Total Entries</div>
          <div className="text-lg font-bold">{totalCount}</div>
        </div>
        <div className="rounded-lg border px-4 py-2 border-amber-200 bg-amber-50/50">
          <div className="text-muted-foreground">Flagged</div>
          <div className="text-lg font-bold text-amber-700">{flaggedCount}</div>
        </div>
        <div className="rounded-lg border px-4 py-2">
          <div className="text-muted-foreground">Unique Actors</div>
          <div className="text-lg font-bold">{uniqueActors}</div>
        </div>
      </div>

      {/* Table */}
      {entries.length > 0 ? (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  let details: Record<string, unknown> = {};
                  try {
                    if (entry.details) details = JSON.parse(entry.details);
                  } catch { /* ignore */ }

                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDate(entry.createdAt)}
                        <br />
                        <span className="text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </TableCell>
                      <TableCell>{toTitleCase(entry.actor.name)}</TableCell>
                      <TableCell>{ACTION_LABELS[entry.action] || entry.action}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={entry.severity === "FLAG"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "text-muted-foreground"}
                        >
                          {entry.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {entry.entityType}
                        {entry.entityId && ` #${entry.entityId}`}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs" title={entry.reason || undefined}>
                        {entry.reason || "—"}
                      </TableCell>
                      <TableCell className="max-w-[250px] text-xs">
                        <DetailsCell details={details} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No audit entries found for the selected period.
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 print:hidden">
          {page > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/reports/audit?from=${params.from}&to=${params.to}&severity=${params.severity || ""}&actorId=${params.actorId || ""}&page=${page - 1}`}>
                Previous
              </Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/reports/audit?from=${params.from}&to=${params.to}&severity=${params.severity || ""}&actorId=${params.actorId || ""}&page=${page + 1}`}>
                Next
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function DetailsCell({ details }: { details: Record<string, unknown> }) {
  const keys = Object.keys(details);
  if (keys.length === 0) return <span className="text-muted-foreground">—</span>;

  const LABELS: Record<string, string> = {
    oldFee: "Previous fee",
    newFee: "New fee",
    rate: "Rate",
    discount: "Discount",
    discountPercent: "Discount %",
    discountReason: "Reason",
    oldRate: "Previous rate",
    newRate: "New rate",
  };

  const isCurrency = (key: string) => ["oldFee", "newFee", "rate", "discount", "oldRate", "newRate"].includes(key);

  // Special rendering for fee changes
  if (details.oldFee != null && details.newFee != null) {
    return (
      <span className="font-mono text-xs">
        {"\u20B9"}{Number(details.oldFee).toLocaleString("en-IN")} → {"\u20B9"}{Number(details.newFee).toLocaleString("en-IN")}
      </span>
    );
  }
  if (details.oldRate != null && details.newRate != null) {
    return (
      <span className="font-mono text-xs">
        {"\u20B9"}{Number(details.oldRate).toLocaleString("en-IN")} → {"\u20B9"}{Number(details.newRate).toLocaleString("en-IN")}
      </span>
    );
  }

  return (
    <div className="space-y-0.5">
      {keys.slice(0, 4).map((key) => {
        const label = LABELS[key] || key;
        const val = details[key];
        const formatted = isCurrency(key) && typeof val === "number"
          ? `\u20B9${val.toLocaleString("en-IN")}`
          : typeof val === "number"
            ? val.toLocaleString("en-IN")
            : String(val ?? "");
        return (
          <div key={key} className="truncate">
            <span className="text-muted-foreground">{label}:</span> {formatted}
          </div>
        );
      })}
      {keys.length > 4 && (
        <div className="text-muted-foreground">+{keys.length - 4} more</div>
      )}
    </div>
  );
}
