import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url:
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5432/petra_lms",
  },
  experimental: {
    externalTables: true,
  },
  tables: {
    external: [
      "public.applicant_accounts",
      "public.applicant_sessions",
      "public.admission_applications",
      "public.application_documents",
      "public.visit_bookings",
      "public.entrance_fee_schedules",
      "public.applicant_charges",
      "public.applicant_payments",
      "public.applicant_payment_reversals",
      "public.applicant_fee_ledger_entries",
      "public.applicant_receipt_sequences",
      "public.entrance_exam_papers",
      "public.entrance_exam_questions",
      "public.exam_candidate_sequences",
      "public.applicant_exam_registrations",
      "public.applicant_exam_answers",
      "public.admission_decisions",
      "public.student_admission_document_links",
    ],
  },
  enums: {
    external: [
      "public.ApplicationStatus",
      "public.EntranceExamMode",
      "public.VisitBookingStatus",
      "public.EntranceFeeKind",
      "public.ApplicantPaymentStatus",
      "public.ApplicantLedgerEntryType",
      "public.EntranceExamPaperStatus",
      "public.ApplicantExamStatus",
      "public.ExamAttendanceStatus",
      "public.ExamAnswerOption",
      "public.AdmissionDecisionOutcome",
      "public.AdmissionOfferResponse",
    ],
  },
});
