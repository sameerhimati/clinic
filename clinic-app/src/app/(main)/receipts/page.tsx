import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { formatDate, toTitleCase } from "@/lib/format";
import { requireAuth } from "@/lib/auth";
import { canCollectPayments } from "@/lib/permissions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type UnifiedPayment = {
  id: string;
  type: "Receipt" | "Deposit";
  date: Date;
  amount: number;
  paymentMode: string;
  patientName: string;
  patientCode: number | null;
  patientId: number;
  detail: string;
  linkHref: string | null;
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; page?: string; q?: string; mode?: string }>;
}) {
  const currentUser = await requireAuth();
  const canCollect = canCollectPayments(currentUser.permissionLevel);
  if (!canCollect) redirect("/dashboard");

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const pageSize = 25;
  const searchQuery = params.q?.trim() || "";
  const modeFilter = params.mode || "";

  // Date filter
  const dateFrom = params.from ? new Date(params.from) : undefined;
  const dateTo = params.to ? new Date(params.to + "T23:59:59") : undefined;

  const receiptWhere: Record<string, unknown> = {};
  const depositWhere: Record<string, unknown> = {};
  if (dateFrom || dateTo) {
    receiptWhere.receiptDate = {};
    depositWhere.paymentDate = {};
    if (dateFrom) {
      (receiptWhere.receiptDate as Record<string, unknown>).gte = dateFrom;
      (depositWhere.paymentDate as Record<string, unknown>).gte = dateFrom;
    }
    if (dateTo) {
      (receiptWhere.receiptDate as Record<string, unknown>).lte = dateTo;
      (depositWhere.paymentDate as Record<string, unknown>).lte = dateTo;
    }
  }

  // Patient search filter
  if (searchQuery) {
    const patientFilter = {
      OR: [
        { name: { contains: searchQuery } },
        ...(isNaN(Number(searchQuery)) ? [] : [{ code: Number(searchQuery) }]),
      ],
    };
    receiptWhere.visit = { patient: patientFilter };
    depositWhere.patient = patientFilter;
  }

  // Payment mode filter
  if (modeFilter) {
    receiptWhere.paymentMode = modeFilter;
    depositWhere.paymentMode = modeFilter;
  }

  // Fetch limited records for the current page window + counts/aggregates
  const fetchLimit = pageSize * 3;
  const fetchSkip = Math.max(0, (page - 1) * pageSize);

  const [receipts, deposits, receiptTotal, depositTotal, receiptAgg, depositAgg] = await Promise.all([
    prisma.receipt.findMany({
      where: receiptWhere,
      orderBy: { receiptDate: "desc" },
      take: fetchLimit,
      skip: fetchSkip,
      include: {
        visit: {
          include: {
            patient: { select: { id: true, name: true, code: true } },
            operation: { select: { name: true } },
          },
        },
      },
    }),
    prisma.patientPayment.findMany({
      where: depositWhere,
      orderBy: { paymentDate: "desc" },
      take: fetchLimit,
      skip: fetchSkip,
      include: {
        patient: { select: { id: true, name: true, code: true } },
      },
    }),
    prisma.receipt.count({ where: receiptWhere }),
    prisma.patientPayment.count({ where: depositWhere }),
    prisma.receipt.aggregate({ where: receiptWhere, _sum: { amount: true } }),
    prisma.patientPayment.aggregate({ where: depositWhere, _sum: { amount: true } }),
  ]);

  // Merge into unified list
  const unified: UnifiedPayment[] = [
    ...receipts.map((r) => ({
      id: `receipt-${r.id}`,
      type: "Receipt" as const,
      date: r.receiptDate,
      amount: r.amount,
      paymentMode: r.paymentMode,
      patientName: toTitleCase(r.visit.patient.name),
      patientCode: r.visit.patient.code,
      patientId: r.visit.patient.id,
      detail: r.visit.operation?.name || "Visit",
      linkHref: `/receipts/${r.id}/print`,
    })),
    ...deposits.map((d) => ({
      id: `deposit-${d.id}`,
      type: "Deposit" as const,
      date: d.paymentDate,
      amount: d.amount,
      paymentMode: d.paymentMode,
      patientName: toTitleCase(d.patient.name),
      patientCode: d.patient.code,
      patientId: d.patient.id,
      detail: d.notes || "Escrow Deposit",
      linkHref: null,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const total = receiptTotal + depositTotal;
  const totalAmount = (receiptAgg._sum.amount || 0) + (depositAgg._sum.amount || 0);
  const totalPages = Math.ceil(total / pageSize);
  const paged = unified.slice(0, pageSize);

  const typeBadge = {
    Receipt: { className: "bg-green-50 text-green-700 border-green-200" },
    Deposit: { className: "bg-blue-50 text-blue-700 border-blue-200" },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Payments</h2>
        {canCollect && (
          <Button asChild>
            <Link href="/receipts/new">
              <Plus className="mr-2 h-4 w-4" /> New Receipt
            </Link>
          </Button>
        )}
      </div>

      <form className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Search</span>
          <Input name="q" type="text" placeholder="Patient name or code..." defaultValue={searchQuery} className="w-48" />
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Mode</span>
          <select
            name="mode"
            defaultValue={modeFilter}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="">All modes</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="UPI">UPI</option>
            <option value="NEFT">NEFT</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>
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
        {(params.from || params.to || searchQuery || modeFilter) && (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/receipts">Clear</Link>
          </Button>
        )}
      </form>

      <div className="flex gap-4 text-sm flex-wrap">
        <span className="text-muted-foreground">{total} {total === 1 ? "payment" : "payments"}</span>
        <span className="font-medium">
          Total: {"\u20B9"}{totalAmount.toLocaleString("en-IN")}
        </span>
        <span className="text-green-700 text-xs">
          {receiptTotal} receipts ({"\u20B9"}{(receiptAgg._sum.amount || 0).toLocaleString("en-IN")})
        </span>
        <span className="text-blue-700 text-xs">
          {depositTotal} deposits ({"\u20B9"}{(depositAgg._sum.amount || 0).toLocaleString("en-IN")})
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {paged.map((payment) => {
              const inner = (
                <div className="flex items-center justify-between p-4 hover:bg-accent transition-colors">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <Badge variant="outline" className={typeBadge[payment.type].className + " text-[10px] px-1.5 py-0"}>
                        {payment.type}
                      </Badge>
                      {payment.patientCode && (
                        <span className="font-mono text-sm text-muted-foreground">
                          #{payment.patientCode}
                        </span>
                      )}
                      {payment.patientName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {payment.detail} · {formatDate(payment.date)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{payment.paymentMode}</Badge>
                    <span className="font-medium">
                      {"\u20B9"}{payment.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              );

              return payment.linkHref ? (
                <Link key={payment.id} href={payment.linkHref}>
                  {inner}
                </Link>
              ) : (
                <Link key={payment.id} href={`/patients/${payment.patientId}`}>
                  {inner}
                </Link>
              );
            })}
            {paged.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">No payments found</div>
            )}
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (() => {
        const qp = new URLSearchParams();
        if (params.from) qp.set("from", params.from);
        if (params.to) qp.set("to", params.to);
        if (searchQuery) qp.set("q", searchQuery);
        if (modeFilter) qp.set("mode", modeFilter);
        const base = qp.toString();
        return (
          <div className="flex items-center justify-center gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/receipts?${base}&page=${page - 1}`}>Previous</Link>
              </Button>
            )}
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            {page < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/receipts?${base}&page=${page + 1}`}>Next</Link>
              </Button>
            )}
          </div>
        );
      })()}
    </div>
  );
}
