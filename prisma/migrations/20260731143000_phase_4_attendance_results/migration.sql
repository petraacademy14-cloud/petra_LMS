-- CreateEnum
CREATE TYPE "public"."AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateEnum
CREATE TYPE "public"."AttendanceRegisterStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'LOCKED');

-- CreateEnum
CREATE TYPE "public"."AssessmentKind" AS ENUM ('CONTINUOUS_ASSESSMENT', 'EXAM');

-- CreateEnum
CREATE TYPE "public"."ResultSheetStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PUBLISHED', 'LOCKED');

-- CreateTable
CREATE TABLE "public"."teaching_assignments" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classArmId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherMembershipId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teaching_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."attendance_registers" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classArmId" TEXT NOT NULL,
    "registerDate" DATE NOT NULL,
    "status" "public"."AttendanceRegisterStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "lockedById" TEXT,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."attendance_entries" (
    "id" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "public"."AttendanceStatus" NOT NULL,
    "note" TEXT,
    "markedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."attendance_corrections" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "beforeStatus" "public"."AttendanceStatus" NOT NULL,
    "afterStatus" "public"."AttendanceStatus" NOT NULL,
    "beforeNote" TEXT,
    "afterNote" TEXT,
    "reason" TEXT NOT NULL,
    "correctedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."grading_schemes" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "caWeight" DECIMAL(5,2) NOT NULL,
    "examWeight" DECIMAL(5,2) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grading_schemes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."grade_bands" (
    "id" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "minScore" DECIMAL(5,2) NOT NULL,
    "maxScore" DECIMAL(5,2) NOT NULL,
    "remark" TEXT NOT NULL,
    "gradePoint" DECIMAL(4,2),
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "grade_bands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."result_sheets" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classArmId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "gradingSchemeId" TEXT NOT NULL,
    "teacherMembershipId" TEXT NOT NULL,
    "status" "public"."ResultSheetStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "lockedById" TEXT,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "result_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assessment_components" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "public"."AssessmentKind" NOT NULL,
    "maxScore" DECIMAL(6,2) NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."student_scores" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "score" DECIMAL(6,2) NOT NULL,
    "markedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."score_corrections" (
    "id" TEXT NOT NULL,
    "scoreId" TEXT NOT NULL,
    "beforeScore" DECIMAL(6,2) NOT NULL,
    "afterScore" DECIMAL(6,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "correctedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."result_entries" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherComment" TEXT,
    "adminComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "result_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teaching_assignments_campusId_termId_classArmId_idx" ON "public"."teaching_assignments"("campusId", "termId", "classArmId");

-- CreateIndex
CREATE INDEX "teaching_assignments_teacherMembershipId_termId_idx" ON "public"."teaching_assignments"("teacherMembershipId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "teaching_assignments_termId_classArmId_subjectId_teacherMem_key" ON "public"."teaching_assignments"("termId", "classArmId", "subjectId", "teacherMembershipId");

-- CreateIndex
CREATE INDEX "attendance_registers_campusId_termId_registerDate_idx" ON "public"."attendance_registers"("campusId", "termId", "registerDate" DESC);

-- CreateIndex
CREATE INDEX "attendance_registers_schoolId_registerDate_idx" ON "public"."attendance_registers"("schoolId", "registerDate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_registers_classArmId_registerDate_key" ON "public"."attendance_registers"("classArmId", "registerDate");

-- CreateIndex
CREATE INDEX "attendance_entries_studentId_createdAt_idx" ON "public"."attendance_entries"("studentId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_entries_registerId_studentId_key" ON "public"."attendance_entries"("registerId", "studentId");

-- CreateIndex
CREATE INDEX "attendance_corrections_entryId_createdAt_idx" ON "public"."attendance_corrections"("entryId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "grading_schemes_schoolId_isDefault_idx" ON "public"."grading_schemes"("schoolId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "grading_schemes_schoolId_name_key" ON "public"."grading_schemes"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "grade_bands_schemeId_label_key" ON "public"."grade_bands"("schemeId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "grade_bands_schemeId_sortOrder_key" ON "public"."grade_bands"("schemeId", "sortOrder");

-- CreateIndex
CREATE INDEX "result_sheets_campusId_termId_status_idx" ON "public"."result_sheets"("campusId", "termId", "status");

-- CreateIndex
CREATE INDEX "result_sheets_teacherMembershipId_termId_status_idx" ON "public"."result_sheets"("teacherMembershipId", "termId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "result_sheets_termId_classArmId_subjectId_key" ON "public"."result_sheets"("termId", "classArmId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_components_sheetId_name_key" ON "public"."assessment_components"("sheetId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_components_sheetId_sortOrder_key" ON "public"."assessment_components"("sheetId", "sortOrder");

-- CreateIndex
CREATE INDEX "student_scores_studentId_createdAt_idx" ON "public"."student_scores"("studentId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "student_scores_componentId_studentId_key" ON "public"."student_scores"("componentId", "studentId");

-- CreateIndex
CREATE INDEX "score_corrections_scoreId_createdAt_idx" ON "public"."score_corrections"("scoreId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "result_entries_studentId_createdAt_idx" ON "public"."result_entries"("studentId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "result_entries_sheetId_studentId_key" ON "public"."result_entries"("sheetId", "studentId");

-- AddForeignKey
ALTER TABLE "public"."teaching_assignments" ADD CONSTRAINT "teaching_assignments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teaching_assignments" ADD CONSTRAINT "teaching_assignments_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "public"."campuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teaching_assignments" ADD CONSTRAINT "teaching_assignments_termId_fkey" FOREIGN KEY ("termId") REFERENCES "public"."terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teaching_assignments" ADD CONSTRAINT "teaching_assignments_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "public"."class_arms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teaching_assignments" ADD CONSTRAINT "teaching_assignments_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teaching_assignments" ADD CONSTRAINT "teaching_assignments_teacherMembershipId_fkey" FOREIGN KEY ("teacherMembershipId") REFERENCES "public"."school_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance_registers" ADD CONSTRAINT "attendance_registers_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance_registers" ADD CONSTRAINT "attendance_registers_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "public"."campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance_registers" ADD CONSTRAINT "attendance_registers_termId_fkey" FOREIGN KEY ("termId") REFERENCES "public"."terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance_registers" ADD CONSTRAINT "attendance_registers_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "public"."class_arms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance_registers" ADD CONSTRAINT "attendance_registers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance_registers" ADD CONSTRAINT "attendance_registers_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance_registers" ADD CONSTRAINT "attendance_registers_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance_entries" ADD CONSTRAINT "attendance_entries_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "public"."attendance_registers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance_entries" ADD CONSTRAINT "attendance_entries_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance_entries" ADD CONSTRAINT "attendance_entries_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance_corrections" ADD CONSTRAINT "attendance_corrections_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "public"."attendance_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance_corrections" ADD CONSTRAINT "attendance_corrections_correctedById_fkey" FOREIGN KEY ("correctedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."grading_schemes" ADD CONSTRAINT "grading_schemes_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."grade_bands" ADD CONSTRAINT "grade_bands_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "public"."grading_schemes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."result_sheets" ADD CONSTRAINT "result_sheets_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."result_sheets" ADD CONSTRAINT "result_sheets_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "public"."campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."result_sheets" ADD CONSTRAINT "result_sheets_termId_fkey" FOREIGN KEY ("termId") REFERENCES "public"."terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."result_sheets" ADD CONSTRAINT "result_sheets_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "public"."class_arms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."result_sheets" ADD CONSTRAINT "result_sheets_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."result_sheets" ADD CONSTRAINT "result_sheets_gradingSchemeId_fkey" FOREIGN KEY ("gradingSchemeId") REFERENCES "public"."grading_schemes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."result_sheets" ADD CONSTRAINT "result_sheets_teacherMembershipId_fkey" FOREIGN KEY ("teacherMembershipId") REFERENCES "public"."school_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."result_sheets" ADD CONSTRAINT "result_sheets_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."result_sheets" ADD CONSTRAINT "result_sheets_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."result_sheets" ADD CONSTRAINT "result_sheets_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."result_sheets" ADD CONSTRAINT "result_sheets_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assessment_components" ADD CONSTRAINT "assessment_components_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "public"."result_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."student_scores" ADD CONSTRAINT "student_scores_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "public"."assessment_components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."student_scores" ADD CONSTRAINT "student_scores_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."student_scores" ADD CONSTRAINT "student_scores_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."score_corrections" ADD CONSTRAINT "score_corrections_scoreId_fkey" FOREIGN KEY ("scoreId") REFERENCES "public"."student_scores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."score_corrections" ADD CONSTRAINT "score_corrections_correctedById_fkey" FOREIGN KEY ("correctedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."result_entries" ADD CONSTRAINT "result_entries_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "public"."result_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."result_entries" ADD CONSTRAINT "result_entries_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Business-rule constraints
ALTER TABLE "grading_schemes"
  ADD CONSTRAINT "grading_schemes_weight_total_check"
  CHECK ("caWeight" > 0 AND "examWeight" > 0 AND "caWeight" + "examWeight" = 100);

ALTER TABLE "grade_bands"
  ADD CONSTRAINT "grade_bands_range_check"
  CHECK ("minScore" >= 0 AND "maxScore" <= 100 AND "minScore" <= "maxScore");

ALTER TABLE "assessment_components"
  ADD CONSTRAINT "assessment_components_values_check"
  CHECK ("maxScore" > 0 AND "weight" > 0 AND "weight" <= 100);

ALTER TABLE "student_scores"
  ADD CONSTRAINT "student_scores_non_negative_check" CHECK ("score" >= 0);

-- Seed one editable Nigerian-school default per existing school.
INSERT INTO "grading_schemes" (
  "id", "schoolId", "name", "caWeight", "examWeight", "isDefault", "createdAt", "updatedAt"
)
SELECT
  'scheme_' || md5(school."id" || ':standard-40-60'),
  school."id",
  'Standard 40/60',
  40,
  60,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "schools" AS school
ON CONFLICT ("schoolId", "name") DO NOTHING;

INSERT INTO "grade_bands" (
  "id", "schemeId", "label", "minScore", "maxScore", "remark", "gradePoint", "sortOrder"
)
SELECT
  'band_' || md5(scheme."id" || ':' || band.label),
  scheme."id",
  band.label,
  band.minimum,
  band.maximum,
  band.remark,
  band.points,
  band.position
FROM "grading_schemes" AS scheme
CROSS JOIN (
  VALUES
    ('A', 70.00, 100.00, 'Excellent', 5.00, 1),
    ('B', 60.00, 69.99, 'Very good', 4.00, 2),
    ('C', 50.00, 59.99, 'Good', 3.00, 3),
    ('D', 45.00, 49.99, 'Fair', 2.00, 4),
    ('E', 40.00, 44.99, 'Pass', 1.00, 5),
    ('F', 0.00, 39.99, 'Needs improvement', 0.00, 6)
) AS band(label, minimum, maximum, remark, points, position)
WHERE scheme."name" = 'Standard 40/60'
ON CONFLICT ("schemeId", "label") DO NOTHING;

-- Cross-campus and role guards for operational records.
CREATE OR REPLACE FUNCTION enforce_phase_4_scope()
RETURNS TRIGGER AS $$
DECLARE
  expected_school_id TEXT;
  expected_campus_id TEXT;
BEGIN
  IF TG_TABLE_NAME = 'teaching_assignments' THEN
    SELECT campus."schoolId", campus."id"
      INTO expected_school_id, expected_campus_id
      FROM "campuses" AS campus
      JOIN "terms" AS term ON term."campusId" = campus."id"
      JOIN "class_arms" AS arm ON arm."campusId" = campus."id"
      JOIN "subjects" AS subject ON subject."schoolId" = campus."schoolId"
      JOIN "school_memberships" AS membership
        ON membership."id" = NEW."teacherMembershipId"
       AND membership."schoolId" = campus."schoolId"
       AND membership."campusId" = campus."id"
       AND membership."role" = 'TEACHER'
       AND membership."status" = 'ACTIVE'
     WHERE campus."id" = NEW."campusId"
       AND term."id" = NEW."termId"
       AND arm."id" = NEW."classArmId"
       AND subject."id" = NEW."subjectId";
  ELSIF TG_TABLE_NAME = 'attendance_registers' THEN
    SELECT campus."schoolId", campus."id"
      INTO expected_school_id, expected_campus_id
      FROM "campuses" AS campus
      JOIN "terms" AS term ON term."campusId" = campus."id"
      JOIN "class_arms" AS arm ON arm."campusId" = campus."id"
     WHERE campus."id" = NEW."campusId"
       AND term."id" = NEW."termId"
       AND arm."id" = NEW."classArmId";
  ELSE
    SELECT campus."schoolId", campus."id"
      INTO expected_school_id, expected_campus_id
      FROM "campuses" AS campus
      JOIN "terms" AS term ON term."campusId" = campus."id"
      JOIN "class_arms" AS arm ON arm."campusId" = campus."id"
      JOIN "subjects" AS subject ON subject."schoolId" = campus."schoolId"
      JOIN "grading_schemes" AS scheme ON scheme."schoolId" = campus."schoolId"
      JOIN "school_memberships" AS membership
        ON membership."id" = NEW."teacherMembershipId"
       AND membership."schoolId" = campus."schoolId"
       AND membership."campusId" = campus."id"
       AND membership."role" = 'TEACHER'
       AND membership."status" = 'ACTIVE'
     WHERE campus."id" = NEW."campusId"
       AND term."id" = NEW."termId"
       AND arm."id" = NEW."classArmId"
       AND subject."id" = NEW."subjectId"
       AND scheme."id" = NEW."gradingSchemeId";
  END IF;

  IF expected_school_id IS NULL
     OR expected_school_id <> NEW."schoolId"
     OR expected_campus_id <> NEW."campusId" THEN
    RAISE EXCEPTION 'Phase 4 scope mismatch for %', TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER teaching_assignments_scope_guard
BEFORE INSERT OR UPDATE ON "teaching_assignments"
FOR EACH ROW EXECUTE FUNCTION enforce_phase_4_scope();

CREATE TRIGGER attendance_registers_scope_guard
BEFORE INSERT OR UPDATE ON "attendance_registers"
FOR EACH ROW EXECUTE FUNCTION enforce_phase_4_scope();

CREATE TRIGGER result_sheets_scope_guard
BEFORE INSERT OR UPDATE ON "result_sheets"
FOR EACH ROW EXECUTE FUNCTION enforce_phase_4_scope();

CREATE OR REPLACE FUNCTION prevent_locked_academic_edits()
RETURNS TRIGGER AS $$
DECLARE
  register_state "AttendanceRegisterStatus";
  sheet_state "ResultSheetStatus";
BEGIN
  IF TG_TABLE_NAME = 'attendance_entries' THEN
    SELECT "status" INTO register_state
      FROM "attendance_registers"
     WHERE "id" = COALESCE(NEW."registerId", OLD."registerId");
    IF register_state = 'LOCKED' THEN
      RAISE EXCEPTION 'Locked attendance registers cannot be edited';
    END IF;
  ELSIF TG_TABLE_NAME = 'assessment_components' THEN
    SELECT "status" INTO sheet_state
      FROM "result_sheets"
     WHERE "id" = COALESCE(NEW."sheetId", OLD."sheetId");
    IF sheet_state = 'LOCKED' THEN
      RAISE EXCEPTION 'Locked result sheets cannot be edited';
    END IF;
  ELSIF TG_TABLE_NAME = 'student_scores' THEN
    SELECT sheet."status" INTO sheet_state
      FROM "assessment_components" AS component
      JOIN "result_sheets" AS sheet ON sheet."id" = component."sheetId"
     WHERE component."id" = COALESCE(NEW."componentId", OLD."componentId");
    IF sheet_state = 'LOCKED' THEN
      RAISE EXCEPTION 'Locked result sheets cannot be edited';
    END IF;
  ELSE
    SELECT "status" INTO sheet_state
      FROM "result_sheets"
     WHERE "id" = COALESCE(NEW."sheetId", OLD."sheetId");
    IF sheet_state = 'LOCKED' THEN
      RAISE EXCEPTION 'Locked result sheets cannot be edited';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attendance_entries_lock_guard
BEFORE INSERT OR UPDATE OR DELETE ON "attendance_entries"
FOR EACH ROW EXECUTE FUNCTION prevent_locked_academic_edits();

CREATE TRIGGER assessment_components_lock_guard
BEFORE INSERT OR UPDATE OR DELETE ON "assessment_components"
FOR EACH ROW EXECUTE FUNCTION prevent_locked_academic_edits();

CREATE TRIGGER student_scores_lock_guard
BEFORE INSERT OR UPDATE OR DELETE ON "student_scores"
FOR EACH ROW EXECUTE FUNCTION prevent_locked_academic_edits();

CREATE TRIGGER result_entries_lock_guard
BEFORE INSERT OR UPDATE OR DELETE ON "result_entries"
FOR EACH ROW EXECUTE FUNCTION prevent_locked_academic_edits();
