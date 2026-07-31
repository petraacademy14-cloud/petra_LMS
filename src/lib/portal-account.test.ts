import { describe, expect, it } from "vitest";
import {
  generateTemporaryPortalPassword,
  isValidPortalUsername,
  normalizePortalUsername,
  portalHome,
  suggestedPortalUsername,
} from "@/lib/portal-account";

describe("portal account rules", () => {
  it("normalizes and validates school-issued usernames", () => {
    expect(normalizePortalUsername("  TEST-NNE-0002 ")).toBe("test-nne-0002");
    expect(isValidPortalUsername("test-nne-0002")).toBe(true);
    expect(isValidPortalUsername("bad username")).toBe(false);
    expect(isValidPortalUsername("x")).toBe(false);
  });

  it("suggests memorable student and parent usernames", () => {
    expect(
      suggestedPortalUsername({
        role: "STUDENT",
        admissionNumber: "TEST-NNE-0002",
        fallbackId: "student-id",
      }),
    ).toBe("test-nne-0002");
    expect(
      suggestedPortalUsername({
        role: "PARENT",
        phone: "+234 803 123 4567",
        fallbackId: "guardian-id",
      }),
    ).toBe("parent-8031234567");
  });

  it("creates strong temporary passwords and correct role homes", () => {
    const password = generateTemporaryPortalPassword();
    expect(password.length).toBeGreaterThanOrEqual(15);
    expect(password).toMatch(/^Petra!\d[A-Za-z2-9]+$/);
    expect(portalHome("PARENT")).toBe("/parent");
    expect(portalHome("STUDENT")).toBe("/student");
  });
});
