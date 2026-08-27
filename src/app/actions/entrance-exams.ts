"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { requireApplicant } from "@/lib/applicant-auth";
import { ensureApplicantExamRegistration } from "@/lib/applicant-exam";
import {
  answerOptions,
  attendanceStatuses,
  canStartOnlineExam,
  examDeadline,
  scoreManualExam,
  scoreObjectiveExam,
  selectAssignedQuestions,
  type AnswerOption,
} from "@/lib/entrance-exam";

const text = (min: number, max: number) => z.string().trim().min(min).max(max);
const optionalText = (value: FormDataEntryValue | null) => {
  const result = typeof value === "string" ? value.trim() : "";
  return result || null;
};
const optionalDateTime = (value: FormDataEntryValue | null) => {
  const result = optionalText(value);
  return result ? new Date(result) : null;
};

function assertCampusAccess(
  viewer: { membership: { role: string; campusId: string | null } },
  campusId: string,
) {
  if (viewer.membership.role !== "OWNER" && viewer.membership.campusId !== campusId) {
    throw new Error("FORBIDDEN:CAMPUS_SCOPE");
  }
}

export async function createEntranceExamPaper(formData: FormData) {
  const viewer = await requirePermission("admissions.manage");
  const input = z
    .object({
      campusId: z.string().trim().min(1),
      classLevelId: z.string().trim().min(1),
      title: text(3, 160),
      mode: z.enum(["ONLINE", "ONSITE"]),
      instructions: text(10, 3000),
      durationMinutes: z.coerce.number().int().min(10).max(240),
      questionCount: z.coerce.number().int().min(1).max(200),
      passMark: z.coerce.number().min(0).max(100),
      opensAt: z.date().nullable(),
      closesAt: z.date().nullable(),
      scheduledAt: z.date().nullable(),
      venue: z.string().trim().max(300).nullable(),
    })
    .superRefine((value, ctx) => {
      if (value.mode === "ONLINE") {
        if (!value.opensAt || !value.closesAt || value.opensAt >= value.closesAt) {
          ctx.addIssue({ code: "custom", message: "Online papers need a valid opening and closing time" });
        }
      } else if (!value.scheduledAt || !value.venue) {
        ctx.addIssue({ code: "custom", message: "Onsite papers need a date, time and venue" });
      }
    })
    .parse({
      campusId: formData.get("campusId"),
      classLevelId: formData.get("classLevelId"),
      title: formData.get("title"),
      mode: formData.get("mode"),
      instructions: formData.get("instructions"),
      durationMinutes: formData.get("durationMinutes"),
      questionCount: formData.get("questionCount"),
      passMark: formData.get("passMark"),
      opensAt: optionalDateTime(formData.get("opensAt")),
      closesAt: optionalDateTime(formData.get("closesAt")),
      scheduledAt: optionalDateTime(formData.get("scheduledAt")),
      venue: optionalText(formData.get("venue")),
    });

  assertCampusAccess(viewer, input.campusId);
  const placement = await db.classArm.findFirst({
    where: {
      campusId: input.campusId,
      classLevelId: input.classLevelId,
      isActive: true,
      campus: { schoolId: viewer.membership.schoolId, isActive: true },
      classLevel: { schoolId: viewer.membership.schoolId, isActive: true },
    },
    select: { id: true },
  });
  if (!placement) throw new Error("INVALID:EXAM_PLACEMENT");

  const paperId = crypto.randomUUID();
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO "entrance_exam_papers" (
        "id", "schoolId", "campusId", "classLevelId", "title", "mode", "instructions",
        "durationMinutes", "questionCount", "passMark", "opensAt", "closesAt",
        "scheduledAt", "venue", "createdById"
      ) VALUES (
        ${paperId}, ${viewer.membership.schoolId}, ${input.campusId}, ${input.classLevelId},
        ${input.title}, ${input.mode}::"EntranceExamMode", ${input.instructions},
        ${input.durationMinutes}, ${input.questionCount}, ${input.passMark}, ${input.opensAt},
        ${input.closesAt}, ${input.scheduledAt}, ${input.venue}, ${viewer.user.id}
      )
    `;
    await tx.auditLog.create({
      data: {
        schoolId: viewer.membership.schoolId,
        campusId: input.campusId,
        actorUserId: viewer.user.id,
        action: "exam.paper_created",
        entityType: "EntranceExamPaper",
        entityId: paperId,
        after: { title: input.title, mode: input.mode, questionCount: input.questionCount },
      },
    });
  });
  revalidatePath("/admissions-admin/exams");
}

export async function addEntranceExamQuestion(paperId: string, formData: FormData) {
  const viewer = await requirePermission("admissions.manage");
  const input = z.object({
    prompt: text(5, 2000),
    optionA: text(1, 800),
    optionB: text(1, 800),
    optionC: text(1, 800),
    optionD: text(1, 800),
    correctOption: z.enum(answerOptions),
    marks: z.coerce.number().positive().max(100),
  }).parse({
    prompt: formData.get("prompt"),
    optionA: formData.get("optionA"),
    optionB: formData.get("optionB"),
    optionC: formData.get("optionC"),
    optionD: formData.get("optionD"),
    correctOption: formData.get("correctOption"),
    marks: formData.get("marks"),
  });

  const papers = await db.$queryRaw<Array<{ campusId: string; status: string }>>`
    SELECT "campusId", "status"::text AS "status"
    FROM "entrance_exam_papers"
    WHERE "id" = ${paperId} AND "schoolId" = ${viewer.membership.schoolId}
    LIMIT 1
  `;
  const paper = papers[0];
  if (!paper) throw new Error("NOT_FOUND:EXAM_PAPER");
  assertCampusAccess(viewer, paper.campusId);
  if (paper.status !== "DRAFT") throw new Error("LOCKED:EXAM_PAPER");

  const orderRows = await db.$queryRaw<Array<{ nextOrder: number }>>`
    SELECT COALESCE(MAX("sortOrder"), 0)::int + 1 AS "nextOrder"
    FROM "entrance_exam_questions" WHERE "paperId" = ${paperId}
  `;
  const questionId = crypto.randomUUID();
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO "entrance_exam_questions" (
        "id", "schoolId", "paperId", "prompt", "optionA", "optionB", "optionC", "optionD",
        "correctOption", "marks", "sortOrder", "createdById"
      ) VALUES (
        ${questionId}, ${viewer.membership.schoolId}, ${paperId}, ${input.prompt}, ${input.optionA},
        ${input.optionB}, ${input.optionC}, ${input.optionD}, ${input.correctOption}::"ExamAnswerOption",
        ${input.marks}, ${orderRows[0]?.nextOrder ?? 1}, ${viewer.user.id}
      )
    `;
    await tx.auditLog.create({
      data: {
        schoolId: viewer.membership.schoolId,
        campusId: paper.campusId,
        actorUserId: viewer.user.id,
        action: "exam.question_added",
        entityType: "EntranceExamQuestion",
        entityId: questionId,
        after: { paperId, correctOption: input.correctOption, marks: input.marks },
      },
    });
  });
  revalidatePath("/admissions-admin/exams");
}

