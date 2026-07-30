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

  it("limits teachers to read permissions", () => {
    expect(permissionsFor("TEACHER").every((item) => item.endsWith(".read"))).toBe(
      true,
    );
    expect(hasPermission("TEACHER", "people.manage")).toBe(false);
  });
});
