/** Shared domain types — single source of truth for string enum values used across the app */

export type VisitType = "NEW" | "FOLLOWUP" | "REVIEW";

export type PaymentMode = "Cash" | "Card" | "UPI" | "NEFT" | "Cheque";

/** Human-readable role name for a permission level */
export function roleName(permissionLevel: number): string {
  switch (permissionLevel) {
    case 0: return "SysAdmin";
    case 1: return "Admin";
    case 2: return "Reception";
    case 3: return "Doctor";
    default: return `Level ${permissionLevel}`;
  }
}
