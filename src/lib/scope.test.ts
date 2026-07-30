import { describe, expect, it } from "vitest";
import { canAccessCampus } from "@/lib/scope";

describe("campus access", () => {
  it("allows an owner to access any campus", () => {
    expect(
      canAccessCampus({
        role: "OWNER",
        assignedCampusId: null,
        targetCampusId: "nnewi",
      }),
    ).toBe(true);
  });

  it("allows admins and teachers only in their assigned campus", () => {
    expect(
      canAccessCampus({
        role: "ADMIN",
        assignedCampusId: "awka",
        targetCampusId: "awka",
      }),
    ).toBe(true);
    expect(
      canAccessCampus({
        role: "ADMIN",
        assignedCampusId: "awka",
        targetCampusId: "nnewi",
      }),
    ).toBe(false);
    expect(
      canAccessCampus({
        role: "TEACHER",
        assignedCampusId: null,
        targetCampusId: "awka",
      }),
    ).toBe(false);
  });
});
