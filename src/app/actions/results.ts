"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { canTransitionResult } from "@/lib/academics";
import { requireCampusAccess, requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";

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
      gradingSchemeId: z.string().cuid(),
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
    select: { caWeight: true, examWeight: true },
  });
  if (!assignment || !scheme) throw new Error("INVALID:RESULT_SHEET_SCOPE");
  if (
    viewer.membership.role === "TEACHER" &&
    viewer.membership.id !== input.teacherMembershipId
  ) {
    throw new Error("FORBIDDEN:TEACHING_ASSIGNMENT");
  }
  await db.$transaction(async (tx) => {
    const sheet = await tx.resultSheet.create({
      data: { schoolId: viewer.membership.schoolId, ...input },
    });
    const halfCa = Number(scheme.caWeight) / 2;
    await tx.assessmentComponent.createMany({
      data: [
        {
          sheetId: sheet.id,
          name: "Continuous assessment 1",
          kind: "CONTINUOUS_ASSESSMENT",
          maxScore: 20,
          weight: halfCa,
          sortOrder: 1,
        },
        {
          sheetId: sheet.id,
          name: "Continuous assessment 2",
          kind: "CONTINUOUS_ASSESSMENT",
          maxScore: 20,
          weight: halfCa,
          sortOrder: 2,
        },
        {
          sheetId: sheet.id,
          name: "Examination",
          kind: "EXAM",
          maxScore: 60,
          weight: scheme.examWeight,
          sortOrder: 3,
        },
      ],
    });
    await audit(tx, {
      schoolId: viewer.membership.schoolId,
      campusId: input.campusId,
      actorUserId: viewer.user.id,
      action: "results.sheet_created",
      entityType: "ResultSheet",
      entityId: sheet.id,
      after: input,
    });
  });
  revalidatePath("/results");
}

async function resultSheetForEditor(sheetId: string, membershipId: string, role: string) {
  const sheet = await db.resultSheet.findUnique({
    where: { id: sheetId },
    include: {
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
  const studentIds = sheet.classArm.enrollments.map((item) => item.studentId);

  await db.$transaction(async (tx) => {
    for (const studentId of studentIds) {
      for (const component of sheet.components) {
        const raw = formData.get(`score:${component.id}:${studentId}`);
        if (raw === null || raw === "") continue;
        const score = z.coerce.number().min(0).max(Number(component.maxScore)).parse(raw);
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
    await audit(tx, {
      schoolId: sheet.schoolId,
      campusId: sheet.campusId,
      actorUserId: viewer.user.id,
      action: "results.scores_saved",
      entityType: "ResultSheet",
      entityId: sheet.id,
      after: { studentCount: studentIds.length, componentCount: sheet.components.length },
    });
  });
  revalidatePath(`/results/${sheet.id}`);
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
    const expected = sheet.classArm.enrollments.length * sheet.components.length;
    const recorded = await db.studentScore.count({
      where: {
        component: { sheetId: sheet.id },
        studentId: { in: sheet.classArm.enrollments.map((item) => item.studentId) },
      },
    });
    if (recorded !== expected) throw new Error("INVALID:INCOMPLETE_RESULT_SHEET");
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
    input.score > Number(score.component.maxScore)
  ) {
    throw new Error("INVALID:SCORE_CORRECTION");
  }
  await db.$transaction(async (tx) => {
    await tx.scoreCorrection.create({
      data: {
        scoreId: score.id,
        beforeScore: score.score,
        afterScore: input.score,
        reason: input.reason,
        correctedById: viewer.user.id,
      },
    });
    await tx.studentScore.update({
      where: { id: score.id },
      data: { score: input.score, markedById: viewer.user.id },
    });
    await audit(tx, {
      schoolId: score.component.sheet.schoolId,
      campusId: score.component.sheet.campusId,
      actorUserId: viewer.user.id,
      action: "results.score_corrected",
      entityType: "StudentScore",
      entityId: score.id,
      before: { score: Number(score.score) },
      after: { score: input.score, reason: input.reason },
    });
  });
  revalidatePath(`/results/${score.component.sheet.id}`);
}

export async function updateDefaultGradingScheme(formData: FormData) {
  const viewer = await requirePermission("academic.manage");
  const input = z
    .object({
      schemeId: z.string().cuid(),
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
