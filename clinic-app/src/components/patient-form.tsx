"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { toast } from "sonner";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dateToString } from "@/lib/validations";
import { AlertTriangle } from "lucide-react";

type Disease = { id: number; name: string };
type Patient = {
  id: number;
  salutation: string | null;
  name: string;
  fatherHusbandName: string | null;
  dateOfBirth: Date | null;
  ageAtRegistration: number | null;
  gender: string | null;
  bloodGroup: string | null;
  occupation: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  addressLine3: string | null;
  city: string | null;
  pincode: string | null;
  referringPhysician: string | null;
  physicianPhone: string | null;
  remarks: string | null;
  diseases?: { diseaseId: number }[];
};

export function PatientForm({
  diseases,
  patient,
  action,
}: {
  diseases: Disease[];
  patient?: Patient;
  action: (formData: FormData) => Promise<void>;
}) {
  const patientDiseaseIds = patient?.diseases?.map((d) => d.diseaseId) || [];
  const [isPending, startTransition] = useTransition();

  const [age, setAge] = useState<string>(
    patient?.ageAtRegistration?.toString() || ""
  );

  const [mobile, setMobile] = useState(patient?.mobile || "");
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [duplicatePatient, setDuplicatePatient] = useState<{
    id: number;
    code: number | null;
    name: string;
  } | null>(null);
  const dupCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function normalizeMobile(raw: string): string {
    return raw.replace(/[\s\-()\/]/g, "");
  }

  function validateMobile(raw: string): string | null {
    const digits = normalizeMobile(raw);
    if (!digits) return null;
    if (!/^\d+$/.test(digits)) return "Only digits allowed";
    if (digits.length !== 10) return "Must be 10 digits";
    if (!/^[6-9]/.test(digits)) return "Must start with 6, 7, 8, or 9";
    return null;
  }

  const checkDuplicate = useCallback(
    (raw: string) => {
      if (dupCheckTimer.current) clearTimeout(dupCheckTimer.current);
      setDuplicatePatient(null);
      const digits = normalizeMobile(raw);
      if (digits.length < 10) return;
      dupCheckTimer.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/patients/search?q=${digits}`);
          const data = await res.json();
          const match = data.patients?.find(
            (p: { id: number; mobile: string | null }) =>
              p.mobile && normalizeMobile(p.mobile) === digits && p.id !== patient?.id
          );
          if (match) setDuplicatePatient({ id: match.id, code: match.code, name: match.name });
        } catch { /* silently fail */ }
      }, 400);
    },
    [patient?.id]
  );

  function handleMobileChange(value: string) {
    setMobile(value);
    setMobileError(validateMobile(value));
    checkDuplicate(value);
  }

  function handleDobChange(dateStr: string) {
    if (!dateStr) return;
    const dob = new Date(dateStr);
    const today = new Date();
    let years = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) years--;
    if (years >= 0 && years <= 150) setAge(years.toString());
  }

  function handleSubmit(formData: FormData) {
    const err = validateMobile(formData.get("mobile") as string);
    if (err) { setMobileError(err); toast.error(`Mobile: ${err}`); return; }
    startTransition(async () => {
      try { await action(formData); }
      catch (e) { if (isRedirectError(e)) throw e; toast.error(e instanceof Error ? e.message : "Something went wrong"); }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">

      {/* ── Personal Details ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-[120px_1fr]">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <select
                name="salutation"
                defaultValue={patient?.salutation || ""}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20 focus-visible:border-ring"
              >
                <option value="">—</option>
                {["Mr", "Mrs", "Ms", "Baby", "Master", "Dr"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Full Name <span className="text-destructive/70">*</span></Label>
              <Input name="name" required defaultValue={patient?.name || ""} placeholder="Patient name" />
            </div>
          </div>

          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Father / Husband</Label>
              <Input name="fatherHusbandName" defaultValue={patient?.fatherHusbandName || ""} />
            </div>
            <div className="space-y-1.5">
              <Label>Mobile <span className="text-destructive/70">*</span></Label>
              <Input
                name="mobile" type="tel" required value={mobile}
                onChange={(e) => handleMobileChange(e.target.value)}
                placeholder="10-digit mobile"
                className={mobileError ? "border-destructive" : ""}
              />
              {mobileError && <p className="text-xs text-destructive mt-1">{mobileError}</p>}
              {duplicatePatient && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-amber-900">Possible duplicate</p>
                      <p className="text-xs text-amber-800">
                        This mobile number is already registered to{" "}
                        <Link href={`/patients/${duplicatePatient.id}`} className="font-medium underline" target="_blank">
                          #{duplicatePatient.code} {duplicatePatient.name}
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Date of Birth</Label>
              <Input
                name="dateOfBirth" type="date"
                defaultValue={patient?.dateOfBirth ? dateToString(new Date(patient.dateOfBirth)) : ""}
                onChange={(e) => handleDobChange(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Age</Label>
              <Input
                name="ageAtRegistration" type="number" min={0} max={150}
                value={age} onChange={(e) => setAge(e.target.value)} placeholder="—"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <select
                name="gender"
                defaultValue={patient?.gender || ""}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20 focus-visible:border-ring"
              >
                <option value="">—</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Blood Group</Label>
              <select
                name="bloodGroup"
                defaultValue={patient?.bloodGroup || ""}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20 focus-visible:border-ring"
              >
                <option value="">—</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Occupation</Label>
              <Input name="occupation" defaultValue={patient?.occupation || ""} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input name="phone" type="tel" defaultValue={patient?.phone || ""} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input name="email" type="email" defaultValue={patient?.email || ""} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Address ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Address Line 1</Label>
            <Input name="addressLine1" defaultValue={patient?.addressLine1 || ""} />
          </div>
          <div className="space-y-1.5">
            <Label>Address Line 2</Label>
            <Input name="addressLine2" defaultValue={patient?.addressLine2 || ""} />
          </div>
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Area / Landmark</Label>
              <Input name="addressLine3" defaultValue={patient?.addressLine3 || ""} />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input name="city" defaultValue={patient?.city || ""} />
            </div>
            <div className="space-y-1.5">
              <Label>Pincode</Label>
              <Input name="pincode" defaultValue={patient?.pincode || ""} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Medical History ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Medical History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-0">
            {diseases.map((disease) => (
              <label
                key={disease.id}
                htmlFor={`disease-${disease.id}`}
                className="flex items-center gap-2 cursor-pointer select-none rounded px-1.5 py-1 text-sm hover:bg-muted/40 transition-colors"
              >
                <Checkbox
                  id={`disease-${disease.id}`}
                  name="diseases"
                  value={disease.id.toString()}
                  defaultChecked={patientDiseaseIds.includes(disease.id)}
                  className="shrink-0"
                />
                <span>{disease.name}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Remarks ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Remarks</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea name="remarks" rows={2} defaultValue={patient?.remarks || ""} placeholder="Any additional notes..." />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" asChild>
          <Link href="/patients">Cancel</Link>
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? (patient ? "Updating..." : "Registering...")
            : (patient ? "Update Patient" : "Register Patient")}
        </Button>
      </div>
    </form>
  );
}
