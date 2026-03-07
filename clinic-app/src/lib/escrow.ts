import { prisma } from "@/lib/db";

export async function calcEscrowDeposits(patientId: number): Promise<number> {
  const result = await prisma.patientPayment.aggregate({
    where: { patientId },
    _sum: { amount: true },
  });
  return result._sum.amount || 0;
}

export async function calcEscrowFulfilled(patientId: number): Promise<number> {
  const result = await prisma.escrowFulfillment.aggregate({
    where: { patientId },
    _sum: { amount: true },
  });
  return result._sum.amount || 0;
}

export async function calcEscrowBalance(patientId: number): Promise<number> {
  const [deposits, fulfilled] = await Promise.all([
    calcEscrowDeposits(patientId),
    calcEscrowFulfilled(patientId),
  ]);
  return deposits - fulfilled;
}

export async function getEscrowSummary(patientId: number) {
  const [deposits, fulfilled, recentPayments, recentFulfillments] = await Promise.all([
    calcEscrowDeposits(patientId),
    calcEscrowFulfilled(patientId),
    prisma.patientPayment.findMany({
      where: { patientId },
      orderBy: { paymentDate: "desc" },
      take: 10,
      include: {
        createdBy: { select: { name: true } },
      },
    }),
    prisma.escrowFulfillment.findMany({
      where: { patientId },
      orderBy: { fulfilledAt: "desc" },
      take: 10,
      include: {
        workDone: {
          include: { operation: { select: { name: true } } },
        },
        visit: { select: { caseNo: true } },
        doctor: { select: { name: true } },
      },
    }),
  ]);

  return {
    deposits,
    fulfilled,
    balance: deposits - fulfilled,
    recentPayments,
    recentFulfillments,
  };
}

export async function hasEscrowPayments(patientId: number): Promise<boolean> {
  const count = await prisma.patientPayment.count({
    where: { patientId },
    take: 1,
  });
  return count > 0;
}
