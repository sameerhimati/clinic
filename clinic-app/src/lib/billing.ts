/** Shared billing calculation utilities — single source of truth for balance math */

type VisitLike = {
  operationRate: number | null;
  discount: number;
};

type ReceiptLike = {
  amount: number;
};

/** Calculate the billed amount for a visit (rate minus discount) */
export function calcBilled(visit: VisitLike): number {
  return (visit.operationRate || 0) - visit.discount;
}

/** Calculate total paid from a list of receipts */
export function calcPaid(receipts: ReceiptLike[]): number {
  return receipts.reduce((sum, r) => sum + r.amount, 0);
}

/** Calculate outstanding balance for a visit */
export function calcBalance(visit: VisitLike, receipts: ReceiptLike[]): number {
  return calcBilled(visit) - calcPaid(receipts);
}
