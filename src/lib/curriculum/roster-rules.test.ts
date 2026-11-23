import {describe,expect,it} from "vitest";
import {determineResultRoster} from "./roster-rules";
describe("results subject roster",()=>{
  const ids=["ada","ben","chi"];
  it("preserves existing sheets when no offering is configured",()=>{
    expect(determineResultRoster({legacyStudentIds:ids,selectedStudentIds:[],existingStudentIds:[],offeringConfigured:false}))
      .toEqual({studentIds:ids,mode:"legacy"});
  });
  it("includes only selected class students when configured",()=>{
    expect(determineResultRoster({legacyStudentIds:ids,selectedStudentIds:["chi","outsider","ada"],existingStudentIds:[],offeringConfigured:true}))
      .toEqual({studentIds:["ada","chi"],mode:"selected"});
  });
  it("preserves already scored students instead of hiding records",()=>{
    expect(determineResultRoster({legacyStudentIds:ids,selectedStudentIds:["ada"],existingStudentIds:["ben"],offeringConfigured:true}))
      .toEqual({studentIds:ids,mode:"legacy"});
  });
  it("returns empty roster when offerings exist but nobody is selected",()=>{
    expect(determineResultRoster({legacyStudentIds:ids,selectedStudentIds:[],existingStudentIds:[],offeringConfigured:true}))
      .toEqual({studentIds:[],mode:"selected"});
  });
});
