CREATE TABLE "class_teacher_assignments" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "academicSessionId" TEXT NOT NULL,
  "classArmId" TEXT NOT NULL,
  "teacherMembershipId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "class_teacher_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "class_teacher_assignments_academicSessionId_classArmId_key"
  ON "class_teacher_assignments"("academicSessionId", "classArmId");
CREATE INDEX "class_teacher_assignments_schoolId_academicSessionId_idx"
  ON "class_teacher_assignments"("schoolId", "academicSessionId");
CREATE INDEX "class_teacher_assignments_campusId_classArmId_idx"
  ON "class_teacher_assignments"("campusId", "classArmId");
CREATE INDEX "class_teacher_assignments_teacherMembershipId_idx"
  ON "class_teacher_assignments"("teacherMembershipId");

ALTER TABLE "class_teacher_assignments"
  ADD CONSTRAINT "class_teacher_assignments_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_teacher_assignments"
  ADD CONSTRAINT "class_teacher_assignments_campusId_fkey"
  FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_teacher_assignments"
  ADD CONSTRAINT "class_teacher_assignments_academicSessionId_fkey"
  FOREIGN KEY ("academicSessionId") REFERENCES "academic_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_teacher_assignments"
  ADD CONSTRAINT "class_teacher_assignments_classArmId_fkey"
  FOREIGN KEY ("classArmId") REFERENCES "class_arms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_teacher_assignments"
  ADD CONSTRAINT "class_teacher_assignments_teacherMembershipId_fkey"
  FOREIGN KEY ("teacherMembershipId") REFERENCES "school_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION validate_class_teacher_assignment_scope()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "class_arms" arm
    JOIN "campuses" campus ON campus."id" = arm."campusId"
    JOIN "class_levels" level ON level."id" = arm."classLevelId"
    WHERE arm."id" = NEW."classArmId"
      AND arm."campusId" = NEW."campusId"
      AND campus."schoolId" = NEW."schoolId"
      AND level."schoolId" = NEW."schoolId"
  ) THEN
    RAISE EXCEPTION 'Class teacher assignment has an invalid class scope';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM "academic_sessions" session
    WHERE session."id" = NEW."academicSessionId"
      AND session."schoolId" = NEW."schoolId"
  ) THEN
    RAISE EXCEPTION 'Class teacher assignment has an invalid academic session';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM "school_memberships" membership
    WHERE membership."id" = NEW."teacherMembershipId"
      AND membership."schoolId" = NEW."schoolId"
      AND membership."campusId" = NEW."campusId"
      AND membership."role" = 'TEACHER'
      AND membership."status" = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Class teacher assignment has an invalid teacher';
  END IF;

  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "class_teacher_assignments_scope_guard"
BEFORE INSERT OR UPDATE ON "class_teacher_assignments"
FOR EACH ROW EXECUTE FUNCTION validate_class_teacher_assignment_scope();
