import { describe, expect, it } from "vitest";
import { assessmentMaximums, elementaryGroups, juniorSubjects, nurserySubjects, seniorAvailableSubjects, seniorOtherSubjects, seniorPathways } from "./catalog";

describe("approved curriculum", () => {
  it("has the approved number of distinct subjects per section", () => {
    expect(new Set(nurserySubjects).size).toBe(11);
    expect(new Set(elementaryGroups.flatMap(([, subjects]) => [...subjects] as string[])).size).toBe(18);
    expect(new Set(juniorSubjects).size).toBe(17);
    expect(new Set([...seniorOtherSubjects, ...Object.values(seniorPathways).flat()]).size).toBe(23);
  });
  it("excludes other pathway subjects from each default availability list", () => {
    expect(seniorAvailableSubjects("SCIENCE")).toContain("Physics");
    expect(seniorAvailableSubjects("SCIENCE")).not.toContain("Accounting");
    expect(seniorAvailableSubjects("ARTS")).toContain("Government");
    expect(seniorAvailableSubjects("ARTS")).not.toContain("Chemistry");
    expect(seniorAvailableSubjects("COMMERCIAL")).toContain("Commerce");
    expect(seniorAvailableSubjects("COMMERCIAL")).not.toContain("Literature");
  });
  it("uses separate assessment limits totaling 100", () => {
    expect(assessmentMaximums).toEqual({cat1:20,cat2:20,exam:60});
    expect(Object.values(assessmentMaximums).reduce<number>((a,b)=>a+b,0)).toBe(100);
  });
});