export async function publishEntranceExamPaper(paperId: string) {
  const viewer = await requirePermission("admissions.manage");
  const rows = await db.$queryRaw<Array<{ campusId: string; status: string; questionCount: number; activeQuestions: bigint }>>`
    SELECT p."campusId", p."status"::text AS "status", p."questionCount",
      COUNT(q."id") FILTER (WHERE q."isActive")::bigint AS "activeQuestions"
    FROM "entrance_exam_papers" p
    LEFT JOIN "entrance_exam_questions" q ON q."paperId" = p."id"
    WHERE p."id" = ${paperId} AND p."schoolId" = ${viewer.membership.schoolId}
    GROUP BY p."id"
    LIMIT 1
  `;
  const paper = rows[0];
  if (!paper) throw new Error("NOT_FOUND:EXAM_PAPER");
  assertCampusAccess(viewer, paper.campusId);
  if (paper.status !== "DRAFT") throw new Error("LOCKED:EXAM_PAPER");
  if (Number(paper.activeQuestions) < paper.questionCount) {
    throw new Error("INCOMPLETE:EXAM_QUESTION_BANK");
  }
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE "entrance_exam_papers"
      SET "status" = 'PUBLISHED', "publishedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${paperId} AND "status" = 'DRAFT'
    `;
    await tx.auditLog.create({
      data: {
        schoolId: viewer.membership.schoolId,
        campusId: paper.campusId,
        actorUserId: viewer.user.id,
        action: "exam.paper_published",
        entityType: "EntranceExamPaper",
        entityId: paperId,
        before: { status: "DRAFT" },
        after: { status: "PUBLISHED" },
      },
    });
  });
  revalidatePath("/admissions-admin/exams");
}

export async function closeEntranceExamPaper(paperId: string) {
  const viewer = await requirePermission("admissions.manage");
  const rows = await db.$queryRaw<Array<{ campusId: string; status: string }>>`
    SELECT "campusId", "status"::text AS "status" FROM "entrance_exam_papers"
    WHERE "id" = ${paperId} AND "schoolId" = ${viewer.membership.schoolId} LIMIT 1
  `;
  const paper = rows[0];
  if (!paper) throw new Error("NOT_FOUND:EXAM_PAPER");
  assertCampusAccess(viewer, paper.campusId);
  if (paper.status !== "PUBLISHED") throw new Error("INVALID:EXAM_PAPER_STATUS");
  await db.$executeRaw`
    UPDATE "entrance_exam_papers" SET "status" = 'CLOSED' WHERE "id" = ${paperId}
  `;
  await db.auditLog.create({
    data: {
      schoolId: viewer.membership.schoolId,
      campusId: paper.campusId,
      actorUserId: viewer.user.id,
      action: "exam.paper_closed",
      entityType: "EntranceExamPaper",
      entityId: paperId,
      before: { status: "PUBLISHED" },
      after: { status: "CLOSED" },
    },
  });
  revalidatePath("/admissions-admin/exams");
}

export async function startApplicantExam() {
  const viewer = await requireApplicant();
  const registration = await ensureApplicantExamRegistration(viewer);
  if (!registration || registration.mode !== "ONLINE") redirect("/apply/exam?error=unavailable");
  const now = new Date();
  if (!canStartOnlineExam({
    paperStatus: registration.paperStatus,
    registrationStatus: registration.status,
    opensAt: registration.opensAt,
    closesAt: registration.closesAt,
    now,
  })) {
    redirect("/apply/exam?error=not-open");
  }
  const expiresAt = examDeadline(now, registration.durationMinutes, registration.closesAt);
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE "applicant_exam_registrations"
      SET "status" = 'IN_PROGRESS', "startedAt" = ${now}, "expiresAt" = ${expiresAt}
      WHERE "id" = ${registration.id} AND "status" = 'SCHEDULED'
    `;
    await tx.auditLog.create({
      data: {
        schoolId: viewer.schoolId,
        actorUserId: null,
        action: "exam.started",
        entityType: "ApplicantExamRegistration",
        entityId: registration.id,
        after: { candidateNumber: registration.candidateNumber, expiresAt: expiresAt.toISOString() },
      },
    });
  });
  redirect("/apply/exam/take");
}

