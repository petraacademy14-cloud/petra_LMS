-- Repair a database where the original Phase 2 migration is recorded as
-- successful but all Phase 2 tables were removed. Preserve compatible enum
-- types that may remain from the earlier rolled-back migration.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'Gender'
  ) THEN
    CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'StudentStatus'
  ) THEN
    CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'WITHDRAWN', 'GRADUATED');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'EnrollmentStatus'
  ) THEN
    CREATE TYPE "EnrollmentStatus" AS ENUM ('CURRENT', 'PROMOTED', 'TRANSFERRED', 'WITHDRAWN', 'GRADUATED');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'GuardianRelationship'
  ) THEN
    CREATE TYPE "GuardianRelationship" AS ENUM ('FATHER', 'MOTHER', 'GUARDIAN', 'SIBLING', 'RELATIVE', 'OTHER');
  END IF;
END
$$;

ALTER TYPE "EnrollmentStatus" ADD VALUE IF NOT EXISTS 'GRADUATED';

DO $repair$
DECLARE
  missing_table_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO missing_table_count
  FROM (
    VALUES
      (to_regclass('public.admission_sequences')),
      (to_regclass('public.students')),
      (to_regclass('public.guardians')),
      (to_regclass('public.student_guardians')),
      (to_regclass('public.enrollments')),
      (to_regclass('public.student_documents'))
  ) AS phase_2_tables(table_name)
  WHERE table_name IS NULL;

  IF missing_table_count = 6 THEN
    CREATE TABLE "admission_sequences" (
        "id" TEXT NOT NULL,
        "schoolId" TEXT NOT NULL,
        "campusId" TEXT NOT NULL,
        "year" INTEGER NOT NULL,
        "nextNumber" INTEGER NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "admission_sequences_pkey" PRIMARY KEY ("id")
    );
    
    CREATE TABLE "students" (
        "id" TEXT NOT NULL,
        "schoolId" TEXT NOT NULL,
        "campusId" TEXT NOT NULL,
        "admissionNumber" TEXT NOT NULL,
        "firstName" TEXT NOT NULL,
        "middleName" TEXT,
        "lastName" TEXT NOT NULL,
        "preferredName" TEXT,
        "gender" "Gender" NOT NULL,
        "dateOfBirth" DATE,
        "admissionDate" DATE NOT NULL,
        "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
        "address" TEXT,
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "students_pkey" PRIMARY KEY ("id")
    );
    
    CREATE TABLE "guardians" (
        "id" TEXT NOT NULL,
        "schoolId" TEXT NOT NULL,
        "firstName" TEXT NOT NULL,
        "lastName" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "email" TEXT,
        "address" TEXT,
        "occupation" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "guardians_pkey" PRIMARY KEY ("id")
    );
    
    CREATE TABLE "student_guardians" (
        "id" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "guardianId" TEXT NOT NULL,
        "relationship" "GuardianRelationship" NOT NULL,
        "isPrimary" BOOLEAN NOT NULL DEFAULT false,
        "livesWith" BOOLEAN NOT NULL DEFAULT false,
        "canPickup" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "student_guardians_pkey" PRIMARY KEY ("id")
    );
    
    CREATE TABLE "enrollments" (
        "id" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "campusId" TEXT NOT NULL,
        "academicSessionId" TEXT NOT NULL,
        "classArmId" TEXT NOT NULL,
        "status" "EnrollmentStatus" NOT NULL DEFAULT 'CURRENT',
        "startsOn" DATE NOT NULL,
        "endsOn" DATE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
    );
    
    CREATE TABLE "student_documents" (
        "id" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "campusId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "storageKey" TEXT NOT NULL,
        "fileName" TEXT NOT NULL,
        "contentType" TEXT NOT NULL,
        "sizeBytes" INTEGER NOT NULL,
        "uploadedById" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "student_documents_pkey" PRIMARY KEY ("id")
    );
    
    CREATE INDEX "admission_sequences_schoolId_year_idx" ON "admission_sequences"("schoolId", "year");
    CREATE UNIQUE INDEX "admission_sequences_campusId_year_key" ON "admission_sequences"("campusId", "year");
    CREATE INDEX "students_campusId_status_lastName_firstName_idx" ON "students"("campusId", "status", "lastName", "firstName");
    CREATE INDEX "students_schoolId_lastName_firstName_idx" ON "students"("schoolId", "lastName", "firstName");
    CREATE UNIQUE INDEX "students_schoolId_admissionNumber_key" ON "students"("schoolId", "admissionNumber");
    CREATE INDEX "guardians_schoolId_phone_idx" ON "guardians"("schoolId", "phone");
    CREATE INDEX "guardians_schoolId_lastName_firstName_idx" ON "guardians"("schoolId", "lastName", "firstName");
    CREATE INDEX "student_guardians_guardianId_idx" ON "student_guardians"("guardianId");
    CREATE UNIQUE INDEX "student_guardians_studentId_guardianId_key" ON "student_guardians"("studentId", "guardianId");
    CREATE INDEX "enrollments_campusId_classArmId_status_idx" ON "enrollments"("campusId", "classArmId", "status");
    CREATE INDEX "enrollments_academicSessionId_status_idx" ON "enrollments"("academicSessionId", "status");
    CREATE UNIQUE INDEX "enrollments_studentId_academicSessionId_key" ON "enrollments"("studentId", "academicSessionId");
    CREATE UNIQUE INDEX "student_documents_storageKey_key" ON "student_documents"("storageKey");
    CREATE INDEX "student_documents_studentId_createdAt_idx" ON "student_documents"("studentId", "createdAt" DESC);
    CREATE INDEX "student_documents_campusId_createdAt_idx" ON "student_documents"("campusId", "createdAt" DESC);
    
    ALTER TABLE "admission_sequences" ADD CONSTRAINT "admission_sequences_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "admission_sequences" ADD CONSTRAINT "admission_sequences_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "students" ADD CONSTRAINT "students_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    ALTER TABLE "students" ADD CONSTRAINT "students_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    ALTER TABLE "guardians" ADD CONSTRAINT "guardians_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "class_arms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  ELSIF missing_table_count > 0 THEN
    RAISE EXCEPTION
      'Phase 2 repair stopped because only % of 6 tables are missing',
      missing_table_count;
  END IF;
