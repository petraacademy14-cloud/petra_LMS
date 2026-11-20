import "server-only";
import { z } from "zod";
import { createHash } from "node:crypto";
import { catalogNames, subjectKey, isSeniorClassCode } from "./registration";
import { db } from "@/lib/db";
import { requireCampusAccess, requirePermission } from "@/lib/dal";

const id = z.string().trim().min(1).max(128);
const offeringInput = z.object({
  campusId: id, termId: id, classArmId: id, subjectId: id,
  displayName: z.string().trim().min(1).max(120),
  groupName: z.string().trim().min(1).max(120).nullable(),
  sortOrder: z.number().int().min(0).max(1000),
  pathway: z.enum(["SCIENCE", "ARTS", "COMMERCIAL"]).nullable(),
  isRequired: z.boolean(),
});

export async function createCurriculumOffering(input: unknown) {
  const data = offeringInput.parse(input);
  const viewer = await requirePermission("academic.manage");
  await requireCampusAccess(data.campusId);
  const schoolId = viewer.membership.schoolId;
  return db.$transaction(async (tx) => {
    const [term, arm, subject] = await Promise.all([
      tx.term.findFirst({where:{id:data.termId,campusId:data.campusId,academicSession:{schoolId,isCurrent:true},isCurrent:true}}),
      tx.classArm.findFirst({where:{id:data.classArmId,campusId:data.campusId,isActive:true,classLevel:{schoolId,isActive:true}}}),
      tx.subject.findFirst({where:{id:data.subjectId,schoolId,isActive:true,campusSubjects:{some:{campusId:data.campusId,isActive:true}}}}),
    ]);
    if (!term || !arm || !subject) throw new Error("INVALID_CURRICULUM_SCOPE");
    const offering = await tx.curriculumOffering.create({data});
    await tx.auditLog.create({data:{schoolId,campusId:data.campusId,actorUserId:viewer.user.id,action:"curriculum.offering.create",entityType:"CurriculumOffering",entityId:offering.id,after:data}});
    return offering;
  }, {isolationLevel:"Serializable"});
}

const selectionInput = z.object({campusId:id,enrollmentId:id,offeringId:id});

export async function addStudentSubjectSelection(input: unknown) {
  const data = selectionInput.parse(input);
  const viewer = await requirePermission("academic.manage");
  await requireCampusAccess(data.campusId);
  const schoolId = viewer.membership.schoolId;
  return db.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.findFirst({where:{id:data.enrollmentId,campusId:data.campusId,status:"CURRENT",student:{schoolId,campusId:data.campusId,status:"ACTIVE"},academicSession:{schoolId,isCurrent:true}}});
    if (!enrollment) throw new Error("INVALID_ENROLLMENT_SCOPE");
    const offering = await tx.curriculumOffering.findFirst({where:{id:data.offeringId,campusId:data.campusId,classArmId:enrollment.classArmId,isActive:true,term:{campusId:data.campusId,academicSessionId:enrollment.academicSessionId,isCurrent:true},subject:{schoolId,isActive:true,campusSubjects:{some:{campusId:data.campusId,isActive:true}}}}});
    if (!offering || (offering.pathway !== null && offering.pathway !== enrollment.academicPathway)) throw new Error("INVALID_SUBJECT_SELECTION");
    const previous = await tx.studentSubjectSelection.findUnique({where:{enrollmentId_offeringId:{enrollmentId:data.enrollmentId,offeringId:data.offeringId}}});
    if (previous?.isActive) return previous;
    if (previous && previous.campusId !== data.campusId) throw new Error("INVALID_SELECTION_SCOPE");
    const selection = await tx.studentSubjectSelection.upsert({where:{enrollmentId_offeringId:{enrollmentId:data.enrollmentId,offeringId:data.offeringId}},create:data,update:{isActive:true}});
    await tx.auditLog.create({data:{schoolId,campusId:data.campusId,actorUserId:viewer.user.id,action:"curriculum.selection.activate",entityType:"StudentSubjectSelection",entityId:selection.id,before:{isActive:previous?.isActive??false},after:{...data,isActive:true}}});
    return selection;
  }, {isolationLevel:"Serializable"});
}

