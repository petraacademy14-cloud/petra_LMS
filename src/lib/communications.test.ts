import { describe, expect, it } from "vitest";
import { canTransitionContent, renderCommunicationTemplate, slugifyContent, validateAudience } from "@/lib/communications";

describe("Phase 5 communication rules", () => {
  it("enforces review before publication", () => {
    expect(canTransitionContent("DRAFT", "IN_REVIEW")).toBe(true);
    expect(canTransitionContent("IN_REVIEW", "APPROVED")).toBe(true);
    expect(canTransitionContent("DRAFT", "PUBLISHED")).toBe(false);
    expect(canTransitionContent("PUBLISHED", "DRAFT")).toBe(false);
  });

  it("creates stable public slugs", () => {
    expect(slugifyContent("Inter-House Sports 2026!")).toBe("inter-house-sports-2026");
  });

  it("keeps unknown template variables visible", () => {
    expect(renderCommunicationTemplate("Hello {{name}}, {{missing}}", { name: "Ada" }))
      .toBe("Hello Ada, {{missing}}");
  });

  it("requires explicit campus and class audience scope", () => {
    expect(validateAudience({ audience: "SCHOOL" })).toBe(true);
    expect(validateAudience({ audience: "CAMPUS", campusId: "awk" })).toBe(true);
    expect(validateAudience({ audience: "CLASS", campusId: "awk", classArmId: "pri1" })).toBe(true);
    expect(validateAudience({ audience: "CLASS", campusId: "awk" })).toBe(false);
  });
});
