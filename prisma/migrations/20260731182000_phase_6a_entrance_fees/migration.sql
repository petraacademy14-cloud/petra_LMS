-- Phase 6A.3: applicant entrance fees and payments
CREATE TYPE "public"."EntranceFeeKind" AS ENUM ('FORM','EXAM');
CREATE TYPE "public"."ApplicantPaymentStatus" AS ENUM ('PENDING_VERIFICATION','VERIFIED','REVERSED');
CREATE TYPE "public"."ApplicantLedgerEntryType" AS ENUM ('CHARGE','PAYMENT','REVERSAL');

CREATE TABLE "public"."entrance_fee_schedules" (
  "id" TEXT PRIMARY KEY,
  "schoolId" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "classLevelId" TEXT NOT NULL,
  "kind" "public"."EntranceFeeKind" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "entrance_fee_schedules_amount_check" CHECK ("amount" > 0)
);

CREATE TABLE "public"."applicant_charges" (
  "id" TEXT PRIMARY KEY,
  "schoolId" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "scheduleId" TEXT NOT NULL,
  "kind" "public"."EntranceFeeKind" NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "applicant_charges_amount_check" CHECK ("amount" > 0)
);

CREATE TABLE "public"."applicant_payments" (
  "id" TEXT PRIMARY KEY,
  "schoolId" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "chargeId" TEXT NOT NULL,
  "status" "public"."ApplicantPaymentStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "method" "public"."PaymentMethod" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "reference" TEXT,
  "receiptNumber" TEXT,
  "paidAt" TIMESTAMP(3) NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verifiedAt" TIMESTAMP(3),
  "verifiedById" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "applicant_payments_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "applicant_payments_verified_fields_check" CHECK (
    ("status"='PENDING_VERIFICATION' AND "verifiedAt" IS NULL AND "verifiedById" IS NULL AND "receiptNumber" IS NULL)
    OR ("status" IN ('VERIFIED','REVERSED') AND "verifiedAt" IS NOT NULL AND "verifiedById" IS NOT NULL AND "receiptNumber" IS NOT NULL)
  )
);

CREATE TABLE "public"."applicant_payment_reversals" (
  "id" TEXT PRIMARY KEY,
  "paymentId" TEXT NOT NULL UNIQUE,
  "reason" TEXT NOT NULL,
  "recordedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "public"."applicant_fee_ledger_entries" (
  "id" TEXT PRIMARY KEY,
  "schoolId" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "type" "public"."ApplicantLedgerEntryType" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "referenceType" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "recordedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "applicant_fee_ledger_sign_check" CHECK (
    ("type"='CHARGE' AND "amount" > 0)
    OR ("type"='PAYMENT' AND "amount" < 0)
    OR ("type"='REVERSAL' AND "amount" > 0)
  )
);

CREATE TABLE "public"."applicant_receipt_sequences" (
  "id" TEXT PRIMARY KEY,
  "schoolId" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "currentNumber" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "applicant_receipt_sequences_number_check" CHECK ("currentNumber" >= 0)
);

CREATE UNIQUE INDEX "entrance_fee_schedules_scope_kind_key" ON "public"."entrance_fee_schedules"("campusId","classLevelId","kind");
CREATE INDEX "entrance_fee_schedules_school_active_idx" ON "public"."entrance_fee_schedules"("schoolId","isActive","kind");
CREATE UNIQUE INDEX "applicant_charges_application_kind_key" ON "public"."applicant_charges"("applicationId","kind");
CREATE INDEX "applicant_charges_school_campus_kind_idx" ON "public"."applicant_charges"("schoolId","campusId","kind");
CREATE UNIQUE INDEX "applicant_payments_receipt_number_key" ON "public"."applicant_payments"("receiptNumber") WHERE "receiptNumber" IS NOT NULL;
CREATE INDEX "applicant_payments_application_status_idx" ON "public"."applicant_payments"("applicationId","status","paidAt" DESC);
CREATE INDEX "applicant_payments_campus_status_method_idx" ON "public"."applicant_payments"("campusId","status","method","paidAt" DESC);
CREATE UNIQUE INDEX "applicant_fee_ledger_reference_key" ON "public"."applicant_fee_ledger_entries"("referenceType","referenceId","type");
CREATE INDEX "applicant_fee_ledger_application_occurred_idx" ON "public"."applicant_fee_ledger_entries"("applicationId","occurredAt");
CREATE INDEX "applicant_fee_ledger_campus_occurred_idx" ON "public"."applicant_fee_ledger_entries"("campusId","occurredAt" DESC);
CREATE UNIQUE INDEX "applicant_receipt_sequences_campus_year_key" ON "public"."applicant_receipt_sequences"("campusId","year");

