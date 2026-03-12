// Permission helpers
// Permission levels: 0=SYSADM, 1=Admin, 2=Reception, 3=Doctor, 4=Consultant

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

/** Can access Patient Directory report (bulk PII + financials with CSV export) */
export function canSeePatientDirectory(permissionLevel: number): boolean {
  return permissionLevel <= 1;
}

/** Can edit patient demographics */
export function canEditPatients(permissionLevel: number): boolean {
  return permissionLevel <= 2;
}

/** Can manage system settings, doctors, operations, labs */
export function canManageSystem(permissionLevel: number): boolean {
  return permissionLevel <= 1;
}

/** Can create/edit clinical examination reports (L3 doctors + L4 consultants) */
export function canExamine(permissionLevel: number): boolean {
  return permissionLevel === 3 || permissionLevel === 4;
}

/** Can schedule appointments (L1 admin + L2 reception only) */
export function canSchedule(permissionLevel: number): boolean {
  return permissionLevel <= 2;
}

/** Can create treatment plans (L3 BDS doctors only) */
export function canCreateTreatmentPlans(permissionLevel: number): boolean {
  return permissionLevel === 3;
}

/** Can schedule follow-up appointments from exam page (L3 doctors + L4 consultants) */
export function canScheduleFollowUp(permissionLevel: number): boolean {
  return permissionLevel === 3 || permissionLevel === 4;
}

/** Can create visits directly (L1 admin + L2 reception only) */
export function canCreateVisits(permissionLevel: number): boolean {
  return permissionLevel <= 2;
}

/** Admin can unlock reports and visits */
export function isAdmin(permissionLevel: number): boolean {
  return permissionLevel <= 1;
}

/** Max discount percent allowed by role */
export function maxDiscountPercent(permissionLevel: number, isSuperUser: boolean): number {
  if (permissionLevel <= 1) return 100; // L1: unlimited
  if (permissionLevel === 2 && isSuperUser) return 100; // L2 super: unlimited
  if (permissionLevel <= 3) return 20; // L2 standard + L3: up to 20%
  return 0; // L4: no discounts
}

/** Can override minimum fee enforcement (rate below tariff minimum) */
export function canOverrideMinFee(permissionLevel: number, isSuperUser: boolean): boolean {
  return permissionLevel <= 1 || (permissionLevel === 2 && isSuperUser);
}

/** Can manage lab rates and operation tariffs (L1 always, L2 super-user) */
export function canManageRates(permissionLevel: number, isSuperUser: boolean): boolean {
  return permissionLevel <= 1 || (permissionLevel === 2 && isSuperUser);
}

/** Can create/manage lab orders (L1/L2 only) */
export function canManageLabOrders(permissionLevel: number): boolean {
  return permissionLevel <= 2;
}

/** Whether discount >20% requires a reason (for audit) */
export function discountRequiresReason(discountPercent: number): boolean {
  return discountPercent > 20;
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
