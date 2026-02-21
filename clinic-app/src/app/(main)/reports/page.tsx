import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, AlertCircle } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { canSeePayments } from "@/lib/permissions";

export default async function ReportsPage() {
  const currentUser = await requireAuth();
  if (!canSeePayments(currentUser.permissionLevel)) {
    redirect("/dashboard");
  }
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Reports</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/reports/commission">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Doctor Commission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Commission calculation for doctors based on receipts, with TDS deduction.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/reports/outstanding">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Outstanding Dues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Patients with unpaid balances, filterable by date range and doctor.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