ALTER TABLE "public"."entrance_fee_schedules" ADD CONSTRAINT "entrance_fee_schedules_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."schools"("id") ON DELETE CASCADE;
ALTER TABLE "public"."entrance_fee_schedules" ADD CONSTRAINT "entrance_fee_schedules_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "public"."campuses"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."entrance_fee_schedules" ADD CONSTRAINT "entrance_fee_schedules_classLevelId_fkey" FOREIGN KEY ("classLevelId") REFERENCES "public"."class_levels"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."entrance_fee_schedules" ADD CONSTRAINT "entrance_fee_schedules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."applicant_charges" ADD CONSTRAINT "applicant_charges_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."schools"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."applicant_charges" ADD CONSTRAINT "applicant_charges_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "public"."campuses"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."applicant_charges" ADD CONSTRAINT "applicant_charges_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "public"."admission_applications"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."applicant_charges" ADD CONSTRAINT "applicant_charges_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."entrance_fee_schedules"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."applicant_payments" ADD CONSTRAINT "applicant_payments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."schools"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."applicant_payments" ADD CONSTRAINT "applicant_payments_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "public"."campuses"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."applicant_payments" ADD CONSTRAINT "applicant_payments_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "public"."admission_applications"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."applicant_payments" ADD CONSTRAINT "applicant_payments_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "public"."applicant_charges"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."applicant_payments" ADD CONSTRAINT "applicant_payments_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."applicant_payment_reversals" ADD CONSTRAINT "applicant_payment_reversals_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."applicant_payments"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."applicant_payment_reversals" ADD CONSTRAINT "applicant_payment_reversals_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."applicant_fee_ledger_entries" ADD CONSTRAINT "applicant_fee_ledger_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."schools"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."applicant_fee_ledger_entries" ADD CONSTRAINT "applicant_fee_ledger_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "public"."campuses"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."applicant_fee_ledger_entries" ADD CONSTRAINT "applicant_fee_ledger_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "public"."admission_applications"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."applicant_fee_ledger_entries" ADD CONSTRAINT "applicant_fee_ledger_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."applicant_receipt_sequences" ADD CONSTRAINT "applicant_receipt_sequences_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."schools"("id") ON DELETE RESTRICT;
ALTER TABLE "public"."applicant_receipt_sequences" ADD CONSTRAINT "applicant_receipt_sequences_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "public"."campuses"("id") ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION "public"."validate_applicant_finance_scope"() RETURNS trigger AS $$
DECLARE
  app_school TEXT;
  app_campus TEXT;
  schedule_school TEXT;
  schedule_campus TEXT;
  schedule_class TEXT;
  charge_school TEXT;
  charge_campus TEXT;
  charge_application TEXT;
BEGIN
  IF TG_TABLE_NAME = 'entrance_fee_schedules' THEN
    IF NOT EXISTS (SELECT 1 FROM "public"."campuses" c WHERE c."id"=NEW."campusId" AND c."schoolId"=NEW."schoolId") THEN
      RAISE EXCEPTION 'Entrance fee campus is outside the school';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM "public"."class_levels" l WHERE l."id"=NEW."classLevelId" AND l."schoolId"=NEW."schoolId") THEN
      RAISE EXCEPTION 'Entrance fee class is outside the school';
    END IF;
  ELSIF TG_TABLE_NAME = 'applicant_charges' THEN
    SELECT "schoolId", "campusId" INTO app_school, app_campus FROM "public"."admission_applications" WHERE "id"=NEW."applicationId";
    SELECT "schoolId", "campusId", "classLevelId" INTO schedule_school, schedule_campus, schedule_class FROM "public"."entrance_fee_schedules" WHERE "id"=NEW."scheduleId";
    IF app_school IS NULL OR app_school<>NEW."schoolId" OR app_campus IS NULL OR app_campus<>NEW."campusId" THEN
      RAISE EXCEPTION 'Applicant charge scope mismatch';
    END IF;
    IF schedule_school<>NEW."schoolId" OR schedule_campus<>NEW."campusId" OR NOT EXISTS (
      SELECT 1 FROM "public"."admission_applications" a WHERE a."id"=NEW."applicationId" AND a."classLevelId"=schedule_class
    ) THEN
      RAISE EXCEPTION 'Applicant charge schedule mismatch';
    END IF;
  ELSIF TG_TABLE_NAME = 'applicant_payments' THEN
    SELECT "schoolId", "campusId", "applicationId" INTO charge_school, charge_campus, charge_application FROM "public"."applicant_charges" WHERE "id"=NEW."chargeId";
    IF charge_school IS NULL OR charge_school<>NEW."schoolId" OR charge_campus<>NEW."campusId" OR charge_application<>NEW."applicationId" THEN
      RAISE EXCEPTION 'Applicant payment scope mismatch';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "entrance_fee_schedules_scope_guard" BEFORE INSERT OR UPDATE ON "public"."entrance_fee_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."validate_applicant_finance_scope"();
CREATE TRIGGER "applicant_charges_scope_guard" BEFORE INSERT ON "public"."applicant_charges" FOR EACH ROW EXECUTE FUNCTION "public"."validate_applicant_finance_scope"();
CREATE TRIGGER "applicant_payments_scope_guard" BEFORE INSERT OR UPDATE ON "public"."applicant_payments" FOR EACH ROW EXECUTE FUNCTION "public"."validate_applicant_finance_scope"();

CREATE OR REPLACE FUNCTION "public"."prevent_applicant_finance_mutation"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Applicant financial ledger records are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "applicant_charges_immutable" BEFORE UPDATE OR DELETE ON "public"."applicant_charges" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_applicant_finance_mutation"();
CREATE TRIGGER "applicant_fee_ledger_immutable" BEFORE UPDATE OR DELETE ON "public"."applicant_fee_ledger_entries" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_applicant_finance_mutation"();
CREATE TRIGGER "applicant_payment_reversals_immutable" BEFORE UPDATE OR DELETE ON "public"."applicant_payment_reversals" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_applicant_finance_mutation"();
