-- Phase 6A: applicant accounts, applications, documents and school visits
CREATE TYPE "public"."ApplicationStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'AWAITING_PAYMENT',
  'AWAITING_EXAMINATION',
  'UNDER_REVIEW',
  'ACCEPTED',
  'WAITLISTED',
  'REJECTED'
);

CREATE TYPE "public"."EntranceExamMode" AS ENUM ('ONLINE', 'ONSITE');
CREATE TYPE "public"."VisitBookingStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

CREATE TABLE "public"."applicant_accounts" (
  "id" TEXT PRIMARY KEY,
  "schoolId" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "relationship" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "applicant_accounts_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."schools"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "applicant_accounts_schoolId_email_key" ON "public"."applicant_accounts"("schoolId", "email");
CREATE INDEX "applicant_accounts_schoolId_createdAt_idx" ON "public"."applicant_accounts"("schoolId", "createdAt" DESC);

CREATE TABLE "public"."applicant_sessions" (
  "id" TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "applicant_sessions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."applicant_accounts"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "applicant_sessions_tokenHash_key" ON "public"."applicant_sessions"("tokenHash");
CREATE INDEX "applicant_sessions_accountId_expiresAt_idx" ON "public"."applicant_sessions"("accountId", "expiresAt");

CREATE TABLE "public"."admission_applications" (
  "id" TEXT PRIMARY KEY,
  "schoolId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "applicationNumber" TEXT NOT NULL,
  "status" "public"."ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
  "campusId" TEXT,
  "classLevelId" TEXT,
  "studentFirstName" TEXT,
  "studentMiddleName" TEXT,
  "studentLastName" TEXT,
  "preferredName" TEXT,
  "gender" "public"."Gender",
  "dateOfBirth" DATE,
  "address" TEXT,
  "previousSchool" TEXT,
  "medicalNotes" TEXT,
  "examMode" "public"."EntranceExamMode",
  "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admission_applications_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."schools"("id") ON DELETE CASCADE,
  CONSTRAINT "admission_applications_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."applicant_accounts"("id") ON DELETE CASCADE,
  CONSTRAINT "admission_applications_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "public"."campuses"("id") ON DELETE RESTRICT,
  CONSTRAINT "admission_applications_classLevelId_fkey" FOREIGN KEY ("classLevelId") REFERENCES "public"."class_levels"("id") ON DELETE RESTRICT
);

CREATE UNIQUE INDEX "admission_applications_accountId_key" ON "public"."admission_applications"("accountId");
CREATE UNIQUE INDEX "admission_applications_schoolId_applicationNumber_key" ON "public"."admission_applications"("schoolId", "applicationNumber");
CREATE INDEX "admission_applications_schoolId_status_createdAt_idx" ON "public"."admission_applications"("schoolId", "status", "createdAt" DESC);
CREATE INDEX "admission_applications_campusId_status_createdAt_idx" ON "public"."admission_applications"("campusId", "status", "createdAt" DESC);

CREATE TABLE "public"."application_documents" (
  "id" TEXT PRIMARY KEY,
  "applicationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "application_documents_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "public"."admission_applications"("id") ON DELETE CASCADE,
  CONSTRAINT "application_documents_size_check" CHECK ("sizeBytes" > 0 AND "sizeBytes" <= 5242880)
);

CREATE UNIQUE INDEX "application_documents_storageKey_key" ON "public"."application_documents"("storageKey");
CREATE INDEX "application_documents_applicationId_createdAt_idx" ON "public"."application_documents"("applicationId", "createdAt" DESC);

CREATE TABLE "public"."visit_bookings" (
  "id" TEXT PRIMARY KEY,
  "schoolId" TEXT NOT NULL,
  "campusId" TEXT,
  "guardianName" TEXT NOT NULL,
  "studentName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "classInterest" TEXT NOT NULL,
  "preferredDate" DATE NOT NULL,
  "preferredTime" TEXT NOT NULL,
  "notes" TEXT,
  "status" "public"."VisitBookingStatus" NOT NULL DEFAULT 'REQUESTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "visit_bookings_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."schools"("id") ON DELETE CASCADE,
  CONSTRAINT "visit_bookings_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "public"."campuses"("id") ON DELETE RESTRICT
);

CREATE INDEX "visit_bookings_schoolId_status_preferredDate_idx" ON "public"."visit_bookings"("schoolId", "status", "preferredDate");
CREATE INDEX "visit_bookings_campusId_status_preferredDate_idx" ON "public"."visit_bookings"("campusId", "status", "preferredDate");

CREATE OR REPLACE FUNCTION "public"."validate_admission_application_scope"()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "public"."applicant_accounts" a
    WHERE a."id" = NEW."accountId" AND a."schoolId" = NEW."schoolId"
  ) THEN
    RAISE EXCEPTION 'Applicant account must belong to application school';
  END IF;

  IF NEW."campusId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "public"."campuses" c
    WHERE c."id" = NEW."campusId" AND c."schoolId" = NEW."schoolId"
  ) THEN
    RAISE EXCEPTION 'Application campus must belong to application school';
  END IF;

  IF NEW."classLevelId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "public"."class_levels" l
    WHERE l."id" = NEW."classLevelId" AND l."schoolId" = NEW."schoolId"
  ) THEN
    RAISE EXCEPTION 'Application class level must belong to application school';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "admission_applications_scope_trigger"
BEFORE INSERT OR UPDATE ON "public"."admission_applications"
FOR EACH ROW EXECUTE FUNCTION "public"."validate_admission_application_scope"();

CREATE OR REPLACE FUNCTION "public"."validate_visit_booking_scope"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."campusId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "public"."campuses" c
    WHERE c."id" = NEW."campusId" AND c."schoolId" = NEW."schoolId"
  ) THEN
    RAISE EXCEPTION 'Visit campus must belong to booking school';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "visit_bookings_scope_trigger"
BEFORE INSERT OR UPDATE ON "public"."visit_bookings"
FOR EACH ROW EXECUTE FUNCTION "public"."validate_visit_booking_scope"();
