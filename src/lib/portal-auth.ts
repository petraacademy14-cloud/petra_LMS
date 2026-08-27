import "server-only";

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { portalHome, type PortalAccountRole } from "@/lib/portal-account";

const PORTAL_COOKIE = "petra_portal_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

export type PortalViewer = {
  id: string;
  schoolId: string;
  role: PortalAccountRole;
  username: string;
  displayName: string;
  guardianId: string | null;
  studentId: string | null;
  mustChangePassword: boolean;
};

function tokenDigest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashPortalPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${digest}`;
}

export function verifyPortalPassword(password: string, encoded: string) {
  const [algorithm, salt, expectedHex] = encoded.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;

  const expected = Buffer.from(expectedHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function createPortalSession(accountId: string) {
  const token = randomBytes(32).toString("hex");
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.$executeRaw`
    INSERT INTO "portal_sessions" ("id", "accountId", "tokenHash", "expiresAt")
    VALUES (${sessionId}, ${accountId}, ${tokenDigest(token)}, ${expiresAt})
  `;

  const cookieStore = await cookies();
  cookieStore.set(PORTAL_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyPortalSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE)?.value;

  if (token) {
    await db.$executeRaw`
      DELETE FROM "portal_sessions" WHERE "tokenHash" = ${tokenDigest(token)}
    `;
  }

  cookieStore.delete(PORTAL_COOKIE);
}

export async function destroyAllPortalSessions(accountId: string) {
  await db.$executeRaw`
    DELETE FROM "portal_sessions" WHERE "accountId" = ${accountId}
  `;
}

export async function getPortalViewer(): Promise<PortalViewer | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE)?.value;
  if (!token) return null;

  const rows = await db.$queryRaw<PortalViewer[]>`
    SELECT a."id", a."schoolId", a."role"::text AS "role", a."username",
      a."displayName", a."guardianId", a."studentId", a."mustChangePassword"
    FROM "portal_sessions" s
    JOIN "portal_accounts" a ON a."id" = s."accountId"
    WHERE s."tokenHash" = ${tokenDigest(token)}
      AND s."expiresAt" > CURRENT_TIMESTAMP
      AND a."status" = 'ACTIVE'
      AND (a."lockedUntil" IS NULL OR a."lockedUntil" <= CURRENT_TIMESTAMP)
    LIMIT 1
  `;

  const viewer = rows[0] ?? null;
  if (viewer) {
    await db.$executeRaw`
      UPDATE "portal_sessions"
      SET "lastSeenAt" = CURRENT_TIMESTAMP
      WHERE "tokenHash" = ${tokenDigest(token)}
    `;
  }

  return viewer;
}

export async function requirePortalViewer(options?: { allowPasswordChange?: boolean }) {
  const viewer = await getPortalViewer();
  if (!viewer) redirect("/login");
  if (viewer.mustChangePassword && !options?.allowPasswordChange) {
    redirect("/portal/change-password");
  }
  return viewer;
}

export async function requirePortalRole(role: PortalAccountRole) {
  const viewer = await requirePortalViewer();
  if (viewer.role !== role) redirect(portalHome(viewer.role));
  return viewer;
}
