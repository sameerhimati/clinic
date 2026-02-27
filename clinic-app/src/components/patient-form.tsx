"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  // Age auto-compute from DOB
  const [age, setAge] = useState<string>(
    patient?.ageAtRegistration?.toString() || ""
  );

  // Mobile validation + duplicate check
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
    if (!digits) return null; // empty handled by required
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
          if (match) {
            setDuplicatePatient({
              id: match.id,
              code: match.code,
              name: match.name,
            });
          }
        } catch {
          // silently fail
        }
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
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      years--;
    }
    if (years >= 0 && years <= 150) {
      setAge(years.toString());
    }
  }

  function handleSubmit(formData: FormData) {
    // Client-side mobile validation before submit
    const mobileVal = formData.get("mobile") as string;
    const err = validateMobile(mobileVal);
    if (err) {
      setMobileError(err);
      toast.error(`Mobile: ${err}`);
      return;
    }
    startTransition(async () => {
      try {
        await action(formData);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="salutation">Salutation</Label>
            <Select name="salutation" defaultValue={patient?.salutation || ""}>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {["Mr", "Mrs", "Ms", "Baby", "Master", "Dr"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={patient?.name || ""}
              placeholder="Patient name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fatherHusbandName">Father/Husband Name</Label>
            <Input
              id="fatherHusbandName"
              name="fatherHusbandName"
              defaultValue={patient?.fatherHusbandName || ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              defaultValue={
                patient?.dateOfBirth
                  ? dateToString(new Date(patient.dateOfBirth))
                  : ""
              }
              onChange={(e) => handleDobChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ageAtRegistration">Age</Label>
            <Input
              id="ageAtRegistration"
              name="ageAtRegistration"
              type="number"
              min={0}
              max={150}
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select name="gender" defaultValue={patient?.gender || ""}>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Male</SelectItem>
                <SelectItem value="F">Female</SelectItem>
                <SelectItem value="O">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bloodGroup">Blood Group</Label>
            <Select name="bloodGroup" defaultValue={patient?.bloodGroup || ""}>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                  (bg) => (
                    <SelectItem key={bg} value={bg}>
                      {bg}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="occupation">Occupation</Label>
            <Input
              id="occupation"
              name="occupation"
              defaultValue={patient?.occupation || ""}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Details */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="mobile">
              Mobile <span className="text-destructive">*</span>
            </Label>
            <Input
              id="mobile"
              name="mobile"
              type="tel"
              required
              value={mobile}
              onChange={(e) => handleMobileChange(e.target.value)}
              placeholder="10-digit mobile"
              className={mobileError ? "border-destructive" : ""}
            />
            {mobileError && (
              <p className="text-xs text-destructive">{mobileError}</p>
            )}
            {duplicatePatient && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-amber-800">
                    This mobile is already registered to{" "}
                    <Link
                      href={`/patients/${duplicatePatient.id}`}
                      className="font-medium underline"
                      target="_blank"
                    >
                      #{duplicatePatient.code} {duplicatePatient.name}
                    </Link>
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={patient?.phone || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={patient?.email || ""}
            />
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="addressLine1">Address Line 1</Label>
            <Input
              id="addressLine1"
              name="addressLine1"
              defaultValue={patient?.addressLine1 || ""}
            />
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="addressLine2">Address Line 2</Label>
            <Input
              id="addressLine2"
              name="addressLine2"
              defaultValue={patient?.addressLine2 || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressLine3">Address Line 3</Label>
            <Input
              id="addressLine3"
              name="addressLine3"
              defaultValue={patient?.addressLine3 || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              name="city"
              defaultValue={patient?.city || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pincode">Pincode</Label>
            <Input
              id="pincode"
              name="pincode"
              defaultValue={patient?.pincode || ""}
            />
          </div>
        </CardContent>
      </Card>

      {/* Referring Physician */}
      <Card>
        <CardHeader>
          <CardTitle>Referring Physician</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="referringPhysician">Physician Name</Label>
            <Input
              id="referringPhysician"
              name="referringPhysician"
              defaultValue={patient?.referringPhysician || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="physicianPhone">Physician Phone</Label>
            <Input
              id="physicianPhone"
              name="physicianPhone"
              type="tel"
              defaultValue={patient?.physicianPhone || ""}
            />
          </div>
        </CardContent>
      </Card>

      {/* Medical History */}
      <Card>
        <CardHeader>
          <CardTitle>Medical History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2.5">
            {diseases.map((disease) => (
              <label
                key={disease.id}
                htmlFor={`disease-${disease.id}`}
                className="flex items-start gap-2 cursor-pointer text-sm min-h-[28px]"
              >
                <Checkbox
                  id={`disease-${disease.id}`}
                  name="diseases"
                  value={disease.id.toString()}
                  defaultChecked={patientDiseaseIds.includes(disease.id)}
                  className="mt-0.5 shrink-0"
                />
                <span className="leading-snug">{disease.name}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Remarks */}
      <Card>
        <CardHeader>
          <CardTitle>Remarks</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            name="remarks"
            rows={3}
            defaultValue={patient?.remarks || ""}
            placeholder="Clinical notes or remarks..."
          />
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>{isPending ? (patient ? "Updating..." : "Registering...") : (patient ? "Update Patient" : "Register Patient")}</Button>
      </div>
    </form>
  );
}
