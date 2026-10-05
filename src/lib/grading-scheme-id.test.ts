import { describe, expect, it } from "vitest";
import { gradingSchemeId } from "./grading-scheme-id";

describe("grading scheme IDs", () => {
  it("accepts migration-generated IDs and Prisma CUIDs", () => {
    expect(gradingSchemeId.safeParse("scheme_" + "a".repeat(32)).success).toBe(true);
    expect(gradingSchemeId.safeParse("cm123456789abcdefghijklmn").success).toBe(true);
  });
  it("rejects missing and malformed IDs", () => {
    for (const value of [undefined, "", "scheme_123", "unrelated-id"]) {
      expect(gradingSchemeId.safeParse(value).success).toBe(false);
    }
  });
});
