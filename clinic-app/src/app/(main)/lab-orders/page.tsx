import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { canManageLabOrders } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { toTitleCase } from "@/lib/format";
import { LabOrderActions } from "./lab-order-actions";

export const dynamic = "force-dynamic";

export default async function LabOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; labId?: string }>;
}) {
  const currentUser = await requireAuth();
  if (!canManageLabOrders(currentUser.permissionLevel)) redirect("/dashboard");

  const { status: statusFilter, labId: labIdFilter } = await searchParams;
  const filterLabId = labIdFilter ? parseInt(labIdFilter) : null;

  const where: Record<string, unknown> = {};
  if (statusFilter && statusFilter !== "ALL") {
    where.status = statusFilter;
  }
  if (filterLabId) {
    where.labId = filterLabId;
  }

  const [orders, labs] = await Promise.all([
    prisma.labOrder.findMany({
      where,
      orderBy: [{ status: "asc" }, { orderedDate: "desc" }],
      include: {
        patient: { select: { id: true, code: true, name: true } },
        lab: { select: { name: true } },
        labRate: { select: { itemName: true } },
        createdBy: { select: { name: true } },
        receivedBy: { select: { name: true } },
        planItem: { select: { label: true } },
      },
    }),
    prisma.lab.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const pendingOrders = orders.filter((o) => o.status === "ORDERED");
  const receivedOrders = orders.filter((o) => o.status === "RECEIVED");

  const now = new Date();

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Lab Orders" }]} />
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Lab Orders</h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Status:</span>
          {["ALL", "ORDERED", "RECEIVED"].map((s) => (
            <Link
              key={s}
              href={`/lab-orders?status=${s}${filterLabId ? `&labId=${filterLabId}` : ""}`}
              className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${
                (statusFilter || "ALL") === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-accent border-input"
              }`}
            >
              {s === "ALL" ? "All" : s === "ORDERED" ? `Pending (${pendingOrders.length})` : `Received (${receivedOrders.length})`}
            </Link>
          ))}
          {labs.length > 1 && (
            <>
              <span className="ml-2 text-muted-foreground">Lab:</span>
              <Link
                href={`/lab-orders?status=${statusFilter || "ALL"}`}
                className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${
                  !filterLabId
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-accent border-input"
                }`}
              >
                All
              </Link>
              {labs.map((l) => (
                <Link
                  key={l.id}
                  href={`/lab-orders?status=${statusFilter || "ALL"}&labId=${l.id}`}
                  className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${
                    filterLabId === l.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-accent border-input"
                  }`}
                >
                  {l.name}
                </Link>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Pending Orders */}
      {pendingOrders.length > 0 && (statusFilter !== "RECEIVED") && (
        <Card className="border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              Pending Orders
              <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50">{pendingOrders.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {pendingOrders.map((order) => {
                const daysSinceOrdered = Math.floor((now.getTime() - new Date(order.orderedDate).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={order.id} className="flex items-center justify-between py-3 gap-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/patients/${order.patient.id}`} className="font-medium hover:underline flex items-center gap-2">
                        <span className="font-mono text-sm text-muted-foreground">#{order.patient.code}</span>
                        <span className="truncate">{toTitleCase(order.patient.name)}</span>
                      </Link>
                      <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-foreground">{order.labRate.itemName}</span>
                        <span>· {order.lab.name}</span>
                        {order.quantity > 1 && <span>· Qty: {order.quantity}</span>}
                        {order.toothNumbers && <span>· Teeth: {order.toothNumbers}</span>}
                        {order.planItem && (
                          <Badge variant="outline" className="text-xs px-1 py-0">{order.planItem.label}</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Ordered {format(new Date(order.orderedDate), "dd MMM yyyy")}
                        {order.expectedDate && ` · Expected ${format(new Date(order.expectedDate), "dd MMM")}`}
                        {daysSinceOrdered > 7 && (
                          <Badge variant="outline" className="ml-1.5 text-xs px-1 py-0 text-red-600 border-red-200 bg-red-50">
                            {daysSinceOrdered}d ago
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-sm font-semibold tabular-nums">
                          ₹{order.totalAmount.toLocaleString("en-IN")}
                        </span>
                        {order.rateAdjustment !== 0 && (
                          <div className="text-xs text-amber-600">
                            {order.rateAdjustment > 0 ? "+" : ""}₹{order.rateAdjustment.toLocaleString("en-IN")} adj.
                          </div>
                        )}
                      </div>
                      <LabOrderActions orderId={order.id} status={order.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Received Orders */}
      {receivedOrders.length > 0 && (statusFilter !== "ORDERED") && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              Received
              <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">{receivedOrders.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {receivedOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/patients/${order.patient.id}`} className="font-medium hover:underline flex items-center gap-2">
                      <span className="font-mono text-sm text-muted-foreground">#{order.patient.code}</span>
                      <span className="truncate">{toTitleCase(order.patient.name)}</span>
                    </Link>
                    <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-foreground">{order.labRate.itemName}</span>
                      <span>· {order.lab.name}</span>
                      {order.quantity > 1 && <span>· Qty: {order.quantity}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Received {order.receivedDate ? format(new Date(order.receivedDate), "dd MMM yyyy") : "—"}
                      {order.receivedBy && ` by ${toTitleCase(order.receivedBy.name)}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold tabular-nums">
                      ₹{order.totalAmount.toLocaleString("en-IN")}
                    </span>
                    {order.rateAdjustment !== 0 && (
                      <div className="text-xs text-amber-600">
                        {order.rateAdjustment > 0 ? "+" : ""}₹{order.rateAdjustment.toLocaleString("en-IN")} adj.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {orders.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">No lab orders found</p>
          <p className="text-sm mt-1">Lab orders will appear here when created from patient pages or the dashboard.</p>
        </div>
      )}
    </div>
  );
}
