"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Check,
  ArrowRight,
  Circle,
  CalendarDays,
  Edit,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { completePlan, cancelPlan } from "@/app/(main)/patients/[id]/plan/actions";
import { toast } from "sonner";

export type PlanItem = {
  id: number;
  sortOrder: number;
  label: string;
  operationId: number | null;
  operationName: string | null;
  assignedDoctorId: number | null;
  assignedDoctorName: string | null;
  estimatedDayGap: number;
  visitId: number | null;
  visitDate: Date | null;
  completedAt: Date | null;
  notes: string | null;
};

export type TreatmentPlanData = {
  id: number;
  title: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  createdByName: string;
  items: PlanItem[];
  patientId: number;
};

function estimateDate(items: PlanItem[], targetIndex: number): Date | null {
  // Find the last completed item before targetIndex
  let lastDate: Date | null = null;
  let lastIndex = -1;
  for (let i = targetIndex - 1; i >= 0; i--) {
    if (items[i].visitDate) {
      lastDate = new Date(items[i].visitDate!);
      lastIndex = i;
      break;
    }
  }
  if (!lastDate) return null;

  // Sum day gaps from lastIndex+1 to targetIndex
  let totalDays = 0;
  for (let i = lastIndex + 1; i <= targetIndex; i++) {
    totalDays += items[i].estimatedDayGap;
  }
  return addDays(lastDate, totalDays);
}

export function TreatmentPlanCard({
  plan,
  isDoctor,
  compact,
}: {
  plan: TreatmentPlanData;
  isDoctor?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const items = [...plan.items].sort((a, b) => a.sortOrder - b.sortOrder);
  const completedCount = items.filter((i) => i.visitId !== null).length;
  const totalCount = items.length;
  const nextItemIndex = items.findIndex((i) => i.visitId === null);
  const nextItem = nextItemIndex >= 0 ? items[nextItemIndex] : null;
  const nextEstimatedDate = nextItem ? estimateDate(items, nextItemIndex) : null;
  const isActive = plan.status === "ACTIVE";
  const isCompleted = plan.status === "COMPLETED";

  const statusBadge = {
    ACTIVE: { label: "Active", className: "bg-blue-50 text-blue-700 border-blue-200" },
    COMPLETED: { label: "Completed", className: "bg-green-50 text-green-700 border-green-200" },
    CANCELLED: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
  }[plan.status] || { label: plan.status, className: "" };

  async function handleComplete() {
    startTransition(async () => {
      try {
        await completePlan(plan.id);
        toast.success("Treatment plan marked complete");
        router.refresh();
      } catch {
        toast.error("Failed to update plan");
      }
    });
  }

  async function handleCancel() {
    startTransition(async () => {
      try {
        await cancelPlan(plan.id);
        toast.success("Treatment plan cancelled");
        router.refresh();
      } catch {
        toast.error("Failed to cancel plan");
      }
    });
  }

  // Build schedule URL for next step
  const scheduleUrl = nextItem
    ? `/appointments/new?patientId=${plan.patientId}${nextItem.assignedDoctorId ? `&doctorId=${nextItem.assignedDoctorId}` : ""}&reason=${encodeURIComponent(nextItem.label)}${nextEstimatedDate ? `&date=${format(nextEstimatedDate, "yyyy-MM-dd")}` : ""}&planItemId=${nextItem.id}`
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{plan.title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {completedCount} of {totalCount} steps
              {nextItem && nextEstimatedDate && (
                <> · Next: {nextItem.label} (~{format(nextEstimatedDate, "dd MMM")})</>
              )}
            </p>
          </div>
          <Badge variant="outline" className={statusBadge.className}>
            {statusBadge.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
          />
        </div>

        {/* Items list */}
        <div className="space-y-1 pt-1">
          {items.map((item, index) => {
            const isItemCompleted = item.visitId !== null;
            const isNext = index === nextItemIndex;
            const estimated = !isItemCompleted ? estimateDate(items, index) : null;

            return (
              <div key={item.id} className="flex items-start gap-2 text-sm">
                <div className="shrink-0 mt-0.5">
                  {isItemCompleted ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : isNext ? (
                    <ArrowRight className="h-4 w-4 text-primary" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/40" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className={`${isItemCompleted ? "text-foreground" : isNext ? "text-primary font-medium" : "text-muted-foreground"}`}
                  >
                    {item.label}
                  </span>
                  {/* Completed: show date + doctor */}
                  {isItemCompleted && item.visitDate && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {format(new Date(item.visitDate), "dd MMM")}
                      {item.assignedDoctorName && ` · Dr. ${item.assignedDoctorName}`}
                    </span>
                  )}
                  {/* Future: show estimated date + assigned doctor */}
                  {!isItemCompleted && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {estimated && `~${format(estimated, "dd MMM")}`}
                      {item.assignedDoctorName && ` · Dr. ${item.assignedDoctorName}`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        {isActive && (
          <div className="flex gap-2 flex-wrap pt-2 border-t mt-2">
            {scheduleUrl && (
              <Button size="sm" asChild>
                <Link href={scheduleUrl}>
                  <CalendarDays className="mr-1 h-3.5 w-3.5" />
                  Schedule: {nextItem!.label}
                </Link>
              </Button>
            )}
            <Button size="sm" variant="outline" asChild>
              <Link href={`/patients/${plan.patientId}/plan/${plan.id}/edit`}>
                <Edit className="mr-1 h-3.5 w-3.5" />
                Edit
              </Link>
            </Button>
            {completedCount >= totalCount && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleComplete}
                disabled={isPending}
                className="text-green-700 border-green-300 hover:bg-green-50"
              >
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                Mark Complete
              </Button>
            )}
            {completedCount < totalCount && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    disabled={isPending}
                  >
                    <XCircle className="mr-1 h-3.5 w-3.5" />
                    Cancel Plan
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel treatment plan?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This won&apos;t affect completed visits. The plan will be marked as
                      cancelled.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Plan</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancel}>
                      Yes, Cancel Plan
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}

        {/* Completed banner */}
        {isCompleted && (
          <div className="text-sm text-green-700 font-medium pt-2 border-t mt-2">
            All treatment steps completed
          </div>
        )}
      </CardContent>
    </Card>
  );
}