export async function submitApplicantExam(formData: FormData) {
  const viewer = await requireApplicant();
  const rows = await db.$queryRaw<
    Array<{
      id: string;
      paperId: string;
      status: string;
      questionCount: number;
      passMark: unknown;
      mode: string;
      candidateNumber: string;
    }>
  >`
    SELECT r."id", r."paperId", r."status"::text AS "status", p."questionCount",
      p."passMark", p."mode"::text AS "mode", r."candidateNumber"
    FROM "applicant_exam_registrations" r
    JOIN "entrance_exam_papers" p ON p."id" = r."paperId"
    JOIN "admission_applications" a ON a."id" = r."applicationId"
    WHERE r."applicationId" = ${viewer.applicationId} AND a."accountId" = ${viewer.id}
    LIMIT 1
  `;
  const registration = rows[0];
  if (!registration || registration.status !== "IN_PROGRESS" || registration.mode !== "ONLINE") {
    redirect("/apply/exam?error=not-active");
  }

  const questionRows = await db.$queryRaw<
    Array<{ id: string; correctOption: AnswerOption; marks: unknown }>
  >`
    SELECT "id", "correctOption"::text AS "correctOption", "marks"
    FROM "entrance_exam_questions"
    WHERE "paperId" = ${registration.paperId} AND "isActive" = TRUE
  `;
  const assigned = selectAssignedQuestions(
    registration.id,
    questionRows.map((question) => ({ ...question, marks: Number(question.marks) })),
    registration.questionCount,
  );
  const selected = new Map<string, AnswerOption>();
  for (const question of assigned) {
    const answer = formData.get(`question_${question.id}`);
    if (typeof answer === "string" && answerOptions.includes(answer as AnswerOption)) {
      selected.set(question.id, answer as AnswerOption);
    }
  }
  const outcome = scoreObjectiveExam(assigned, selected, Number(registration.passMark));
  const now = new Date();

  await db.$transaction(async (tx) => {
    for (const question of assigned) {
      const selectedOption = selected.get(question.id) ?? null;
      const correct = selectedOption === question.correctOption;
      await tx.$executeRaw`
        INSERT INTO "applicant_exam_answers" (
          "id", "registrationId", "questionId", "selectedOption", "isCorrect", "marksAwarded"
        ) VALUES (
          ${crypto.randomUUID()}, ${registration.id}, ${question.id},
          ${selectedOption}::"ExamAnswerOption", ${correct}, ${correct ? question.marks : 0}
        )
        ON CONFLICT ("registrationId", "questionId") DO UPDATE SET
          "selectedOption" = EXCLUDED."selectedOption",
          "isCorrect" = EXCLUDED."isCorrect",
          "marksAwarded" = EXCLUDED."marksAwarded"
      `;
    }
    await tx.$executeRaw`
      UPDATE "applicant_exam_registrations"
      SET "status" = 'SCORED', "submittedAt" = ${now}, "scoredAt" = ${now},
        "score" = ${outcome.score}, "maximumScore" = ${outcome.maximumScore},
        "percentage" = ${outcome.percentage}, "passed" = ${outcome.passed}
      WHERE "id" = ${registration.id} AND "status" = 'IN_PROGRESS'
    `;
    await tx.$executeRaw`
      UPDATE "admission_applications"
      SET "status" = 'UNDER_REVIEW', "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${viewer.applicationId} AND "status" = 'AWAITING_EXAMINATION'
    `;
    await tx.auditLog.create({
      data: {
        schoolId: viewer.schoolId,
        actorUserId: null,
        action: "exam.objective_scored",
        entityType: "ApplicantExamRegistration",
        entityId: registration.id,
        after: {
          candidateNumber: registration.candidateNumber,
          score: outcome.score,
          maximumScore: outcome.maximumScore,
          percentage: outcome.percentage,
          passed: outcome.passed,
        },
      },
    });
  });
  revalidatePath("/apply/exam");
  revalidatePath("/apply/status");
  redirect("/apply/exam?completed=1");
}

