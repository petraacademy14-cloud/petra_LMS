CREATE OR REPLACE FUNCTION validate_entrance_exam_question_scope() RETURNS TRIGGER AS $$
DECLARE paper_school TEXT; paper_status "EntranceExamPaperStatus";
BEGIN
  SELECT "schoolId", "status" INTO paper_school, paper_status FROM "entrance_exam_papers" WHERE "id" = NEW."paperId";
  IF paper_school IS NULL OR paper_school <> NEW."schoolId" THEN
    RAISE EXCEPTION 'Entrance exam question scope mismatch';
  END IF;
  IF paper_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Published examination questions are locked';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
  IF TG_OP = 'INSERT' AND paper_status <> 'PUBLISHED' THEN
    RAISE EXCEPTION 'Applicant can only be registered for a published paper';
  END IF;
  IF TG_OP = 'UPDATE' AND paper_status NOT IN ('PUBLISHED', 'CLOSED') THEN
    RAISE EXCEPTION 'Applicant examination paper is not active';
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
