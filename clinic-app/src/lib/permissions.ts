// Simple permission helpers
// Permission levels: 0=SYSADM, 1=Admin, 2=Reception, 3=Doctor

/** Can see payment tracking, receipts, collections, commissions, outstanding balances */
export function canSeePayments(permissionLevel: number): boolean {
  return permissionLevel <= 2;
}

/** Can edit patient demographics */
export function canEditPatients(permissionLevel: number): boolean {
  return permissionLevel <= 2;
}

/** Can manage system settings, doctors, operations, labs */
export function canManageSystem(permissionLevel: number): boolean {
  return permissionLevel <= 1;
}
