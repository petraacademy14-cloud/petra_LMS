"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { TermKind } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import {
  requireCampusAccess,
  requirePermission,
} from "@/lib/dal";

export type ActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialActionState: ActionState = {
  status: "idle",
  message: "",
};

const shortText = z.string().trim().min(2).max(80);
const code = z
  .string()
  .trim()
  .min(2)
  .max(16)
  .regex(/^[A-Za-z0-9-]+$/)
  .transform((value) => value.toUpperCase());

function errorState(error: unknown): ActionState {
  if (error instanceof z.ZodError) {
    return {
      status: "error",
      message: "Check the highlighted information and try again.",
      fieldErrors: error.flatten().fieldErrors,
    };
  }

  if (
    error instanceof Error &&
    (error.message.startsWith("FORBIDDEN") ||
      error.message.startsWith("NOT_FOUND"))
  ) {
    return {
      status: "error",
      message: "You do not have access to complete this action.",
    };
  }

  console.error(error);
  return {
    status: "error",
    message: "The change could not be saved. Please try again.",
  };
}

async function auditContext() {
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

async function writeAudit(
  tx: Prisma.TransactionClient,
  input: {
    schoolId: string;
    campusId?: string | null;
    actorUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    after: Prisma.InputJsonValue;
  },
) {
  return tx.auditLog.create({
    data: {
      ...input,
      ...(await auditContext()),
    },
  });
}

export async function createCampus(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const viewer = await requirePermission("school.manage");
    const input = z
      .object({
        name: shortText,
        code,
        city: shortText,
      })
      .parse(Object.fromEntries(formData));

    await db.$transaction(async (tx) => {
      const campus = await tx.campus.create({
        data: {
          schoolId: viewer.membership.schoolId,
          name: input.name,
          code: input.code,
          city: input.city,
        },
      });
      await writeAudit(tx, {
        schoolId: viewer.membership.schoolId,
        campusId: campus.id,
        actorUserId: viewer.user.id,
        action: "campus.created",
        entityType: "Campus",
        entityId: campus.id,
        after: {
          name: campus.name,
          code: campus.code,
          city: campus.city,
        },
      });
    });

    revalidatePath("/structure");
    revalidatePath("/dashboard");
    return { status: "success", message: "Campus created successfully." };
  } catch (error) {
    return errorState(error);
  }
}

export async function createAcademicSession(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const viewer = await requirePermission("school.manage");
    const input = z
      .object({
        name: shortText,
        startsOn: z.coerce.date(),
        endsOn: z.coerce.date(),
        isCurrent: z.string().optional(),
      })
      .refine((value) => value.endsOn > value.startsOn, {
        message: "End date must be after the start date.",
        path: ["endsOn"],
      })
      .parse(Object.fromEntries(formData));

    await db.$transaction(async (tx) => {
      if (input.isCurrent) {
        await tx.academicSession.updateMany({
          where: { schoolId: viewer.membership.schoolId, isCurrent: true },
          data: { isCurrent: false },
        });
      }
      const session = await tx.academicSession.create({
        data: {
          schoolId: viewer.membership.schoolId,
          name: input.name,
          startsOn: input.startsOn,
          endsOn: input.endsOn,
          isCurrent: Boolean(input.isCurrent),
        },
      });
      await writeAudit(tx, {
        schoolId: viewer.membership.schoolId,
        actorUserId: viewer.user.id,
        action: "academic_session.created",
        entityType: "AcademicSession",
        entityId: session.id,
        after: {
          name: session.name,
          startsOn: session.startsOn.toISOString(),
          endsOn: session.endsOn.toISOString(),
          isCurrent: session.isCurrent,
        },
      });
    });

    revalidatePath("/academics");
    revalidatePath("/dashboard");
    return { status: "success", message: "Academic session created." };
  } catch (error) {
    return errorState(error);
  }
}

export async function createClassLevel(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const viewer = await requirePermission("school.manage");
    const input = z
      .object({
        name: shortText,
        code,
        sortOrder: z.coerce.number().int().min(1).max(100),
      })
      .parse(Object.fromEntries(formData));

    await db.$transaction(async (tx) => {
      const level = await tx.classLevel.create({
        data: {
          schoolId: viewer.membership.schoolId,
          ...input,
        },
      });
      await writeAudit(tx, {
        schoolId: viewer.membership.schoolId,
        actorUserId: viewer.user.id,
        action: "class_level.created",
        entityType: "ClassLevel",
        entityId: level.id,
        after: input,
      });
    });

    revalidatePath("/academics");
    return { status: "success", message: "Class level created." };
  } catch (error) {
    return errorState(error);
  }
}

