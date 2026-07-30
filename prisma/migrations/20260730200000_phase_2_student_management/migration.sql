CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'WITHDRAWN', 'GRADUATED', 'ARCHIVED');
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');
CREATE TYPE "GuardianRelationship" AS ENUM ('FATHER', 'MOTHER', 'GUARDIAN', 'SIBLING', 'RELATIVE', 'OTHER');
CREATE TYPE "EnrollmentStatus" AS ENUM ('CURRENT', 'PROMOTED', 'COMPLETED', 'TRANSFERRED', 'WITHDRAWN');
CREATE TYPE "ImportStatus" AS ENUM ('VALIDATING', 'READY', 'FAILED', 'IMPORTING', 'COMPLETED', 'CANCELLED');
CREATE TYPE "DocumentCategory" AS ENUM ('BIRTH_CERTIFICATE', 'PREVIOUS_REPORT', 'MEDICAL', 'ADMISSION_FORM', 'OTHER');

CREATE TABLE "students" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "admissionNumber" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "middleName" TEXT,
  "lastName" TEXT NOT NULL,
  "preferredName" TEXT,
  "dateOfBirth" DATE,
  "gender" "Gender",
  "photoUrl" TEXT,
  "address" TEXT,
  "medicalNotes" TEXT,
  "admissionDate" DATE NOT NULL,
  "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
  "statusReason" TEXT,
  "statusChangedAt" TIMESTAMP(3),
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
  "alternatePhone" TEXT,
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
  "isPrimaryContact" BOOLEAN NOT NULL DEFAULT false,
  "receivesMessages" BOOLEAN NOT NULL DEFAULT true,
  "canPickUp" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "student_guardians_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_enrollments" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "classArmId" TEXT NOT NULL,
  "academicSessionId" TEXT NOT NULL,
  "status" "EnrollmentStatus" NOT NULL DEFAULT 'CURRENT',
  "startsOn" DATE NOT NULL,
  "endsOn" DATE,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "student_enrollments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admission_counters" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "lastValue" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "admission_counters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_documents" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "category" "DocumentCategory" NOT NULL,
  "originalName" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_import_jobs" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "classArmId" TEXT NOT NULL,
  "academicSessionId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "sourceName" TEXT NOT NULL,
  "status" "ImportStatus" NOT NULL DEFAULT 'VALIDATING',
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "validRows" INTEGER NOT NULL DEFAULT 0,
  "invalidRows" INTEGER NOT NULL DEFAULT 0,
  "importedRows" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "student_import_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_import_rows" (
  "id" TEXT NOT NULL,
  "importJobId" TEXT NOT NULL,
  "rowNumber" INTEGER NOT NULL,
  "data" JSONB NOT NULL,
  "errors" JSONB,
  "isValid" BOOLEAN NOT NULL,
  "studentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_import_rows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "students_schoolId_admissionNumber_key" ON "students"("schoolId", "admissionNumber");
CREATE INDEX "students_schoolId_status_lastName_firstName_idx" ON "students"("schoolId", "status", "lastName", "firstName");
CREATE INDEX "students_campusId_status_idx" ON "students"("campusId", "status");
CREATE INDEX "guardians_schoolId_phone_idx" ON "guardians"("schoolId", "phone");
CREATE INDEX "guardians_schoolId_email_idx" ON "guardians"("schoolId", "email");
CREATE UNIQUE INDEX "student_guardians_studentId_guardianId_key" ON "student_guardians"("studentId", "guardianId");
CREATE INDEX "student_guardians_guardianId_idx" ON "student_guardians"("guardianId");
CREATE INDEX "student_enrollments_studentId_startsOn_idx" ON "student_enrollments"("studentId", "startsOn" DESC);
CREATE INDEX "student_enrollments_campusId_classArmId_academicSessionId_status_idx" ON "student_enrollments"("campusId", "classArmId", "academicSessionId", "status");
CREATE UNIQUE INDEX "student_enrollments_one_current_per_student" ON "student_enrollments"("studentId") WHERE "status" = 'CURRENT';
CREATE UNIQUE INDEX "admission_counters_schoolId_campusId_year_key" ON "admission_counters"("schoolId", "campusId", "year");
CREATE UNIQUE INDEX "student_documents_storagePath_key" ON "student_documents"("storagePath");
CREATE INDEX "student_documents_studentId_createdAt_idx" ON "student_documents"("studentId", "createdAt" DESC);
CREATE INDEX "student_import_jobs_schoolId_createdAt_idx" ON "student_import_jobs"("schoolId", "createdAt" DESC);
CREATE INDEX "student_import_jobs_campusId_status_idx" ON "student_import_jobs"("campusId", "status");
CREATE UNIQUE INDEX "student_import_rows_importJobId_rowNumber_key" ON "student_import_rows"("importJobId", "rowNumber");
CREATE INDEX "student_import_rows_importJobId_isValid_idx" ON "student_import_rows"("importJobId", "isValid");

ALTER TABLE "students" ADD CONSTRAINT "students_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "students" ADD CONSTRAINT "students_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "class_arms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "admission_counters" ADD CONSTRAINT "admission_counters_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "admission_counters" ADD CONSTRAINT "admission_counters_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_import_jobs" ADD CONSTRAINT "student_import_jobs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_import_jobs" ADD CONSTRAINT "student_import_jobs_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_import_jobs" ADD CONSTRAINT "student_import_jobs_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "class_arms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_import_jobs" ADD CONSTRAINT "student_import_jobs_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_import_jobs" ADD CONSTRAINT "student_import_jobs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_import_rows" ADD CONSTRAINT "student_import_rows_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "student_import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

