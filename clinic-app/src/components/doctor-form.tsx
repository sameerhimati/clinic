"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toTitleCase } from "@/lib/format";

type Designation = { id: number; name: string };
type RoomOption = { id: number; name: string };

const SPECIALTIES = [
  "General",
  "Endodontist",
  "Prosthodontist",
  "Oral Surgeon",
  "Orthodontist",
  "Pedodontist",
  "Periodontist",
];

type DoctorData = {
  id: number;
  name: string;
  code: number | null;
  mobile: string | null;
  email: string | null;
  designationId: number | null;
  specialty: string | null;
  defaultRoomId: number | null;
  permissionLevel: number;
  commissionPercent: number;
  commissionRate: number | null;
  tdsPercent: number;
  isConsultant: boolean;
  password: string | null;
} | null;

export function DoctorForm({
  doctor,
  designations,
  rooms,
  action,
}: {
  doctor?: DoctorData;
  designations: Designation[];
  rooms?: RoomOption[];
  action: (formData: FormData) => Promise<void>;
}) {
  const isEdit = !!doctor;
  const [isPending, startTransition] = useTransition();

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

  return (
    <form action={handleSubmit} className="space-y-6 max-w-2xl">
      {isEdit && <input type="hidden" name="id" value={doctor.id} />}

      <Card>
        <CardHeader><CardTitle>Doctor Details</CardTitle></CardHeader>
        <CardContent className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
            <Input name="name" required defaultValue={doctor?.name || ""} />
          </div>

          {isEdit && doctor.code != null && (
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input value={`#${doctor.code}`} disabled />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="mobile">Mobile</Label>
            <Input name="mobile" defaultValue={doctor?.mobile || ""} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input name="email" type="email" defaultValue={doctor?.email || ""} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="designationId">Designation</Label>
            <select
              id="designationId"
              name="designationId"
              defaultValue={doctor?.designationId || ""}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Select...</option>
              {designations.map((d) => (
                <option key={d.id} value={d.id}>{toTitleCase(d.name)}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="permissionLevel">Role</Label>
            <select
              id="permissionLevel"
              name="permissionLevel"
              defaultValue={doctor?.permissionLevel ?? 3}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="0">SysAdmin</option>
              <option value="1">Admin</option>
              <option value="2">Reception</option>
              <option value="3">Doctor</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="specialty">Specialty</Label>
            <select
              id="specialty"
              name="specialty"
              defaultValue={doctor?.specialty || ""}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Select...</option>
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {rooms && rooms.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="defaultRoomId">Default Room</Label>
              <select
                id="defaultRoomId"
                name="defaultRoomId"
                defaultValue={doctor?.defaultRoomId || ""}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">No default room</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="sm:col-span-2 flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isConsultant"
              name="isConsultant"
              defaultChecked={doctor?.isConsultant ?? false}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <Label htmlFor="isConsultant" className="font-normal">Visiting Consultant</Label>
            <span className="text-xs text-muted-foreground">(receives per-procedure fees)</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Commission & TDS</CardTitle></CardHeader>
        <CardContent className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="commissionPercent">Commission %</Label>
            <Input name="commissionPercent" type="number" step="0.01" min="0" max="100" defaultValue={doctor?.commissionPercent ?? 0} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="commissionRate">Fixed Commission Rate (₹)</Label>
            <Input name="commissionRate" type="number" step="0.01" min="0" defaultValue={doctor?.commissionRate ?? ""} placeholder="Leave empty for percentage-based" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tdsPercent">TDS %</Label>
            <Input name="tdsPercent" type="number" step="0.01" min="0" max="100" defaultValue={doctor?.tdsPercent ?? 0} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Authentication</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input name="password" type="password" defaultValue={isEdit ? "" : ""} placeholder={isEdit ? "Leave blank to keep current" : "Leave empty for no login access"} />
            <p className="text-xs text-muted-foreground">Plain text password (legacy system). Leave empty to prevent login.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" asChild>
          <Link href="/doctors">Cancel</Link>
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : (isEdit ? "Save Changes" : "Create Doctor")}
        </Button>
      </div>
    </form>
  );
}
