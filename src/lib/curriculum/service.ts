import "server-only";
import { z } from "zod";
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
