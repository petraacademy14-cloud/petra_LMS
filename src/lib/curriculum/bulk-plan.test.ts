import { describe, expect, it } from "vitest";
import { curriculumSections, planSectionSubjects, sectionForClass } from "./bulk-plan";
import { subjectKey } from "./registration";
describe("bulk curriculum offerings",()=>{
  it("maps only supported class levels",()=>{
    expect(sectionForClass("NUR-1")).toBe("NURSERY");
    expect(sectionForClass("PRI-5")).toBe("ELEMENTARY");
    expect(sectionForClass("JSS-2")).toBe("JUNIOR");
    expect(sectionForClass("SSS-3")).toBe("SENIOR");
    expect(sectionForClass("CRECHE")).toBeNull();
    expect(sectionForClass("JSS-2")).not.toBe("SENIOR");
  });
  it("keeps correct section counts and unique subjects",()=>{
    expect(curriculumSections.map(s=>planSectionSubjects(s).length)).toEqual([11,18,17,23]);
    for(const section of curriculumSections) {
      const offerings=planSectionSubjects(section);
      expect(new Set(offerings.map(o=>subjectKey(o.name))).size).toBe(offerings.length);
      expect(offerings.map(o=>o.sortOrder)).toEqual(offerings.map((_,i)=>i+1));
    }
  });
  it("retains individual elementary scores and senior pathway rules",()=>{
    const elementary=planSectionSubjects("ELEMENTARY");
    expect(elementary.find(o=>o.name==="Civic Education")?.groupName).toBe("Religious and National Values (RNV)");
    expect(elementary.some(o=>o.name==="Religious and National Values (RNV)")).toBe(false);
    const senior=planSectionSubjects("SENIOR");
    expect(senior.find(o=>o.name==="Physics")?.pathway).toBe("SCIENCE");
    expect(senior.find(o=>o.name==="Government")?.pathway).toBe("ARTS");
    expect(senior.find(o=>o.name==="Accounting")?.pathway).toBe("COMMERCIAL");
    expect(senior.find(o=>o.name==="English Language")?.pathway).toBeNull();
    expect(senior.every(o=>o.groupName===null)).toBe(true);
  });
});
