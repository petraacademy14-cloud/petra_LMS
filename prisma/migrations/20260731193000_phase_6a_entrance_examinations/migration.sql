CREATE TYPE "EntranceExamPaperStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');
CREATE TYPE "ApplicantExamStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'SCORED', 'ABSENT', 'CANCELLED');
CREATE TYPE "ExamAttendanceStatus" AS ENUM ('NOT_MARKED', 'PRESENT', 'ABSENT');
CREATE TYPE "ExamAnswerOption" AS ENUM ('A', 'B', 'C', 'D');

CREATE TABLE "entrance_exam_papers" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "classLevelId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "mode" "EntranceExamMode" NOT NULL,
  "instructions" TEXT NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "questionCount" INTEGER NOT NULL,
  "passMark" DECIMAL(5,2) NOT NULL,
  "opensAt" TIMESTAMPTZ,
  "closesAt" TIMESTAMPTZ,
  "scheduledAt" TIMESTAMPTZ,
  "venue" TEXT,
  "status" "EntranceExamPaperStatus" NOT NULL DEFAULT 'DRAFT',
  "createdById" TEXT NOT NULL,
  "publishedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "entrance_exam_papers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "entrance_exam_papers_duration_check" CHECK ("durationMinutes" BETWEEN 10 AND 240),
  CONSTRAINT "entrance_exam_papers_question_count_check" CHECK ("questionCount" BETWEEN 1 AND 200),
  CONSTRAINT "entrance_exam_papers_pass_mark_check" CHECK ("passMark" BETWEEN 0 AND 100),
  CONSTRAINT "entrance_exam_papers_mode_schedule_check" CHECK (
    ("mode" = 'ONLINE' AND "opensAt" IS NOT NULL AND "closesAt" IS NOT NULL AND "opensAt" < "closesAt")
    OR
    ("mode" = 'ONSITE' AND "scheduledAt" IS NOT NULL AND NULLIF(BTRIM("venue"), '') IS NOT NULL)
  )
);

CREATE TABLE "entrance_exam_questions" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "paperId" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "optionA" TEXT NOT NULL,
  "optionB" TEXT NOT NULL,
  "optionC" TEXT NOT NULL,
  "optionD" TEXT NOT NULL,
  "correctOption" "ExamAnswerOption" NOT NULL,
  "marks" DECIMAL(8,2) NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "entrance_exam_questions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "entrance_exam_questions_marks_check" CHECK ("marks" > 0),
  CONSTRAINT "entrance_exam_questions_sort_check" CHECK ("sortOrder" > 0)
);

CREATE TABLE "exam_candidate_sequences" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "currentNumber" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exam_candidate_sequences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "exam_candidate_sequences_number_check" CHECK ("currentNumber" >= 0)
);

CREATE TABLE "applicant_exam_registrations" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "paperId" TEXT NOT NULL,
  "candidateNumber" TEXT NOT NULL,
  "seatNumber" TEXT,
  "status" "ApplicantExamStatus" NOT NULL DEFAULT 'SCHEDULED',
  "startedAt" TIMESTAMPTZ,
  "expiresAt" TIMESTAMPTZ,
  "submittedAt" TIMESTAMPTZ,
  "scoredAt" TIMESTAMPTZ,
  "score" DECIMAL(10,2),
  "maximumScore" DECIMAL(10,2),
  "percentage" DECIMAL(5,2),
  "passed" BOOLEAN,
  "attendanceStatus" "ExamAttendanceStatus" NOT NULL DEFAULT 'NOT_MARKED',
  "attendanceMarkedById" TEXT,
  "attendanceMarkedAt" TIMESTAMPTZ,
  "manualScoreRecordedById" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "applicant_exam_registrations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "applicant_exam_registrations_score_check" CHECK (
    ("score" IS NULL AND "maximumScore" IS NULL AND "percentage" IS NULL AND "passed" IS NULL)
    OR
    ("score" >= 0 AND "maximumScore" > 0 AND "score" <= "maximumScore" AND "percentage" BETWEEN 0 AND 100 AND "passed" IS NOT NULL)
  ),
  CONSTRAINT "applicant_exam_registrations_timer_check" CHECK (
    "expiresAt" IS NULL OR "startedAt" IS NULL OR "expiresAt" > "startedAt"
  )
);

