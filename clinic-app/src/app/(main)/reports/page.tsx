import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, AlertCircle, FileText, Receipt, FlaskConical, Percent, UserCheck, Users, Shield } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { canSeeReports, canSeePatientDirectory } from "@/lib/permissions";

type ReportItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  adminOnly?: boolean;
};

const reports: ReportItem[] = [
  {
    href: "/reports/commission",
    icon: BarChart3,
    title: "Doctor Commission",
    description: "Payments, lab costs, TDS & net payable by doctor",
  },
  {
    href: "/reports/outstanding",
    icon: AlertCircle,
    title: "Outstanding Dues",
    description: "Unpaid balances by patient, visit & doctor",
  },
  {
    href: "/reports/operations",
    icon: FileText,
    title: "Operations Report",
    description: "Procedures by date range, doctor & operation type",
  },
  {
    href: "/reports/receipts",
    icon: Receipt,
    title: "Receipts Report",
    description: "Payments by date range & payment mode",
  },
  {
    href: "/reports/lab",
    icon: FlaskConical,
    title: "Lab Report",
    description: "Lab work by date range & lab",
  },
  {
    href: "/reports/discount",
    icon: Percent,
    title: "Discount Report",
    description: "Cases with discounts by date range",
  },
  {
    href: "/reports/doctor-patients",
    icon: UserCheck,
    title: "Doctor-Patient Report",
    description: "Patients seen by a specific doctor",
  },
  {
    href: "/reports/doctor-activity",
    icon: BarChart3,
    title: "Doctor Activity",
    description: "Procedures & revenue by doctor per month",
  },
  {
    href: "/reports/patients",
    icon: Users,
    title: "Patient Directory",
    description: "Full patient listing with contact & visit info",
    adminOnly: true,
  },
  {
    href: "/reports/audit",
    icon: Shield,
    title: "Audit Log",
    description: "Flagged actions: discounts, rate changes, plan modifications",
    adminOnly: true,
  },
];

export default async function ReportsPage() {
  const currentUser = await requireAuth();
  if (!canSeeReports(currentUser.permissionLevel)) {
    redirect("/dashboard");
  }
  const isAdminUser = canSeePatientDirectory(currentUser.permissionLevel);
  const visibleReports = reports.filter((r) => !r.adminOnly || isAdminUser);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Reports</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleReports.map((r) => (
          <Link key={r.href} href={r.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex items-center gap-3 pt-6">
                <r.icon className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-sm text-muted-foreground">{r.description}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
