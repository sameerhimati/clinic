import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const clinic = await prisma.clinicSettings.findFirst();

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-2xl font-bold">Settings</h2>

      <Card>
        <CardHeader>
          <CardTitle>Clinic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{clinic?.name || "Not set"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Address</span>
            <span className="font-medium text-right">
              {[clinic?.addressLine1, clinic?.addressLine2, clinic?.addressLine3]
                .filter(Boolean)
                .join(", ")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">City</span>
            <span className="font-medium">{clinic?.city} - {clinic?.pincode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Phone</span>
            <span className="font-medium">{clinic?.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{clinic?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version</span>
            <span className="font-medium">{clinic?.appVersion}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Database Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <DatabaseStats />
        </CardContent>
      </Card>
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
      <StatRow label="Patients" value={patients} />
      <StatRow label="Visits" value={visits} />
      <StatRow label="Receipts" value={receipts} />
      <StatRow label="Doctors" value={doctors} />
      <StatRow label="Operations" value={operations} />
    </>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value.toLocaleString()}</span>
    </div>
  );
}
