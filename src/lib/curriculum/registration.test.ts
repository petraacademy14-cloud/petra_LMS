import { describe, expect, it } from "vitest";
import { catalogNames, subjectKey, isSeniorClassCode } from "./registration";
describe("curriculum registration",()=>{
  it("recognizes only explicit aliases and normalizes whitespace",()=>{
    expect(subjectKey(" CRS ")).toBe(subjectKey("Christian Religious Studies"));
    expect(subjectKey("Basic Science & Technology")).toBe(subjectKey("Basic Science and Technology"));
    expect(subjectKey("Robotics")).not.toBe(subjectKey("Robotics & AI"));
  });
  it("has unique canonical subject keys",()=>{
    const names=catalogNames();
    expect(new Set(names.map(subjectKey)).size).toBe(names.length);
  });
  it("recognizes senior class codes only",()=>{
    expect(isSeniorClassCode("SSS-2")).toBe(true);
    expect(isSeniorClassCode("SS3")).toBe(true);
    expect(isSeniorClassCode("JSS-3")).toBe(false);
    expect(isSeniorClassCode("PRI-5")).toBe(false);
  });
});
