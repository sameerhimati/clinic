"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChevronDown, X } from "lucide-react";
import { toast } from "sonner";
import { OperationCombobox, type Operation, type Doctor, type Lab } from "@/components/visit-form";
import { createQuickVisit } from "@/app/(main)/visits/actions";
import { todayString } from "@/lib/validations";

const DISCOUNT_TIERS = [
  { label: "No Discount", percent: 0, minLevel: 3 },
  { label: "10%", percent: 10, minLevel: 3 },
  { label: "15%", percent: 15, minLevel: 2 },
  { label: "20%", percent: 20, minLevel: 1 },
] as const;

function formatINR(amount: number): string {
  return amount.toLocaleString("en-IN");
}

type FollowUpContext = {
  rootVisitId: number;
  operationId?: number;
  operationName: string;
  doctorId: number | null;
  doctorName?: string | null;
  caseNo?: number | null;
};

export function QuickVisitSheet({
  open,
  onOpenChange,
  patientId,
  patientName,
  patientCode,
  operations,
  doctors,
  labs,
  permissionLevel,
  currentDoctorId,
  followUpContext,
  appointmentId,
  onCreated,
  totalPaid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: number;
  patientName: string;
  patientCode: number | null;
  operations: Operation[];
  doctors: Doctor[];
  labs: Lab[];
  permissionLevel: number;
  currentDoctorId: number;
  followUpContext?: FollowUpContext;
  appointmentId?: number;
  onCreated?: () => void;
  totalPaid?: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isDoctor = permissionLevel === 3;
  const isFollowUp = !!followUpContext;

  // Form state
  const [selectedOperationId, setSelectedOperationId] = useState<number | undefined>(
    followUpContext?.operationId
  );
  const [operationRate, setOperationRate] = useState(isFollowUp ? "0" : "");
  const [tariffRate, setTariffRate] = useState<number | null>(null);
  const [discount, setDiscount] = useState(0);
  const [selectedDiscountPercent, setSelectedDiscountPercent] = useState<number | null>(null);
  const [doctorId, setDoctorId] = useState<number | undefined>(
    isDoctor ? currentDoctorId : (followUpContext?.doctorId || undefined) as number | undefined
  );
  const [visitDate, setVisitDate] = useState(todayString());
  const [stepLabel, setStepLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [showLabSection, setShowLabSection] = useState(false);
  const [selectedLabId, setSelectedLabId] = useState<number | null>(null);
  const [labRateId, setLabRateId] = useState<number | null>(null);
  const [labRateAmount, setLabRateAmount] = useState("0");
  const [labQuantity, setLabQuantity] = useState("1");

  const selectedLab = labs.find((l) => l.id === selectedLabId);
  const rateNum = parseFloat(operationRate) || 0;

  function resetForm() {
    setSelectedOperationId(followUpContext?.operationId);
    setOperationRate(isFollowUp ? "0" : "");
    setTariffRate(null);
    setDiscount(0);
    setSelectedDiscountPercent(null);
    setDoctorId(isDoctor ? currentDoctorId : (followUpContext?.doctorId || undefined) as number | undefined);
    setVisitDate(todayString());
    setStepLabel("");
    setNotes("");
    setShowLabSection(false);
    setSelectedLabId(null);
    setLabRateId(null);
    setLabRateAmount("0");
    setLabQuantity("1");
  }

  async function handleSubmit(andExamine: boolean) {
    if (!selectedOperationId) {
      toast.error("Please select a treatment");
      return;
    }
    if (!isDoctor && !doctorId) {
      toast.error("Please select a doctor");
      return;
    }
    startTransition(async () => {
      try {
        const result = await createQuickVisit({
          patientId,
          operationId: selectedOperationId,
          operationRate: rateNum,
          discount,
          doctorId,
          visitDate,
          visitType: isFollowUp ? "FOLLOWUP" : "NEW",
          parentVisitId: followUpContext?.rootVisitId,
          stepLabel: stepLabel || undefined,
          notes: notes || undefined,
          labId: selectedLabId || undefined,
          labRateId: labRateId || undefined,
          labRateAmount: parseFloat(labRateAmount) || undefined,
          labQuantity: parseInt(labQuantity) || undefined,
          appointmentId,
        });

        toast.success(isFollowUp ? "Follow-up created" : "Visit created");
        resetForm();
        onOpenChange(false);

        if (andExamine) {
          router.push(`/visits/${result.visitId}/examine`);
        } else {
          onCreated?.();
          router.refresh();
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to create visit");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isFollowUp ? "Add Follow-up" : "New Visit"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* Patient badge */}
          <div>
            <Badge variant="secondary" className="text-sm py-1 px-3">
              <span className="font-mono mr-1">#{patientCode}</span>
              {patientName}
            </Badge>
          </div>

          {/* Follow-up context banner */}
          {isFollowUp && followUpContext && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-100 text-xs">Follow-up</Badge>
                <span className="text-sm font-medium">
                  {followUpContext.caseNo && `Case #${followUpContext.caseNo} — `}
                  {followUpContext.operationName}
                  {followUpContext.doctorName && ` · Dr. ${followUpContext.doctorName}`}
                </span>
              </div>
              {!isDoctor && (
                <p className="text-xs text-muted-foreground mt-1">
                  Rate defaults to ₹0 for follow-ups. Change if this step is billed separately.
                </p>
              )}
            </div>
          )}

          {/* Treatment picker */}
          <div className="space-y-1.5">
            <Label>Treatment <span className="text-destructive">*</span></Label>
            <OperationCombobox
              operations={operations}
              defaultOperationId={followUpContext?.operationId}
              onSelect={(op) => {
                setSelectedOperationId(op?.id);
                const fee = op?.defaultMinFee || null;
                setTariffRate(fee);
                if (!isFollowUp && fee) {
                  setOperationRate(fee.toString());
                }
                setDiscount(0);
                setSelectedDiscountPercent(null);
              }}
            />
          </div>

          {/* Step label for follow-ups */}
          {isFollowUp && (
            <div className="space-y-1.5">
              <Label>Step Label</Label>
              <Input
                value={stepLabel}
                onChange={(e) => setStepLabel(e.target.value)}
                placeholder="e.g., Impression, Crown Prep, Suture Removal"
              />
            </div>
          )}

          {/* Date */}
          <div className="space-y-1.5">
            <Label>Visit Date</Label>
            <Input
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
            />
          </div>

          {/* Rate + Discount */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Rate (₹)</Label>
              {isDoctor ? (
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold tabular-nums">
                    ₹{formatINR(rateNum)}
                  </span>
                  {tariffRate != null && tariffRate > 0 && (
                    <span className="text-xs text-muted-foreground">Tariff rate</span>
                  )}
                </div>
              ) : (
                <>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={operationRate}
                    onChange={(e) => {
                      setOperationRate(e.target.value);
                      setDiscount(0);
                      setSelectedDiscountPercent(null);
                    }}
                    placeholder="0"
                  />
                  {tariffRate != null && tariffRate > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Tariff: ₹{formatINR(tariffRate)}
                      {rateNum !== tariffRate && (
                        <button
                          type="button"
                          className="ml-2 text-primary hover:underline"
                          onClick={() => { setOperationRate(tariffRate.toString()); setDiscount(0); }}
                        >
                          Reset
                        </button>
                      )}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Discount selector */}
            {rateNum > 0 && (
              <div className="space-y-2">
                <Label>Discount</Label>
                <div className="flex flex-wrap gap-1.5">
                  {DISCOUNT_TIERS.map((tier) => {
                    const canUse = permissionLevel <= tier.minLevel;
                    const isSelected = selectedDiscountPercent === tier.percent;
                    return (
                      <button
                        key={tier.percent}
                        type="button"
                        disabled={!canUse}
                        onClick={() => {
                          setSelectedDiscountPercent(tier.percent);
                          setDiscount(Math.round(rateNum * tier.percent / 100));
                        }}
                        className={`inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : canUse
                              ? "border-input bg-background hover:bg-accent cursor-pointer"
                              : "border-input bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                        }`}
                      >
                        {tier.label}
                      </button>
                    );
                  })}
                </div>
                {discount > 0 && (
                  <div className="text-sm tabular-nums">
                    ₹{formatINR(rateNum)} — ₹{formatINR(discount)} = <span className="font-semibold">₹{formatINR(rateNum - discount)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Doctor selector — hidden for doctors */}
          {!isDoctor && (
            <div className="space-y-1.5">
              <Label>Doctor <span className="text-destructive">*</span></Label>
              <select
                value={doctorId || ""}
                onChange={(e) => setDoctorId(e.target.value ? parseInt(e.target.value) : undefined)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">Select doctor...</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Lab Work (collapsible) — hidden for doctors */}
          {!isDoctor && (
            <>
              {!showLabSection ? (
                <button
                  type="button"
                  onClick={() => setShowLabSection(true)}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                  Add Lab Work
                </button>
              ) : (
                <div className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Lab Work</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setShowLabSection(false);
                        setSelectedLabId(null);
                        setLabRateId(null);
                      }}
                    >
                      <X className="h-3 w-3 mr-1" /> Remove
                    </Button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Lab</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        onChange={(e) => {
                          setSelectedLabId(e.target.value ? parseInt(e.target.value) : null);
                          setLabRateId(null);
                        }}
                      >
                        <option value="">Select lab...</option>
                        {labs.map((l) => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                    </div>
                    {selectedLab && (
                      <div className="space-y-1.5">
                        <Label>Lab Item</Label>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                          onChange={(e) => {
                            const rateId = e.target.value ? parseInt(e.target.value) : null;
                            setLabRateId(rateId);
                            if (rateId && selectedLab) {
                              const rate = selectedLab.rates.find(r => r.id === rateId);
                              if (rate && rate.rate > 0) setLabRateAmount(rate.rate.toString());
                            }
                          }}
                        >
                          <option value="">Select item...</option>
                          {selectedLab.rates.map((lr) => (
                            <option key={lr.id} value={lr.id}>
                              {lr.itemName} {lr.rate > 0 ? `(₹${formatINR(lr.rate)})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label>Lab Rate (₹)</Label>
                      <Input type="number" step="1" min="0" value={labRateAmount} onChange={(e) => setLabRateAmount(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Qty</Label>
                      <Input type="number" min="1" value={labQuantity} onChange={(e) => setLabQuantity(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional visit notes..."
            />
          </div>

          {/* Minimum collection warning */}
          {(() => {
            if (!selectedOperationId || totalPaid === undefined) return null;
            const op = operations.find((o) => o.id === selectedOperationId);
            if (!op) return null;
            const minNeeded = (op.doctorFee || 0) + (op.labCostEstimate || 0);
            if (minNeeded <= 0 || totalPaid >= minNeeded) return null;
            const shortfall = minNeeded - totalPaid;
            return (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-medium">Minimum collection warning</p>
                <p className="text-xs mt-1">
                  This procedure needs at least ₹{minNeeded.toLocaleString("en-IN")} (doctor fee + lab cost).
                  Patient has paid ₹{totalPaid.toLocaleString("en-IN")} — short by ₹{shortfall.toLocaleString("en-IN")}.
                </p>
              </div>
            );
          })()}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            {isDoctor ? (
              <>
                <Button
                  onClick={() => handleSubmit(true)}
                  disabled={isPending}
                  className="flex-1"
                >
                  {isPending ? "Creating..." : "Create & Examine"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSubmit(false)}
                  disabled={isPending}
                >
                  Create Visit
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => handleSubmit(false)}
                  disabled={isPending}
                  className="flex-1"
                >
                  {isPending ? "Creating..." : "Create Visit"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSubmit(true)}
                  disabled={isPending}
                >
                  Create & Examine
                </Button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
