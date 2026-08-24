ALTER TABLE "applicant_accounts"
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "credentialsIssuedAt" TIMESTAMPTZ,
  ADD COLUMN "credentialsIssuedById" TEXT,
  ADD COLUMN "passwordChangedAt" TIMESTAMPTZ;

ALTER TABLE "applicant_accounts"
  ADD CONSTRAINT "applicant_accounts_credentials_issuer_fkey"
  FOREIGN KEY ("credentialsIssuedById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
