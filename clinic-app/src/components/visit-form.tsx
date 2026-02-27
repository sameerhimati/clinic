"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useTransition, useRef, useEffect } from "react";
import { toast } from "sonner";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { PatientSearch } from "@/components/patient-search";
import Link from "next/link";
import { X, Search, Check, ChevronsUpDown, Lock } from "lucide-react";
import { todayString } from "@/lib/validations";

type SelectedPatient = { id: number; name: string; code: number | null; salutation: string | null };
export type Operation = { id: number; name: string; category: string | null; defaultMinFee: number | null };
export type Doctor = { id: number; name: string; commissionPercent: number };
export type Lab = { id: number; name: string; rates: { id: number; itemName: string; rate: number }[] };

type ParentVisit = {
  id: number;
  caseNo: number | null;
  patientId: number;
  operationId: number | null;
  operationName: string | null;
  doctorId: number | null;
  doctorName: string | null;
};

// --- Discount tiers by role ---
const DISCOUNT_TIERS = [
  { label: "No Discount", percent: 0, minLevel: 3 },
  { label: "10%", percent: 10, minLevel: 3 },
  { label: "15%", percent: 15, minLevel: 2 },
  { label: "20%", percent: 20, minLevel: 1 },
] as const;

function formatINR(amount: number): string {
  return amount.toLocaleString("en-IN");
}

