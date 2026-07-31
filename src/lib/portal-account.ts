import { randomBytes } from "node:crypto";

export const portalAccountRoles = ["PARENT", "STUDENT"] as const;
export type PortalAccountRole = (typeof portalAccountRoles)[number];

export function portalRoleLabel(role: PortalAccountRole) {
  return role === "PARENT" ? "Parent or guardian" : "Student";
}

export function portalHome(role: PortalAccountRole) {
  return role === "PARENT" ? "/parent" : "/student";
}

export function normalizePortalUsername(value: string) {
  return value.trim().toLowerCase();
}

export function isValidPortalUsername(value: string) {
  return /^[a-z0-9][a-z0-9._-]{3,79}$/.test(normalizePortalUsername(value));
}

function safeUsernamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
    .slice(0, 72);
}

export function suggestedPortalUsername(input: {
  role: PortalAccountRole;
  admissionNumber?: string | null;
  phone?: string | null;
  fallbackId: string;
}) {
  if (input.role === "STUDENT" && input.admissionNumber) {
    return safeUsernamePart(input.admissionNumber);
  }

  const phoneDigits = input.phone?.replace(/\D/g, "").slice(-10);
  if (input.role === "PARENT" && phoneDigits && phoneDigits.length >= 7) {
    return `parent-${phoneDigits}`;
  }

  return `${input.role.toLowerCase()}-${safeUsernamePart(input.fallbackId.slice(-10))}`;
}

export function generateTemporaryPortalPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(9);
  const randomPart = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  return `Petra!${bytes[0] % 10}${randomPart}`;
}
