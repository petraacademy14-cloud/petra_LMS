import { describe, expect, it } from "vitest";
import {
  hasPermission,
  permissions,
  permissionsFor,
} from "@/lib/permissions";

describe("role permissions", () => {
  it("gives the owner every defined permission", () => {
    expect(permissionsFor("OWNER")).toEqual(
      expect.arrayContaining([...permissions]),
    );
    expect(permissionsFor("OWNER")).toHaveLength(permissions.length);
  });

  it("does not allow admins to manage school-wide settings", () => {
    expect(hasPermission("ADMIN", "academic.manage")).toBe(true);
    expect(hasPermission("ADMIN", "school.manage")).toBe(false);
    expect(hasPermission("ADMIN", "system.manage")).toBe(false);
  });

  it("limits teachers to assigned teaching workflows", () => {
    expect(hasPermission("TEACHER", "people.read")).toBe(false);
    expect(hasPermission("TEACHER", "people.manage")).toBe(false);
    expect(hasPermission("TEACHER", "academic.read")).toBe(false);
    expect(hasPermission("TEACHER", "admissions.read")).toBe(false);
    expect(hasPermission("TEACHER", "finance.read")).toBe(false);
    expect(hasPermission("TEACHER", "attendance.manage")).toBe(true);
    expect(hasPermission("TEACHER", "attendance.correct")).toBe(false);
    expect(hasPermission("TEACHER", "results.manage")).toBe(true);
    expect(hasPermission("TEACHER", "results.approve")).toBe(false);
  });

  it("allows owners and campus admins to manage admissions", () => {
    expect(hasPermission("OWNER", "admissions.manage")).toBe(true);
    expect(hasPermission("ADMIN", "admissions.read")).toBe(true);
    expect(hasPermission("ADMIN", "admissions.manage")).toBe(true);
  });

  it("allows campus admins to correct attendance and approve results", () => {
    expect(hasPermission("ADMIN", "attendance.correct")).toBe(true);
    expect(hasPermission("ADMIN", "results.approve")).toBe(true);
    expect(hasPermission("ADMIN", "results.publish")).toBe(true);
  });

  it("allows campus admins to record and reconcile fees", () => {
    expect(hasPermission("ADMIN", "finance.read")).toBe(true);
    expect(hasPermission("ADMIN", "finance.manage")).toBe(true);
    expect(hasPermission("ADMIN", "finance.reconcile")).toBe(true);
  });

  it("separates communication drafting from publication", () => {
    expect(hasPermission("TEACHER", "communications.manage")).toBe(true);
    expect(hasPermission("TEACHER", "communications.publish")).toBe(false);
    expect(hasPermission("ADMIN", "communications.review")).toBe(true);
    expect(hasPermission("ADMIN", "communications.publish")).toBe(true);
  });
});
