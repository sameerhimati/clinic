import { prisma } from "@/lib/db";

export async function calcEscrowDeposits(patientId: number): Promise<number> {
  const result = await prisma.patientPayment.aggregate({
    where: { patientId },
    _sum: { amount: true },
  });
  return result._sum.amount || 0;
}

export async function calcEscrowBalance(patientId: number): Promise<number> {
  return calcEscrowDeposits(patientId);
}

export async function getEscrowSummary(patientId: number) {
  const [deposits, recentPayments] = await Promise.all([
    calcEscrowDeposits(patientId),
    prisma.patientPayment.findMany({
      where: { patientId },
      orderBy: { paymentDate: "desc" },
      take: 10,
      include: {
        createdBy: { select: { name: true } },
      },
    }),
  ]);

  return {
    deposits,
    balance: deposits,
    recentPayments,
  };
}

export async function hasEscrowPayments(patientId: number): Promise<boolean> {
  const count = await prisma.patientPayment.count({
    where: { patientId },
    take: 1,
  });
  return count > 0;
}
