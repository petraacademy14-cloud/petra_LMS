"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { ActionState } from "@/app/actions/foundation";
import { DEFAULT_CLASS_ARMS, makeAcademicCode } from "@/lib/academic-setup";
import { requireCampusAccess, requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";

const shortText = z.string().trim().min(2).max(80);
const optionalCode = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .trim()
    .min(2)
    .max(16)
    .regex(/^[A-Za-z0-9-]+$/)
    .transform((value) => value.toUpperCase())
    .optional(),
);
const optionalCapacity = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().int().min(1).max(1000).optional(),
);

function errorState(error: unknown): ActionState {
  if (error instanceof z.ZodError) {
    return {
      status: "error",
      message: error.issues[0]?.message ?? "Check the submitted information.",
      fieldErrors: error.flatten().fieldErrors,
    };
  }
  if (
    error instanceof Error &&
    (error.message.startsWith("FORBIDDEN") ||
      error.message.startsWith("NOT_FOUND") ||
      error.message.startsWith("INVALID"))
  ) {
    return { status: "error", message: "This action is not allowed." };
  }
  console.error(error);
  return {
    status: "error",
    message: "The change could not be saved. Please try again.",
  };
}

async function requestContext() {
  const requestHeaders = await headers();
  return {
    requestId:
      requestHeaders.get("x-request-id") ??
      requestHeaders.get("x-vercel-id") ??
      crypto.randomUUID(),
    ipAddress:
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: requestHeaders.get("user-agent"),
  };
}

async function audit(
  tx: Prisma.TransactionClient,
  input: {
    schoolId: string;
    campusId: string;
    actorUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    before?: Prisma.InputJsonValue;
    after: Prisma.InputJsonValue;
  },
) {
  await tx.auditLog.create({
    data: { ...input, ...(await requestContext()) },
  });
}

async function syncSubjectForCurrentClassTeachers(
  tx: Prisma.TransactionClient,
  input: { schoolId: string; campusId: string; subjectId: string },
) {
  const classTeachers = await tx.$queryRaw<
    Array<{
      academicSessionId: string;
      classArmId: string;
      teacherMembershipId: string;
    }>
  >`
    SELECT assignment."academicSessionId", assignment."classArmId", assignment."teacherMembershipId"
    FROM "class_teacher_assignments" assignment
    JOIN "academic_sessions" session ON session."id" = assignment."academicSessionId"
    WHERE assignment."schoolId" = ${input.schoolId}
      AND assignment."campusId" = ${input.campusId}
      AND session."isCurrent" = true
  `;
  if (!classTeachers.length) return;

  const sessionIds = [...new Set(classTeachers.map((item) => item.academicSessionId))];
  const terms = await tx.term.findMany({
    where: {
      campusId: input.campusId,
      academicSessionId: { in: sessionIds },
    },
    select: { id: true, academicSessionId: true },
  });

  await tx.teachingAssignment.createMany({
    data: classTeachers.flatMap((classTeacher) =>
      terms
        .filter((term) => term.academicSessionId === classTeacher.academicSessionId)
        .map((term) => ({
          schoolId: input.schoolId,
          campusId: input.campusId,
          termId: term.id,
          classArmId: classTeacher.classArmId,
          subjectId: input.subjectId,
          teacherMembershipId: classTeacher.teacherMembershipId,
        })),
    ),
    skipDuplicates: true,
  });
}

