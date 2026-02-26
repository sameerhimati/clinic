"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useTransition, useRef, useEffect } from "react";
import { toast } from "sonner";
import { PatientSearch } from "@/components/patient-search";
import { X, Search, Check, ChevronsUpDown } from "lucide-react";

type SelectedPatient = { id: number; name: string; code: number | null; salutation: string | null };
type Operation = { id: number; name: string; category: string | null; defaultMinFee: number | null };
type Doctor = { id: number; name: string; commissionPercent: number };
type Lab = { id: number; name: string; rates: { id: number; itemName: string; rate: number }[] };

type ParentVisit = {
  id: number;
  caseNo: number | null;
  patientId: number;
  operationId: number | null;
  operationName: string | null;
  doctorId: number | null;
  doctorName: string | null;
};

function OperationCombobox({
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

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Group operations by category, filtered by search
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
          {selected ? selected.name : "Search procedures..."}
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
              <div className="py-4 text-center text-sm text-muted-foreground">No procedures found</div>
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
                    <Check className={`h-3.5 w-3.5 ${selectedId === op.id ? "opacity-100" : "opacity-0"}`} />
                    <span>{op.name}</span>
                    {op.defaultMinFee ? (
                      <span className="ml-auto text-xs text-muted-foreground">{"\u20B9"}{op.defaultMinFee}</span>
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
  const [operationRate, setOperationRate] = useState(isFollowUp ? "0" : "");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await action(formData);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  const selectedLab = labs.find((l) => l.id === selectedLabId);

  // Group operations by category (for non-combobox select fallback)
  const categories = new Map<string, typeof operations>();
  for (const op of operations) {
    const cat = op.category || "Other";
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(op);
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Hidden fields */}
      {appointmentId && (
        <input type="hidden" name="appointmentId" value={appointmentId} />
      )}
      {isFollowUp && (
        <>
          <input type="hidden" name="visitType" value="FOLLOWUP" />
          <input type="hidden" name="parentVisitId" value={parentVisit.id} />
        </>
      )}
      {!isFollowUp && <input type="hidden" name="visitType" value="NEW" />}

      {/* Doctor auto-set for L3 */}
      {isDoctor && defaultDoctorId && (
        <input type="hidden" name="doctorId" value={defaultDoctorId} />
      )}

      {/* Amount auto-set for L3 */}
      {isDoctor && (
        <input type="hidden" name="operationRate" value={operationRate || "0"} />
      )}

      {/* Discount defaults to 0 for L3 */}
      {isDoctor && (
        <input type="hidden" name="discount" value="0" />
      )}

      {/* Follow-up banner */}
      {isFollowUp && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-100">Follow-up</Badge>
            <span className="text-sm font-medium">
              Case #{parentVisit.caseNo} — {parentVisit.operationName || "Visit"}
              {parentVisit.doctorName && ` \u00b7 Dr. ${parentVisit.doctorName}`}
            </span>
          </div>
          {!isDoctor && (
            <p className="text-xs text-muted-foreground mt-1">
              Rate defaults to 0 for follow-ups (included in original price). Change if this step is billed separately.
            </p>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Visit Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {isFollowUp && (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="stepLabel">Step Description</Label>
              <Input
                name="stepLabel"
                placeholder="e.g., Impression, Crown Prep, Suture Removal"
              />
              <p className="text-xs text-muted-foreground">Optional label shown in the treatment timeline</p>
            </div>
          )}

          <div className="space-y-2 sm:col-span-2">
            <Label>
              Patient <span className="text-destructive">*</span>
            </Label>
            {selectedPatient && (
              <input type="hidden" name="patientId" value={selectedPatient.id} />
            )}
            {(isFollowUp || isDoctor) && selectedPatient ? (
              /* Locked patient badge — no change button for follow-ups or doctors */
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
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPatient(null)}
                >
                  <X className="h-3 w-3 mr-1" />
                  Change
                </Button>
              </div>
            ) : (
              <PatientSearch onSelect={setSelectedPatient} />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="visitDate">Visit Date</Label>
            <Input
              name="visitDate"
              type="date"
              defaultValue={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="operationId">Operation/Procedure</Label>
            <OperationCombobox
              operations={operations}
              defaultOperationId={defaultOperationId || undefined}
              onSelect={(op) => {
                if (!isFollowUp && op?.defaultMinFee) {
                  setOperationRate(op.defaultMinFee.toString());
                }
              }}
            />
          </div>

          {/* Amount — hidden for doctors */}
          {!isDoctor && (
            <div className="space-y-2">
              <Label htmlFor="operationRate">Amount ({"\u20B9"})</Label>
              <Input
                name="operationRate"
                type="number"
                step="0.01"
                min="0"
                value={operationRate}
                onChange={(e) => setOperationRate(e.target.value)}
                placeholder="0.00"
              />
            </div>
          )}

          {/* Discount — hidden for doctors */}
          {!isDoctor && (
            <div className="space-y-2">
              <Label htmlFor="discount">Discount ({"\u20B9"})</Label>
              <Input
                name="discount"
                type="number"
                step="0.01"
                min="0"
                defaultValue="0"
              />
            </div>
          )}

          {/* Doctor dropdown — hidden for doctors (auto-set via hidden input above) */}
          {!isDoctor && (
            <div className="space-y-2">
              <Label htmlFor="doctorId">Doctor</Label>
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
          )}

          {/* Assisting Doctor — hidden for doctors */}
          {!isDoctor && (
            <div className="space-y-2">
              <Label htmlFor="assistingDoctorId">Assisting Doctor</Label>
              <select
                name="assistingDoctorId"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">None</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lab Details — hidden for doctors */}
      {!isDoctor && (
        <Card>
          <CardHeader>
            <CardTitle>Lab Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="labId">Lab</Label>
              <select
                name="labId"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                onChange={(e) => setSelectedLabId(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">None</option>
                {labs.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedLab && (
              <div className="space-y-2">
                <Label htmlFor="labRateId">Lab Item</Label>
                <select
                  name="labRateId"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="">Select item...</option>
                  {selectedLab.rates.map((lr) => (
                    <option key={lr.id} value={lr.id}>
                      {lr.itemName} {lr.rate > 0 ? `(\u20B9${lr.rate})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="labRateAmount">Lab Rate ({"\u20B9"})</Label>
              <Input
                name="labRateAmount"
                type="number"
                step="0.01"
                min="0"
                defaultValue="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="labQuantity">Lab Quantity</Label>
              <Input
                name="labQuantity"
                type="number"
                min="1"
                defaultValue="1"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea name="notes" rows={3} placeholder="Visit notes..." />
        </CardContent>
      </Card>

      <Button type="submit" disabled={isPending}>{isPending ? "Creating..." : (isFollowUp ? "Create Follow-up Visit" : "Create Visit")}</Button>
    </form>
  );
}
