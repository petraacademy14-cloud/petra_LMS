CREATE TYPE "PortalAccountRole" AS ENUM ('PARENT', 'STUDENT');
CREATE TYPE "PortalAccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

CREATE TABLE "portal_accounts" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "role" "PortalAccountRole" NOT NULL,
  "username" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "guardianId" TEXT,
  "studentId" TEXT,
  "passwordHash" TEXT NOT NULL,
  "mustChangePassword" BOOLEAN NOT NULL DEFAULT TRUE,
  "status" "PortalAccountStatus" NOT NULL DEFAULT 'ACTIVE',
  "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMPTZ,
  "credentialsIssuedAt" TIMESTAMPTZ,
  "credentialsIssuedById" TEXT,
  "lastLoginAt" TIMESTAMPTZ,
  "passwordChangedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "portal_accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "portal_accounts_target_check" CHECK (
    ("role" = 'PARENT' AND "guardianId" IS NOT NULL AND "studentId" IS NULL)
    OR
    ("role" = 'STUDENT' AND "studentId" IS NOT NULL AND "guardianId" IS NULL)
  ),
  CONSTRAINT "portal_accounts_username_check" CHECK ("username" ~ '^[a-z0-9][a-z0-9._-]{3,79}$'),
  CONSTRAINT "portal_accounts_failed_login_check" CHECK ("failedLoginCount" >= 0)
);

CREATE TABLE "portal_sessions" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "lastSeenAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "portal_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "portal_accounts_username_key" ON "portal_accounts"("username");
CREATE UNIQUE INDEX "portal_accounts_guardian_key" ON "portal_accounts"("guardianId") WHERE "guardianId" IS NOT NULL;
CREATE UNIQUE INDEX "portal_accounts_student_key" ON "portal_accounts"("studentId") WHERE "studentId" IS NOT NULL;
CREATE INDEX "portal_accounts_school_role_status_created_idx" ON "portal_accounts"("schoolId", "role", "status", "createdAt" DESC);
CREATE INDEX "portal_accounts_guardian_status_idx" ON "portal_accounts"("guardianId", "status");
CREATE INDEX "portal_accounts_student_status_idx" ON "portal_accounts"("studentId", "status");
CREATE UNIQUE INDEX "portal_sessions_token_key" ON "portal_sessions"("tokenHash");
CREATE INDEX "portal_sessions_account_expiry_idx" ON "portal_sessions"("accountId", "expiresAt");

ALTER TABLE "portal_accounts" ADD CONSTRAINT "portal_accounts_school_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "portal_accounts" ADD CONSTRAINT "portal_accounts_guardian_fkey"
  FOREIGN KEY ("guardianId") REFERENCES "guardians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "portal_accounts" ADD CONSTRAINT "portal_accounts_student_fkey"
  FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "portal_accounts" ADD CONSTRAINT "portal_accounts_issuer_fkey"
  FOREIGN KEY ("credentialsIssuedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "portal_sessions" ADD CONSTRAINT "portal_sessions_account_fkey"
  FOREIGN KEY ("accountId") REFERENCES "portal_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION validate_portal_account_scope() RETURNS TRIGGER AS $$
DECLARE target_school TEXT;
BEGIN
  NEW."username" := LOWER(BTRIM(NEW."username"));
  NEW."displayName" := BTRIM(NEW."displayName");

  IF TG_OP = 'UPDATE' AND (
    OLD."schoolId" <> NEW."schoolId"
    OR OLD."role" <> NEW."role"
    OR OLD."guardianId" IS DISTINCT FROM NEW."guardianId"
    OR OLD."studentId" IS DISTINCT FROM NEW."studentId"
  ) THEN
    RAISE EXCEPTION 'Portal account identity and target cannot be changed';
  END IF;

  IF NEW."role" = 'PARENT' THEN
    SELECT "schoolId" INTO target_school FROM "guardians" WHERE "id" = NEW."guardianId";
  ELSE
    SELECT "schoolId" INTO target_school FROM "students" WHERE "id" = NEW."studentId";
  END IF;

  IF target_school IS NULL OR target_school <> NEW."schoolId" THEN
    RAISE EXCEPTION 'Portal account school scope mismatch';
  END IF;

  IF NEW."displayName" = '' THEN
    RAISE EXCEPTION 'Portal account display name is required';
  END IF;

  NEW."updatedAt" := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER portal_account_scope_guard
BEFORE INSERT OR UPDATE ON "portal_accounts"
FOR EACH ROW EXECUTE FUNCTION validate_portal_account_scope();
