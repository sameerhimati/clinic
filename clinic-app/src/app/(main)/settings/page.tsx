import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { canManageSystem, canManageRates } from "@/lib/permissions";
import Link from "next/link";
import { Stethoscope, FlaskConical, Building2, ChevronRight, DoorOpen, FolderUp, CircleDot, Briefcase } from "lucide-react";
import { DefaultAdvanceForm } from "./default-advance-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const currentUser = await requireAuth();
  const isFullAdmin = canManageSystem(currentUser.permissionLevel);
  const canRates = canManageRates(currentUser.permissionLevel, currentUser.isSuperUser);

  // Must be either full admin or rate manager to see settings
  if (!isFullAdmin && !canRates) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }
  const clinic = isFullAdmin ? await prisma.clinicSettings.findFirst() : null;

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>

      <div className="grid gap-3">
          {/* Treatments & Labs — visible to rate managers (L1 + L2 super) */}
          {canRates && (
            <>
              <Link href="/settings/operations" className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent transition-colors">
                <div className="flex items-center gap-3">
                  <Stethoscope className="h-5 w-5 text-muted-foreground" />
                  <div className="font-medium">Treatments & Tariff</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>

              <Link href="/settings/labs" className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent transition-colors">
                <div className="flex items-center gap-3">
                  <FlaskConical className="h-5 w-5 text-muted-foreground" />
                  <div className="font-medium">Labs & Lab Rates</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </>
          )}

          {/* Corporate Partners — L1 + L2 */}
          {canRates && (
            <Link href="/settings/corporate" className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent transition-colors">
              <div className="flex items-center gap-3">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
                <div className="font-medium">Corporate Partners</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          )}

          {/* L1-only sections */}
          {isFullAdmin && (
            <>
              <Link href="/settings/findings" className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent transition-colors">
                <div className="flex items-center gap-3">
                  <CircleDot className="h-5 w-5 text-muted-foreground" />
                  <div className="font-medium">Dental Findings</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>

              <Link href="/settings/rooms" className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent transition-colors">
                <div className="flex items-center gap-3">
                  <DoorOpen className="h-5 w-5 text-muted-foreground" />
                  <div className="font-medium">Rooms</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>

              <Link href="/settings/bulk-upload" className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent transition-colors">
                <div className="flex items-center gap-3">
                  <FolderUp className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Bulk Upload</div>
                    <div className="text-sm text-muted-foreground">Import X-rays and scanned records</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </>
          )}
        </div>

      {/* Default Advance Amount — L1 + L2 super */}
      {canRates && clinic && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Advance Deposit</CardTitle>
          </CardHeader>
          <CardContent>
            <DefaultAdvanceForm currentAmount={clinic.defaultAdvance} />
          </CardContent>
        </Card>
      )}

      {/* Clinic Information — L1 only */}
      {isFullAdmin && clinic && <Card>
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
      </Card>}

      {/* Database Stats — L1 only */}
      {isFullAdmin && (
        <Card>
          <CardHeader><CardTitle>Database Stats</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <DatabaseStats />
          </CardContent>
        </Card>
      )}
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
      <SettingRow label="Treatments" value={operations.toLocaleString()} />
    </>
  );
}
