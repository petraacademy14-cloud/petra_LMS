"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";

const titleSchema = z.string().trim().min(3).max(160);
const bodySchema = z.string().trim().min(10).max(5000);

async function audit(
  tx: Prisma.TransactionClient,
  input: {
    schoolId: string;
    campusId: string;
    actorUserId: string;
    action: string;
    entityId: string;
    before?: Prisma.InputJsonValue;
    after?: Prisma.InputJsonValue;
  },
) {
  const requestHeaders = await headers();
  await tx.auditLog.create({
    data: {
      schoolId: input.schoolId,
      campusId: input.campusId,
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: "Announcement",
      entityId: input.entityId,
      before: input.before,
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

function nigeriaLocalDateTime(raw: string | undefined) {
  if (!raw) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)
    ? `${raw}:00+01:00`
    : raw;
  const value = new Date(normalized);
  if (Number.isNaN(value.getTime())) {
    throw new Error("INVALID:ANNOUNCEMENT_SCHEDULE");
  }
  return value;
}

export async function createTeacherAnnouncement(formData: FormData) {
  const viewer = await requirePermission("communications.read");
  if (viewer.membership.role !== "TEACHER" || !viewer.membership.campusId) {
    throw new Error("FORBIDDEN:TEACHER_COMMUNICATION");
  }

  const input = z
    .object({
      classArmId: z.string().cuid(),
      title: titleSchema,
      body: bodySchema,
      scheduledFor: z.string().optional(),
      parentFacing: z.boolean(),
    })
    .parse({
      classArmId: formData.get("classArmId"),
      title: formData.get("title"),
      body: formData.get("body"),
      scheduledFor:
        String(formData.get("scheduledFor") ?? "").trim() || undefined,
      parentFacing: formData.get("parentFacing") === "on",
    });

  const assignment = await db.teachingAssignment.findFirst({
    where: {
      schoolId: viewer.membership.schoolId,
      campusId: viewer.membership.campusId,
      teacherMembershipId: viewer.membership.id,
      classArmId: input.classArmId,
      term: { isCurrent: true },
    },
    select: { id: true },
  });
  if (!assignment) {
    throw new Error("FORBIDDEN:TEACHER_CLASS_ASSIGNMENT");
  }

  const scheduledFor = nigeriaLocalDateTime(input.scheduledFor);

  await db.$transaction(async (tx) => {
    const announcement = await tx.announcement.create({
      data: {
        schoolId: viewer.membership.schoolId,
        campusId: viewer.membership.campusId!,
        classArmId: input.classArmId,
        audience: "CLASS",
        title: input.title,
        body: input.body,
        scheduledFor,
        parentFacing: input.parentFacing,
        authorId: viewer.user.id,
      },
      select: {
        id: true,
        title: true,
        classArmId: true,
        status: true,
      },
    });
    await audit(tx, {
      schoolId: viewer.membership.schoolId,
      campusId: viewer.membership.campusId!,
      actorUserId: viewer.user.id,
      action: "teacher.announcement_created",
      entityId: announcement.id,
      after: {
        title: announcement.title,
        classArmId: announcement.classArmId,
        status: announcement.status,
      },
    });
  });

  revalidatePath("/teacher");
  revalidatePath("/teacher/communications");
}

export async function submitTeacherAnnouncement(formData: FormData) {
  const viewer = await requirePermission("communications.read");
  if (viewer.membership.role !== "TEACHER" || !viewer.membership.campusId) {
    throw new Error("FORBIDDEN:TEACHER_COMMUNICATION");
  }

  const announcementId = z.string().cuid().parse(formData.get("announcementId"));
  const announcement = await db.announcement.findFirst({
    where: {
      id: announcementId,
      schoolId: viewer.membership.schoolId,
      campusId: viewer.membership.campusId,
      authorId: viewer.user.id,
      status: "DRAFT",
      audience: "CLASS",
    },
    select: {
      id: true,
      status: true,
      classArmId: true,
    },
  });
  if (!announcement?.classArmId) {
    throw new Error("NOT_FOUND:TEACHER_ANNOUNCEMENT");
  }

  const assignment = await db.teachingAssignment.findFirst({
    where: {
      schoolId: viewer.membership.schoolId,
      campusId: viewer.membership.campusId,
      teacherMembershipId: viewer.membership.id,
      classArmId: announcement.classArmId,
      term: { isCurrent: true },
    },
    select: { id: true },
  });
  if (!assignment) {
    throw new Error("FORBIDDEN:TEACHER_CLASS_ASSIGNMENT");
  }

  await db.$transaction(async (tx) => {
    await tx.announcement.update({
      where: { id: announcement.id },
      data: { status: "IN_REVIEW" },
    });
    await audit(tx, {
      schoolId: viewer.membership.schoolId,
      campusId: viewer.membership.campusId!,
      actorUserId: viewer.user.id,
      action: "teacher.announcement_submitted",
      entityId: announcement.id,
      before: { status: announcement.status },
      after: { status: "IN_REVIEW" },
    });
  });

  revalidatePath("/teacher");
  revalidatePath("/teacher/communications");
  revalidatePath("/communications");
}
