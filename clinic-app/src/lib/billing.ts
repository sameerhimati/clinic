/** Shared billing calculation utilities — single source of truth for balance math */

type VisitLike = {
  operationRate: number | null;
  discount: number;
  quantity?: number;
};

type ReceiptLike = {
  amount: number;
};

/** Calculate the billed amount for a visit: (rate - discount) × quantity */
export function calcBilled(visit: VisitLike): number {
  const qty = visit.quantity ?? 1;
  return ((visit.operationRate || 0) - visit.discount) * qty;
}

/** Calculate total paid from a list of receipts */
export function calcPaid(receipts: ReceiptLike[]): number {
  return receipts.reduce((sum, r) => sum + r.amount, 0);
}

/** Calculate outstanding balance for a visit */
export function calcBalance(visit: VisitLike, receipts: ReceiptLike[]): number {
  return calcBilled(visit) - calcPaid(receipts);
}
