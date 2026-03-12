"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlaskConical, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { LabOrderDialog } from "@/components/lab-order-dialog";
import { LabOrderReceiveButton } from "./lab-order-receive-button";

type LabNudge = {
  planItemId: number;
  patientId: number;
  patientCode: number | null;
  patientName: string;
  planTitle: string;
  stepLabel: string;
  toothNumbers: string | null;
  stepCount?: number;
};

type PendingOrder = {
  id: number;
  patientId: number;
  patientCode: number | null;
  patientName: string;
  labName: string;
  materialName: string;
  daysSinceOrdered: number;
  expectedDate: string | null;
  totalAmount: number;
};

type LabData = {
  id: number;
  name: string;
  rates: { id: number; itemName: string; rate: number }[];
};

export function PendingLabOrdersWidget({
  nudges,
  pendingOrders,
  labs,
}: {
  nudges: LabNudge[];
  pendingOrders: PendingOrder[];
  labs: LabData[];
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderTarget, setOrderTarget] = useState<{
    patientId: number;
    patientName: string;
    patientCode: number | null;
    defaultPlanItemId?: number;
    defaultToothNumbers?: string;
  } | null>(null);

  if (nudges.length === 0 && pendingOrders.length === 0) return null;

  function openOrderDialog(nudge: LabNudge) {
    setOrderTarget({
      patientId: nudge.patientId,
      patientName: nudge.patientName,
      patientCode: nudge.patientCode,
      defaultPlanItemId: nudge.planItemId,
      defaultToothNumbers: nudge.toothNumbers || undefined,
    });
    setOrderDialogOpen(true);
  }

  return (
    <>
      <Card className="border-violet-200">
        <CardHeader className="pb-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full"
          >
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-violet-600" />
              Lab Work
              <span className="text-xs font-normal text-muted-foreground">
                ({nudges.length + pendingOrders.length})
              </span>
            </CardTitle>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </CardHeader>
        {expanded && (
          <CardContent className="pt-0 space-y-3">
            {/* Needs Ordering — nudges */}
            {nudges.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider pb-1">
                  Needs Ordering
                </div>
                <div className="divide-y">
                  {nudges.slice(0, 5).map((nudge) => (
                    <div key={nudge.planItemId} className="py-2">
                      <div className="flex items-center justify-between gap-2">
                        <Link href={`/patients/${nudge.patientId}`} className="font-medium text-sm hover:underline truncate flex items-center gap-1.5">
                          <span className="font-mono text-xs text-muted-foreground">#{nudge.patientCode}</span>
                          <span className="truncate">{nudge.patientName}</span>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs shrink-0"
                          onClick={() => openOrderDialog(nudge)}
                        >
                          <FlaskConical className="mr-1 h-3 w-3" />
                          Order
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {nudge.planTitle}
                        {nudge.stepCount && nudge.stepCount > 1
                          ? <span className="font-medium text-foreground"> ({nudge.stepCount} steps need lab)</span>
                          : <> — <span className="font-medium text-foreground">{nudge.stepLabel}</span></>
                        }
                        {nudge.toothNumbers && ` · Teeth ${nudge.toothNumbers}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Awaiting Delivery */}
            {pendingOrders.length > 0 && (
              <div className={nudges.length > 0 ? "pt-2 border-t" : ""}>
                <div className="text-xs font-semibold text-violet-600 uppercase tracking-wider pb-1">
                  Awaiting Delivery
                </div>
                <div className="divide-y">
                  {pendingOrders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between py-2 gap-2">
                      <div className="min-w-0 flex-1">
                        <Link href={`/patients/${order.patientId}`} className="font-medium text-sm hover:underline truncate flex items-center gap-1.5">
                          <span className="font-mono text-xs text-muted-foreground">#{order.patientCode}</span>
                          <span className="truncate">{order.patientName}</span>
                        </Link>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {order.materialName} · {order.labName}
                          {order.daysSinceOrdered > 7 && (
                            <Badge variant="outline" className="ml-1.5 text-xs px-1 py-0 text-red-600 border-red-200 bg-red-50">
                              {order.daysSinceOrdered}d
                            </Badge>
                          )}
                        </div>
                      </div>
                      <LabOrderReceiveButton orderId={order.id} />
                    </div>
                  ))}
                </div>
                {pendingOrders.length > 5 && (
                  <Link href="/lab-orders?status=ORDERED" className="text-xs text-primary hover:underline mt-1 block">
                    +{pendingOrders.length - 5} more →
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Lab Order Dialog */}
      {orderTarget && (
        <LabOrderDialog
          key={orderTarget.patientId}
          open={orderDialogOpen}
          onOpenChange={(open) => {
            setOrderDialogOpen(open);
            if (!open) setOrderTarget(null);
          }}
          patientId={orderTarget.patientId}
          patientName={orderTarget.patientName}
          patientCode={orderTarget.patientCode}
          labs={labs}
          defaultPlanItemId={orderTarget.defaultPlanItemId}
          defaultToothNumbers={orderTarget.defaultToothNumbers}
        />
      )}
    </>
  );
}