CREATE TABLE "applicant_exam_answers" (
  "id" TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "selectedOption" "ExamAnswerOption",
  "isCorrect" BOOLEAN NOT NULL DEFAULT FALSE,
  "marksAwarded" DECIMAL(8,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "applicant_exam_answers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "applicant_exam_answers_marks_check" CHECK ("marksAwarded" >= 0)
);

CREATE UNIQUE INDEX "entrance_exam_questions_paper_sort_key" ON "entrance_exam_questions"("paperId", "sortOrder");
CREATE INDEX "entrance_exam_papers_school_status_mode_idx" ON "entrance_exam_papers"("schoolId", "status", "mode");
CREATE INDEX "entrance_exam_papers_campus_class_status_idx" ON "entrance_exam_papers"("campusId", "classLevelId", "status");
CREATE INDEX "entrance_exam_questions_school_paper_active_idx" ON "entrance_exam_questions"("schoolId", "paperId", "isActive");
CREATE UNIQUE INDEX "exam_candidate_sequences_school_year_key" ON "exam_candidate_sequences"("schoolId", "year");
CREATE UNIQUE INDEX "applicant_exam_registrations_application_key" ON "applicant_exam_registrations"("applicationId");
CREATE UNIQUE INDEX "applicant_exam_registrations_candidate_key" ON "applicant_exam_registrations"("candidateNumber");
CREATE INDEX "applicant_exam_registrations_paper_status_candidate_idx" ON "applicant_exam_registrations"("paperId", "status", "candidateNumber");
CREATE UNIQUE INDEX "applicant_exam_answers_registration_question_key" ON "applicant_exam_answers"("registrationId", "questionId");
CREATE INDEX "applicant_exam_answers_registration_created_idx" ON "applicant_exam_answers"("registrationId", "createdAt");

ALTER TABLE "entrance_exam_papers" ADD CONSTRAINT "entrance_exam_papers_school_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "entrance_exam_papers" ADD CONSTRAINT "entrance_exam_papers_campus_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "entrance_exam_papers" ADD CONSTRAINT "entrance_exam_papers_class_fkey" FOREIGN KEY ("classLevelId") REFERENCES "class_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "entrance_exam_papers" ADD CONSTRAINT "entrance_exam_papers_creator_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "entrance_exam_questions" ADD CONSTRAINT "entrance_exam_questions_school_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "entrance_exam_questions" ADD CONSTRAINT "entrance_exam_questions_paper_fkey" FOREIGN KEY ("paperId") REFERENCES "entrance_exam_papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "entrance_exam_questions" ADD CONSTRAINT "entrance_exam_questions_creator_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exam_candidate_sequences" ADD CONSTRAINT "exam_candidate_sequences_school_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "applicant_exam_registrations" ADD CONSTRAINT "applicant_exam_registrations_application_fkey" FOREIGN KEY ("applicationId") REFERENCES "admission_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "applicant_exam_registrations" ADD CONSTRAINT "applicant_exam_registrations_paper_fkey" FOREIGN KEY ("paperId") REFERENCES "entrance_exam_papers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "applicant_exam_registrations" ADD CONSTRAINT "applicant_exam_registrations_attendance_marker_fkey" FOREIGN KEY ("attendanceMarkedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "applicant_exam_registrations" ADD CONSTRAINT "applicant_exam_registrations_score_recorder_fkey" FOREIGN KEY ("manualScoreRecordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "applicant_exam_answers" ADD CONSTRAINT "applicant_exam_answers_registration_fkey" FOREIGN KEY ("registrationId") REFERENCES "applicant_exam_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "applicant_exam_answers" ADD CONSTRAINT "applicant_exam_answers_question_fkey" FOREIGN KEY ("questionId") REFERENCES "entrance_exam_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION validate_entrance_exam_paper_scope() RETURNS TRIGGER AS $$
DECLARE campus_school TEXT; class_school TEXT;
BEGIN
  SELECT "schoolId" INTO campus_school FROM "campuses" WHERE "id" = NEW."campusId";
  SELECT "schoolId" INTO class_school FROM "class_levels" WHERE "id" = NEW."classLevelId";
  IF campus_school IS NULL OR class_school IS NULL OR campus_school <> NEW."schoolId" OR class_school <> NEW."schoolId" THEN
    RAISE EXCEPTION 'Entrance exam paper scope mismatch';
  END IF;
  NEW."updatedAt" := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entrance_exam_paper_scope_guard
BEFORE INSERT OR UPDATE ON "entrance_exam_papers"
FOR EACH ROW EXECUTE FUNCTION validate_entrance_exam_paper_scope();

CREATE OR REPLACE FUNCTION validate_entrance_exam_question_scope() RETURNS TRIGGER AS $$
DECLARE paper_school TEXT; paper_status "EntranceExamPaperStatus";
BEGIN
  SELECT "schoolId", "status" INTO paper_school, paper_status FROM "entrance_exam_papers" WHERE "id" = NEW."paperId";
  IF paper_school IS NULL OR paper_school <> NEW."schoolId" THEN
    RAISE EXCEPTION 'Entrance exam question scope mismatch';
  END IF;
  IF TG_OP = 'UPDATE' AND paper_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Published examination questions are locked';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entrance_exam_question_scope_guard
BEFORE INSERT OR UPDATE ON "entrance_exam_questions"
FOR EACH ROW EXECUTE FUNCTION validate_entrance_exam_question_scope();

CREATE OR REPLACE FUNCTION lock_published_exam_questions() RETURNS TRIGGER AS $$
DECLARE paper_status "EntranceExamPaperStatus";
BEGIN
  SELECT "status" INTO paper_status FROM "entrance_exam_papers" WHERE "id" = OLD."paperId";
  IF paper_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Published examination questions cannot be deleted';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entrance_exam_question_delete_guard
BEFORE DELETE ON "entrance_exam_questions"
FOR EACH ROW EXECUTE FUNCTION lock_published_exam_questions();

CREATE OR REPLACE FUNCTION validate_applicant_exam_registration() RETURNS TRIGGER AS $$
DECLARE app_school TEXT; app_campus TEXT; app_class TEXT; app_mode "EntranceExamMode"; app_status "ApplicationStatus";
DECLARE paper_school TEXT; paper_campus TEXT; paper_class TEXT; paper_mode "EntranceExamMode"; paper_status "EntranceExamPaperStatus";
BEGIN
  SELECT "schoolId", "campusId", "classLevelId", "examMode", "status"
    INTO app_school, app_campus, app_class, app_mode, app_status
    FROM "admission_applications" WHERE "id" = NEW."applicationId";
  SELECT "schoolId", "campusId", "classLevelId", "mode", "status"
    INTO paper_school, paper_campus, paper_class, paper_mode, paper_status
    FROM "entrance_exam_papers" WHERE "id" = NEW."paperId";
  IF app_school IS NULL OR paper_school IS NULL OR app_school <> paper_school OR app_campus <> paper_campus OR app_class <> paper_class OR app_mode <> paper_mode THEN
    RAISE EXCEPTION 'Applicant examination registration scope mismatch';
  END IF;
  IF paper_status <> 'PUBLISHED' THEN
    RAISE EXCEPTION 'Applicant can only be registered for a published paper';
  END IF;
  IF app_status NOT IN ('AWAITING_EXAMINATION', 'UNDER_REVIEW') THEN
    RAISE EXCEPTION 'Applicant is not eligible for examination registration';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD."status" <> NEW."status" THEN
    IF NOT (
      (OLD."status" = 'SCHEDULED' AND NEW."status" IN ('IN_PROGRESS', 'SCORED', 'ABSENT', 'CANCELLED')) OR
      (OLD."status" = 'IN_PROGRESS' AND NEW."status" = 'SCORED')
    ) THEN
      RAISE EXCEPTION 'Invalid applicant examination status transition';
    END IF;
  END IF;
  NEW."updatedAt" := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER applicant_exam_registration_guard
BEFORE INSERT OR UPDATE ON "applicant_exam_registrations"
FOR EACH ROW EXECUTE FUNCTION validate_applicant_exam_registration();

CREATE OR REPLACE FUNCTION validate_applicant_exam_answer() RETURNS TRIGGER AS $$
DECLARE registration_status "ApplicantExamStatus"; registration_paper TEXT; question_paper TEXT; question_marks DECIMAL(8,2);
BEGIN
  SELECT "status", "paperId" INTO registration_status, registration_paper FROM "applicant_exam_registrations" WHERE "id" = NEW."registrationId";
  SELECT "paperId", "marks" INTO question_paper, question_marks FROM "entrance_exam_questions" WHERE "id" = NEW."questionId";
  IF registration_status IS NULL OR question_paper IS NULL OR registration_paper <> question_paper THEN
    RAISE EXCEPTION 'Applicant examination answer scope mismatch';
  END IF;
  IF registration_status <> 'IN_PROGRESS' THEN
    RAISE EXCEPTION 'Answers can only be recorded during an active examination';
  END IF;
  IF NEW."marksAwarded" > question_marks THEN
    RAISE EXCEPTION 'Awarded marks exceed question marks';
  END IF;
  NEW."updatedAt" := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER applicant_exam_answer_guard
BEFORE INSERT OR UPDATE ON "applicant_exam_answers"
FOR EACH ROW EXECUTE FUNCTION validate_applicant_exam_answer();
