"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
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
              defaultValue={patient?.mobile || ""}
              placeholder="10-digit mobile"
            />
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