export async function registerCampusCatalog(input: unknown) {
  const {campusId}=z.object({campusId:id}).parse(input);
  const viewer=await requirePermission("academic.manage");
  await requireCampusAccess(campusId);
  const schoolId=viewer.membership.schoolId;
  return db.$transaction(async tx=>{
    const existing=await tx.subject.findMany({where:{schoolId}});
    const byKey=new Map<string,typeof existing>();
    for(const subject of existing){
      const key=subjectKey(subject.name);
      byKey.set(key,[...(byKey.get(key)??[]),subject]);
    }
    let created=0, enabled=0, skipped=0;
    for(const name of catalogNames()){
      const key=subjectKey(name);
      const matches=byKey.get(key)??[];
      if(matches.length>1 || (matches.length===1&&!matches[0].isActive)){skipped++;continue;}
      let subject=matches[0];
      if(!subject){
        const code="CUR-"+createHash("sha256").update(key).digest("hex").slice(0,12).toUpperCase();
        if(existing.some(s=>s.code===code)){skipped++;continue;}
        subject=await tx.subject.create({data:{schoolId,name,code}});
        existing.push(subject);
        byKey.set(key,[subject]);
        created++;
      }
      const previous=await tx.campusSubject.findUnique({where:{campusId_subjectId:{campusId,subjectId:subject.id}}});
      if(previous?.isActive)continue;
      const link=await tx.campusSubject.upsert({where:{campusId_subjectId:{campusId,subjectId:subject.id}},create:{campusId,subjectId:subject.id},update:{isActive:true}});
      await tx.auditLog.create({data:{schoolId,campusId,actorUserId:viewer.user.id,action:"curriculum.catalog.enable",entityType:"CampusSubject",entityId:link.id,after:{subjectId:subject.id,name:subject.name,created:matches.length===0}}});
      enabled++;
    }
    return {created,enabled,skipped};
  },{isolationLevel:"Serializable",timeout:60000});
}

export async function setStudentPathway(input:unknown){
  const data=z.object({campusId:id,enrollmentId:id,pathway:z.enum(["SCIENCE","ARTS","COMMERCIAL"])}).parse(input);
  const viewer=await requirePermission("academic.manage");
  await requireCampusAccess(data.campusId);
  const schoolId=viewer.membership.schoolId;
  return db.$transaction(async tx=>{
    const enrollment=await tx.enrollment.findFirst({where:{id:data.enrollmentId,campusId:data.campusId,status:"CURRENT",student:{schoolId,campusId:data.campusId,status:"ACTIVE"},academicSession:{schoolId,isCurrent:true},classArm:{campusId:data.campusId,classLevel:{schoolId}}},include:{classArm:{include:{classLevel:true}}}});
    if(!enrollment||!isSeniorClassCode(enrollment.classArm.classLevel.code))throw new Error("INVALID_SENIOR_ENROLLMENT");
    if(enrollment.academicPathway===data.pathway)return;
    const conflicting=await tx.studentSubjectSelection.count({where:{enrollmentId:enrollment.id,isActive:true,offering:{pathway:{not:null},NOT:{pathway:data.pathway}}}});
    if(conflicting)throw new Error("PATHWAY_HAS_CONFLICTING_SELECTIONS");
    await tx.enrollment.update({where:{id:enrollment.id},data:{academicPathway:data.pathway}});
    await tx.auditLog.create({data:{schoolId,campusId:data.campusId,actorUserId:viewer.user.id,action:"curriculum.pathway.set",entityType:"Enrollment",entityId:enrollment.id,before:{pathway:enrollment.academicPathway},after:{pathway:data.pathway}}});
  },{isolationLevel:"Serializable"});
}
