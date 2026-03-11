"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  ArrowRight,
  Circle,
  CalendarDays,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  Link2,
} from "lucide-react";
import { formatDate, toTitleCase } from "@/lib/format";
import { TreatmentPlanCard, type TreatmentPlanData } from "@/components/treatment-plan-card";

export type ChainPlanData = TreatmentPlanData & {
  chainOrder: number | null;
  estimatedTotal: number | null;
  items: (TreatmentPlanData["items"][0] & {
    estimatedCost: number | null;
    estimatedLabCost: number | null;
    labRateName: string | null;
    scheduledDate: Date | null;
  })[];
};

export type TreatmentChainData = {
  id: number;
  title: string;
  toothNumbers: string | null;
  status: string;
  createdByName: string;
  plans: ChainPlanData[];
  patientId: number;
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function TreatmentChainCard({
  chain,
  isDoctor,
  permissionLevel,
  defaultExpanded = true,
}: {
  chain: TreatmentChainData;
  isDoctor?: boolean;
  permissionLevel?: number;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const level = permissionLevel ?? 0;
  const showCosts = level <= 3; // L1, L2, L3 see costs. L4 does not.

  const plans = [...chain.plans].sort(
    (a, b) => (a.chainOrder || 0) - (b.chainOrder || 0),
  );

  // Calculate chain total
  const chainTotal = plans.reduce(
    (sum, p) => sum + (p.estimatedTotal || 0),
    0,
  );

  // Count completed / total steps across all plans
  const totalSteps = plans.reduce((sum, p) => sum + p.items.length, 0);
  const completedSteps = plans.reduce(
    (sum, p) => sum + p.items.filter((i) => i.visitId !== null).length,
    0,
  );

  const statusBadge = {
    ACTIVE: {
      label: "Active",
      className: "bg-blue-50 text-blue-700 border-blue-200",
    },
    COMPLETED: {
      label: "Completed",
      className: "bg-green-50 text-green-700 border-green-200",
    },
    CANCELLED: {
      label: "Cancelled",
      className: "bg-muted text-muted-foreground",
    },
  }[chain.status] || { label: chain.status, className: "" };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-0.5 hover:bg-accent rounded shrink-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary shrink-0" />
                <CardTitle className="text-base">{chain.title}</CardTitle>
                {chain.toothNumbers && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-primary/5 border-primary/20"
                  >
                    #{chain.toothNumbers}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {completedSteps} of {totalSteps} steps across {plans.length}{" "}
                {plans.length === 1 ? "plan" : "plans"}
                {showCosts && chainTotal > 0 && (
                  <span className="ml-2 font-semibold text-primary">
                    {formatCurrency(chainTotal)} total
                  </span>
                )}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={statusBadge.className}>
            {statusBadge.label}
          </Badge>
        </div>

        {/* Combined progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{
              width: `${totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0}%`,
            }}
          />
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3 pt-0">
          {plans.map((plan, planIndex) => (
            <ChainPlanSection
              key={plan.id}
              plan={plan}
              planIndex={planIndex}
              showCosts={showCosts}
              isDoctor={isDoctor}
              permissionLevel={level}
              patientId={chain.patientId}
            />
          ))}

        </CardContent>
      )}
    </Card>
  );
}

function ChainPlanSection({
  plan,
  planIndex,
  showCosts,
  isDoctor,
  permissionLevel,
  patientId,
}: {
  plan: ChainPlanData;
  planIndex: number;
  showCosts: boolean;
  isDoctor?: boolean;
  permissionLevel: number;
  patientId: number;
}) {
  const items = [...plan.items].sort((a, b) => a.sortOrder - b.sortOrder);
  const completedCount = items.filter((i) => i.visitId !== null).length;
  const isComplete = completedCount >= items.length;

  return (
    <div className="rounded-lg border bg-card/50 p-3 space-y-2">
      {/* Plan header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5">
            {planIndex + 1}
          </span>
          <span className="text-sm font-medium">{plan.title}</span>
          <span className="text-xs text-muted-foreground">
            ({completedCount}/{items.length})
          </span>
        </div>
        {showCosts && plan.estimatedTotal ? (
          <span className="text-sm font-semibold text-muted-foreground">
            {formatCurrency(plan.estimatedTotal)}
          </span>
        ) : null}
      </div>

      {/* Steps list */}
      <div className="space-y-1">
        {items.map((item) => {
          const isItemCompleted = item.visitId !== null;
          const isNext =
            !isItemCompleted &&
            items.findIndex((i) => i.visitId === null) ===
              items.indexOf(item);

          return (
            <div key={item.id} className="flex items-start gap-2 text-sm">
              <div className="shrink-0 mt-0.5">
                {isItemCompleted ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : isNext ? (
                  <ArrowRight className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-muted-foreground/30" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span
                  className={
                    isItemCompleted
                      ? "text-foreground"
                      : isNext
                        ? "text-primary font-medium"
                        : "text-muted-foreground"
                  }
                >
                  {item.label}
                </span>

                {/* Cost inline */}
                {showCosts && item.estimatedCost ? (
                  <span className="text-xs text-muted-foreground ml-2">
                    {formatCurrency(item.estimatedCost)}
                  </span>
                ) : null}

                {/* Completed date */}
                {isItemCompleted && item.visitDate && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {item.visitId ? (
                      <Link
                        href={`/visits/${item.visitId}`}
                        className="text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {formatDate(item.visitDate)}
                      </Link>
                    ) : (
                      formatDate(item.visitDate)
                    )}
                  </span>
                )}

                {/* Scheduled date */}
                {!isItemCompleted && item.scheduledDate && (
                  <span className="text-xs text-muted-foreground ml-2">
                    → {formatDate(item.scheduledDate)}
                  </span>
                )}

                {/* Lab work badge */}
                {showCosts && item.labRateName && (
                  <span className="text-xs text-muted-foreground ml-2">
                    <FlaskConical className="inline h-3 w-3 mr-0.5" />
                    {item.labRateName}
                    {item.estimatedLabCost
                      ? ` ${formatCurrency(item.estimatedLabCost)}`
                      : ""}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Plan actions — schedule next */}
      {!isComplete && !isDoctor && plan.status === "ACTIVE" && (
        <div className="flex gap-2 pt-1">
          {(() => {
            const nextItem = items.find((i) => i.visitId === null);
            if (!nextItem) return null;
            const scheduleUrl = `/appointments/new?patientId=${patientId}${nextItem.assignedDoctorId ? `&doctorId=${nextItem.assignedDoctorId}` : ""}&reason=${encodeURIComponent(nextItem.label)}${nextItem.scheduledDate ? `&date=${new Date(nextItem.scheduledDate).toISOString().split("T")[0]}` : ""}&planItemId=${nextItem.id}`;
            return (
              <Button size="sm" variant="outline" asChild className="text-xs">
                <Link href={scheduleUrl}>
                  <CalendarDays className="mr-1 h-3 w-3" />
                  Schedule: {nextItem.label}
                </Link>
              </Button>
            );
          })()}
        </div>
      )}
    </div>
  );
}
