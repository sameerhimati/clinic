import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { format } from "date-fns";
import { requireAuth } from "@/lib/auth";
import { canCollectPayments } from "@/lib/permissions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; page?: string }>;
}) {
  const currentUser = await requireAuth();
  const canCollect = canCollectPayments(currentUser.permissionLevel);
  if (!canCollect) redirect("/dashboard");

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const pageSize = 25;

  const where: Record<string, unknown> = {};
  if (params.from || params.to) {
    where.receiptDate = {};
    if (params.from) (where.receiptDate as Record<string, unknown>).gte = new Date(params.from);
    if (params.to) (where.receiptDate as Record<string, unknown>).lte = new Date(params.to + "T23:59:59");
  }

  const [receipts, total, aggregate] = await Promise.all([
    prisma.receipt.findMany({
      where,
      orderBy: { receiptDate: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
      include: {
        visit: {
          include: {
            patient: { select: { name: true, code: true } },
            operation: { select: { name: true } },
          },
        },
      },
    }),
    prisma.receipt.count({ where }),
    prisma.receipt.aggregate({ where, _sum: { amount: true } }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Receipts</h2>
        {canCollect && (
          <Button asChild>
            <Link href="/receipts/new">
              <Plus className="mr-2 h-4 w-4" /> New Receipt
            </Link>
          </Button>
        )}
      </div>

      <form className="flex flex-wrap gap-2">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">From</span>
          <Input name="from" type="date" defaultValue={params.from || ""} className="w-auto" />
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">To</span>
          <Input name="to" type="date" defaultValue={params.to || ""} className="w-auto" />
        </div>
        <Button type="submit" variant="secondary" size="sm">
          <Search className="mr-2 h-4 w-4" /> Filter
        </Button>
        {(params.from || params.to) && (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/receipts">Clear</Link>
          </Button>
        )}
      </form>

      <div className="flex gap-4 text-sm">
        <span className="text-muted-foreground">{total} {total === 1 ? "receipt" : "receipts"}</span>
        <span className="font-medium">
          Total: {"\u20B9"}{(aggregate._sum.amount || 0).toLocaleString("en-IN")}
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {receipts.map((receipt) => (
              <Link
                key={receipt.id}
                href={`/receipts/${receipt.id}/print`}
                className="flex items-center justify-between p-4 hover:bg-accent transition-colors"
              >
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {receipt.receiptNo && (
                      <span className="font-mono text-sm text-muted-foreground">
                        #{receipt.receiptNo}
                      </span>
                    )}
                    {receipt.visit.patient.code && (
                      <span className="font-mono text-sm text-muted-foreground">
                        #{receipt.visit.patient.code}
                      </span>
                    )}
                    {receipt.visit.patient.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {receipt.visit.operation?.name || "Visit"} ·{" "}
                    {format(new Date(receipt.receiptDate), "MMM d, yyyy")}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{receipt.paymentMode}</Badge>
                  <span className="font-medium">
                    {"\u20B9"}{receipt.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              </Link>
            ))}
            {receipts.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">No receipts found</div>
            )}
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/receipts?from=${params.from || ""}&to=${params.to || ""}&page=${page - 1}`}>Previous</Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/receipts?from=${params.from || ""}&to=${params.to || ""}&page=${page + 1}`}>Next</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
