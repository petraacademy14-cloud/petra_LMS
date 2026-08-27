import { describe, expect, it } from "vitest";
import {
  lagosDateInput,
  resultProgress,
  teachingClassKey,
  teacherStatusTone,
  uniqueTeachingClasses,
} from "@/lib/teacher-workspace";

describe("teacher workspace helpers", () => {
  it("deduplicates subject assignments that share one class and term", () => {
    const assignments = [
      { id: "math", termId: "term-1", classArmId: "class-1" },
      { id: "english", termId: "term-1", classArmId: "class-1" },
      { id: "science", termId: "term-1", classArmId: "class-2" },
    ];

    expect(uniqueTeachingClasses(assignments).map((item) => item.id)).toEqual([
      "math",
      "science",
    ]);
    expect(teachingClassKey(assignments[0]!)).toBe("term-1:class-1");
  });

  it("formats dates in the school timezone", () => {
    expect(lagosDateInput(new Date("2026-07-31T23:30:00.000Z"))).toBe(
      "2026-08-01",
    );
  });

  it("calculates result completion without exceeding 100 percent", () => {
    expect(
      resultProgress({ componentCount: 3, studentCount: 10, scoreCount: 15 }),
    ).toEqual({
      expected: 30,
      recorded: 15,
      percent: 50,
      complete: false,
    });
    expect(
      resultProgress({ componentCount: 2, studentCount: 2, scoreCount: 5 }),
    ).toEqual({
      expected: 4,
      recorded: 5,
      percent: 100,
      complete: false,
    });
  });

  it("provides consistent status tones", () => {
    expect(teacherStatusTone("DRAFT")).toBe("brand");
    expect(teacherStatusTone("SUBMITTED")).toBe("success");
    expect(teacherStatusTone("UNKNOWN")).toBeUndefined();
  });
});
