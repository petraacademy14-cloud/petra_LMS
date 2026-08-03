CREATE TABLE "student_feedback_reports" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "termId" TEXT NOT NULL,
  "classArmId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "teacherMembershipId" TEXT NOT NULL,
  "teacherUserId" TEXT NOT NULL,
  "feedbackDate" DATE NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SENT',
  "studentNameSnapshot" TEXT NOT NULL,
  "classNameSnapshot" TEXT NOT NULL,
  "teacherNameSnapshot" TEXT NOT NULL,
  "homeworkStatus" TEXT,
  "feedingStatus" TEXT,
  "toiletStatus" TEXT,
  "peerRelationshipStatus" TEXT,
  "conductStatus" TEXT,
  "breakTimeStatus" TEXT,
  "classParticipationStatus" TEXT,
  "healthStatus" TEXT,
  "arrivalStatus" TEXT,
  "observationNote" TEXT,
  "teacherComment" TEXT,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "parentGuardianId" TEXT,
  "parentPortalAccountId" TEXT,
  "parentComment" TEXT,
  "acknowledgedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "student_feedback_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_feedback_reports_student_teacher_date_key"
  ON "student_feedback_reports"("studentId", "teacherMembershipId", "feedbackDate");
CREATE INDEX "student_feedback_reports_school_student_date_idx"
  ON "student_feedback_reports"("schoolId", "studentId", "feedbackDate" DESC);
CREATE INDEX "student_feedback_reports_teacher_date_idx"
  ON "student_feedback_reports"("teacherMembershipId", "feedbackDate" DESC);
CREATE INDEX "student_feedback_reports_parent_ack_idx"
  ON "student_feedback_reports"("parentGuardianId", "acknowledgedAt");

ALTER TABLE "student_feedback_reports"
  ADD CONSTRAINT "student_feedback_reports_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_feedback_reports"
  ADD CONSTRAINT "student_feedback_reports_campusId_fkey"
  FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_feedback_reports"
  ADD CONSTRAINT "student_feedback_reports_termId_fkey"
  FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_feedback_reports"
  ADD CONSTRAINT "student_feedback_reports_classArmId_fkey"
  FOREIGN KEY ("classArmId") REFERENCES "class_arms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_feedback_reports"
  ADD CONSTRAINT "student_feedback_reports_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_feedback_reports"
  ADD CONSTRAINT "student_feedback_reports_teacherMembershipId_fkey"
  FOREIGN KEY ("teacherMembershipId") REFERENCES "school_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_feedback_reports"
  ADD CONSTRAINT "student_feedback_reports_teacherUserId_fkey"
  FOREIGN KEY ("teacherUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_feedback_reports"
  ADD CONSTRAINT "student_feedback_reports_parentGuardianId_fkey"
  FOREIGN KEY ("parentGuardianId") REFERENCES "guardians"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_feedback_reports"
  ADD CONSTRAINT "student_feedback_reports_parentPortalAccountId_fkey"
  FOREIGN KEY ("parentPortalAccountId") REFERENCES "portal_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
