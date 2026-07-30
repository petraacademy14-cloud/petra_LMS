import { describe, expect, it } from "vitest";
import { formatAdmissionNumber } from "./admission-number";

describe("formatAdmissionNumber", () => {
  it("builds a stable campus-scoped number", () => {
    expect(
      formatAdmissionNumber({ campusCode: "awk", year: 2026, sequence: 42 }),
    ).toBe("PET/AWK/2026/0042");
  });

  it("does not truncate large sequences", () => {
    expect(
      formatAdmissionNumber({ campusCode: "NNE", year: 2027, sequence: 10001 }),
    ).toBe("PET/NNE/2027/10001");
  });

  it("rejects unsafe campus codes", () => {
    expect(() =>
      formatAdmissionNumber({ campusCode: "../AWK", year: 2026, sequence: 1 }),
    ).toThrow();
  });
});

