import { describe, expect, it } from "vitest";
import { formatAdmissionNumber } from "@/lib/admission-number";

describe("admission number generation", () => {
  it("uses Petra, campus, year and a padded sequence", () => {
    expect(
      formatAdmissionNumber({ campusCode: "awk", year: 2026, sequence: 17 }),
    ).toBe("PET/AWK/2026/0017");
  });

  it("rejects unsafe campus codes and sequence values", () => {
    expect(() =>
      formatAdmissionNumber({
        campusCode: "../awk",
        year: 2026,
        sequence: 1,
      }),
    ).toThrow("INVALID_CAMPUS_CODE");
    expect(() =>
      formatAdmissionNumber({ campusCode: "AWK", year: 2026, sequence: 0 }),
    ).toThrow("INVALID_ADMISSION_SEQUENCE");
  });
});
