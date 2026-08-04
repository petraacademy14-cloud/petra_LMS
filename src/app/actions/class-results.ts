"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { PETRA_RESULT_COMPONENTS } from "@/lib/academics";
import { requireCampusAccess, requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";

async function audit(
  tx: Prisma.TransactionClient,
  input: {
    schoolId: string;
    campusId: string;
    actorUserId: string;
    entityId: string;
    after: Prisma.InputJsonValue;
  },
) {
  const requestHeaders = await headers();
  await tx.auditLog.create({
    data: {
      schoolId: input.schoolId,
      campusId: input.campusId,
      actorUserId: input.actorUserId,
      action: "results.sheet_created",
      entityType: "ResultSheet",
      entityId: input.entityId,
      after: input.after,
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

export async function createClassTeacherResultSheet(formData: FormData) {
  const viewer = await requirePermission("results.manage");
  const input = z
    .object({
      campusId: z.string().cuid(),
      termId: z.string().cuid(),
      classArmId: z.string().cuid(),
      subjectId: z.string().cuid(),
      gradingSchemeId: z.string().cuid(),
    })
    .parse(Object.fromEntries(formData));

  await requireCampusAccess(input.campusId);
  const [assignments, scheme] = await Promise.all([
    db.teachingAssignment.findMany({
      where: {
        schoolId: viewer.membership.schoolId,
        campusId: input.campusId,
        termId: input.termId,
        classArmId: input.classArmId,
        subjectId: input.subjectId,
      },
      take: 2,
      select: { teacherMembershipId: true },
    }),
    db.gradingScheme.findFirst({
      where: {
        id: input.gradingSchemeId,
        schoolId: viewer.membership.schoolId,
      },
      select: { id: true },
    }),
  ]);

  if (assignments.length !== 1 || !scheme) {
    throw new Error("INVALID:CLASS_TEACHER_RESULT_SCOPE");
  }
  const teacherMembershipId = assignments[0]!.teacherMembershipId;
  if (
    viewer.membership.role === "TEACHER" &&
    viewer.membership.id !== teacherMembershipId
  ) {
    throw new Error("FORBIDDEN:CLASS_TEACHER_RESULT_SCOPE");
  }

  await db.$transaction(async (tx) => {
    const sheet = await tx.resultSheet.create({
      data: {
        schoolId: viewer.membership.schoolId,
        ...input,
        teacherMembershipId,
      },
    });
    await tx.assessmentComponent.createMany({
      data: PETRA_RESULT_COMPONENTS.map((component) => ({
        sheetId: sheet.id,
        ...component,
      })),
    });
    await audit(tx, {
      schoolId: viewer.membership.schoolId,
      campusId: input.campusId,
      actorUserId: viewer.user.id,
      entityId: sheet.id,
      after: { ...input, teacherMembershipId },
    });
  });

  revalidatePath("/results");
}