// --- Operation Combobox ---
export function OperationCombobox({
  operations,
  defaultOperationId,
  onSelect,
}: {
  operations: Operation[];
  defaultOperationId?: number;
  onSelect: (op: Operation | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | undefined>(defaultOperationId);
  const ref = useRef<HTMLDivElement>(null);

  const selected = operations.find((o) => o.id === selectedId);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = operations.filter(
    (op) => op.name.toLowerCase().includes(search.toLowerCase())
  );
  const categories = new Map<string, Operation[]>();
  for (const op of filtered) {
    const cat = op.category || "Other";
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(op);
  }

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name="operationId" value={selectedId || ""} />
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm hover:bg-accent transition-colors"
      >
        <span className={selected ? "" : "text-muted-foreground"}>
          {selected
            ? `${selected.name}${selected.defaultMinFee ? ` — ₹${formatINR(selected.defaultMinFee)}` : ""}`
            : "Search treatments..."}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <div className="flex items-center border-b px-3">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to filter..."
              className="flex h-9 w-full bg-transparent px-2 py-1 text-sm outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <div className="py-4 text-center text-sm text-muted-foreground">No treatments found</div>
            )}
            {Array.from(categories.entries()).map(([cat, ops]) => (
              <div key={cat}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{cat}</div>
                {ops.map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer ${
                      selectedId === op.id ? "bg-accent" : ""
                    }`}
                    onClick={() => {
                      setSelectedId(op.id);
                      onSelect(op);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check className={`h-3.5 w-3.5 shrink-0 ${selectedId === op.id ? "opacity-100" : "opacity-0"}`} />
                    <span className="truncate">{op.name}</span>
                    {op.defaultMinFee != null && op.defaultMinFee > 0 ? (
                      <span className="ml-auto text-xs text-muted-foreground tabular-nums shrink-0">₹{formatINR(op.defaultMinFee)}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Discount Selector ---
function DiscountSelector({
  permissionLevel,
  rate,
  discount,
  onDiscountChange,
}: {
  permissionLevel: number;
  rate: number;
  discount: number;
  onDiscountChange: (amount: number, percent: number | null) => void;
}) {
  const [selectedPercent, setSelectedPercent] = useState<number | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const isAdmin = permissionLevel <= 1;

  function selectTier(percent: number) {
    setCustomMode(false);
    setSelectedPercent(percent);
    const amount = Math.round(rate * percent / 100);
    onDiscountChange(amount, percent);
  }

  const netAmount = rate - discount;

  return (
    <div className="space-y-2">
      <Label>Discount</Label>
      <div className="flex flex-wrap gap-1.5">
        {DISCOUNT_TIERS.map((tier) => {
          const canUse = permissionLevel <= tier.minLevel;
          const isSelected = !customMode && selectedPercent === tier.percent;
          return (
            <button
              key={tier.percent}
              type="button"
              disabled={!canUse}
              onClick={() => selectTier(tier.percent)}
              className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : canUse
                    ? "border-input bg-background hover:bg-accent cursor-pointer"
                    : "border-input bg-muted text-muted-foreground cursor-not-allowed opacity-50"
              }`}
            >
              {tier.label}
              {!canUse && <Lock className="h-3 w-3" />}
            </button>
          );
        })}
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setCustomMode(true);
              setSelectedPercent(null);
            }}
            className={`inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              customMode
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background hover:bg-accent cursor-pointer"
            }`}
          >
            Custom
          </button>
        )}
      </div>

      {customMode && (
        <Input
          type="number"
          min="0"
          max={rate}
          step="1"
          value={discount || ""}
          onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0, null)}
          placeholder="Flat ₹ amount"
          className="w-40"
        />
      )}

      {/* Hidden form field */}
      <input type="hidden" name="discount" value={discount} />

      {/* Summary line */}
      {rate > 0 && (
        <div className="flex items-center gap-2 text-sm tabular-nums">
          <span>₹{formatINR(rate)}</span>
          {discount > 0 && (
            <>
              <span className="text-muted-foreground">—</span>
              <span className="text-amber-600">
                ₹{formatINR(discount)}
                {selectedPercent ? ` (${selectedPercent}%)` : ""}
              </span>
              <span className="text-muted-foreground">=</span>
              <span className="font-semibold">₹{formatINR(netAmount)}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function VisitForm({
  operations,
  doctors,
  labs,
  defaultPatient,
  defaultDoctorId: propDefaultDoctorId,
  action,
  mode = "new",
  parentVisit,
  showInternalCosts = true,
  appointmentId,
  permissionLevel = 0,
}: {
  operations: Operation[];
  doctors: Doctor[];
  labs: Lab[];
  defaultPatient?: SelectedPatient | null;
  defaultDoctorId?: number;
  action: (formData: FormData) => Promise<void>;
  mode?: "new" | "followup";
  parentVisit?: ParentVisit | null;
  showInternalCosts?: boolean;
  appointmentId?: number;
  permissionLevel?: number;
}) {
  const isFollowUp = mode === "followup" && parentVisit;

  const defaultOperationId = isFollowUp ? parentVisit.operationId : undefined;
  const defaultDoctorId = isFollowUp ? parentVisit.doctorId : propDefaultDoctorId;

  const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(
    defaultPatient || null
  );
  const [operationRate, setOperationRate] = useState(isFollowUp ? "0" : "");
  const [tariffRate, setTariffRate] = useState<number | null>(null);
  const [discount, setDiscount] = useState(0);
  const [isPending, startTransition] = useTransition();

  // Set initial tariff for follow-up default operation
  useEffect(() => {
    if (isFollowUp && defaultOperationId) {
      const op = operations.find(o => o.id === defaultOperationId);
      if (op?.defaultMinFee) setTariffRate(op.defaultMinFee);
    }
  }, [isFollowUp, defaultOperationId, operations]);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await action(formData);
      } catch (e) {
        if (isRedirectError(e)) throw e;
        toast.error(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  const rateNum = parseFloat(operationRate) || 0;

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Hidden fields */}
      {appointmentId && <input type="hidden" name="appointmentId" value={appointmentId} />}
      {isFollowUp && (
        <>
          <input type="hidden" name="visitType" value="FOLLOWUP" />
          <input type="hidden" name="parentVisitId" value={parentVisit.id} />
        </>
      )}
      {!isFollowUp && <input type="hidden" name="visitType" value="NEW" />}
      {defaultDoctorId && <input type="hidden" name="doctorId" value={defaultDoctorId} />}
      <input type="hidden" name="operationRate" value={operationRate || "0"} />

      {/* Follow-up banner */}
      {isFollowUp && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-100 text-xs">Follow-up</Badge>
            <span className="text-sm font-medium">
              Case #{parentVisit.caseNo} — {parentVisit.operationName || "Visit"}
              {parentVisit.doctorName && ` · Dr. ${parentVisit.doctorName}`}
            </span>
          </div>
        </div>
      )}

      {/* Patient & Treatment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Patient & Treatment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Patient */}
          <div className="space-y-2">
            <Label>Patient <span className="text-destructive">*</span></Label>
            {selectedPatient && <input type="hidden" name="patientId" value={selectedPatient.id} />}
            {selectedPatient ? (
              <Badge variant="secondary" className="text-sm py-1 px-3">
                <span className="font-mono mr-1">#{selectedPatient.code}</span>
                {selectedPatient.salutation && `${selectedPatient.salutation}. `}
                {selectedPatient.name}
              </Badge>
            ) : (
              <PatientSearch onSelect={setSelectedPatient} />
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Treatment */}
            <div className="space-y-2 sm:col-span-2">
              <Label>Treatment <span className="text-destructive">*</span></Label>
              <OperationCombobox
                operations={operations}
                defaultOperationId={defaultOperationId || undefined}
                onSelect={(op) => {
                  const fee = op?.defaultMinFee || null;
                  setTariffRate(fee);
                  if (!isFollowUp && fee) {
                    setOperationRate(fee.toString());
                  }
                  setDiscount(0);
                }}
              />
            </div>

            {/* Step Label (follow-up only) */}
            {isFollowUp && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Step Label</Label>
                <Input name="stepLabel" placeholder="e.g., Impression, Crown Prep, Suture Removal" />
              </div>
            )}

            {/* Visit Date */}
            <div className="space-y-2">
              <Label>Visit Date <span className="text-destructive">*</span></Label>
              <Input
                name="visitDate"
                type="date"
                defaultValue={todayString()}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Rate (₹)</Label>
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold tabular-nums">
                  ₹{formatINR(rateNum)}
                </span>
                {tariffRate != null && tariffRate > 0 && (
                  <span className="text-xs text-muted-foreground">Tariff rate</span>
                )}
                {isFollowUp && (
                  <span className="text-xs text-muted-foreground">(₹0 default for follow-ups)</span>
                )}
              </div>
            </div>

            {rateNum > 0 && (
              <DiscountSelector
                permissionLevel={permissionLevel}
                rate={rateNum}
                discount={discount}
                onDiscountChange={(amount) => setDiscount(amount)}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea name="notes" rows={2} placeholder="Optional visit notes..." />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" asChild>
          <Link href={defaultPatient ? `/patients/${defaultPatient.id}` : "/dashboard"}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={isPending || !selectedPatient}>
          {isPending ? "Creating..." : (isFollowUp ? "Create Follow-up" : "Create Visit")}
        </Button>
      </div>
    </form>
  );
}
