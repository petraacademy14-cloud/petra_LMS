import "server-only";
import { db } from "@/lib/db";
import { attendanceSummary, resolveGrade, totalWeightedScore } from "@/lib/academics";
import { sectionForClass } from "@/lib/curriculum/bulk-plan";
import type { CurriculumSection } from "@/lib/curriculum/bulk-plan";

export type ReportRow = {
  subject:string; group:string|null; sortOrder:number;
  cat1:number|null;cat2:number|null;exam:number|null;
  total:number|null;grade:string;remark:string;comment:string|null;
  classHighest:number|null;classLowest:number|null;
};
export type PublishedReport = {
  studentId:string;schoolName:string;campusName:string;
  studentName:string;admissionNumber:string;className:string;
  section:CurriculumSection|null;termName:string;sessionName:string;
  rows:ReportRow[];average:number|null;
  attendance:{total:number;present:number;absent:number;late:number;attendanceRate:number};
};

/** Shared data source for all three authorized report download routes and the print view. */
export async function loadPublishedReport(input:{
  schoolId:string; studentId:string; termId:string;
  campusId?:string; releasedAttendanceOnly?:boolean;
}):Promise<PublishedReport|null> {
  const term=await db.term.findFirst({where:{
    id:input.termId,campus:{schoolId:input.schoolId,...(input.campusId?{id:input.campusId}:{})}
  },select:{id:true,campusId:true,name:true,academicSessionId:true,academicSession:{select:{name:true}}}});
  if(!term)return null;
  const student=await db.student.findFirst({where:{
    id:input.studentId,schoolId:input.schoolId,campusId:term.campusId,
    ...(input.campusId?{campusId:input.campusId}:{})
  },include:{
    school:true,campus:true,
    enrollments:{where:{academicSessionId:term.academicSessionId},
      include:{classArm:{include:{classLevel:true}}},orderBy:{startsOn:"desc"}},
    attendanceEntries:{where:{register:{
      termId:input.termId,...(input.releasedAttendanceOnly?{status:{in:["SUBMITTED","LOCKED"] as const}}:{})
    }},select:{status:true}},
    resultEntries:{where:{sheet:{termId:input.termId,status:{in:["PUBLISHED","LOCKED"]}}},
      include:{sheet:{include:{
        subject:true,classArm:{include:{classLevel:true}},
        gradingScheme:{include:{bands:true}},
        components:{include:{scores:{where:{studentId:input.studentId}}},orderBy:{sortOrder:"asc"}}
      }}}}
  }});
  if(!student||!student.resultEntries.length)return null;
  const enrollment=student.enrollments.find(e=>e.status==="CURRENT")??student.enrollments[0];
  const firstSheet=student.resultEntries[0]!.sheet;
  // Fall back to published sheet class, not a different academic session.
  const classArm=enrollment?.classArm??firstSheet.classArm;
  const offerings=await db.curriculumOffering.findMany({
    where:{campusId:term.campusId,termId:term.id,classArmId:classArm.id},
    select:{subjectId:true,displayName:true,groupName:true,sortOrder:true}
  });
  const offeringMap=new Map(offerings.map(o=>[o.subjectId,o]));

  // Compare only complete published scores from students enrolled in this class/session.
  const cohort=await db.enrollment.findMany({where:{
    campusId:term.campusId,academicSessionId:term.academicSessionId,classArmId:classArm.id
  },select:{studentId:true}});
  const comparisons=await db.resultSheet.findMany({where:{
    id:{in:student.resultEntries.map(e=>e.sheetId)},schoolId:input.schoolId,campusId:term.campusId,
    termId:term.id,classArmId:classArm.id,status:{in:["PUBLISHED","LOCKED"]}
  },select:{id:true,components:{select:{
    maxScore:true,weight:true,scores:{
      where:{studentId:{in:cohort.map(e=>e.studentId)}},select:{studentId:true,score:true}
    }
  }}}});
  const extremes=new Map<string,{highest:number;lowest:number}>();
  for(const sheet of comparisons){
    const marks=new Map<string,Array<{score:number;maxScore:number;weight:number}>>();
    for(const component of sheet.components)for(const score of component.scores){
      const values=marks.get(score.studentId)??[];
      values.push({score:Number(score.score),maxScore:Number(component.maxScore),weight:Number(component.weight)});
      marks.set(score.studentId,values);
    }
    const totals=[...marks.values()].filter(values=>values.length===sheet.components.length&&values.length>0).map(values=>totalWeightedScore(values));
    if(totals.length)extremes.set(sheet.id,{highest:Math.max(...totals),lowest:Math.min(...totals)});
  }
  const rows:ReportRow[]=student.resultEntries.map(entry=>{
    const sheet=entry.sheet;
    const configured=offeringMap.get(sheet.subjectId);
    const values=sheet.components.map(component=>component.scores[0]?Number(component.scores[0].score):null);
    const complete=values.length>0&&values.every(v=>v!==null);
    const total=complete?totalWeightedScore(sheet.components.map(component=>({
      score:component.scores[0]!.score,maxScore:component.maxScore,weight:component.weight
    }))):null;
    const grade=total===null?null:resolveGrade(total,sheet.gradingScheme.bands);
    const byOrder=(sortOrder:number)=> {
      const index=sheet.components.findIndex(c=>c.sortOrder===sortOrder);
      return index>=0?values[index]:null;
    };
    return {
      subject:configured?.displayName??sheet.subject.name,group:configured?.groupName??null,
      sortOrder:configured?.sortOrder??999,
      cat1:byOrder(1),cat2:byOrder(2),exam:byOrder(3),
      total,grade:grade?.label??"—",remark:grade?.remark??"—",
      comment:entry.teacherComment,
      classHighest:extremes.get(sheet.id)?.highest??null,
      classLowest:extremes.get(sheet.id)?.lowest??null,
    };
  }).sort((a,b)=>a.sortOrder-b.sortOrder||a.subject.localeCompare(b.subject));
  const completed=rows.flatMap(row=>row.total===null?[]:[row.total]);
  const average=completed.length?Math.round(completed.reduce((a,b)=>a+b,0)/completed.length*100)/100:null;
  return {
    studentId:student.id,schoolName:student.school.name,campusName:student.campus.name,
    studentName:student.lastName+", "+student.firstName,admissionNumber:student.admissionNumber,
    className:classArm.classLevel.name+" "+classArm.name,section:sectionForClass(classArm.classLevel.code),
    termName:term.name,sessionName:term.academicSession.name,rows,average,
    attendance:attendanceSummary(student.attendanceEntries.map(a=>a.status))
  };
}
