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
    ],
  },
  enums: {
    external: [
      "public.ApplicationStatus",
      "public.EntranceExamMode",
      "public.VisitBookingStatus",
    ],
  },
});
