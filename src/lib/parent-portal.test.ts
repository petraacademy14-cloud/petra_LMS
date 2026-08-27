import { describe, expect, it } from "vitest";
import {
  announcementIsVisibleToStudent,
  guardianCanAccessStudent,
  uniqueTermIds,
} from "@/lib/parent-portal";

describe("parent portal access", () => {
  it("allows only students linked to the signed-in guardian", () => {
    expect(guardianCanAccessStudent(["student-1", "student-2"], "student-2")).toBe(true);
    expect(guardianCanAccessStudent(["student-1", "student-2"], "student-3")).toBe(false);
  });

  it("matches school, campus and class announcements to the student scope", () => {
    const student = { studentId: "student-1", campusId: "awka", classArmId: "jss1-a" };

    expect(
      announcementIsVisibleToStudent(
        { audience: "SCHOOL", campusId: null, classArmId: null },
        student,
      ),
    ).toBe(true);
    expect(
      announcementIsVisibleToStudent(
        { audience: "CAMPUS", campusId: "awka", classArmId: null },
        student,
      ),
    ).toBe(true);
    expect(
      announcementIsVisibleToStudent(
        { audience: "CAMPUS", campusId: "nnewi", classArmId: null },
        student,
      ),
    ).toBe(false);
    expect(
      announcementIsVisibleToStudent(
        { audience: "CLASS", campusId: "awka", classArmId: "jss1-a" },
        student,
      ),
    ).toBe(true);
  });

  it("deduplicates report-card term links", () => {
    expect(uniqueTermIds(["term-1", "term-1", "term-2"])).toEqual(["term-1", "term-2"]);
  });
});