END
$repair$;

CREATE OR REPLACE FUNCTION enforce_student_scope()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "campuses"
    WHERE "id" = NEW."campusId" AND "schoolId" = NEW."schoolId"
  ) THEN
    RAISE EXCEPTION 'Student campus must belong to the student school';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS students_scope_guard ON "students";

CREATE TRIGGER students_scope_guard
BEFORE INSERT OR UPDATE ON "students"
FOR EACH ROW EXECUTE FUNCTION enforce_student_scope();

CREATE OR REPLACE FUNCTION enforce_admission_sequence_scope()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "campuses"
    WHERE "id" = NEW."campusId" AND "schoolId" = NEW."schoolId"
  ) THEN
    RAISE EXCEPTION 'Admission sequence campus must belong to the school';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS admission_sequences_scope_guard ON "admission_sequences";

CREATE TRIGGER admission_sequences_scope_guard
BEFORE INSERT OR UPDATE ON "admission_sequences"
FOR EACH ROW EXECUTE FUNCTION enforce_admission_sequence_scope();

CREATE OR REPLACE FUNCTION enforce_enrollment_scope()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "students" s
    JOIN "class_arms" ca ON ca."id" = NEW."classArmId"
    JOIN "academic_sessions" a ON a."id" = NEW."academicSessionId"
    JOIN "campuses" c ON c."id" = NEW."campusId"
    WHERE s."id" = NEW."studentId"
      AND s."schoolId" = c."schoolId"
      AND s."campusId" = NEW."campusId"
      AND ca."campusId" = NEW."campusId"
      AND a."schoolId" = s."schoolId"
  ) THEN
    RAISE EXCEPTION 'Enrollment references must share school and campus scope';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enrollments_scope_guard ON "enrollments";

CREATE TRIGGER enrollments_scope_guard
BEFORE INSERT OR UPDATE ON "enrollments"
FOR EACH ROW EXECUTE FUNCTION enforce_enrollment_scope();

CREATE OR REPLACE FUNCTION enforce_student_guardian_scope()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "students" s
    JOIN "guardians" g ON g."id" = NEW."guardianId"
    WHERE s."id" = NEW."studentId" AND s."schoolId" = g."schoolId"
  ) THEN
    RAISE EXCEPTION 'Student and guardian must belong to the same school';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS student_guardians_scope_guard ON "student_guardians";

CREATE TRIGGER student_guardians_scope_guard
BEFORE INSERT OR UPDATE ON "student_guardians"
FOR EACH ROW EXECUTE FUNCTION enforce_student_guardian_scope();
