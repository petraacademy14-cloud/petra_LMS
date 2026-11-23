import "server-only";
import { db } from "@/lib/db";
import { determineResultRoster } from "./roster-rules";

type SheetScope = {
  id:string; schoolId:string; campusId:string; termId:string;
  classArmId:string; subjectId:string; status:string;
};
export async function getResultRoster(sheet:SheetScope, legacyStudentIds:readonly string[]) {
  // Published/locked results and historical periods retain their prior display semantics.
  if(sheet.status!=="DRAFT") return {studentIds:[...legacyStudentIds],mode:"legacy" as const};
  const offering=await db.curriculumOffering.findFirst({
    where:{campusId:sheet.campusId,termId:sheet.termId,classArmId:sheet.classArmId,
      subjectId:sheet.subjectId,isActive:true,term:{academicSession:{schoolId:sheet.schoolId}}},
    select:{id:true},
  });
  if(!offering) return {studentIds:[...legacyStudentIds],mode:"legacy" as const};
  const [selections, existingScores, existingEntries]=await Promise.all([
    db.studentSubjectSelection.findMany({
      where:{campusId:sheet.campusId,offeringId:offering.id,isActive:true,
        enrollment:{classArmId:sheet.classArmId,campusId:sheet.campusId,status:"CURRENT",
          academicSession:{schoolId:sheet.schoolId},student:{schoolId:sheet.schoolId,status:"ACTIVE"}}},
      select:{enrollment:{select:{studentId:true}}},
    }),
    db.studentScore.findMany({where:{component:{sheetId:sheet.id}},select:{studentId:true},distinct:["studentId"]}),
    db.resultEntry.findMany({where:{sheetId:sheet.id},select:{studentId:true}}),
  ]);
  return determineResultRoster({
    legacyStudentIds,
    selectedStudentIds:selections.map(s=>s.enrollment.studentId),
    existingStudentIds:[...existingScores.map(s=>s.studentId),...existingEntries.map(e=>e.studentId)],
    offeringConfigured:true,
  });
}
