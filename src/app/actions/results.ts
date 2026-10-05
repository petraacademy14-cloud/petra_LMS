"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { canTransitionResult, PETRA_RESULT_COMPONENTS } from "@/lib/academics";
import { requireCampusAccess, requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { gradingSchemeId } from "@/lib/grading-scheme-id";
import { parseResultScore, resultScoreLimit, resultEntryError } from "@/lib/result-score-entry";

async function audit(
  tx: Prisma.TransactionClient,
  input: {
    schoolId: string;
    campusId: string | null;
    actorUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    before?: Prisma.InputJsonValue;
    after?: Prisma.InputJsonValue;
  },
) {
  const requestHeaders = await headers();
  await tx.auditLog.create({
    data: {
      ...input,
      requestId:
        requestHeaders.get("x-request-id") ??
        requestHeaders.get("x-vercel-id") ??
        crypto.randomUUID(),
      ipAddress:
        requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: requestHeaders.get("user-agent"),
    },
  });
}

export async function createTeachingAssignment(formData: FormData) {
  const viewer = await requirePermission("academic.manage");
  const input = z
    .object({
      campusId: z.string().cuid(),
      termId: z.string().cuid(),
      classArmId: z.string().cuid(),
      subjectId: z.string().cuid(),
      teacherMembershipId: z.string().cuid(),
    })
    .parse(Object.fromEntries(formData));
  await requireCampusAccess(input.campusId);
  const [term, classArm, subject, teacher] = await Promise.all([
    db.term.findFirst({
      where: {
        id: input.termId,
        campusId: input.campusId,
        campus: { schoolId: viewer.membership.schoolId },
      },
      select: { id: true },
    }),
    db.classArm.findFirst({
      where: {
        id: input.classArmId,
        campusId: input.campusId,
        campus: { schoolId: viewer.membership.schoolId },
      },
      select: { id: true },
    }),
    db.subject.findFirst({
      where: { id: input.subjectId, schoolId: viewer.membership.schoolId },
      select: { id: true },
    }),
    db.schoolMembership.findFirst({
      where: {
        id: input.teacherMembershipId,
        schoolId: viewer.membership.schoolId,
        campusId: input.campusId,
        role: "TEACHER",
        status: "ACTIVE",
      },
      select: { id: true },
    }),
  ]);
  if (!term || !classArm || !subject || !teacher) {
    throw new Error("INVALID:TEACHING_ASSIGNMENT");
  }
  await db.$transaction(async (tx) => {
    const assignment = await tx.teachingAssignment.upsert({
      where: {
        termId_classArmId_subjectId_teacherMembershipId: {
          termId: input.termId,
          classArmId: input.classArmId,
          subjectId: input.subjectId,
          teacherMembershipId: input.teacherMembershipId,
        },
      },
      create: { schoolId: viewer.membership.schoolId, ...input },
      update: {},
    });
    await audit(tx, {
      schoolId: viewer.membership.schoolId,
      campusId: input.campusId,
      actorUserId: viewer.user.id,
      action: "teaching.assignment_created",
      entityType: "TeachingAssignment",
      entityId: assignment.id,
      after: input,
    });
  });
  revalidatePath("/results");
}

export async function createResultSheet(formData: FormData) {
  const viewer = await requirePermission("results.manage");
  const input = z
    .object({
      campusId: z.string().cuid(),
      termId: z.string().cuid(),
      classArmId: z.string().cuid(),
      subjectId: z.string().cuid(),
      gradingSchemeId,
      teacherMembershipId: z.string().cuid(),
    })
    .parse(Object.fromEntries(formData));
  await requireCampusAccess(input.campusId);
  const assignment = await db.teachingAssignment.findFirst({
    where: {
      schoolId: viewer.membership.schoolId,
      campusId: input.campusId,
      termId: input.termId,
      classArmId: input.classArmId,
      subjectId: input.subjectId,
      teacherMembershipId: input.teacherMembershipId,
    },
    select: { id: true },
  });
  const scheme = await db.gradingScheme.findFirst({
    where: { id: input.gradingSchemeId, schoolId: viewer.membership.schoolId },
    select: { id: true },
  });
  if (!assignment || !scheme) throw new Error("INVALID:RESULT_SHEET_SCOPE");
  if (
    viewer.membership.role === "TEACHER" &&
    viewer.membership.id !== input.teacherMembershipId
  ) {
    throw new Error("FORBIDDEN:TEACHING_ASSIGNMENT");
  }
  const sheetId = await db.$transaction(async (tx) => {
    // Serialize automatic creation for the same term/class/subject.
    const key = `${input.termId}:${input.classArmId}:${input.subjectId}`;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))::text`;
    const existing = await tx.resultSheet.findUnique({
      where: { termId_classArmId_subjectId: {
        termId: input.termId, classArmId: input.classArmId, subjectId: input.subjectId,
      } },
    });
    if (existing) {
      if (existing.schoolId !== viewer.membership.schoolId ||
          existing.campusId !== input.campusId ||
          existing.teacherMembershipId !== input.teacherMembershipId) {
        throw new Error("FORBIDDEN:RESULT_SHEET");
      }
      return existing.id;
    }
    const sheet = await tx.resultSheet.create({
      data: { schoolId: viewer.membership.schoolId, ...input },
    });
    await tx.assessmentComponent.createMany({
      data: PETRA_RESULT_COMPONENTS.map((component) => ({ sheetId: sheet.id, ...component })),
    });
    await audit(tx, {
      schoolId: viewer.membership.schoolId, campusId: input.campusId,
      actorUserId: viewer.user.id, action: "results.sheet_created",
      entityType: "ResultSheet", entityId: sheet.id, after: input,
    });
    return sheet.id;
  });
  revalidatePath("/results");
  revalidatePath("/teacher/results");
  if (viewer.membership.role === "TEACHER") redirect(`/results/${sheetId}`);
}

export async function openTeacherScores(formData: FormData) {
  const viewer = await requirePermission("results.manage");
  const assignmentId = z.string().cuid().parse(formData.get("assignmentId"));
  const assignment = await db.teachingAssignment.findFirst({
    where: {
      id: assignmentId, schoolId: viewer.membership.schoolId,
      campusId: viewer.membership.campusId ?? "__none__",
      teacherMembershipId: viewer.membership.id,
    },
  });
  if (!assignment) throw new Error("FORBIDDEN:TEACHING_ASSIGNMENT");
  await requireCampusAccess(assignment.campusId);
  const scheme = await db.gradingScheme.findFirst({
    where: { schoolId: viewer.membership.schoolId, isDefault: true },
    orderBy: { createdAt: "asc" }, select: { id: true },
  });
  if (!scheme) throw new Error("INVALID:NO_DEFAULT_GRADING_SCHEME");
  const input = new FormData();
  for (const name of ["campusId", "termId", "classArmId", "subjectId", "teacherMembershipId"] as const) {
    input.set(name, assignment[name]);
  }
  input.set("gradingSchemeId", scheme.id);
  await createResultSheet(input);
}

async function resultSheetForEditor(sheetId: string, membershipId: string, role: string) {
  const sheet = await db.resultSheet.findUnique({
    where: { id: sheetId },
    include: {
      term: { select: { academicSessionId: true } },
      components: { orderBy: { sortOrder: "asc" } },
      classArm: {
        select: {
          enrollments: {
            where: { status: "CURRENT", student: { status: "ACTIVE" } },
            select: { studentId: true },
          },
        },
      },
    },
  });
  if (!sheet) throw new Error("NOT_FOUND:RESULT_SHEET");
  if (role === "TEACHER" && sheet.teacherMembershipId !== membershipId) {
    throw new Error("FORBIDDEN:RESULT_SHEET");
  }
  return sheet;
}

async function activeResultStudents(tx: Prisma.TransactionClient, sheet: {
  campusId: string; schoolId: string; classArmId: string; term: { academicSessionId: string };
}) {
  const enrollments = await tx.enrollment.findMany({
    where: {
      campusId: sheet.campusId, classArmId: sheet.classArmId,
      academicSessionId: sheet.term.academicSessionId, status: "CURRENT",
      student: { schoolId: sheet.schoolId, campusId: sheet.campusId, status: "ACTIVE" },
    }, select: { studentId: true },
  });
  return enrollments.map((entry) => entry.studentId);
}

async function verifyCompleteResultScores(tx: Prisma.TransactionClient, sheet: {
  id: string; components: { id: string; kind: string; maxScore: { toString(): string } }[];
}, studentIds: string[]) {
  const recorded = await tx.studentScore.findMany({
    where: { component: { sheetId: sheet.id }, studentId: { in: studentIds } },
    select: { componentId: true, score: true },
  });
  if (!studentIds.length || !sheet.components.length || recorded.length !== studentIds.length * sheet.components.length) {
    throw new Error("INVALID:INCOMPLETE_RESULT_SHEET");
  }
  for (const score of recorded) {
    const component = sheet.components.find((item) => item.id === score.componentId)!;
    parseResultScore(score.score.toString(), resultScoreLimit(component));
  }
}

async function verifyCurrentResultTeacher(tx: Prisma.TransactionClient, sheet: {
  schoolId: string; campusId: string; termId: string; classArmId: string; subjectId: string; teacherMembershipId: string;
}, role: string, membershipId: string) {
  if (role !== "TEACHER") return;
  if (sheet.teacherMembershipId !== membershipId || !await tx.teachingAssignment.findFirst({
    where: { schoolId: sheet.schoolId, campusId: sheet.campusId, termId: sheet.termId,
      classArmId: sheet.classArmId, subjectId: sheet.subjectId, teacherMembershipId: membershipId },
    select: { id: true },
  })) throw new Error("FORBIDDEN:TEACHING_ASSIGNMENT");
}

export async function saveResultSheetScores(formData: FormData) {
  const viewer = await requirePermission("results.manage");
  const sheetId = z.string().cuid().parse(formData.get("sheetId"));
  const sheet = await resultSheetForEditor(
    sheetId,
    viewer.membership.id,
    viewer.membership.role,
  );
  if (sheet.schoolId !== viewer.membership.schoolId) {
    throw new Error("FORBIDDEN:RESULT_SHEET");
  }
  await requireCampusAccess(sheet.campusId);
  if (sheet.status !== "DRAFT") throw new Error("INVALID:RESULT_SHEET_STATE");
  const expectedVersion = z.string().datetime().parse(formData.get("version"));
  const intent = z.enum(["save", "submit"]).parse(formData.get("intent") ?? "save");

  await db.$transaction(async (tx) => {
    // A row lock coordinates saves with submission, approval and corrections.
    await tx.$queryRaw`SELECT "id" FROM "result_sheets" WHERE "id" = ${sheet.id} FOR UPDATE`;
    const current = await tx.resultSheet.findUniqueOrThrow({ where: { id: sheet.id } });
    await verifyCurrentResultTeacher(tx, current, viewer.membership.role, viewer.membership.id);
    const studentIds = await activeResultStudents(tx, sheet);
    if (current.status !== "DRAFT") throw new Error("INVALID:RESULT_SHEET_STATE");
    if (current.updatedAt.toISOString() !== expectedVersion) throw new Error("CONFLICT:RESULT_SHEET_CHANGED");
    for (const studentId of studentIds) {
      for (const component of sheet.components) {
        const raw = formData.get(`score:${component.id}:${studentId}`);
        const score = parseResultScore(raw, resultScoreLimit(component));
        // Blank fields preserve recorded scores; zero is an explicit score.
        if (score === null) continue;
        await tx.studentScore.upsert({
          where: {
            componentId_studentId: { componentId: component.id, studentId },
          },
          create: {
            componentId: component.id,
            studentId,
            score,
            markedById: viewer.user.id,
          },
          update: { score, markedById: viewer.user.id },
        });
      }
      if (!formData.has(`comment:${studentId}`)) continue;
      const teacherComment = z
        .string()
        .trim()
        .max(500)
        .parse(formData.get(`comment:${studentId}`) ?? "");
      await tx.resultEntry.upsert({
        where: { sheetId_studentId: { sheetId: sheet.id, studentId } },
        create: {
          sheetId: sheet.id,
          studentId,
          teacherComment: teacherComment || null,
        },
        update: { teacherComment: teacherComment || null },
      });
    }
    if (intent === "submit") await verifyCompleteResultScores(tx, sheet, studentIds);
    await tx.resultSheet.update({ where: { id: sheet.id }, data: {
      updatedAt: new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1)),
      ...(intent === "submit" ? { status: "SUBMITTED", submittedById: viewer.user.id, submittedAt: new Date() } : {}),
    } });
    if (intent === "submit") await audit(tx, {
      schoolId: sheet.schoolId, campusId: sheet.campusId, actorUserId: viewer.user.id,
      action: "results.status_changed", entityType: "ResultSheet", entityId: sheet.id,
      before: { status: "DRAFT" }, after: { status: "SUBMITTED" },
    });
    await audit(tx, {
      schoolId: sheet.schoolId,
      campusId: sheet.campusId,
      actorUserId: viewer.user.id,
      action: "results.scores_saved",
      entityType: "ResultSheet",
      entityId: sheet.id,
      after: { studentCount: studentIds.length, componentCount: sheet.components.length },
    });
  }, { timeout: 30_000 });
  revalidatePath(`/results/${sheet.id}`);
  revalidatePath("/teacher/results");
}

export async function saveTeacherScoreEntry(
  _previous: { error: string; success: string }, formData: FormData,
) {
  try {
    await saveResultSheetScores(formData);
    return { error: "", success: formData.get("intent") === "submit" ? "Scores saved and submitted for approval." : "Draft saved. You can return to complete the remaining scores." };
  } catch (error) {
    return { error: resultEntryError(error), success: "" };
  }
}

export async function transitionResultSheet(formData: FormData) {
  const viewer = await requirePermission("results.read");
  const input = z
    .object({
      sheetId: z.string().cuid(),
      nextStatus: z.enum(["DRAFT", "SUBMITTED", "APPROVED", "PUBLISHED", "LOCKED"]),
    })
    .parse(Object.fromEntries(formData));
  const sheet = await resultSheetForEditor(
    input.sheetId,
    viewer.membership.id,
    viewer.membership.role,
  );
  if (sheet.schoolId !== viewer.membership.schoolId) {
    throw new Error("FORBIDDEN:RESULT_SHEET");
  }
  await requireCampusAccess(sheet.campusId);
  if (!canTransitionResult(sheet.status, input.nextStatus)) {
    throw new Error("INVALID:RESULT_TRANSITION");
  }
  if (input.nextStatus === "SUBMITTED") {
    await requirePermission("results.manage");

  } else if (input.nextStatus === "APPROVED" || input.nextStatus === "DRAFT") {
    await requirePermission("results.approve");
  } else {
    await requirePermission("results.publish");
  }

  const now = new Date();
  const stateData =
    input.nextStatus === "SUBMITTED"
      ? { submittedById: viewer.user.id, submittedAt: now }
      : input.nextStatus === "APPROVED"
        ? { approvedById: viewer.user.id, approvedAt: now }
        : input.nextStatus === "PUBLISHED"
          ? { publishedById: viewer.user.id, publishedAt: now }
          : input.nextStatus === "LOCKED"
            ? { lockedById: viewer.user.id, lockedAt: now }
            : {
                submittedById: null,
                submittedAt: null,
                approvedById: null,
                approvedAt: null,
              };
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "result_sheets" WHERE "id" = ${sheet.id} FOR UPDATE`;
    const current = await tx.resultSheet.findUniqueOrThrow({ where: { id: sheet.id } });
    await verifyCurrentResultTeacher(tx, current, viewer.membership.role, viewer.membership.id);
    if (current.status !== sheet.status || !canTransitionResult(current.status, input.nextStatus)) {
      throw new Error("CONFLICT:RESULT_SHEET_CHANGED");
    }
    if (input.nextStatus === "SUBMITTED") {
      const studentIds = await activeResultStudents(tx, sheet);
      await verifyCompleteResultScores(tx, sheet, studentIds);
    }
    await tx.resultSheet.update({
      where: { id: sheet.id },
      data: { status: input.nextStatus, ...stateData },
    });
    await audit(tx, {
      schoolId: sheet.schoolId,
      campusId: sheet.campusId,
      actorUserId: viewer.user.id,
      action: "results.status_changed",
      entityType: "ResultSheet",
      entityId: sheet.id,
      before: { status: sheet.status },
      after: { status: input.nextStatus },
    });
  });
  revalidatePath("/results");
  revalidatePath(`/results/${sheet.id}`);
}