export async function createSubject(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const viewer = await requirePermission("school.manage");
    const input = z
      .object({ name: shortText, code })
      .parse(Object.fromEntries(formData));

    await db.$transaction(async (tx) => {
      const subject = await tx.subject.create({
        data: {
          schoolId: viewer.membership.schoolId,
          ...input,
        },
      });
      await writeAudit(tx, {
        schoolId: viewer.membership.schoolId,
        actorUserId: viewer.user.id,
        action: "subject.created",
        entityType: "Subject",
        entityId: subject.id,
        after: input,
      });
    });

    revalidatePath("/academics");
    return { status: "success", message: "Subject created." };
  } catch (error) {
    return errorState(error);
  }
}

export async function createClassArm(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission("academic.manage");
    const input = z
      .object({
        campusId: z.string().cuid(),
        classLevelId: z.string().cuid(),
        name: shortText,
        code,
        capacity: z.coerce.number().int().min(1).max(1000).optional(),
      })
      .parse(Object.fromEntries(formData));
    const viewer = await requireCampusAccess(input.campusId);

    await db.$transaction(async (tx) => {
      const classLevel = await tx.classLevel.findFirst({
        where: {
          id: input.classLevelId,
          schoolId: viewer.membership.schoolId,
        },
        select: { id: true },
      });
      if (!classLevel) throw new Error("NOT_FOUND:CLASS_LEVEL");

      const arm = await tx.classArm.create({ data: input });
      await writeAudit(tx, {
        schoolId: viewer.membership.schoolId,
        campusId: input.campusId,
        actorUserId: viewer.user.id,
        action: "class_arm.created",
        entityType: "ClassArm",
        entityId: arm.id,
        after: input,
      });
    });

    revalidatePath("/academics");
    revalidatePath("/dashboard");
    return { status: "success", message: "Class arm created." };
  } catch (error) {
    return errorState(error);
  }
}

export async function createTerm(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission("academic.manage");
    const input = z
      .object({
        academicSessionId: z.string().cuid(),
        campusId: z.string().cuid(),
        name: shortText,
        kind: z.enum(["FIRST", "SECOND", "THIRD", "CUSTOM"]),
        startsOn: z.coerce.date(),
        endsOn: z.coerce.date(),
        isCurrent: z.string().optional(),
      })
      .refine((value) => value.endsOn > value.startsOn, {
        message: "End date must be after the start date.",
        path: ["endsOn"],
      })
      .parse(Object.fromEntries(formData));
    const viewer = await requireCampusAccess(input.campusId);

    await db.$transaction(async (tx) => {
      const session = await tx.academicSession.findFirst({
        where: {
          id: input.academicSessionId,
          schoolId: viewer.membership.schoolId,
        },
      });
      if (!session) throw new Error("NOT_FOUND:ACADEMIC_SESSION");
      if (input.startsOn < session.startsOn || input.endsOn > session.endsOn) {
        throw new z.ZodError([
          {
            code: "custom",
            path: ["startsOn"],
            message: "Term dates must fall inside the academic session.",
          },
        ]);
      }

      if (input.isCurrent) {
        await tx.term.updateMany({
          where: { campusId: input.campusId, isCurrent: true },
          data: { isCurrent: false },
        });
      }
      const term = await tx.term.create({
        data: {
          ...input,
          kind: input.kind as TermKind,
          isCurrent: Boolean(input.isCurrent),
        },
      });
      await writeAudit(tx, {
        schoolId: viewer.membership.schoolId,
        campusId: input.campusId,
        actorUserId: viewer.user.id,
        action: "term.created",
        entityType: "Term",
        entityId: term.id,
        after: {
          name: term.name,
          kind: term.kind,
          startsOn: term.startsOn.toISOString(),
          endsOn: term.endsOn.toISOString(),
          isCurrent: term.isCurrent,
        },
      });
    });

    revalidatePath("/academics");
    revalidatePath("/dashboard");
    return { status: "success", message: "Term created." };
  } catch (error) {
    return errorState(error);
  }
}

export async function enableSubjectAtCampus(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission("academic.manage");
    const input = z
      .object({
        campusId: z.string().cuid(),
        subjectId: z.string().cuid(),
      })
      .parse(Object.fromEntries(formData));
    const viewer = await requireCampusAccess(input.campusId);

    await db.$transaction(async (tx) => {
      const subject = await tx.subject.findFirst({
        where: { id: input.subjectId, schoolId: viewer.membership.schoolId },
        select: { id: true },
      });
      if (!subject) throw new Error("NOT_FOUND:SUBJECT");

      const offering = await tx.campusSubject.upsert({
        where: {
          campusId_subjectId: input,
        },
        create: input,
        update: { isActive: true },
      });
      await writeAudit(tx, {
        schoolId: viewer.membership.schoolId,
        campusId: input.campusId,
        actorUserId: viewer.user.id,
        action: "campus_subject.enabled",
        entityType: "CampusSubject",
        entityId: offering.id,
        after: input,
      });
    });

    revalidatePath("/academics");
    revalidatePath("/dashboard");
    return { status: "success", message: "Subject enabled at campus." };
  } catch (error) {
    return errorState(error);
  }
}
