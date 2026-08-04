import { describe, expect, it } from "vitest";
import {
  attendanceSummary,
  canTransitionResult,
  PETRA_RESULT_COMPONENTS,
  resolveGrade,
  resultComponentLabel,
  totalWeightedScore,
  weightedScore,
} from "@/lib/academics";

describe("Phase 4 academic rules", () => {
  it("uses Petra Academy's First CAT, Second CAT and examination allocation", () => {
    expect(PETRA_RESULT_COMPONENTS).toEqual([
      expect.objectContaining({ name: "First CAT", maxScore: 20, weight: 20 }),
      expect.objectContaining({ name: "Second CAT", maxScore: 20, weight: 20 }),
      expect.objectContaining({ name: "Examination", maxScore: 60, weight: 60 }),
    ]);
    expect(
      PETRA_RESULT_COMPONENTS.reduce(
        (total, component) => total + component.maxScore,
        0,
      ),
    ).toBe(100);
  });

  it("shows approved CAT labels for result sheets created before the rename", () => {
    expect(
      resultComponentLabel({
        name: "Continuous assessment 1",
        kind: "CONTINUOUS_ASSESSMENT",
        sortOrder: 1,
      }),
    ).toBe("First CAT");
    expect(
      resultComponentLabel({
        name: "Continuous assessment 2",
        kind: "CONTINUOUS_ASSESSMENT",
        sortOrder: 2,
      }),
    ).toBe("Second CAT");
  });

  it("normalizes components by their configured weights", () => {
    expect(weightedScore({ score: 15, maxScore: 20, weight: 20 })).toBe(15);
    expect(
      totalWeightedScore([
        { score: 15, maxScore: 20, weight: 20 },
        { score: 18, maxScore: 20, weight: 20 },
        { score: 48, maxScore: 60, weight: 60 },
      ]),
    ).toBe(81);
  });

  it("rejects scores above the component maximum", () => {
    expect(() => weightedScore({ score: 21, maxScore: 20, weight: 20 })).toThrow(
      "INVALID_SCORE",
    );
  });

  it("resolves an inclusive configured grade band", () => {
    expect(
      resolveGrade(70, [
        { label: "A", minScore: 70, maxScore: 100, remark: "Excellent" },
        { label: "B", minScore: 60, maxScore: 69.99, remark: "Very good" },
      ])?.label,
    ).toBe("A");
  });

  it("counts late and excused learners as attending", () => {
    expect(
      attendanceSummary(["PRESENT", "LATE", "EXCUSED", "ABSENT"]),
    ).toEqual({
      present: 1,
      absent: 1,
      late: 1,
      excused: 1,
      total: 4,
      attendanceRate: 75,
    });
  });

  it("enforces approval, publication and locking order", () => {
    expect(canTransitionResult("DRAFT", "SUBMITTED")).toBe(true);
    expect(canTransitionResult("SUBMITTED", "APPROVED")).toBe(true);
    expect(canTransitionResult("APPROVED", "LOCKED")).toBe(false);
    expect(canTransitionResult("LOCKED", "DRAFT")).toBe(false);
  });
});
