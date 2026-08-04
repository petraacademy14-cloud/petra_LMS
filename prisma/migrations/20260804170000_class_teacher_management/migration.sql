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

WITH existing_class_offerings AS (
  SELECT
    arm."campusId",
    arm."classLevelId",
    MAX(arm."capacity") AS "capacity"
  FROM "class_arms" arm
  WHERE arm."isActive" = true
  GROUP BY arm."campusId", arm."classLevelId"
), required_arms AS (
  SELECT * FROM (VALUES ('A'), ('B')) AS arm("code")
)
INSERT INTO "class_arms" (
  "id",
  "campusId",
  "classLevelId",
  "name",
  "code",
  "capacity",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  'arm_' || md5(
    random()::text || clock_timestamp()::text || offering."campusId" || offering."classLevelId" || required."code"
  ),
  offering."campusId",
  offering."classLevelId",
  required."code",
  required."code",
  offering."capacity",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM existing_class_offerings offering
CROSS JOIN required_arms required
WHERE NOT EXISTS (
  SELECT 1
  FROM "class_arms" existing
  WHERE existing."campusId" = offering."campusId"
    AND existing."classLevelId" = offering."classLevelId"
    AND existing."code" = required."code"
)
ON CONFLICT DO NOTHING;

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

CREATE OR REPLACE FUNCTION sync_class_teacher_assignment_access()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "teaching_assignments" assignment
  USING "terms" term
  WHERE assignment."termId" = term."id"
    AND term."academicSessionId" = NEW."academicSessionId"
    AND term."campusId" = NEW."campusId"
    AND assignment."classArmId" = NEW."classArmId"
    AND assignment."teacherMembershipId" <> NEW."teacherMembershipId";

  UPDATE "result_sheets" sheet
  SET
    "teacherMembershipId" = NEW."teacherMembershipId",
    "updatedAt" = CURRENT_TIMESTAMP
  FROM "terms" term
  WHERE sheet."termId" = term."id"
    AND term."academicSessionId" = NEW."academicSessionId"
    AND term."campusId" = NEW."campusId"
    AND sheet."classArmId" = NEW."classArmId"
    AND sheet."teacherMembershipId" <> NEW."teacherMembershipId"
    AND sheet."status" = 'DRAFT';

  INSERT INTO "teaching_assignments" (
    "id",
    "schoolId",
    "campusId",
    "termId",
    "classArmId",
    "subjectId",
    "teacherMembershipId",
    "createdAt"
  )
  SELECT
    'ta_' || md5(
      random()::text || clock_timestamp()::text || NEW."id" || term."id" || offering."subjectId"
    ),
    NEW."schoolId",
    NEW."campusId",
    term."id",
    NEW."classArmId",
    offering."subjectId",
    NEW."teacherMembershipId",
    CURRENT_TIMESTAMP
  FROM "terms" term
  JOIN "campus_subjects" offering
    ON offering."campusId" = NEW."campusId"
   AND offering."isActive" = true
  WHERE term."academicSessionId" = NEW."academicSessionId"
    AND term."campusId" = NEW."campusId"
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "class_teacher_assignments_access_sync"
AFTER INSERT OR UPDATE OF "teacherMembershipId" ON "class_teacher_assignments"
FOR EACH ROW EXECUTE FUNCTION sync_class_teacher_assignment_access();

CREATE OR REPLACE FUNCTION sync_class_teachers_for_new_term()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "teaching_assignments" (
    "id",
    "schoolId",
    "campusId",
    "termId",
    "classArmId",
    "subjectId",
    "teacherMembershipId",
    "createdAt"
  )
  SELECT
    'ta_' || md5(
      random()::text || clock_timestamp()::text || class_teacher."id" || NEW."id" || offering."subjectId"
    ),
    class_teacher."schoolId",
    class_teacher."campusId",
    NEW."id",
    class_teacher."classArmId",
    offering."subjectId",
    class_teacher."teacherMembershipId",
    CURRENT_TIMESTAMP
  FROM "class_teacher_assignments" class_teacher
  JOIN "campus_subjects" offering
    ON offering."campusId" = NEW."campusId"
   AND offering."isActive" = true
  WHERE class_teacher."academicSessionId" = NEW."academicSessionId"
    AND class_teacher."campusId" = NEW."campusId"
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "terms_class_teacher_access_sync"
AFTER INSERT ON "terms"
FOR EACH ROW EXECUTE FUNCTION sync_class_teachers_for_new_term();

CREATE OR REPLACE FUNCTION sync_class_teachers_for_subject()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."isActive" = true THEN
    INSERT INTO "teaching_assignments" (
      "id",
      "schoolId",
      "campusId",
      "termId",
      "classArmId",
      "subjectId",
      "teacherMembershipId",
      "createdAt"
    )
    SELECT
      'ta_' || md5(
        random()::text || clock_timestamp()::text || class_teacher."id" || term."id" || NEW."subjectId"
      ),
      class_teacher."schoolId",
      class_teacher."campusId",
      term."id",
      class_teacher."classArmId",
      NEW."subjectId",
      class_teacher."teacherMembershipId",
      CURRENT_TIMESTAMP
    FROM "class_teacher_assignments" class_teacher
    JOIN "terms" term
      ON term."academicSessionId" = class_teacher."academicSessionId"
     AND term."campusId" = class_teacher."campusId"
    WHERE class_teacher."campusId" = NEW."campusId"
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "campus_subjects_class_teacher_access_sync"
AFTER INSERT OR UPDATE OF "isActive" ON "campus_subjects"
FOR EACH ROW EXECUTE FUNCTION sync_class_teachers_for_subject();
