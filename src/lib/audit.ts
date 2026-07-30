import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

type AuditEvent = {
  schoolId: string;
  campusId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function recordAudit(event: AuditEvent) {
  try {
    return await db.auditLog.create({ data: event });
  } catch (error) {
    logger.error("audit_log_write_failed", {
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
