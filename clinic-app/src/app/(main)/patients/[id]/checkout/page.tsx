import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { canCollectPayments } from "@/lib/permissions";
import { calcBilled, calcPaid } from "@/lib/billing";
import { calcEscrowDeposits } from "@/lib/escrow";
import { toTitleCase } from "@/lib/format";
import { CheckoutClient } from "./checkout-client";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patientId = parseInt(id);
  const currentUser = await requireAuth();

  if (!canCollectPayments(currentUser.permissionLevel)) {
    redirect(`/patients/${patientId}`);
  }

  // Use local midnight for date comparisons
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const [patient, todayVisits, escrowDeposits, doctors] = await Promise.all([
    prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, code: true, name: true },
    }),
    // Today's visits for this patient (completed appointments or recent visits)
    prisma.visit.findMany({
      where: {
        patientId,
        visitDate: { gte: todayStart, lt: tomorrowStart },
      },
      include: {
        operation: { select: { name: true } },
        doctor: { select: { id: true, name: true } },
        receipts: { select: { id: true, amount: true, receiptNo: true, paymentMode: true, receiptDate: true } },
        clinicalReports: { select: { id: true }, take: 1 },
      },
      orderBy: { visitDate: "desc" },
    }),
    calcEscrowDeposits(patientId),
    prisma.doctor.findMany({
      where: { isActive: true, permissionLevel: { gte: 3 } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!patient) notFound();

  // Get all-time financial summary
  const [allVisits, allReceiptsRaw] = await Promise.all([
    prisma.visit.findMany({
      where: { patientId, operationRate: { gt: 0 } },
      select: { operationRate: true, discount: true, quantity: true },
    }),
    prisma.receipt.aggregate({
      where: { visit: { patientId } },
      _sum: { amount: true },
    }),
  ]);

  const totalBilled = allVisits.reduce((sum, v) => sum + calcBilled(v), 0);
  const totalReceipts = allReceiptsRaw._sum.amount || 0;
  const totalCollected = totalReceipts + escrowDeposits;
  const outstanding = totalBilled - totalCollected;

  // Map today's visits
  const visits = todayVisits.map((v) => ({
    id: v.id,
    caseNo: v.caseNo,
    operationName: v.operation?.name || "Visit",
    doctorName: v.doctor ? toTitleCase(v.doctor.name) : null,
    billed: calcBilled(v),
    paid: calcPaid(v.receipts),
    hasReport: v.clinicalReports.length > 0,
    operationRate: v.operationRate || 0,
    discount: v.discount,
  }));

  return (
    <CheckoutClient
      patient={{
        id: patient.id,
        code: patient.code,
        name: toTitleCase(patient.name),
      }}
      todayVisits={visits}
      financials={{
        totalBilled,
        totalCollected,
        outstanding,
        escrowDeposits,
      }}
      doctors={doctors.map((d) => ({ id: d.id, name: toTitleCase(d.name) }))}
    />
  );
}