export async function correctStudentScore(formData: FormData) {
  const viewer = await requirePermission("results.approve");
  const input = z
    .object({
      scoreId: z.string().cuid(),
      score: z.coerce.number().min(0),
      reason: z.string().trim().min(5).max(300),
    })
    .parse(Object.fromEntries(formData));
  const score = await db.studentScore.findUnique({
    where: { id: input.scoreId },
    select: {
      id: true,
      score: true,
      component: {
        select: {
          maxScore: true,
          kind: true,
          sortOrder: true,
          sheet: {
            select: { id: true, schoolId: true, campusId: true, status: true },
          },
        },
      },
    },
  });
  if (!score || score.component.sheet.schoolId !== viewer.membership.schoolId) {
    throw new Error("NOT_FOUND:SCORE");
  }
  await requireCampusAccess(score.component.sheet.campusId);
  if (
    score.component.sheet.status === "LOCKED" ||
    input.score > resultScoreLimit(score.component)
  ) {
    throw new Error("INVALID:SCORE_CORRECTION");
  }
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "result_sheets" WHERE "id" = ${score.component.sheet.id} FOR UPDATE`;
    const current = await tx.resultSheet.findUniqueOrThrow({ where: { id: score.component.sheet.id } });
    if (current.status === "LOCKED") throw new Error("INVALID:SCORE_CORRECTION");
    const previous = await tx.studentScore.findUniqueOrThrow({ where: { id: score.id } });
    await tx.scoreCorrection.create({
      data: {
        scoreId: score.id,
        beforeScore: previous.score,
        afterScore: input.score,
        reason: input.reason,
        correctedById: viewer.user.id,
      },
    });
    await tx.studentScore.update({
      where: { id: score.id },
      data: { score: input.score, markedById: viewer.user.id },
    });
    await tx.resultSheet.update({ where: { id: current.id }, data: { updatedAt: new Date() } });
    await audit(tx, {
      schoolId: score.component.sheet.schoolId,
      campusId: score.component.sheet.campusId,
      actorUserId: viewer.user.id,
      action: "results.score_corrected",
      entityType: "StudentScore",
      entityId: score.id,
      before: { score: Number(previous.score) },
      after: { score: input.score, reason: input.reason },
    });
  });
  revalidatePath(`/results/${score.component.sheet.id}`);
}

export async function updateDefaultGradingScheme(formData: FormData) {
  const viewer = await requirePermission("academic.manage");
  const input = z
    .object({
      schemeId: gradingSchemeId,
      caWeight: z.coerce.number().positive().max(99),
      examWeight: z.coerce.number().positive().max(99),
      aMin: z.coerce.number().min(0).max(100),
      bMin: z.coerce.number().min(0).max(100),
      cMin: z.coerce.number().min(0).max(100),
      dMin: z.coerce.number().min(0).max(100),
      eMin: z.coerce.number().min(0).max(100),
    })
    .parse(Object.fromEntries(formData));
  if (input.caWeight + input.examWeight !== 100) {
    throw new Error("INVALID:GRADING_WEIGHT");
  }
  const thresholds = [input.aMin, input.bMin, input.cMin, input.dMin, input.eMin, 0];
  if (!thresholds.every((value, index) => index === 0 || thresholds[index - 1]! > value)) {
    throw new Error("INVALID:GRADE_BANDS");
  }
  const scheme = await db.gradingScheme.findFirst({
    where: { id: input.schemeId, schoolId: viewer.membership.schoolId },
    include: { bands: true },
  });
  if (!scheme) throw new Error("NOT_FOUND:GRADING_SCHEME");
  await db.$transaction(async (tx) => {
    await tx.gradingScheme.update({
      where: { id: scheme.id },
      data: { caWeight: input.caWeight, examWeight: input.examWeight },
    });
    const labels = ["A", "B", "C", "D", "E", "F"];
    for (let index = 0; index < labels.length; index += 1) {
      const band = scheme.bands.find((item) => item.label === labels[index]);
      if (!band) continue;
      await tx.gradeBand.update({
        where: { id: band.id },
        data: {
          minScore: thresholds[index],
          maxScore: index === 0 ? 100 : thresholds[index - 1]! - 0.01,
        },
      });
    }
    await audit(tx, {
      schoolId: viewer.membership.schoolId,
      campusId: viewer.membership.campusId,
      actorUserId: viewer.user.id,
      action: "grading.scheme_updated",
      entityType: "GradingScheme",
      entityId: scheme.id,
      after: { caWeight: input.caWeight, examWeight: input.examWeight, thresholds },
    });
  });
  revalidatePath("/results/settings");
}
