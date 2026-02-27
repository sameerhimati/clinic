"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useState, useTransition, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { PatientSearch } from "@/components/patient-search";
import Link from "next/link";
import { X, Search, Check, ChevronsUpDown, ChevronDown, Plus, Lock } from "lucide-react";
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
  const isDoctor = permissionLevel === 3;

  const defaultOperationId = isFollowUp ? parentVisit.operationId : undefined;
  const defaultDoctorId = isFollowUp ? parentVisit.doctorId : propDefaultDoctorId;

  const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(
    defaultPatient || null
  );
  const [selectedLabId, setSelectedLabId] = useState<number | null>(null);
  const [labRateAmount, setLabRateAmount] = useState("0");
  const [operationRate, setOperationRate] = useState(isFollowUp ? "0" : "");
  const [tariffRate, setTariffRate] = useState<number | null>(null);
  const [discount, setDiscount] = useState(0);
  const [showLabSection, setShowLabSection] = useState(false);
  const [showAssistingDoctor, setShowAssistingDoctor] = useState(false);
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

  const selectedLab = labs.find((l) => l.id === selectedLabId);
  const rateNum = parseFloat(operationRate) || 0;
  const rateDiffersFromTariff = tariffRate != null && tariffRate > 0 && rateNum !== tariffRate;

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
      {isDoctor && defaultDoctorId && <input type="hidden" name="doctorId" value={defaultDoctorId} />}
      {isDoctor && <input type="hidden" name="operationRate" value={operationRate || "0"} />}
      {isDoctor && <input type="hidden" name="discount" value="0" />}

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
          {!isDoctor && (
            <p className="text-xs text-muted-foreground mt-1">
              Rate defaults to ₹0 for follow-ups. Change if this step is billed separately.
            </p>
          )}
        </div>
      )}

      {/* --- Patient --- */}
      <div className="space-y-1.5">
        <Label>Patient <span className="text-destructive">*</span></Label>
        {selectedPatient && <input type="hidden" name="patientId" value={selectedPatient.id} />}
        {(isFollowUp || isDoctor) && selectedPatient ? (
          <Badge variant="secondary" className="text-sm py-1 px-3">
            <span className="font-mono mr-1">#{selectedPatient.code}</span>
            {selectedPatient.salutation && `${selectedPatient.salutation}. `}
            {selectedPatient.name}
          </Badge>
        ) : selectedPatient ? (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm py-1 px-3">
              <span className="font-mono mr-1">#{selectedPatient.code}</span>
              {selectedPatient.salutation && `${selectedPatient.salutation}. `}
              {selectedPatient.name}
            </Badge>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>
              <X className="h-3 w-3 mr-1" /> Change
            </Button>
          </div>
        ) : (
          <PatientSearch onSelect={setSelectedPatient} />
        )}
      </div>

      {/* --- Treatment + Rate + Discount --- */}
      <div className="rounded-lg border p-4 space-y-4">
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
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
                // Reset discount when treatment changes
                setDiscount(0);
              }}
            />
          </div>

          {isFollowUp && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Step Label</Label>
              <Input name="stepLabel" placeholder="e.g., Impression, Crown Prep, Suture Removal" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Visit Date <span className="text-destructive">*</span></Label>
            <Input
              name="visitDate"
              type="date"
              defaultValue={todayString()}
            />
          </div>
        </div>

        {/* Amount + Discount — hidden for doctors */}
        {!isDoctor && (
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Rate ({"\u20B9"})</Label>
              <div className="relative">
                <Input
                  name="operationRate"
                  type="number"
                  step="1"
                  min="0"
                  value={operationRate}
                  onChange={(e) => {
                    setOperationRate(e.target.value);
                    // Recalculate discount if a % was selected
                    setDiscount(0);
                  }}
                  placeholder="0"
                  className={rateDiffersFromTariff ? "border-amber-400 pr-20" : ""}
                />
                {tariffRate != null && tariffRate > 0 && (
                  <span
                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs tabular-nums cursor-pointer ${
                      rateDiffersFromTariff ? "text-amber-600 font-medium" : "text-muted-foreground"
                    }`}
                    title="Click to reset to tariff rate"
                    onClick={() => {
                      setOperationRate(tariffRate.toString());
                      setDiscount(0);
                    }}
                  >
                    Tariff: ₹{formatINR(tariffRate)}
                  </span>
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
        )}
      </div>

      {/* --- Doctor --- */}
      {!isDoctor && (
        <div className="space-y-3">
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Doctor</Label>
              <select
                name="doctorId"
                defaultValue={defaultDoctorId || ""}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">Select doctor...</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {showInternalCosts && d.commissionPercent > 0 ? ` (${d.commissionPercent}%)` : ""}
                  </option>
                ))}
              </select>
            </div>
            {showAssistingDoctor && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Assisting Doctor</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setShowAssistingDoctor(false)}
                  >
                    <X className="h-3 w-3 mr-1" /> Remove
                  </Button>
                </div>
                <select
                  name="assistingDoctorId"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="">None</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {!showAssistingDoctor && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAssistingDoctor(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Assisting Doctor
            </Button>
          )}
        </div>
      )}

      {/* --- Lab Work (collapsible) --- */}
      {!isDoctor && (
        <>
          {!showLabSection ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowLabSection(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Lab Work
            </Button>
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
                  }}
                >
                  <X className="h-3 w-3 mr-1" /> Remove
                </Button>
              </div>
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Lab</Label>
                  <select
                    name="labId"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    onChange={(e) => setSelectedLabId(e.target.value ? parseInt(e.target.value) : null)}
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
                      name="labRateId"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      onChange={(e) => {
                        if (!e.target.value || !selectedLab) return;
                        const rate = selectedLab.rates.find(r => r.id === parseInt(e.target.value));
                        if (rate && rate.rate > 0) {
                          setLabRateAmount(rate.rate.toString());
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
                  <Input name="labRateAmount" type="number" step="1" min="0" value={labRateAmount} onChange={(e) => setLabRateAmount(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Qty</Label>
                  <Input name="labQuantity" type="number" min="1" defaultValue="1" />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* --- Notes --- */}
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea name="notes" rows={2} placeholder="Optional visit notes..." />
      </div>

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
