// Simple permission helpers
// Permission levels: 0=SYSADM, 1=Admin, 2=Reception, 3=Doctor

/** Can view reports pages (commission, outstanding — shows other doctors' earnings) */
export function canSeeReports(permissionLevel: number): boolean {
  return permissionLevel <= 2;
}

/** Can see internal costs: lab costs, commission %, clinic margins */
export function canSeeInternalCosts(permissionLevel: number): boolean {
  return permissionLevel <= 2;
}

/** Can collect payments: checkout, receipt creation, "Collect" buttons */
export function canCollectPayments(permissionLevel: number): boolean {
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

/** Admin can unlock reports and visits */
export function isAdmin(permissionLevel: number): boolean {
  return permissionLevel <= 1;
}

const LOCK_AFTER_HOURS = 24;

/** Check if a clinical report is locked (auto-lock after 24h or manually finalized) */
export function isReportLocked(report: { lockedAt: Date | null; createdAt: Date }): boolean {
  if (report.lockedAt) return true;
  const hoursSinceCreation = (Date.now() - new Date(report.createdAt).getTime()) / (1000 * 60 * 60);
  return hoursSinceCreation >= LOCK_AFTER_HOURS;
}

/** Get hours remaining until auto-lock */
export function hoursUntilAutoLock(report: { createdAt: Date }): number {
  const hoursSinceCreation = (Date.now() - new Date(report.createdAt).getTime()) / (1000 * 60 * 60);
  return Math.max(0, LOCK_AFTER_HOURS - hoursSinceCreation);
}
