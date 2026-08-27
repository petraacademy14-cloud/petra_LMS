import { describe, expect, it } from "vitest";
import {
  canStartOnlineExam,
  examDeadline,
  scoreManualExam,
  scoreObjectiveExam,
  selectAssignedQuestions,
} from "@/lib/entrance-exam";

describe("entrance examination rules", () => {
  it("assigns a stable randomized subset for each registration", () => {
    const questions = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
    const first = selectAssignedQuestions("registration-1", questions, 3).map((item) => item.id);
    const repeated = selectAssignedQuestions("registration-1", [...questions].reverse(), 3).map((item) => item.id);
    const another = selectAssignedQuestions("registration-2", questions, 3).map((item) => item.id);
    expect(repeated).toEqual(first);
    expect(new Set(first).size).toBe(3);
    expect(another).not.toEqual(first);
  });

  it("uses the earlier of the duration deadline and paper closing time", () => {
    const startedAt = new Date("2026-07-31T10:00:00Z");
    expect(examDeadline(startedAt, 60, new Date("2026-07-31T10:40:00Z"))).toEqual(
      new Date("2026-07-31T10:40:00Z"),
    );
    expect(examDeadline(startedAt, 30, new Date("2026-07-31T12:00:00Z"))).toEqual(
      new Date("2026-07-31T10:30:00Z"),
    );
  });

  it("only starts a published scheduled online exam inside its window", () => {
    const opensAt = new Date("2026-07-31T09:00:00Z");
    const closesAt = new Date("2026-07-31T12:00:00Z");
    expect(
      canStartOnlineExam({
        paperStatus: "PUBLISHED",
        registrationStatus: "SCHEDULED",
        opensAt,
        closesAt,
        now: new Date("2026-07-31T10:00:00Z"),
      }),
    ).toBe(true);
    expect(
      canStartOnlineExam({
        paperStatus: "DRAFT",
        registrationStatus: "SCHEDULED",
        opensAt,
        closesAt,
        now: new Date("2026-07-31T10:00:00Z"),
      }),
    ).toBe(false);
  });

  it("scores objective and onsite examinations against the pass mark", () => {
    const questions = [
      { id: "q1", correctOption: "A" as const, marks: 2 },
      { id: "q2", correctOption: "C" as const, marks: 3 },
    ];
    const objective = scoreObjectiveExam(
      questions,
      new Map([
        ["q1", "A" as const],
        ["q2", "B" as const],
      ]),
      40,
    );
    expect(objective).toEqual({ score: 2, maximumScore: 5, percentage: 40, passed: true });
    expect(scoreManualExam(17, 20, 50)).toEqual({
      score: 17,
      maximumScore: 20,
      percentage: 85,
      passed: true,
    });
    expect(() => scoreManualExam(21, 20, 50)).toThrow("INVALID:EXAM_SCORE");
  });
});
