export type ParentAnnouncementScope = {
  audience: "SCHOOL" | "CAMPUS" | "CLASS";
  campusId: string | null;
  classArmId: string | null;
};

export type ParentStudentScope = {
  studentId: string;
  campusId: string;
  classArmId: string | null;
};

export function guardianCanAccessStudent(
  linkedStudentIds: readonly string[],
  studentId: string,
) {
  return linkedStudentIds.includes(studentId);
}

export function announcementIsVisibleToStudent(
  announcement: ParentAnnouncementScope,
  student: ParentStudentScope,
) {
  if (announcement.audience === "SCHOOL") return true;
  if (announcement.audience === "CAMPUS") {
    return announcement.campusId === student.campusId;
  }
  return Boolean(
    student.classArmId && announcement.classArmId === student.classArmId,
  );
}

export function uniqueTermIds(termIds: readonly string[]) {
  return [...new Set(termIds.filter(Boolean))];
}