export async function markOnsiteExamAttendance(registrationId: string, formData: FormData) {
  const viewer = await requirePermission("admissions.manage");
  const attendance = z.enum(attendanceStatuses).parse(formData.get("attendance"));
  const rows = await db.$queryRaw<Array<{ campusId: string; status: string; mode: string; applicationId: string }>>`
    SELECT p."campusId", r."status"::text AS "status", p."mode"::text AS "mode", r."applicationId"
    FROM "applicant_exam_registrations" r
    JOIN "entrance_exam_papers" p ON p."id" = r."paperId"
    JOIN "admission_applications" a ON a."id" = r."applicationId"
    WHERE r."id" = ${registrationId} AND a."schoolId" = ${viewer.membership.schoolId}
    LIMIT 1
  `;
  const registration = rows[0];
  if (!registration) throw new Error("NOT_FOUND:EXAM_REGISTRATION");
  assertCampusAccess(viewer, registration.campusId);
  if (registration.mode !== "ONSITE" || registration.status !== "SCHEDULED") {
    throw new Error("INVALID:ONSITE_ATTENDANCE");
  }
  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE "applicant_exam_registrations"
      SET "attendanceStatus" = ${attendance}::"ExamAttendanceStatus",
        "attendanceMarkedById" = ${viewer.user.id}, "attendanceMarkedAt" = ${now},
        "status" = CASE WHEN ${attendance} = 'ABSENT' THEN 'ABSENT'::"ApplicantExamStatus" ELSE "status" END
      WHERE "id" = ${registrationId}
    `;
    if (attendance === "ABSENT") {
      await tx.$executeRaw`
        UPDATE "admission_applications" SET "status" = 'UNDER_REVIEW', "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${registration.applicationId} AND "status" = 'AWAITING_EXAMINATION'
      `;
    }
    await tx.auditLog.create({
      data: {
        schoolId: viewer.membership.schoolId,
        campusId: registration.campusId,
        actorUserId: viewer.user.id,
        action: "exam.attendance_marked",
        entityType: "ApplicantExamRegistration",
        entityId: registrationId,
        after: { attendance },
      },
    });
  });
  revalidatePath("/admissions-admin/exams");
}

export async function recordOnsiteExamScore(registrationId: string, formData: FormData) {
  const viewer = await requirePermission("admissions.manage");
  const input = z.object({
    score: z.coerce.number().min(0),
    maximumScore: z.coerce.number().positive().max(10_000),
  }).parse({ score: formData.get("score"), maximumScore: formData.get("maximumScore") });
  const rows = await db.$queryRaw<
    Array<{
      campusId: string;
      status: string;
      mode: string;
      attendanceStatus: string;
      applicationId: string;
      passMark: unknown;
      candidateNumber: string;
    }>
  >`
    SELECT p."campusId", r."status"::text AS "status", p."mode"::text AS "mode",
      r."attendanceStatus"::text AS "attendanceStatus", r."applicationId", p."passMark",
      r."candidateNumber"
    FROM "applicant_exam_registrations" r
    JOIN "entrance_exam_papers" p ON p."id" = r."paperId"
    JOIN "admission_applications" a ON a."id" = r."applicationId"
    WHERE r."id" = ${registrationId} AND a."schoolId" = ${viewer.membership.schoolId}
    LIMIT 1
  `;
  const registration = rows[0];
  if (!registration) throw new Error("NOT_FOUND:EXAM_REGISTRATION");
  assertCampusAccess(viewer, registration.campusId);
  if (
    registration.mode !== "ONSITE" ||
    registration.status !== "SCHEDULED" ||
    registration.attendanceStatus !== "PRESENT"
  ) {
    throw new Error("INVALID:ONSITE_SCORE_STATE");
  }
  const outcome = scoreManualExam(input.score, input.maximumScore, Number(registration.passMark));
  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE "applicant_exam_registrations"
      SET "status" = 'SCORED', "submittedAt" = ${now}, "scoredAt" = ${now},
        "score" = ${outcome.score}, "maximumScore" = ${outcome.maximumScore},
        "percentage" = ${outcome.percentage}, "passed" = ${outcome.passed},
        "manualScoreRecordedById" = ${viewer.user.id}
      WHERE "id" = ${registrationId} AND "status" = 'SCHEDULED'
    `;
    await tx.$executeRaw`
      UPDATE "admission_applications"
      SET "status" = 'UNDER_REVIEW', "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${registration.applicationId} AND "status" = 'AWAITING_EXAMINATION'
    `;
    await tx.auditLog.create({
      data: {
        schoolId: viewer.membership.schoolId,
        campusId: registration.campusId,
        actorUserId: viewer.user.id,
        action: "exam.onsite_scored",
        entityType: "ApplicantExamRegistration",
        entityId: registrationId,
        after: {
          candidateNumber: registration.candidateNumber,
          score: outcome.score,
          maximumScore: outcome.maximumScore,
          percentage: outcome.percentage,
          passed: outcome.passed,
        },
      },
    });
  });
  revalidatePath("/admissions-admin/exams");
  revalidatePath("/apply/status");
}
