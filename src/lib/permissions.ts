import type { Role } from "@/generated/prisma/enums";

export const permissions = [
  "school.read",
  "school.manage",
  "campus.read",
  "campus.manage",
  "academic.read",
  "academic.manage",
  "people.read",
  "people.manage",
  "teaching.manage",
  "finance.read",
  "finance.manage",
  "finance.reconcile",
  "attendance.read",
  "attendance.manage",
  "attendance.correct",
  "results.read",
  "results.manage",
  "results.approve",
  "results.publish",
  "audit.read",
  "system.manage",
] as const;

export type Permission = (typeof permissions)[number];

const rolePermissions = {
  OWNER: new Set<Permission>(permissions),
  ADMIN: new Set<Permission>([
    "school.read",
    "campus.read",
    "campus.manage",
    "academic.read",
    "academic.manage",
    "people.read",
    "people.manage",
    "teaching.manage",
    "finance.read",
    "finance.manage",
    "finance.reconcile",
    "attendance.read",
    "attendance.manage",
    "attendance.correct",
    "results.read",
    "results.manage",
    "results.approve",
    "results.publish",
    "audit.read",
  ]),
  TEACHER: new Set<Permission>([
    "school.read",
    "campus.read",
    "academic.read",
    "people.read",
    "attendance.read",
    "attendance.manage",
    "results.read",
    "results.manage",
  ]),
} satisfies Record<Role, Set<Permission>>;

export function hasPermission(role: Role, permission: Permission) {
  return rolePermissions[role].has(permission);
}

export function permissionsFor(role: Role) {
  return [...rolePermissions[role]];
}
