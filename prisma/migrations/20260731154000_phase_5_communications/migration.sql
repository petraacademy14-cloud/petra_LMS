-- Phase 5: communication and digital presence
CREATE TYPE "public"."CommunicationAudience" AS ENUM ('SCHOOL','CAMPUS','CLASS');
CREATE TYPE "public"."CommunicationChannel" AS ENUM ('WHATSAPP','EMAIL','PRINT');
CREATE TYPE "public"."CommunicationTemplateKind" AS ENUM ('GENERAL','FEE_REMINDER','RESULT_NOTICE','ATTENDANCE_NOTICE');
CREATE TYPE "public"."ContentStatus" AS ENUM ('DRAFT','IN_REVIEW','APPROVED','PUBLISHED','ARCHIVED');
CREATE TYPE "public"."PublicationKind" AS ENUM ('NEWS','EVENT','ACHIEVEMENT');

CREATE TABLE "public"."communication_templates" (
  "id" TEXT PRIMARY KEY, "schoolId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "kind" "public"."CommunicationTemplateKind" NOT NULL,
  "channel" "public"."CommunicationChannel" NOT NULL,
  "subject" TEXT, "body" TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "public"."announcements" (
  "id" TEXT PRIMARY KEY, "schoolId" TEXT NOT NULL, "campusId" TEXT, "classArmId" TEXT,
  "audience" "public"."CommunicationAudience" NOT NULL, "title" TEXT NOT NULL, "body" TEXT NOT NULL,
  "status" "public"."ContentStatus" NOT NULL DEFAULT 'DRAFT', "parentFacing" BOOLEAN NOT NULL DEFAULT true,
  "scheduledFor" TIMESTAMP(3), "publishedAt" TIMESTAMP(3), "authorId" TEXT NOT NULL,
  "reviewedById" TEXT, "publishedById" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "announcements_audience_scope_check" CHECK (
    ("audience"='SCHOOL' AND "campusId" IS NULL AND "classArmId" IS NULL) OR
    ("audience"='CAMPUS' AND "campusId" IS NOT NULL AND "classArmId" IS NULL) OR
    ("audience"='CLASS' AND "campusId" IS NOT NULL AND "classArmId" IS NOT NULL)
  )
);
CREATE TABLE "public"."communication_delivery_drafts" (
  "id" TEXT PRIMARY KEY, "schoolId" TEXT NOT NULL, "announcementId" TEXT, "templateId" TEXT,
  "channel" "public"."CommunicationChannel" NOT NULL, "subject" TEXT, "content" TEXT NOT NULL,
  "recipientCount" INTEGER NOT NULL DEFAULT 0, "generatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "public"."content_categories" (
  "id" TEXT PRIMARY KEY, "schoolId" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "public"."publications" (
  "id" TEXT PRIMARY KEY, "schoolId" TEXT NOT NULL, "campusId" TEXT, "categoryId" TEXT,
  "kind" "public"."PublicationKind" NOT NULL, "status" "public"."ContentStatus" NOT NULL DEFAULT 'DRAFT',
  "slug" TEXT NOT NULL, "title" TEXT NOT NULL, "excerpt" TEXT NOT NULL, "body" TEXT NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "coverImageUrl" TEXT,
  "eventStartsAt" TIMESTAMP(3), "eventEndsAt" TIMESTAMP(3), "publishedAt" TIMESTAMP(3),
  "authorId" TEXT NOT NULL, "reviewedById" TEXT, "publishedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "publications_event_dates_check" CHECK ("eventEndsAt" IS NULL OR "eventStartsAt" IS NULL OR "eventEndsAt">="eventStartsAt")
);
CREATE TABLE "public"."communication_media" (
  "id" TEXT PRIMARY KEY, "schoolId" TEXT NOT NULL, "campusId" TEXT, "publicationId" TEXT,
  "name" TEXT NOT NULL, "storageKey" TEXT NOT NULL, "fileName" TEXT NOT NULL,
  "contentType" TEXT NOT NULL, "sizeBytes" INTEGER NOT NULL, "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "communication_media_size_check" CHECK ("sizeBytes">0 AND "sizeBytes"<=5242880)
);
CREATE TABLE "public"."newsletter_subscribers" (
  "id" TEXT PRIMARY KEY, "schoolId" TEXT NOT NULL, "email" TEXT NOT NULL, "name" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unsubscribedAt" TIMESTAMP(3)
);

CREATE UNIQUE INDEX "communication_templates_schoolId_name_channel_key" ON "public"."communication_templates"("schoolId","name","channel");
CREATE INDEX "communication_templates_schoolId_kind_isActive_idx" ON "public"."communication_templates"("schoolId","kind","isActive");
CREATE INDEX "announcements_schoolId_status_publishedAt_idx" ON "public"."announcements"("schoolId","status","publishedAt" DESC);
CREATE INDEX "announcements_campusId_status_publishedAt_idx" ON "public"."announcements"("campusId","status","publishedAt" DESC);
CREATE INDEX "announcements_classArmId_status_idx" ON "public"."announcements"("classArmId","status");
CREATE INDEX "communication_delivery_drafts_schoolId_createdAt_idx" ON "public"."communication_delivery_drafts"("schoolId","createdAt" DESC);
CREATE INDEX "communication_delivery_drafts_announcementId_channel_idx" ON "public"."communication_delivery_drafts"("announcementId","channel");
CREATE UNIQUE INDEX "content_categories_schoolId_slug_key" ON "public"."content_categories"("schoolId","slug");
CREATE UNIQUE INDEX "content_categories_schoolId_name_key" ON "public"."content_categories"("schoolId","name");
CREATE UNIQUE INDEX "publications_schoolId_slug_key" ON "public"."publications"("schoolId","slug");
CREATE INDEX "publications_schoolId_status_publishedAt_idx" ON "public"."publications"("schoolId","status","publishedAt" DESC);
CREATE INDEX "publications_campusId_status_publishedAt_idx" ON "public"."publications"("campusId","status","publishedAt" DESC);
CREATE INDEX "publications_kind_status_eventStartsAt_idx" ON "public"."publications"("kind","status","eventStartsAt");
CREATE UNIQUE INDEX "communication_media_storageKey_key" ON "public"."communication_media"("storageKey");
CREATE INDEX "communication_media_schoolId_createdAt_idx" ON "public"."communication_media"("schoolId","createdAt" DESC);
CREATE INDEX "communication_media_publicationId_createdAt_idx" ON "public"."communication_media"("publicationId","createdAt" DESC);
CREATE UNIQUE INDEX "newsletter_subscribers_schoolId_email_key" ON "public"."newsletter_subscribers"("schoolId","email");
CREATE INDEX "newsletter_subscribers_schoolId_isActive_subscribedAt_idx" ON "public"."newsletter_subscribers"("schoolId","isActive","subscribedAt" DESC);

ALTER TABLE "public"."communication_templates" ADD CONSTRAINT "communication_templates_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."schools"("id") ON DELETE CASCADE;
ALTER TABLE "public"."communication_templates" ADD CONSTRAINT "communication_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."announcements" ADD CONSTRAINT "announcements_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."schools"("id") ON DELETE CASCADE;
ALTER TABLE "public"."announcements" ADD CONSTRAINT "announcements_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "public"."campuses"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."announcements" ADD CONSTRAINT "announcements_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "public"."class_arms"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."announcements" ADD CONSTRAINT "announcements_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."announcements" ADD CONSTRAINT "announcements_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."announcements" ADD CONSTRAINT "announcements_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."communication_delivery_drafts" ADD CONSTRAINT "communication_delivery_drafts_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."schools"("id") ON DELETE CASCADE;
ALTER TABLE "public"."communication_delivery_drafts" ADD CONSTRAINT "communication_delivery_drafts_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "public"."announcements"("id") ON DELETE CASCADE;
ALTER TABLE "public"."communication_delivery_drafts" ADD CONSTRAINT "communication_delivery_drafts_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."communication_templates"("id") ON DELETE SET NULL;
ALTER TABLE "public"."communication_delivery_drafts" ADD CONSTRAINT "communication_delivery_drafts_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."content_categories" ADD CONSTRAINT "content_categories_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."schools"("id") ON DELETE CASCADE;
ALTER TABLE "public"."publications" ADD CONSTRAINT "publications_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."schools"("id") ON DELETE CASCADE;
ALTER TABLE "public"."publications" ADD CONSTRAINT "publications_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "public"."campuses"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."publications" ADD CONSTRAINT "publications_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."content_categories"("id") ON DELETE SET NULL;
ALTER TABLE "public"."publications" ADD CONSTRAINT "publications_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."publications" ADD CONSTRAINT "publications_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."publications" ADD CONSTRAINT "publications_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."communication_media" ADD CONSTRAINT "communication_media_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."schools"("id") ON DELETE CASCADE;
ALTER TABLE "public"."communication_media" ADD CONSTRAINT "communication_media_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "public"."campuses"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."communication_media" ADD CONSTRAINT "communication_media_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "public"."publications"("id") ON DELETE CASCADE;
ALTER TABLE "public"."communication_media" ADD CONSTRAINT "communication_media_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."schools"("id") ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION "public"."enforce_phase5_scope"() RETURNS trigger AS $$
DECLARE target_school TEXT; target_campus TEXT;
BEGIN
  IF TG_TABLE_NAME='announcements' THEN
    IF NEW."campusId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "public"."campuses" c WHERE c.id=NEW."campusId" AND c."schoolId"=NEW."schoolId") THEN RAISE EXCEPTION 'announcement campus scope mismatch'; END IF;
    IF NEW."classArmId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "public"."class_arms" a JOIN "public"."campuses" c ON c.id=a."campusId" WHERE a.id=NEW."classArmId" AND a."campusId"=NEW."campusId" AND c."schoolId"=NEW."schoolId") THEN RAISE EXCEPTION 'announcement class scope mismatch'; END IF;
  ELSIF TG_TABLE_NAME='publications' THEN
    IF NEW."campusId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "public"."campuses" c WHERE c.id=NEW."campusId" AND c."schoolId"=NEW."schoolId") THEN RAISE EXCEPTION 'publication campus scope mismatch'; END IF;
    IF NEW."categoryId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "public"."content_categories" x WHERE x.id=NEW."categoryId" AND x."schoolId"=NEW."schoolId") THEN RAISE EXCEPTION 'publication category scope mismatch'; END IF;
  ELSIF TG_TABLE_NAME='communication_media' THEN
    IF NEW."publicationId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "public"."publications" p WHERE p.id=NEW."publicationId" AND p."schoolId"=NEW."schoolId") THEN RAISE EXCEPTION 'media publication scope mismatch'; END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER "announcements_scope_guard" BEFORE INSERT OR UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_phase5_scope"();
CREATE TRIGGER "publications_scope_guard" BEFORE INSERT OR UPDATE ON "public"."publications" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_phase5_scope"();
CREATE TRIGGER "communication_media_scope_guard" BEFORE INSERT OR UPDATE ON "public"."communication_media" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_phase5_scope"();
