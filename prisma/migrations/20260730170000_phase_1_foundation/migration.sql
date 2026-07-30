-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'TEACHER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TermKind" AS ENUM ('FIRST', 'SECOND', 'THIRD', 'CUSTOM');

-- CreateEnum
CREATE TYPE "LogSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campuses" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'Anambra',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT,
    "role" "Role" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_sessions" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terms" (
    "id" TEXT NOT NULL,
    "academicSessionId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "TermKind" NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_levels" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_arms" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "classLevelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_arms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campus_subjects" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campus_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "requestId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_logs" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "campusId" TEXT,
    "userId" TEXT,
    "severity" "LogSeverity" NOT NULL DEFAULT 'ERROR',
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "fingerprint" TEXT,
    "requestId" TEXT,
    "path" TEXT,
    "context" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_providerId_accountId_key" ON "accounts"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "verifications_identifier_idx" ON "verifications"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "schools_slug_key" ON "schools"("slug");

-- CreateIndex
CREATE INDEX "campuses_schoolId_isActive_idx" ON "campuses"("schoolId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "campuses_schoolId_code_key" ON "campuses"("schoolId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "campuses_schoolId_name_key" ON "campuses"("schoolId", "name");

-- CreateIndex
CREATE INDEX "school_memberships_schoolId_role_status_idx" ON "school_memberships"("schoolId", "role", "status");

-- CreateIndex
CREATE INDEX "school_memberships_campusId_role_status_idx" ON "school_memberships"("campusId", "role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "school_memberships_userId_schoolId_campusId_key" ON "school_memberships"("userId", "schoolId", "campusId");

-- CreateIndex
CREATE INDEX "academic_sessions_schoolId_isCurrent_idx" ON "academic_sessions"("schoolId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "academic_sessions_schoolId_name_key" ON "academic_sessions"("schoolId", "name");

-- CreateIndex
CREATE INDEX "terms_campusId_isCurrent_idx" ON "terms"("campusId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "terms_academicSessionId_campusId_kind_key" ON "terms"("academicSessionId", "campusId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "class_levels_schoolId_code_key" ON "class_levels"("schoolId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "class_levels_schoolId_sortOrder_key" ON "class_levels"("schoolId", "sortOrder");

-- CreateIndex
CREATE INDEX "class_arms_campusId_isActive_idx" ON "class_arms"("campusId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "class_arms_campusId_classLevelId_code_key" ON "class_arms"("campusId", "classLevelId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_schoolId_code_key" ON "subjects"("schoolId", "code");

-- CreateIndex
CREATE INDEX "campus_subjects_campusId_isActive_idx" ON "campus_subjects"("campusId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "campus_subjects_campusId_subjectId_key" ON "campus_subjects"("campusId", "subjectId");

-- CreateIndex
CREATE INDEX "audit_logs_schoolId_occurredAt_idx" ON "audit_logs"("schoolId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_campusId_occurredAt_idx" ON "audit_logs"("campusId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_occurredAt_idx" ON "audit_logs"("actorUserId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "error_logs_severity_occurredAt_idx" ON "error_logs"("severity", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "error_logs_schoolId_occurredAt_idx" ON "error_logs"("schoolId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "error_logs_fingerprint_idx" ON "error_logs"("fingerprint");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campuses" ADD CONSTRAINT "campuses_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_memberships" ADD CONSTRAINT "school_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_memberships" ADD CONSTRAINT "school_memberships_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_memberships" ADD CONSTRAINT "school_memberships_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_sessions" ADD CONSTRAINT "academic_sessions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms" ADD CONSTRAINT "terms_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "academic_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms" ADD CONSTRAINT "terms_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_levels" ADD CONSTRAINT "class_levels_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_arms" ADD CONSTRAINT "class_arms_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_arms" ADD CONSTRAINT "class_arms_classLevelId_fkey" FOREIGN KEY ("classLevelId") REFERENCES "class_levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campus_subjects" ADD CONSTRAINT "campus_subjects_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campus_subjects" ADD CONSTRAINT "campus_subjects_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Domain invariants that Prisma cannot express directly.
ALTER TABLE "school_memberships"
  ADD CONSTRAINT "school_memberships_role_scope_check"
  CHECK (
    ("role" = 'OWNER' AND "campusId" IS NULL)
    OR ("role" IN ('ADMIN', 'TEACHER') AND "campusId" IS NOT NULL)
  );

ALTER TABLE "academic_sessions"
  ADD CONSTRAINT "academic_sessions_date_order_check"
  CHECK ("endsOn" > "startsOn");

ALTER TABLE "terms"
  ADD CONSTRAINT "terms_date_order_check"
  CHECK ("endsOn" > "startsOn");

ALTER TABLE "class_arms"
  ADD CONSTRAINT "class_arms_capacity_check"
  CHECK ("capacity" IS NULL OR "capacity" > 0);

CREATE UNIQUE INDEX "school_memberships_one_school_owner"
  ON "school_memberships" ("userId", "schoolId")
  WHERE "role" = 'OWNER' AND "campusId" IS NULL;

CREATE UNIQUE INDEX "academic_sessions_one_current_per_school"
  ON "academic_sessions" ("schoolId")
  WHERE "isCurrent" = true;

CREATE UNIQUE INDEX "terms_one_current_per_campus"
  ON "terms" ("campusId")
  WHERE "isCurrent" = true;

-- Prevent cross-school references through campus-owned records.
CREATE OR REPLACE FUNCTION enforce_petra_scope_integrity()
RETURNS TRIGGER AS $$
DECLARE
  campus_school_id TEXT;
  parent_school_id TEXT;
BEGIN
  IF NEW."campusId" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT "schoolId" INTO campus_school_id
  FROM "campuses"
  WHERE "id" = NEW."campusId";

  IF TG_TABLE_NAME = 'school_memberships' THEN
    parent_school_id := NEW."schoolId";
  ELSIF TG_TABLE_NAME = 'terms' THEN
    SELECT "schoolId" INTO parent_school_id
    FROM "academic_sessions"
    WHERE "id" = NEW."academicSessionId";
  ELSIF TG_TABLE_NAME = 'class_arms' THEN
    SELECT "schoolId" INTO parent_school_id
    FROM "class_levels"
    WHERE "id" = NEW."classLevelId";
  ELSIF TG_TABLE_NAME = 'campus_subjects' THEN
    SELECT "schoolId" INTO parent_school_id
    FROM "subjects"
    WHERE "id" = NEW."subjectId";
  ELSE
    parent_school_id := NEW."schoolId";
  END IF;

  IF campus_school_id IS DISTINCT FROM parent_school_id THEN
    RAISE EXCEPTION 'Campus and parent record must belong to the same school';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "school_memberships_scope_integrity"
  BEFORE INSERT OR UPDATE ON "school_memberships"
  FOR EACH ROW EXECUTE FUNCTION enforce_petra_scope_integrity();

CREATE TRIGGER "terms_scope_integrity"
  BEFORE INSERT OR UPDATE ON "terms"
  FOR EACH ROW EXECUTE FUNCTION enforce_petra_scope_integrity();

CREATE TRIGGER "class_arms_scope_integrity"
  BEFORE INSERT OR UPDATE ON "class_arms"
  FOR EACH ROW EXECUTE FUNCTION enforce_petra_scope_integrity();

CREATE TRIGGER "campus_subjects_scope_integrity"
  BEFORE INSERT OR UPDATE ON "campus_subjects"
  FOR EACH ROW EXECUTE FUNCTION enforce_petra_scope_integrity();

CREATE TRIGGER "audit_logs_scope_integrity"
  BEFORE INSERT OR UPDATE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION enforce_petra_scope_integrity();

CREATE TRIGGER "error_logs_scope_integrity"
  BEFORE INSERT OR UPDATE ON "error_logs"
  FOR EACH ROW EXECUTE FUNCTION enforce_petra_scope_integrity();

-- Audit history is append-only, including for application database roles.
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log records are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "audit_logs_immutable"
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
