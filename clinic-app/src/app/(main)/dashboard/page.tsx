import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Stethoscope,
  IndianRupee,
  AlertCircle,
  UserPlus,
  Plus,
  Receipt,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    todayVisits,
    todayReceipts,
    totalPatients,
    recentVisits,
    outstandingVisits,
  ] = await Promise.all([
    prisma.visit.count({
      where: { visitDate: { gte: today, lt: tomorrow } },
    }),
    prisma.receipt.aggregate({
      where: { receiptDate: { gte: today, lt: tomorrow } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.patient.count(),
    prisma.visit.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        patient: { select: { id: true, name: true, code: true } },
        operation: { select: { name: true } },
        doctor: { select: { name: true } },
        receipts: { select: { amount: true } },
      },
    }),
    prisma.visit.findMany({
      where: {
        operationRate: { gt: 0 },
      },
      include: {
        receipts: { select: { amount: true } },
        patient: { select: { name: true, id: true } },
      },
    }),
  ]);

  // Calculate outstanding
  let totalOutstanding = 0;
  let outstandingCount = 0;
  for (const visit of outstandingVisits) {
    const billed = (visit.operationRate || 0) - visit.discount;
    const paid = visit.receipts.reduce((s, r) => s + r.amount, 0);
    const balance = billed - paid;
    if (balance > 0) {
      totalOutstanding += balance;
      outstandingCount++;
    }
  }

  return {
    todayVisits,
    todayCollections: todayReceipts._sum.amount || 0,
    todayReceiptCount: todayReceipts._count,
    totalPatients,
    totalOutstanding,
    outstandingCount,
    recentVisits,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/patients/new">
            <UserPlus className="mr-2 h-4 w-4" />
            New Patient
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/visits/new">
            <Plus className="mr-2 h-4 w-4" />
            New Visit
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/receipts/new">
            <Receipt className="mr-2 h-4 w-4" />
            New Receipt
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Today&apos;s Visits
            </CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.todayVisits}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Today&apos;s Collections
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {"\u20B9"}{data.todayCollections.toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.todayReceiptCount} receipt(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Patients
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.totalPatients.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {"\u20B9"}{data.totalOutstanding.toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.outstandingCount} case(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Visits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.recentVisits.map((visit) => {
              const billed = (visit.operationRate || 0) - visit.discount;
              const paid = visit.receipts.reduce((s, r) => s + r.amount, 0);
              const balance = billed - paid;
              return (
                <div
                  key={visit.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex flex-col gap-0.5">
                    <Link
                      href={`/patients/${visit.patientId}`}
                      className="font-medium hover:underline flex items-center gap-2"
                    >
                      {visit.patient.code && (
                        <span className="font-mono text-sm text-muted-foreground">
                          #{visit.patient.code}
                        </span>
                      )}
                      {visit.patient.name}
                    </Link>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{visit.operation?.name || "N/A"}</span>
                      {visit.doctor && (
                        <>
                          <span>·</span>
                          <span>Dr. {visit.doctor.name}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>{format(new Date(visit.visitDate), "MMM d")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-medium">
                        {"\u20B9"}{billed.toLocaleString("en-IN")}
                      </div>
                      {balance > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          Due: {"\u20B9"}{balance.toLocaleString("en-IN")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Paid
                        </Badge>
                      )}
                    </div>
                    {balance > 0 && (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/patients/${visit.patient.id}/checkout`}>
                          Pay
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
