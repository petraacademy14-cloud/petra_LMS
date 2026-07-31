import "server-only";

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

const APPLICANT_COOKIE = "petra_applicant_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 14;

type ApplicantViewerRow = {
  id: string;
  schoolId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  relationship: string;
  applicationId: string;
  applicationNumber: string;
  applicationStatus: string;
};

function tokenDigest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashApplicantPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${digest}`;
}

export function verifyApplicantPassword(password: string, encoded: string) {
  const [algorithm, salt, expectedHex] = encoded.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;

  const expected = Buffer.from(expectedHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function createApplicantSession(accountId: string) {
  const token = randomBytes(32).toString("hex");
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.$executeRaw`
    INSERT INTO "applicant_sessions" ("id", "accountId", "tokenHash", "expiresAt")
    VALUES (${sessionId}, ${accountId}, ${tokenDigest(token)}, ${expiresAt})
  `;

  const cookieStore = await cookies();
  cookieStore.set(APPLICANT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyApplicantSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(APPLICANT_COOKIE)?.value;

  if (token) {
    await db.$executeRaw`
      DELETE FROM "applicant_sessions" WHERE "tokenHash" = ${tokenDigest(token)}
    `;
  }

  cookieStore.delete(APPLICANT_COOKIE);
}

export async function getApplicantViewer() {
  const cookieStore = await cookies();
  const token = cookieStore.get(APPLICANT_COOKIE)?.value;
  if (!token) return null;

  const rows = await db.$queryRaw<ApplicantViewerRow[]>`
    SELECT
      a."id",
      a."schoolId",
      a."firstName",
      a."lastName",
      a."email",
      a."phone",
      a."relationship",
      p."id" AS "applicationId",
      p."applicationNumber",
      p."status"::text AS "applicationStatus"
    FROM "applicant_sessions" s
    JOIN "applicant_accounts" a ON a."id" = s."accountId"
    JOIN "admission_applications" p ON p."accountId" = a."id"
    WHERE s."tokenHash" = ${tokenDigest(token)}
      AND s."expiresAt" > CURRENT_TIMESTAMP
    LIMIT 1
  `;

  const viewer = rows[0] ?? null;
  if (viewer) {
    await db.$executeRaw`
      UPDATE "applicant_sessions"
      SET "lastSeenAt" = CURRENT_TIMESTAMP
      WHERE "tokenHash" = ${tokenDigest(token)}
    `;
  }

  return viewer;
}

export async function requireApplicant() {
  const viewer = await getApplicantViewer();
  if (!viewer) redirect("/apply/login");
  return viewer;
}
