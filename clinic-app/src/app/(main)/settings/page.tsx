import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { canManageSystem } from "@/lib/permissions";
import Link from "next/link";
import { Stethoscope, FlaskConical, Building2, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const currentUser = await requireAuth();
  const isAdmin = canManageSystem(currentUser.permissionLevel);
  const clinic = await prisma.clinicSettings.findFirst();

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>

      {/* Admin-only links */}
      {isAdmin && (
        <div className="grid gap-3">
          <Link href="/settings/operations" className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent transition-colors">
            <div className="flex items-center gap-3">
              <Stethoscope className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Operations / Procedures</div>
                <div className="text-sm text-muted-foreground">Manage dental procedures and fee schedules</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link href="/settings/labs" className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent transition-colors">
            <div className="flex items-center gap-3">
              <FlaskConical className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Labs & Lab Rates</div>
                <div className="text-sm text-muted-foreground">Manage dental labs and their rate cards</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      )}

      {/* Clinic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Clinic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <SettingRow label="Name" value={clinic?.name || "Not set"} />
          <SettingRow label="Address" value={[clinic?.addressLine1, clinic?.addressLine2, clinic?.addressLine3].filter(Boolean).join(", ")} />
          <SettingRow label="City" value={`${clinic?.city || ""} - ${clinic?.pincode || ""}`} />
          <SettingRow label="Phone" value={clinic?.phone} />
          <SettingRow label="Email" value={clinic?.email} />
          <SettingRow label="Version" value={clinic?.appVersion} />
        </CardContent>
      </Card>

      {/* Database Stats */}
      <Card>
        <CardHeader><CardTitle>Database Stats</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <DatabaseStats />
        </CardContent>
      </Card>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}

async function DatabaseStats() {
  const [patients, visits, receipts, doctors, operations] = await Promise.all([
    prisma.patient.count(),
    prisma.visit.count(),
    prisma.receipt.count(),
    prisma.doctor.count(),
    prisma.operation.count(),
  ]);

  return (
    <>
      <SettingRow label="Patients" value={patients.toLocaleString()} />
      <SettingRow label="Visits" value={visits.toLocaleString()} />
      <SettingRow label="Receipts" value={receipts.toLocaleString()} />
      <SettingRow label="Doctors" value={doctors.toLocaleString()} />
      <SettingRow label="Operations" value={operations.toLocaleString()} />
    </>
  );
}
