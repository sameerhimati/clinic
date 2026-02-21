"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

type Patient = { id: number; name: string; legacyCode: number | null };
type Operation = { id: number; name: string; category: string | null; defaultMinFee: number | null };
type Doctor = { id: number; name: string; commissionPercent: number };
type Lab = { id: number; name: string; rates: { id: number; itemName: string; rate: number }[] };

export function VisitForm({
  patients,
  operations,
  doctors,
  labs,
  defaultPatientId,
  action,
}: {
  patients: Patient[];
  operations: Operation[];
  doctors: Doctor[];
  labs: Lab[];
  defaultPatientId?: number;
  action: (formData: FormData) => Promise<void>;
}) {
  const [selectedLabId, setSelectedLabId] = useState<number | null>(null);
  const [operationRate, setOperationRate] = useState("");

  const selectedLab = labs.find((l) => l.id === selectedLabId);

  // Group operations by category
  const categories = new Map<string, typeof operations>();
  for (const op of operations) {
    const cat = op.category || "Other";
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(op);
  }

  return (
    <form action={action} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Visit Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="patientId">
              Patient <span className="text-destructive">*</span>
            </Label>
            <select
              name="patientId"
              required
              defaultValue={defaultPatientId || ""}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="">Select patient...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.legacyCode ? `(#${p.legacyCode})` : ""}
                </option>
              ))}
            </select>
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
            <select
              name="operationId"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              onChange={(e) => {
                const op = operations.find((o) => o.id === parseInt(e.target.value));
                if (op?.defaultMinFee) setOperationRate(op.defaultMinFee.toString());
              }}
            >
              <option value="">Select procedure...</option>
              {Array.from(categories.entries()).map(([cat, ops]) => (
                <optgroup key={cat} label={cat}>
                  {ops.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.name}
                      {op.defaultMinFee ? ` (₹${op.defaultMinFee})` : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="operationRate">Amount (₹)</Label>
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

          <div className="space-y-2">
            <Label htmlFor="discount">Discount (₹)</Label>
            <Input
              name="discount"
              type="number"
              step="0.01"
              min="0"
              defaultValue="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doctorId">Doctor</Label>
            <select
              name="doctorId"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="">Select doctor...</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.commissionPercent > 0 ? ` (${d.commissionPercent}%)` : ""}
                </option>
              ))}
            </select>
          </div>

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
        </CardContent>
      </Card>

      {/* Lab Details */}
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
                    {lr.itemName} {lr.rate > 0 ? `(₹${lr.rate})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="labRateAmount">Lab Rate (₹)</Label>
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

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea name="notes" rows={3} placeholder="Visit notes..." />
        </CardContent>
      </Card>

      <Button type="submit">Create Visit</Button>
    </form>
  );
}
