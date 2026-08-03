-- Phase 6: pilot and launch readiness
CREATE TYPE "public"."PilotStatus" AS ENUM ('PLANNED','ACTIVE','BLOCKED','COMPLETED');
CREATE TYPE "public"."PilotChecklistStatus" AS ENUM ('NOT_STARTED','IN_PROGRESS','PASSED','FAILED','BLOCKED');
CREATE TYPE "public"."PilotIssueSeverity" AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE "public"."PilotIssueStatus" AS ENUM ('OPEN','IN_PROGRESS','RESOLVED','ACCEPTED_RISK');
CREATE TYPE "public"."LaunchApprovalStatus" AS ENUM ('DRAFT','APPROVED','REVOKED');
CREATE TABLE "public"."pilot_runs" (
 "id" TEXT PRIMARY KEY, "schoolId" TEXT NOT NULL, "name" TEXT NOT NULL, "status" "public"."PilotStatus" NOT NULL DEFAULT 'PLANNED',
 "startsAt" TIMESTAMP(3), "endsAt" TIMESTAMP(3), "notes" TEXT, "createdById" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "pilot_run_dates_check" CHECK ("endsAt" IS NULL OR "startsAt" IS NULL OR "endsAt">="startsAt")
);
CREATE TABLE "public"."pilot_checklist_items" (
 "id" TEXT PRIMARY KEY, "pilotRunId" TEXT NOT NULL, "key" TEXT NOT NULL, "area" TEXT NOT NULL, "label" TEXT NOT NULL,
 "status" "public"."PilotChecklistStatus" NOT NULL DEFAULT 'NOT_STARTED', "evidence" TEXT, "verifiedById" TEXT, "verifiedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "public"."pilot_issues" (
 "id" TEXT PRIMARY KEY, "schoolId" TEXT NOT NULL, "campusId" TEXT, "pilotRunId" TEXT NOT NULL, "title" TEXT NOT NULL,
 "description" TEXT NOT NULL, "route" TEXT, "severity" "public"."PilotIssueSeverity" NOT NULL,
 "status" "public"."PilotIssueStatus" NOT NULL DEFAULT 'OPEN', "resolution" TEXT, "reportedById" TEXT NOT NULL,
 "resolvedById" TEXT, "resolvedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "public"."launch_approvals" (
 "id" TEXT PRIMARY KEY, "pilotRunId" TEXT NOT NULL, "status" "public"."LaunchApprovalStatus" NOT NULL DEFAULT 'DRAFT',
 "summary" TEXT, "approvedById" TEXT, "approvedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "pilot_runs_schoolId_status_createdAt_idx" ON "public"."pilot_runs"("schoolId","status","createdAt" DESC);
CREATE UNIQUE INDEX "pilot_checklist_items_pilotRunId_key_key" ON "public"."pilot_checklist_items"("pilotRunId","key");
CREATE INDEX "pilot_checklist_items_pilotRunId_area_status_idx" ON "public"."pilot_checklist_items"("pilotRunId","area","status");
CREATE INDEX "pilot_issues_schoolId_status_severity_idx" ON "public"."pilot_issues"("schoolId","status","severity");
CREATE INDEX "pilot_issues_pilotRunId_createdAt_idx" ON "public"."pilot_issues"("pilotRunId","createdAt" DESC);
CREATE INDEX "pilot_issues_campusId_status_idx" ON "public"."pilot_issues"("campusId","status");
CREATE UNIQUE INDEX "launch_approvals_pilotRunId_key" ON "public"."launch_approvals"("pilotRunId");
CREATE INDEX "launch_approvals_status_approvedAt_idx" ON "public"."launch_approvals"("status","approvedAt" DESC);
ALTER TABLE "public"."pilot_runs" ADD CONSTRAINT "pilot_runs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."schools"("id") ON DELETE CASCADE;
ALTER TABLE "public"."pilot_runs" ADD CONSTRAINT "pilot_runs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."pilot_checklist_items" ADD CONSTRAINT "pilot_checklist_items_pilotRunId_fkey" FOREIGN KEY ("pilotRunId") REFERENCES "public"."pilot_runs"("id") ON DELETE CASCADE;
ALTER TABLE "public"."pilot_checklist_items" ADD CONSTRAINT "pilot_checklist_items_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."pilot_issues" ADD CONSTRAINT "pilot_issues_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."schools"("id") ON DELETE CASCADE;
ALTER TABLE "public"."pilot_issues" ADD CONSTRAINT "pilot_issues_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "public"."campuses"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."pilot_issues" ADD CONSTRAINT "pilot_issues_pilotRunId_fkey" FOREIGN KEY ("pilotRunId") REFERENCES "public"."pilot_runs"("id") ON DELETE CASCADE;
ALTER TABLE "public"."pilot_issues" ADD CONSTRAINT "pilot_issues_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."pilot_issues" ADD CONSTRAINT "pilot_issues_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."launch_approvals" ADD CONSTRAINT "launch_approvals_pilotRunId_fkey" FOREIGN KEY ("pilotRunId") REFERENCES "public"."pilot_runs"("id") ON DELETE CASCADE;
ALTER TABLE "public"."launch_approvals" ADD CONSTRAINT "launch_approvals_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT;
CREATE OR REPLACE FUNCTION "public"."enforce_pilot_scope"() RETURNS trigger AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM "public"."pilot_runs" r WHERE r.id=NEW."pilotRunId" AND r."schoolId"=NEW."schoolId") THEN RAISE EXCEPTION 'pilot issue run scope mismatch'; END IF;
 IF NEW."campusId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "public"."campuses" c WHERE c.id=NEW."campusId" AND c."schoolId"=NEW."schoolId") THEN RAISE EXCEPTION 'pilot issue campus scope mismatch'; END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "pilot_issues_scope_guard" BEFORE INSERT OR UPDATE ON "public"."pilot_issues" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_pilot_scope"();