export async function createClassWithDefaultArms(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission("academic.manage");
    const input = z
      .object({
        campusId: z.string().cuid(),
        name: shortText,
        code: optionalCode,
        capacity: optionalCapacity,
      })
      .parse(Object.fromEntries(formData));
    const viewer = await requireCampusAccess(input.campusId);
    const classCode = input.code ?? makeAcademicCode(input.name);

    const result = await db.$transaction(async (tx) => {
      let level = await tx.classLevel.findFirst({
        where: {
          schoolId: viewer.membership.schoolId,
          OR: [
            { code: classCode },
            { name: { equals: input.name, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, code: true },
      });

      if (!level) {
        const highest = await tx.classLevel.aggregate({
          where: { schoolId: viewer.membership.schoolId },
          _max: { sortOrder: true },
        });
        level = await tx.classLevel.create({
          data: {
            schoolId: viewer.membership.schoolId,
            name: input.name,
            code: classCode,
            sortOrder: (highest._max.sortOrder ?? 0) + 1,
          },
          select: { id: true, name: true, code: true },
        });
      }

      const arms = [];
      for (const armName of DEFAULT_CLASS_ARMS) {
        const arm = await tx.classArm.upsert({
          where: {
            campusId_classLevelId_code: {
              campusId: input.campusId,
              classLevelId: level.id,
              code: armName,
            },
          },
          create: {
            campusId: input.campusId,
            classLevelId: level.id,
            name: armName,
            code: armName,
            capacity: input.capacity,
          },
          update: {
            name: armName,
            isActive: true,
            ...(input.capacity ? { capacity: input.capacity } : {}),
          },
          select: { id: true, name: true },
        });
        arms.push(arm);
      }

      await audit(tx, {
        schoolId: viewer.membership.schoolId,
        campusId: input.campusId,
        actorUserId: viewer.user.id,
        action: "class.setup_completed",
        entityType: "ClassLevel",
        entityId: level.id,
        after: {
          classLevelId: level.id,
          name: level.name,
          code: level.code,
          arms: arms.map((arm) => ({ id: arm.id, name: arm.name })),
          capacity: input.capacity ?? null,
        },
      });

      return level;
    });

    revalidatePath("/academics");
    revalidatePath("/students");
    revalidatePath("/dashboard");
    return {
      status: "success",
      message: `${result.name} was created with Arm A and Arm B.`,
    };
  } catch (error) {
    return errorState(error);
  }
}

export async function createSubjectForCampus(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission("academic.manage");
    const input = z
      .object({
        campusId: z.string().cuid(),
        name: shortText,
        code: optionalCode,
      })
      .parse(Object.fromEntries(formData));
    const viewer = await requireCampusAccess(input.campusId);
    const subjectCode = input.code ?? makeAcademicCode(input.name);

    const subject = await db.$transaction(async (tx) => {
      let record = await tx.subject.findFirst({
        where: {
          schoolId: viewer.membership.schoolId,
          OR: [
            { code: subjectCode },
            { name: { equals: input.name, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, code: true },
      });
      record ??= await tx.subject.create({
        data: {
          schoolId: viewer.membership.schoolId,
          name: input.name,
          code: subjectCode,
        },
        select: { id: true, name: true, code: true },
      });

      const offering = await tx.campusSubject.upsert({
        where: {
          campusId_subjectId: {
            campusId: input.campusId,
            subjectId: record.id,
          },
        },
        create: { campusId: input.campusId, subjectId: record.id },
        update: { isActive: true },
      });

      await syncSubjectForCurrentClassTeachers(tx, {
        schoolId: viewer.membership.schoolId,
        campusId: input.campusId,
        subjectId: record.id,
      });

      await audit(tx, {
        schoolId: viewer.membership.schoolId,
        campusId: input.campusId,
        actorUserId: viewer.user.id,
        action: "subject.created_and_enabled",
        entityType: "CampusSubject",
        entityId: offering.id,
        after: {
          subjectId: record.id,
          name: record.name,
          code: record.code,
        },
      });
      return record;
    });

    revalidatePath("/academics");
    revalidatePath("/results");
    revalidatePath("/teacher");
    return {
      status: "success",
      message: `${subject.name} is now available at this campus.`,
    };
  } catch (error) {
    return errorState(error);
  }
}

export async function assignClassTeacher(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission("academic.manage");
    const input = z
      .object({
        campusId: z.string().cuid(),
        academicSessionId: z.string().cuid(),
        classArmId: z.string().cuid(),
        teacherMembershipId: z.string().cuid(),
      })
      .parse(Object.fromEntries(formData));
    const viewer = await requireCampusAccess(input.campusId);

    const [session, classArm, teacher] = await Promise.all([
      db.academicSession.findFirst({
        where: {
          id: input.academicSessionId,
          schoolId: viewer.membership.schoolId,
        },
        select: { id: true, name: true },
      }),
      db.classArm.findFirst({
        where: {
          id: input.classArmId,
          campusId: input.campusId,
          campus: { schoolId: viewer.membership.schoolId },
        },
        select: {
          id: true,
          name: true,
          classLevel: { select: { name: true } },
        },
      }),
      db.schoolMembership.findFirst({
        where: {
          id: input.teacherMembershipId,
          schoolId: viewer.membership.schoolId,
          campusId: input.campusId,
          role: "TEACHER",
          status: "ACTIVE",
        },
        select: { id: true, user: { select: { name: true } } },
      }),
    ]);
    if (!session || !classArm || !teacher) {
      throw new Error("INVALID:CLASS_TEACHER_SCOPE");
    }

    await db.$transaction(async (tx) => {
      const previous = await tx.$queryRaw<
        Array<{ id: string; teacherMembershipId: string }>
      >`
        SELECT "id", "teacherMembershipId"
        FROM "class_teacher_assignments"
        WHERE "academicSessionId" = ${input.academicSessionId}
          AND "classArmId" = ${input.classArmId}
        LIMIT 1
      `;
      const previousTeacherId = previous[0]?.teacherMembershipId ?? null;
      const assignmentId = previous[0]?.id ?? crypto.randomUUID();

      await tx.$executeRaw`
        INSERT INTO "class_teacher_assignments" (
          "id", "schoolId", "campusId", "academicSessionId", "classArmId", "teacherMembershipId"
        ) VALUES (
          ${assignmentId}, ${viewer.membership.schoolId}, ${input.campusId},
          ${input.academicSessionId}, ${input.classArmId}, ${input.teacherMembershipId}
        )
        ON CONFLICT ("academicSessionId", "classArmId")
        DO UPDATE SET
          "teacherMembershipId" = EXCLUDED."teacherMembershipId",
          "updatedAt" = CURRENT_TIMESTAMP
      `;

      const [terms, subjects] = await Promise.all([
        tx.term.findMany({
          where: {
            academicSessionId: input.academicSessionId,
            campusId: input.campusId,
          },
          select: { id: true },
        }),
        tx.campusSubject.findMany({
          where: { campusId: input.campusId, isActive: true },
          select: { subjectId: true },
        }),
      ]);
      const termIds = terms.map((term) => term.id);

      if (previousTeacherId && previousTeacherId !== input.teacherMembershipId) {
        await tx.teachingAssignment.deleteMany({
          where: {
            classArmId: input.classArmId,
            termId: { in: termIds },
            teacherMembershipId: previousTeacherId,
          },
        });
        await tx.resultSheet.updateMany({
          where: {
            classArmId: input.classArmId,
            termId: { in: termIds },
            teacherMembershipId: previousTeacherId,
            status: "DRAFT",
          },
          data: { teacherMembershipId: input.teacherMembershipId },
        });
      }

      await tx.teachingAssignment.createMany({
        data: terms.flatMap((term) =>
          subjects.map((subject) => ({
            schoolId: viewer.membership.schoolId,
            campusId: input.campusId,
            termId: term.id,
            classArmId: input.classArmId,
            subjectId: subject.subjectId,
            teacherMembershipId: input.teacherMembershipId,
          })),
        ),
        skipDuplicates: true,
      });

      await audit(tx, {
        schoolId: viewer.membership.schoolId,
        campusId: input.campusId,
        actorUserId: viewer.user.id,
        action: previousTeacherId
          ? "class_teacher.reassigned"
          : "class_teacher.assigned",
        entityType: "ClassTeacherAssignment",
        entityId: assignmentId,
        before: previousTeacherId
          ? { teacherMembershipId: previousTeacherId }
          : undefined,
        after: {
          academicSessionId: input.academicSessionId,
          classArmId: input.classArmId,
          teacherMembershipId: input.teacherMembershipId,
          derivedTeachingAssignments: terms.length * subjects.length,
        },
      });
    });

    revalidatePath("/academics");
    revalidatePath("/attendance");
    revalidatePath("/results");
    revalidatePath("/teacher");
    return {
      status: "success",
      message: `${teacher.user.name} is now class teacher for ${classArm.classLevel.name} ${classArm.name} in ${session.name}.`,
    };
  } catch (error) {
    return errorState(error);
  }
}
