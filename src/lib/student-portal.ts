export const releasedAttendanceStatuses = ["SUBMITTED", "LOCKED"] as const;
export const releasedResultStatuses = ["PUBLISHED", "LOCKED"] as const;

export function isReleasedAttendanceStatus(status: string) {
  return releasedAttendanceStatuses.includes(
    status as (typeof releasedAttendanceStatuses)[number],
  );
}

export function isReleasedResultStatus(status: string) {
  return releasedResultStatuses.includes(
    status as (typeof releasedResultStatuses)[number],
  );
}

export function uniqueStudentReportTerms(termIds: string[]) {
  return [...new Set(termIds)];
}

export function studentCanSeeAnnouncement(input: {
  status: string;
  parentFacing: boolean;
  scheduledFor: Date | null;
  now: Date;
  audience: "SCHOOL" | "CAMPUS" | "CLASS";
  campusId: string | null;
  classArmId: string | null;
  studentCampusId: string;
  studentClassArmId: string | null;
}) {
  if (input.status !== "PUBLISHED" || !input.parentFacing) return false;
  if (input.scheduledFor && input.scheduledFor > input.now) return false;
  if (input.audience === "SCHOOL") return true;
  if (input.audience === "CAMPUS") {
    return input.campusId === input.studentCampusId;
  }
  return Boolean(
    input.studentClassArmId && input.classArmId === input.studentClassArmId,
  );
}
