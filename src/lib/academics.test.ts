import { describe, expect, it } from "vitest";
import {
  attendanceSummary,
  canTransitionResult,
  resolveGrade,
  totalWeightedScore,
  weightedScore,
} from "@/lib/academics";

describe("Phase 4 academic rules", () => {
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
