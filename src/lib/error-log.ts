import "server-only";

import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

type ErrorContext = {
  schoolId?: string;
  campusId?: string;
  userId?: string;
  requestId?: string;
  path?: string;
  context?: Record<string, string | number | boolean | null>;
};

export async function captureError(error: unknown, details: ErrorContext = {}) {
  const normalized =
    error instanceof Error ? error : new Error(String(error));
  const fingerprint = createHash("sha256")
    .update(`${normalized.name}:${normalized.message}`)
    .digest("hex")
    .slice(0, 24);

  logger.error("application_error", {
    ...details,
    fingerprint,
    error: normalized.message,
  });

  try {
    await db.errorLog.create({
      data: {
        ...details,
        message: normalized.message,
        stack: normalized.stack,
        fingerprint,
      },
    });
  } catch (loggingError) {
    logger.error("error_log_write_failed", {
      fingerprint,
      error:
        loggingError instanceof Error
          ? loggingError.message
          : String(loggingError),
    });
  }

  return fingerprint;
}
