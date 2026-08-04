import { describe, expect, it } from "vitest";
import { DEFAULT_CLASS_ARMS, makeAcademicCode } from "@/lib/academic-setup";

describe("academic setup helpers", () => {
  it("creates predictable short codes", () => {
    expect(makeAcademicCode("Primary 1")).toBe("PRI-1");
    expect(makeAcademicCode("Civic Education")).toBe("CIV-EDU");
    expect(makeAcademicCode("Computer Studies", 8)).toBe("COM-STU");
  });

  it("keeps A and B as Petra's default class arms", () => {
    expect(DEFAULT_CLASS_ARMS).toEqual(["A", "B"]);
  });
});
