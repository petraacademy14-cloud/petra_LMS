import "server-only";

import { db } from "@/lib/db";

export type ApplicantExamRegistrationRow = {
  id: string;
  applicationId: string;
  paperId: string;
  candidateNumber: string;
  seatNumber: string | null;
  status: "SCHEDULED" | "IN_PROGRESS" | "SCORED" | "ABSENT" | "CANCELLED";
  startedAt: Date | null;
  expiresAt: Date | null;
  submittedAt: Date | null;
  scoredAt: Date | null;
  score: unknown;
  maximumScore: unknown;
  percentage: unknown;
  passed: boolean | null;
  attendanceStatus: "NOT_MARKED" | "PRESENT" | "ABSENT";
  title: string;
  mode: "ONLINE" | "ONSITE";
  instructions: string;
  durationMinutes: number;
  questionCount: number;
  passMark: unknown;
  opensAt: Date | null;
  closesAt: Date | null;
  scheduledAt: Date | null;
  venue: string | null;
  paperStatus: "DRAFT" | "PUBLISHED" | "CLOSED";
  campusName: string;
  className: string;
};

type ApplicantViewer = {
  id: string;
  schoolId: string;
  applicationId: string;
  applicationNumber: string;
  applicationStatus: string;
};

export async function getApplicantExamRegistration(viewer: ApplicantViewer) {
  const rows = await db.$queryRaw<ApplicantExamRegistrationRow[]>`
    SELECT r."id", r."applicationId", r."paperId", r."candidateNumber", r."seatNumber",
      r."status"::text AS "status", r."startedAt", r."expiresAt", r."submittedAt", r."scoredAt",
      r."score", r."maximumScore", r."percentage", r."passed",
      r."attendanceStatus"::text AS "attendanceStatus",
      p."title", p."mode"::text AS "mode", p."instructions", p."durationMinutes",
      p."questionCount", p."passMark", p."opensAt", p."closesAt", p."scheduledAt",
      p."venue", p."status"::text AS "paperStatus", c."name" AS "campusName",
      l."name" AS "className"
    FROM "applicant_exam_registrations" r
    JOIN "entrance_exam_papers" p ON p."id" = r."paperId"
    JOIN "campuses" c ON c."id" = p."campusId"
    JOIN "class_levels" l ON l."id" = p."classLevelId"
    JOIN "admission_applications" a ON a."id" = r."applicationId"
    WHERE r."applicationId" = ${viewer.applicationId}
      AND a."accountId" = ${viewer.id}
      AND a."schoolId" = ${viewer.schoolId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function ensureApplicantExamRegistration(viewer: ApplicantViewer) {
  const existing = await getApplicantExamRegistration(viewer);
  if (existing) return existing;
  if (viewer.applicationStatus !== "AWAITING_EXAMINATION") return null;

  const applications = await db.$queryRaw<
    Array<{
      campusId: string | null;
      classLevelId: string | null;
      examMode: "ONLINE" | "ONSITE" | null;
    }>
  >`
    SELECT "campusId", "classLevelId", "examMode"::text AS "examMode"
    FROM "admission_applications"
    WHERE "id" = ${viewer.applicationId} AND "accountId" = ${viewer.id}
    LIMIT 1
  `;
  const application = applications[0];
  if (!application?.campusId || !application.classLevelId || !application.examMode) return null;

  const papers = await db.$queryRaw<Array<{ id: string; mode: "ONLINE" | "ONSITE" }>>`
    SELECT "id", "mode"::text AS "mode"
    FROM "entrance_exam_papers"
    WHERE "schoolId" = ${viewer.schoolId}
      AND "campusId" = ${application.campusId}
      AND "classLevelId" = ${application.classLevelId}
      AND "mode" = ${application.examMode}::"EntranceExamMode"
      AND "status" = 'PUBLISHED'
      AND ("mode" = 'ONSITE' OR "closesAt" > CURRENT_TIMESTAMP)
    ORDER BY COALESCE("opensAt", "scheduledAt") ASC, "createdAt" ASC
    LIMIT 1
  `;
  const paper = papers[0];
  if (!paper) return null;

  const year = new Date().getFullYear();
  await db.$transaction(async (tx) => {
    const sequenceRows = await tx.$queryRaw<Array<{ currentNumber: number }>>`
      INSERT INTO "exam_candidate_sequences" ("id", "schoolId", "year", "currentNumber")
      VALUES (${crypto.randomUUID()}, ${viewer.schoolId}, ${year}, 1)
      ON CONFLICT ("schoolId", "year")
      DO UPDATE SET "currentNumber" = "exam_candidate_sequences"."currentNumber" + 1,
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING "currentNumber"
    `;
    const serial = sequenceRows[0]?.currentNumber ?? 1;
    const candidateNumber = `PET-EX-${year}-${String(serial).padStart(6, "0")}`;
    const seatNumber = paper.mode === "ONSITE" ? `SEAT-${String(serial).padStart(4, "0")}` : null;
    const registrationId = crypto.randomUUID();

    await tx.$executeRaw`
      INSERT INTO "applicant_exam_registrations" (
        "id", "applicationId", "paperId", "candidateNumber", "seatNumber"
      ) VALUES (
        ${registrationId}, ${viewer.applicationId}, ${paper.id}, ${candidateNumber}, ${seatNumber}
      )
      ON CONFLICT ("applicationId") DO NOTHING
    `;
    await tx.auditLog.create({
      data: {
        schoolId: viewer.schoolId,
        actorUserId: null,
        action: "exam.registration_created",
        entityType: "ApplicantExamRegistration",
        entityId: registrationId,
        after: { applicationNumber: viewer.applicationNumber, candidateNumber, paperId: paper.id },
      },
    });
  });

  return getApplicantExamRegistration(viewer);
}
