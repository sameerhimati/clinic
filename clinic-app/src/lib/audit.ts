import { prisma } from "@/lib/db";

type AuditEntry = {
  action: string;
  severity?: "INFO" | "FLAG";
  actorId: number;
  patientId?: number;
  visitId?: number;
  entityType: string;
  entityId?: number;
  reason?: string;
  details?: Record<string, unknown>;
};

/** Fire-and-forget audit log entry. Never throws — failures are silently logged to console. */
export function logAudit(entry: AuditEntry) {
  prisma.auditLog
    .create({
      data: {
        action: entry.action,
        severity: entry.severity || "INFO",
        actorId: entry.actorId,
        patientId: entry.patientId,
        visitId: entry.visitId,
        entityType: entry.entityType,
        entityId: entry.entityId,
        reason: entry.reason,
        details: entry.details ? JSON.stringify(entry.details) : null,
      },
    })
    .catch(console.error);
}

/** Fire-and-forget flagged audit entry. Reason is required. */
export function logFlaggedAction(
  entry: Omit<AuditEntry, "severity"> & { reason: string }
) {
  logAudit({ ...entry, severity: "FLAG" });
}
