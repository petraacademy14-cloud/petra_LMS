import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { CurriculumForms } from "./curriculum-forms";

export async function CurriculumPanel() {
  const viewer = await requirePermission("academic.manage");
  const {schoolId,role,campusId} = viewer.membership;
  const campuses = await db.campus.findMany({
    where:{schoolId,isActive:true,...(role==="OWNER"?{}:{id:campusId??"__none__"})},
    select:{id:true,name:true},
    orderBy:{name:"asc"},
  });
  const ids=campuses.map(c=>c.id);
  const [terms,arms,subjects,offerings,enrollments]=await Promise.all([
    db.term.findMany({where:{campusId:{in:ids},isCurrent:true,academicSession:{schoolId,isCurrent:true}},select:{id:true,campusId:true,name:true}}),
    db.classArm.findMany({where:{campusId:{in:ids},isActive:true,classLevel:{schoolId,isActive:true}},select:{id:true,campusId:true,name:true,classLevel:{select:{name:true}}}}),
    db.campusSubject.findMany({where:{campusId:{in:ids},isActive:true,subject:{schoolId,isActive:true}},select:{campusId:true,subject:{select:{id:true,name:true}}}}),
    db.curriculumOffering.findMany({where:{campusId:{in:ids},isActive:true,term:{isCurrent:true,academicSession:{schoolId,isCurrent:true}},subject:{schoolId}},select:{id:true,campusId:true,classArmId:true,displayName:true,groupName:true,pathway:true,isRequired:true,termId:true},orderBy:[{sortOrder:"asc"},{displayName:"asc"}]}),
    db.enrollment.findMany({where:{campusId:{in:ids},status:"CURRENT",academicSession:{schoolId,isCurrent:true},student:{schoolId,status:"ACTIVE"}},select:{id:true,campusId:true,classArmId:true,academicPathway:true,student:{select:{firstName:true,lastName:true,admissionNumber:true}}},orderBy:{student:{lastName:"asc"}}}),
  ]);
  return <CurriculumForms campuses={campuses} terms={terms} arms={arms.map(a=>({id:a.id,campusId:a.campusId,name:a.classLevel.name+" "+a.name}))} subjects={subjects.map(s=>({campusId:s.campusId,...s.subject}))} offerings={offerings} enrollments={enrollments.map(e=>({id:e.id,campusId:e.campusId,classArmId:e.classArmId,pathway:e.academicPathway,name:e.student.lastName+" "+e.student.firstName+" ("+e.student.admissionNumber+")"}))}/>;
}
