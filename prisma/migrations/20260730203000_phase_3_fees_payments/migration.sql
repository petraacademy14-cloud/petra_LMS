Loaded Prisma config from prisma.config.ts.

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'POS', 'ONLINE');

-- CreateEnum
CREATE TYPE "StudentChargeType" AS ENUM ('CHARGE', 'DISCOUNT');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('CHARGE', 'DISCOUNT', 'PAYMENT', 'REVERSAL');

-- CreateEnum
CREATE TYPE "ReminderChannel" AS ENUM ('PRINT', 'WHATSAPP', 'SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('OPEN', 'RECONCILED');

-- CreateTable
CREATE TABLE "fee_categories" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_structures" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classLevelId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueOn" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_fee_accounts" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "classArmId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_fee_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_charges" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "categoryId" TEXT,
    "feeStructureId" TEXT,
    "type" "StudentChargeType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueOn" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charge_reversals" (
    "id" TEXT NOT NULL,
    "chargeId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "charge_reversals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reference" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_allocations" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "chargeId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_reversals" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_reversals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_ledger_entries" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_sequences" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "currentNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipt_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_reminders" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "channel" "ReminderChannel" NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL,
    "message" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_batches" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "businessDate" DATE NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'OPEN',
    "expectedAmount" DECIMAL(12,2) NOT NULL,
    "declaredAmount" DECIMAL(12,2) NOT NULL,
    "variance" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "reconciledById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reconciliation_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fee_categories_schoolId_isActive_idx" ON "fee_categories"("schoolId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "fee_categories_schoolId_code_key" ON "fee_categories"("schoolId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "fee_categories_schoolId_name_key" ON "fee_categories"("schoolId", "name");

-- CreateIndex
CREATE INDEX "fee_structures_schoolId_termId_isActive_idx" ON "fee_structures"("schoolId", "termId", "isActive");

-- CreateIndex
CREATE INDEX "fee_structures_campusId_classLevelId_isActive_idx" ON "fee_structures"("campusId", "classLevelId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "fee_structures_campusId_termId_classLevelId_categoryId_key" ON "fee_structures"("campusId", "termId", "classLevelId", "categoryId");

-- CreateIndex
CREATE INDEX "student_fee_accounts_campusId_classArmId_isActive_idx" ON "student_fee_accounts"("campusId", "classArmId", "isActive");

-- CreateIndex
CREATE INDEX "student_fee_accounts_schoolId_displayName_idx" ON "student_fee_accounts"("schoolId", "displayName");

-- CreateIndex
CREATE UNIQUE INDEX "student_fee_accounts_schoolId_studentId_key" ON "student_fee_accounts"("schoolId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "student_fee_accounts_schoolId_admissionNumber_key" ON "student_fee_accounts"("schoolId", "admissionNumber");

-- CreateIndex
CREATE INDEX "student_charges_accountId_termId_createdAt_idx" ON "student_charges"("accountId", "termId", "createdAt");

-- CreateIndex
CREATE INDEX "student_charges_campusId_termId_type_idx" ON "student_charges"("campusId", "termId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "student_charges_accountId_feeStructureId_key" ON "student_charges"("accountId", "feeStructureId");

-- CreateIndex
CREATE UNIQUE INDEX "charge_reversals_chargeId_key" ON "charge_reversals"("chargeId");

-- CreateIndex
CREATE INDEX "charge_reversals_createdAt_idx" ON "charge_reversals"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receiptNumber_key" ON "payments"("receiptNumber");

-- CreateIndex
CREATE INDEX "payments_accountId_termId_paidAt_idx" ON "payments"("accountId", "termId", "paidAt" DESC);

-- CreateIndex
CREATE INDEX "payments_campusId_paidAt_method_idx" ON "payments"("campusId", "paidAt" DESC, "method");

-- CreateIndex
CREATE INDEX "payments_schoolId_receiptNumber_idx" ON "payments"("schoolId", "receiptNumber");

-- CreateIndex
CREATE INDEX "payment_allocations_chargeId_idx" ON "payment_allocations"("chargeId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_allocations_paymentId_chargeId_key" ON "payment_allocations"("paymentId", "chargeId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_reversals_paymentId_key" ON "payment_reversals"("paymentId");

-- CreateIndex
CREATE INDEX "payment_reversals_createdAt_idx" ON "payment_reversals"("createdAt");

-- CreateIndex
CREATE INDEX "fee_ledger_entries_accountId_termId_occurredAt_idx" ON "fee_ledger_entries"("accountId", "termId", "occurredAt");

-- CreateIndex
CREATE INDEX "fee_ledger_entries_campusId_termId_occurredAt_idx" ON "fee_ledger_entries"("campusId", "termId", "occurredAt");

-- CreateIndex
CREATE INDEX "fee_ledger_entries_schoolId_occurredAt_idx" ON "fee_ledger_entries"("schoolId", "occurredAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "fee_ledger_entries_referenceType_referenceId_type_key" ON "fee_ledger_entries"("referenceType", "referenceId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_sequences_campusId_year_key" ON "receipt_sequences"("campusId", "year");

-- CreateIndex
CREATE INDEX "fee_reminders_campusId_termId_createdAt_idx" ON "fee_reminders"("campusId", "termId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "fee_reminders_accountId_createdAt_idx" ON "fee_reminders"("accountId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "reconciliation_batches_schoolId_businessDate_idx" ON "reconciliation_batches"("schoolId", "businessDate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "reconciliation_batches_campusId_businessDate_method_key" ON "reconciliation_batches"("campusId", "businessDate", "method");

-- AddForeignKey
ALTER TABLE "fee_categories" ADD CONSTRAINT "fee_categories_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_classLevelId_fkey" FOREIGN KEY ("classLevelId") REFERENCES "class_levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "fee_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fee_accounts" ADD CONSTRAINT "student_fee_accounts_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fee_accounts" ADD CONSTRAINT "student_fee_accounts_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fee_accounts" ADD CONSTRAINT "student_fee_accounts_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "class_arms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_charges" ADD CONSTRAINT "student_charges_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_charges" ADD CONSTRAINT "student_charges_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_charges" ADD CONSTRAINT "student_charges_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "student_fee_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_charges" ADD CONSTRAINT "student_charges_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_charges" ADD CONSTRAINT "student_charges_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "fee_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_charges" ADD CONSTRAINT "student_charges_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "fee_structures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_reversals" ADD CONSTRAINT "charge_reversals_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "student_charges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_reversals" ADD CONSTRAINT "charge_reversals_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "student_fee_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "student_charges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_reversals" ADD CONSTRAINT "payment_reversals_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_reversals" ADD CONSTRAINT "payment_reversals_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_ledger_entries" ADD CONSTRAINT "fee_ledger_entries_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_ledger_entries" ADD CONSTRAINT "fee_ledger_entries_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_ledger_entries" ADD CONSTRAINT "fee_ledger_entries_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "student_fee_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_ledger_entries" ADD CONSTRAINT "fee_ledger_entries_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_ledger_entries" ADD CONSTRAINT "fee_ledger_entries_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_sequences" ADD CONSTRAINT "receipt_sequences_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_sequences" ADD CONSTRAINT "receipt_sequences_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_reminders" ADD CONSTRAINT "fee_reminders_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_reminders" ADD CONSTRAINT "fee_reminders_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_reminders" ADD CONSTRAINT "fee_reminders_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "student_fee_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_reminders" ADD CONSTRAINT "fee_reminders_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_reminders" ADD CONSTRAINT "fee_reminders_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_batches" ADD CONSTRAINT "reconciliation_batches_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_batches" ADD CONSTRAINT "reconciliation_batches_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_batches" ADD CONSTRAINT "reconciliation_batches_reconciledById_fkey" FOREIGN KEY ("reconciledById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Finance invariants
ALTER TABLE "fee_structures"
  ADD CONSTRAINT "fee_structures_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "student_charges"
  ADD CONSTRAINT "student_charges_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "payment_allocations"
  ADD CONSTRAINT "payment_allocations_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "fee_ledger_entries"
  ADD CONSTRAINT "fee_ledger_entries_signed_amount"
  CHECK (
    ("type" = 'CHARGE' AND "amount" > 0) OR
    ("type" IN ('DISCOUNT', 'PAYMENT') AND "amount" < 0) OR
    ("type" = 'REVERSAL' AND "amount" <> 0)
  );
ALTER TABLE "receipt_sequences"
  ADD CONSTRAINT "receipt_sequences_current_positive" CHECK ("currentNumber" >= 0);
ALTER TABLE "reconciliation_batches"
  ADD CONSTRAINT "reconciliation_amounts_nonnegative"
  CHECK ("expectedAmount" >= 0 AND "declaredAmount" >= 0),
  ADD CONSTRAINT "reconciliation_variance_matches"
  CHECK ("variance" = "declaredAmount" - "expectedAmount");

-- Financial postings and their corrections are append-only. A correction is
-- represented by a new reversal row plus an equal-and-opposite ledger entry.
CREATE OR REPLACE FUNCTION prevent_finance_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION '% is append-only; post a reversal instead', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payments_append_only
BEFORE UPDATE OR DELETE ON "payments"
FOR EACH ROW EXECUTE FUNCTION prevent_finance_mutation();

CREATE TRIGGER payment_allocations_append_only
BEFORE UPDATE OR DELETE ON "payment_allocations"
FOR EACH ROW EXECUTE FUNCTION prevent_finance_mutation();

CREATE TRIGGER payment_reversals_append_only
BEFORE UPDATE OR DELETE ON "payment_reversals"
FOR EACH ROW EXECUTE FUNCTION prevent_finance_mutation();

CREATE TRIGGER student_charges_append_only
BEFORE UPDATE OR DELETE ON "student_charges"
FOR EACH ROW EXECUTE FUNCTION prevent_finance_mutation();

CREATE TRIGGER charge_reversals_append_only
BEFORE UPDATE OR DELETE ON "charge_reversals"
FOR EACH ROW EXECUTE FUNCTION prevent_finance_mutation();

CREATE TRIGGER fee_ledger_entries_append_only
BEFORE UPDATE OR DELETE ON "fee_ledger_entries"
FOR EACH ROW EXECUTE FUNCTION prevent_finance_mutation();

CREATE OR REPLACE FUNCTION validate_finance_scope()
RETURNS TRIGGER AS $$
DECLARE
  campus_school TEXT;
  related_school TEXT;
  related_campus TEXT;
BEGIN
  SELECT "schoolId" INTO campus_school FROM "campuses" WHERE "id" = NEW."campusId";
  IF campus_school IS NULL OR campus_school <> NEW."schoolId" THEN
    RAISE EXCEPTION 'finance record school/campus scope mismatch';
  END IF;

  IF TG_TABLE_NAME = 'fee_structures' THEN
    SELECT "campusId" INTO related_campus FROM "terms" WHERE "id" = NEW."termId";
    IF related_campus <> NEW."campusId" THEN RAISE EXCEPTION 'fee structure term/campus mismatch'; END IF;
    SELECT "schoolId" INTO related_school FROM "class_levels" WHERE "id" = NEW."classLevelId";
    IF related_school <> NEW."schoolId" THEN RAISE EXCEPTION 'fee structure class/school mismatch'; END IF;
    SELECT "schoolId" INTO related_school FROM "fee_categories" WHERE "id" = NEW."categoryId";
    IF related_school <> NEW."schoolId" THEN RAISE EXCEPTION 'fee structure category/school mismatch'; END IF;
  ELSIF TG_TABLE_NAME = 'student_fee_accounts' THEN
    IF NEW."classArmId" IS NOT NULL THEN
      SELECT "campusId" INTO related_campus FROM "class_arms" WHERE "id" = NEW."classArmId";
      IF related_campus <> NEW."campusId" THEN RAISE EXCEPTION 'student fee account class/campus mismatch'; END IF;
    END IF;
  ELSIF TG_TABLE_NAME IN ('student_charges', 'payments', 'fee_ledger_entries', 'fee_reminders') THEN
    SELECT "schoolId", "campusId" INTO related_school, related_campus
    FROM "student_fee_accounts" WHERE "id" = NEW."accountId";
    IF related_school <> NEW."schoolId" OR related_campus <> NEW."campusId" THEN
      RAISE EXCEPTION 'finance account scope mismatch';
    END IF;
    SELECT "campusId" INTO related_campus FROM "terms" WHERE "id" = NEW."termId";
    IF related_campus <> NEW."campusId" THEN RAISE EXCEPTION 'finance term/campus mismatch'; END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fee_structures_scope
BEFORE INSERT OR UPDATE ON "fee_structures"
FOR EACH ROW EXECUTE FUNCTION validate_finance_scope();

CREATE TRIGGER student_fee_accounts_scope
BEFORE INSERT OR UPDATE ON "student_fee_accounts"
FOR EACH ROW EXECUTE FUNCTION validate_finance_scope();

CREATE TRIGGER student_charges_scope
BEFORE INSERT ON "student_charges"
FOR EACH ROW EXECUTE FUNCTION validate_finance_scope();

CREATE TRIGGER payments_scope
BEFORE INSERT ON "payments"
FOR EACH ROW EXECUTE FUNCTION validate_finance_scope();

CREATE TRIGGER fee_ledger_entries_scope
BEFORE INSERT ON "fee_ledger_entries"
FOR EACH ROW EXECUTE FUNCTION validate_finance_scope();

CREATE TRIGGER fee_reminders_scope
BEFORE INSERT ON "fee_reminders"
FOR EACH ROW EXECUTE FUNCTION validate_finance_scope();

CREATE TRIGGER receipt_sequences_scope
BEFORE INSERT OR UPDATE ON "receipt_sequences"
FOR EACH ROW EXECUTE FUNCTION validate_finance_scope();

CREATE TRIGGER reconciliation_batches_scope
BEFORE INSERT OR UPDATE ON "reconciliation_batches"
FOR EACH ROW EXECUTE FUNCTION validate_finance_scope();

CREATE OR REPLACE FUNCTION validate_payment_allocation()
RETURNS TRIGGER AS $$
DECLARE
  payment_account TEXT;
  payment_term TEXT;
  payment_total DECIMAL(12,2);
  charge_account TEXT;
  charge_term TEXT;
  charge_total DECIMAL(12,2);
  already_on_payment DECIMAL(12,2);
  already_on_charge DECIMAL(12,2);
BEGIN
  SELECT "accountId", "termId", "amount"
  INTO payment_account, payment_term, payment_total
  FROM "payments" WHERE "id" = NEW."paymentId";

  SELECT "accountId", "termId", "amount"
  INTO charge_account, charge_term, charge_total
  FROM "student_charges" WHERE "id" = NEW."chargeId" AND "type" = 'CHARGE';

  IF payment_account IS NULL OR charge_account IS NULL OR
     payment_account <> charge_account OR payment_term <> charge_term THEN
    RAISE EXCEPTION 'payment allocation account/term mismatch';
  END IF;

  SELECT COALESCE(SUM("amount"), 0) INTO already_on_payment
  FROM "payment_allocations" WHERE "paymentId" = NEW."paymentId";
  IF already_on_payment + NEW."amount" > payment_total THEN
    RAISE EXCEPTION 'payment allocations exceed payment amount';
  END IF;

  SELECT COALESCE(SUM("amount"), 0) INTO already_on_charge
  FROM "payment_allocations" WHERE "chargeId" = NEW."chargeId";
  IF already_on_charge + NEW."amount" > charge_total THEN
    RAISE EXCEPTION 'payment allocations exceed charge amount';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_allocations_valid
BEFORE INSERT ON "payment_allocations"
FOR EACH ROW EXECUTE FUNCTION validate_payment_allocation();
