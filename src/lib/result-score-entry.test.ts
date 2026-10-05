import { describe, expect, it } from "vitest";
import { parseResultScore, resultScoreLimit } from "./result-score-entry";

describe("score entry safeguards", () => {
  it("preserves blanks and distinguishes an explicit zero", () => {
    for (const raw of [null, "", "   "]) expect(parseResultScore(raw, 20)).toBeNull();
    expect(parseResultScore("0", 20)).toBe(0);
  });
  it("accepts each boundary and decimal scores", () => {
    expect(parseResultScore("20", 20)).toBe(20);
    expect(parseResultScore("60", 60)).toBe(60);
    expect(parseResultScore("19.25", 20)).toBe(19.25);
  });
  it("rejects excessive, negative, nonnumeric and silently rounded scores", () => {
    for (const value of ["21", "20.01", "-1", "NaN", "Infinity", "1e1", "0x10", "1.234"]) {
      expect(() => parseResultScore(value, 20)).toThrow();
    }
    expect(() => parseResultScore("60.01", 60)).toThrow();
  });
  it("enforces Petra caps even if a component was configured too high", () => {
    expect(resultScoreLimit({ kind: "EXAM", maxScore: 100 })).toBe(60);
    expect(resultScoreLimit({ kind: "CONTINUOUS_ASSESSMENT", maxScore: 40 })).toBe(20);
    expect(resultScoreLimit({ kind: "EXAM", maxScore: 50 })).toBe(50);
  });
});
