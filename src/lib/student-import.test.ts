import { describe, expect, it } from "vitest";
import {
  importColumns,
  validateStudentImportTable,
} from "@/lib/student-import";

function validRow() {
  return [
    "",
    "Ada",
    "",
    "Okafor",
    "female",
    "2018-05-14",
    "2026-09-07",
    "awk",
    "pri-2",
    "a",
    "2026/2027",
    "",
    "Chinedu",
    "Okafor",
    "08030000000",
    "",
    "FATHER",
    "",
    "",
    "",
    "",
    "GUARDIAN",
  ];
}

describe("student import validation", () => {
  it("normalizes a valid row", () => {
    const result = validateStudentImportTable([[...importColumns], validRow()]);
    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      first_name: "Ada",
      gender: "FEMALE",
      campus_code: "AWK",
      class_code: "PRI-2",
    });
  });

  it("reports missing headers before importing", () => {
    const result = validateStudentImportTable([["first_name"], ["Ada"]]);
    expect(result.rows).toEqual([]);
    expect(result.errors[0].field).toBe("headers");
  });

  it("rejects duplicate supplied admission numbers", () => {
    const first = validRow();
    const second = validRow();
    first[0] = "PET/AWK/2026/0001";
    second[0] = "PET/AWK/2026/0001";
    const result = validateStudentImportTable([
      [...importColumns],
      first,
      second,
    ]);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: "admission_number", row: 3 }),
    );
  });
});
