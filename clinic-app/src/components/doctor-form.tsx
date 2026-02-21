"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Designation = { id: number; name: string };

type DoctorData = {
  id: number;
  name: string;
  code: number | null;
  mobile: string | null;
  email: string | null;
  designationId: number | null;
  permissionLevel: number;
  commissionPercent: number;
  commissionRate: number | null;
  tdsPercent: number;
  password: string | null;
} | null;

export function DoctorForm({
  doctor,
  designations,
  action,
}: {
  doctor?: DoctorData;
  designations: Designation[];
  action: (formData: FormData) => Promise<void>;
}) {
  const isEdit = !!doctor;

  return (
    <form action={action} className="space-y-6 max-w-2xl">
      {isEdit && <input type="hidden" name="id" value={doctor.id} />}

      <Card>
        <CardHeader><CardTitle>Doctor Details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
            <Input name="name" required defaultValue={doctor?.name || ""} />
          </div>

          {isEdit && doctor.code != null && (
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={`#${doctor.code}`} disabled />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile</Label>
            <Input name="mobile" defaultValue={doctor?.mobile || ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input name="email" type="email" defaultValue={doctor?.email || ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="designationId">Designation</Label>
            <select
              name="designationId"
              defaultValue={doctor?.designationId || ""}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="">Select...</option>
              {designations.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="permissionLevel">Permission Level</Label>
            <select
              name="permissionLevel"
              defaultValue={doctor?.permissionLevel ?? 3}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="0">0 — SYSADM</option>
              <option value="1">1 — Admin</option>
              <option value="2">2 — Reception</option>
              <option value="3">3 — Doctor</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Commission & TDS</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="commissionPercent">Commission %</Label>
            <Input name="commissionPercent" type="number" step="0.01" min="0" max="100" defaultValue={doctor?.commissionPercent ?? 0} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commissionRate">Fixed Commission Rate (₹)</Label>
            <Input name="commissionRate" type="number" step="0.01" min="0" defaultValue={doctor?.commissionRate ?? ""} placeholder="Leave empty for percentage-based" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tdsPercent">TDS %</Label>
            <Input name="tdsPercent" type="number" step="0.01" min="0" max="100" defaultValue={doctor?.tdsPercent ?? 0} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Authentication</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input name="password" type="text" defaultValue={doctor?.password || ""} placeholder="Leave empty for no login access" />
            <p className="text-xs text-muted-foreground">Plain text password (legacy system). Leave empty to prevent login.</p>
          </div>
        </CardContent>
      </Card>

      <Button type="submit">{isEdit ? "Save Changes" : "Create Doctor"}</Button>
    </form>
  );
}
