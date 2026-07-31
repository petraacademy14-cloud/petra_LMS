CREATE TYPE "AdmissionDecisionOutcome" AS ENUM ('ACCEPTED', 'WAITLISTED', 'REJECTED');
CREATE TYPE "AdmissionOfferResponse" AS ENUM ('NOT_APPLICABLE', 'PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

CREATE TABLE "admission_decisions" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "outcome" "AdmissionDecisionOutcome" NOT NULL,
  "internalNote" TEXT NOT NULL,
  "applicantMessage" TEXT,
  "offerExpiresAt" TIMESTAMPTZ,
  "offerResponse" "AdmissionOfferResponse" NOT NULL DEFAULT 'NOT_APPLICABLE',
  "respondedAt" TIMESTAMPTZ,
  "decidedById" TEXT NOT NULL,
  "convertedStudentId" TEXT,
  "convertedById" TEXT,
  "convertedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admission_decisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "admission_decisions_offer_check" CHECK (
    ("outcome" = 'ACCEPTED' AND "offerExpiresAt" IS NOT NULL AND "offerResponse" <> 'NOT_APPLICABLE')
    OR
    ("outcome" <> 'ACCEPTED' AND "offerExpiresAt" IS NULL AND "offerResponse" = 'NOT_APPLICABLE' AND "respondedAt" IS NULL)
  ),
  CONSTRAINT "admission_decisions_conversion_check" CHECK (
    ("convertedStudentId" IS NULL AND "convertedById" IS NULL AND "convertedAt" IS NULL)
    OR
    ("convertedStudentId" IS NOT NULL AND "convertedById" IS NOT NULL AND "convertedAt" IS NOT NULL AND "outcome" = 'ACCEPTED' AND "offerResponse" = 'ACCEPTED')
  )
);

CREATE TABLE "student_admission_document_links" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "applicationDocumentId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_admission_document_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admission_decisions_application_key" ON "admission_decisions"("applicationId");
CREATE UNIQUE INDEX "admission_decisions_converted_student_key" ON "admission_decisions"("convertedStudentId") WHERE "convertedStudentId" IS NOT NULL;
CREATE INDEX "admission_decisions_school_outcome_created_idx" ON "admission_decisions"("schoolId", "outcome", "createdAt" DESC);
CREATE INDEX "admission_decisions_campus_outcome_created_idx" ON "admission_decisions"("campusId", "outcome", "createdAt" DESC);
CREATE INDEX "admission_decisions_offer_response_expiry_idx" ON "admission_decisions"("offerResponse", "offerExpiresAt");
CREATE UNIQUE INDEX "student_admission_document_links_document_key" ON "student_admission_document_links"("applicationDocumentId");
CREATE INDEX "student_admission_document_links_student_created_idx" ON "student_admission_document_links"("studentId", "createdAt" DESC);

ALTER TABLE "admission_decisions" ADD CONSTRAINT "admission_decisions_application_fkey" FOREIGN KEY ("applicationId") REFERENCES "admission_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "admission_decisions" ADD CONSTRAINT "admission_decisions_school_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "admission_decisions" ADD CONSTRAINT "admission_decisions_campus_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "admission_decisions" ADD CONSTRAINT "admission_decisions_decider_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "admission_decisions" ADD CONSTRAINT "admission_decisions_student_fkey" FOREIGN KEY ("convertedStudentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "admission_decisions" ADD CONSTRAINT "admission_decisions_converter_fkey" FOREIGN KEY ("convertedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_admission_document_links" ADD CONSTRAINT "student_admission_document_links_student_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_admission_document_links" ADD CONSTRAINT "student_admission_document_links_document_fkey" FOREIGN KEY ("applicationDocumentId") REFERENCES "application_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_admission_document_links" ADD CONSTRAINT "student_admission_document_links_creator_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
    IF NEW."offerExpiresAt" IS NULL OR NEW."offerExpiresAt" <= CURRENT_TIMESTAMP THEN
      RAISE EXCEPTION 'Accepted offers require a future expiry date';
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

CREATE TRIGGER admission_decision_guard
BEFORE INSERT OR UPDATE ON "admission_decisions"
FOR EACH ROW EXECUTE FUNCTION validate_admission_decision();

CREATE OR REPLACE FUNCTION sync_application_decision_status() RETURNS TRIGGER AS $$
BEGIN
  UPDATE "admission_applications"
  SET "status" = (NEW."outcome"::text)::"ApplicationStatus", "updatedAt" = CURRENT_TIMESTAMP
  WHERE "id" = NEW."applicationId";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admission_decision_application_status_sync
AFTER INSERT OR UPDATE OF "outcome" ON "admission_decisions"
FOR EACH ROW EXECUTE FUNCTION sync_application_decision_status();

CREATE OR REPLACE FUNCTION validate_student_admission_document_link() RETURNS TRIGGER AS $$
DECLARE
  student_school TEXT;
  student_campus TEXT;
  application_school TEXT;
  application_campus TEXT;
  converted_student TEXT;
BEGIN
  SELECT "schoolId", "campusId" INTO student_school, student_campus
  FROM "students" WHERE "id" = NEW."studentId";

  SELECT a."schoolId", a."campusId", d."convertedStudentId"
    INTO application_school, application_campus, converted_student
  FROM "application_documents" doc
  JOIN "admission_applications" a ON a."id" = doc."applicationId"
  JOIN "admission_decisions" d ON d."applicationId" = a."id"
  WHERE doc."id" = NEW."applicationDocumentId";

  IF student_school IS NULL OR application_school IS NULL OR student_school <> application_school OR student_campus <> application_campus OR converted_student <> NEW."studentId" THEN
    RAISE EXCEPTION 'Student admission document link scope mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER student_admission_document_link_guard
BEFORE INSERT OR UPDATE ON "student_admission_document_links"
FOR EACH ROW EXECUTE FUNCTION validate_student_admission_document_link();
