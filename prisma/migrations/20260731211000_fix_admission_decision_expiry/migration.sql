CREATE OR REPLACE FUNCTION validate_admission_decision() RETURNS TRIGGER AS $$
DECLARE
  app_school TEXT;
  app_campus TEXT;
  app_status "ApplicationStatus";
  exam_status "ApplicantExamStatus";
BEGIN
  SELECT a."schoolId", a."campusId", a."status", r."status"
    INTO app_school, app_campus, app_status, exam_status
  FROM "admission_applications" a
  LEFT JOIN "applicant_exam_registrations" r ON r."applicationId" = a."id"
  WHERE a."id" = NEW."applicationId";

  IF app_school IS NULL OR app_campus IS NULL OR app_school <> NEW."schoolId" OR app_campus <> NEW."campusId" THEN
    RAISE EXCEPTION 'Admission decision scope mismatch';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF app_status <> 'UNDER_REVIEW' THEN
      RAISE EXCEPTION 'Only applications under review can receive a decision';
    END IF;
    IF NEW."outcome" IN ('ACCEPTED', 'WAITLISTED') AND exam_status <> 'SCORED' THEN
      RAISE EXCEPTION 'Accepted or waitlisted applicants require a scored examination';
    END IF;
    IF NEW."outcome" = 'REJECTED' AND exam_status NOT IN ('SCORED', 'ABSENT') THEN
      RAISE EXCEPTION 'Rejected applicants require a completed or absent examination record';
    END IF;
  ELSE
    IF NEW."applicationId" <> OLD."applicationId" OR NEW."schoolId" <> OLD."schoolId" OR NEW."campusId" <> OLD."campusId" OR NEW."decidedById" <> OLD."decidedById" THEN
      RAISE EXCEPTION 'Admission decision identity and scope are immutable';
    END IF;
    IF NEW."outcome" <> OLD."outcome" AND NOT (OLD."outcome" = 'WAITLISTED' AND NEW."outcome" IN ('ACCEPTED', 'REJECTED')) THEN
      RAISE EXCEPTION 'Only a waitlisted decision can be upgraded or closed';
    END IF;
    IF NEW."outcome" IN ('ACCEPTED', 'WAITLISTED') AND exam_status <> 'SCORED' THEN
      RAISE EXCEPTION 'Accepted or waitlisted applicants require a scored examination';
    END IF;
  END IF;

  IF NEW."outcome" = 'ACCEPTED' THEN
    IF NEW."offerExpiresAt" IS NULL THEN
      RAISE EXCEPTION 'Accepted offers require an expiry date';
    END IF;
    IF (TG_OP = 'INSERT' OR OLD."outcome" <> NEW."outcome") AND NEW."offerExpiresAt" <= CURRENT_TIMESTAMP THEN
      RAISE EXCEPTION 'New accepted offers require a future expiry date';
    END IF;
    IF TG_OP = 'INSERT' OR OLD."outcome" <> NEW."outcome" THEN
      NEW."offerResponse" := 'PENDING';
      NEW."respondedAt" := NULL;
    END IF;
  ELSE
    NEW."offerExpiresAt" := NULL;
    NEW."offerResponse" := 'NOT_APPLICABLE';
    NEW."respondedAt" := NULL;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW."offerResponse" <> OLD."offerResponse" THEN
    IF OLD."offerResponse" <> 'PENDING' OR NEW."offerResponse" NOT IN ('ACCEPTED', 'DECLINED', 'EXPIRED') THEN
      RAISE EXCEPTION 'Invalid admission offer response transition';
    END IF;
    IF NEW."offerResponse" IN ('ACCEPTED', 'DECLINED') THEN
      NEW."respondedAt" := COALESCE(NEW."respondedAt", CURRENT_TIMESTAMP);
    ELSE
      NEW."respondedAt" := NULL;
    END IF;
  END IF;

  IF NEW."convertedStudentId" IS NOT NULL AND (NEW."outcome" <> 'ACCEPTED' OR NEW."offerResponse" <> 'ACCEPTED') THEN
    RAISE EXCEPTION 'Only an accepted offer can be converted to a student';
  END IF;

  NEW."updatedAt" := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
