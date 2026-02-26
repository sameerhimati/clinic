import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, AlertCircle } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { canSeeReports } from "@/lib/permissions";

export default async function ReportsPage() {
  const currentUser = await requireAuth();
  if (!canSeeReports(currentUser.permissionLevel)) {
    redirect("/dashboard");
  }
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Reports</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/reports/commission">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-3 pt-6">
              <BarChart3 className="h-5 w-5 text-muted-foreground shrink-0" />
              <span className="font-medium">Doctor Commission</span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/reports/outstanding">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-3 pt-6">
              <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0" />
              <span className="font-medium">Outstanding Dues</span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
