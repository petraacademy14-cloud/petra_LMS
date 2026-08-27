"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  createPortalSession,
  destroyAllPortalSessions,
  destroyPortalSession,
  hashPortalPassword,
  requirePortalViewer,
  verifyPortalPassword,
} from "@/lib/portal-auth";
import {
  normalizePortalUsername,
  portalAccountRoles,
  portalHome,
  type PortalAccountRole,
} from "@/lib/portal-account";

export type PortalAuthState = {
  status: "idle" | "error";
  message: string;
};

const initialError = "We could not sign you in. Check the username and password issued by Petra Academy.";

async function requestContext() {
  const requestHeaders = await headers();
  return {
    requestId:
      requestHeaders.get("x-request-id") ??
      requestHeaders.get("x-vercel-id") ??
      crypto.randomUUID(),
    ipAddress:
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: requestHeaders.get("user-agent"),
  };
}

type LoginAccountRow = {
  id: string;
  schoolId: string;
  role: PortalAccountRole;
  passwordHash: string;
  mustChangePassword: boolean;
  status: "ACTIVE" | "SUSPENDED";
  failedLoginCount: number;
  lockedUntil: Date | null;
};

export async function portalLogin(
  requestedRole: PortalAccountRole,
  _previous: PortalAuthState,
  formData: FormData,
): Promise<PortalAuthState> {
  const role = z.enum(portalAccountRoles).parse(requestedRole);
  const parsed = z
    .object({
      username: z.string().trim().min(4).max(80),
      password: z.string().min(1).max(128),
    })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) return { status: "error", message: initialError };
  const username = normalizePortalUsername(parsed.data.username);
  const [account] = await db.$queryRaw<LoginAccountRow[]>`
    SELECT "id", "schoolId", "role"::text AS "role", "passwordHash",
      "mustChangePassword", "status"::text AS "status", "failedLoginCount", "lockedUntil"
    FROM "portal_accounts"
    WHERE "username" = ${username}
    LIMIT 1
  `;

  if (!account || account.role !== role || account.status !== "ACTIVE") {
    return { status: "error", message: initialError };
  }

  const now = new Date();
  if (account.lockedUntil && account.lockedUntil > now) {
    return {
      status: "error",
      message: "This account is temporarily locked after repeated attempts. Try again later or contact Petra Academy.",
    };
  }

  if (!verifyPortalPassword(parsed.data.password, account.passwordHash)) {
    const previousFailures = account.lockedUntil ? 0 : account.failedLoginCount;
    const nextFailures = previousFailures + 1;
    const lockUntil = nextFailures >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
    await db.$executeRaw`
      UPDATE "portal_accounts"
      SET "failedLoginCount" = ${nextFailures}, "lockedUntil" = ${lockUntil}
      WHERE "id" = ${account.id}
    `;
    return { status: "error", message: initialError };
  }

  await db.$executeRaw`
    UPDATE "portal_accounts"
    SET "failedLoginCount" = 0, "lockedUntil" = NULL, "lastLoginAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${account.id}
  `;
  await createPortalSession(account.id);

  if (account.mustChangePassword) redirect("/portal/change-password");
  redirect(portalHome(account.role));
}

export async function changePortalPassword(
  _previous: PortalAuthState,
  formData: FormData,
): Promise<PortalAuthState> {
  const viewer = await requirePortalViewer({ allowPasswordChange: true });
  const parsed = z
    .object({
      password: z.string().min(10, "Use at least 10 characters.").max(128),
      confirmPassword: z.string().min(10).max(128),
    })
    .refine((value) => value.password === value.confirmPassword, {
      message: "The two passwords do not match.",
      path: ["confirmPassword"],
    })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Choose a valid password.",
    };
  }

  const passwordHash = hashPortalPassword(parsed.data.password);
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE "portal_accounts"
      SET "passwordHash" = ${passwordHash}, "mustChangePassword" = FALSE,
        "passwordChangedAt" = CURRENT_TIMESTAMP, "failedLoginCount" = 0, "lockedUntil" = NULL
      WHERE "id" = ${viewer.id}
    `;
    await tx.portalSession.deleteMany({ where: { accountId: viewer.id } });
    await tx.auditLog.create({
      data: {
        schoolId: viewer.schoolId,
        campusId: null,
        actorUserId: null,
        action: "portal.password_changed",
        entityType: "PortalAccount",
        entityId: viewer.id,
        after: { role: viewer.role, username: viewer.username },
        ...(await requestContext()),
      },
    });
  });

  await destroyAllPortalSessions(viewer.id);
  await createPortalSession(viewer.id);
  redirect(portalHome(viewer.role));
}

export async function logoutPortal() {
  await destroyPortalSession();
  redirect("/login");
}
