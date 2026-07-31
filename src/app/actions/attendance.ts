"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { requireCampusAccess, requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";

const attendanceStatus = z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]);

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

async function attendanceScope(input: {
  schoolId: string;
  campusId: string;
  termId: string;
  classArmId: string;
}) {
  const [term, classArm] = await Promise.all([
    db.term.findFirst({
      where: {
        id: input.termId,
        campusId: input.campusId,
        campus: { schoolId: input.schoolId },
      },
      select: { id: true, startsOn: true, endsOn: true },
    }),
    db.classArm.findFirst({
      where: {
        id: input.classArmId,
        campusId: input.campusId,
        campus: { schoolId: input.schoolId },
      },
      select: { id: true },
    }),
  ]);
  if (!term || !classArm) throw new Error("INVALID:ATTENDANCE_SCOPE");
  return term;
}

async function requireTeacherClass(
  membershipId: string,
  role: string,
  termId: string,
  classArmId: string,
) {
  if (role !== "TEACHER") return;
  const assignment = await db.teachingAssignment.findFirst({
    where: { teacherMembershipId: membershipId, termId, classArmId },
    select: { id: true },
  });
  if (!assignment) throw new Error("FORBIDDEN:TEACHING_ASSIGNMENT");
}

export async function saveAttendanceRegister(formData: FormData) {
  const viewer = await requirePermission("attendance.manage");
  const input = z
    .object({
      campusId: z.string().cuid(),
      termId: z.string().cuid(),
      classArmId: z.string().cuid(),
      registerDate: z.coerce.date(),
    })
    .parse(Object.fromEntries(formData));
  await requireCampusAccess(input.campusId);
  const term = await attendanceScope({
    ...input,
    schoolId: viewer.membership.schoolId,
  });
  await requireTeacherClass(
    viewer.membership.id,
    viewer.membership.role,
    input.termId,
    input.classArmId,
  );
  if (input.registerDate < term.startsOn || input.registerDate > term.endsOn) {
    throw new Error("INVALID:ATTENDANCE_DATE");
  }

  const students = await db.student.findMany({
    where: {
      schoolId: viewer.membership.schoolId,
      campusId: input.campusId,
      status: "ACTIVE",
      enrollments: {
        some: { classArmId: input.classArmId, status: "CURRENT" },
      },
    },
    select: { id: true },
  });
  if (!students.length) throw new Error("INVALID:NO_ACTIVE_STUDENTS");
  const entries = students.map((student) => ({
    studentId: student.id,
    status: attendanceStatus.parse(formData.get(`status:${student.id}`)),
    note:
      z.string().trim().max(240).parse(formData.get(`note:${student.id}`) ?? "") ||
      null,
  }));

  await db.$transaction(async (tx) => {
    const existing = await tx.attendanceRegister.findUnique({
      where: {
        classArmId_registerDate: {
          classArmId: input.classArmId,
          registerDate: input.registerDate,
        },
      },
      select: { id: true, status: true },
    });
    if (existing?.status === "LOCKED") {
      throw new Error("INVALID:ATTENDANCE_LOCKED");
    }
    if (existing?.status === "SUBMITTED") {
      throw new Error("INVALID:ATTENDANCE_SUBMITTED");
    }
    const register =
      existing ??
      (await tx.attendanceRegister.create({
        data: {
          schoolId: viewer.membership.schoolId,
          campusId: input.campusId,
          termId: input.termId,
          classArmId: input.classArmId,
          registerDate: input.registerDate,
          createdById: viewer.user.id,
        },
        select: { id: true, status: true },
      }));
    for (const entry of entries) {
      await tx.attendanceEntry.upsert({
        where: {
          registerId_studentId: {
            registerId: register.id,
            studentId: entry.studentId,
          },
        },
        create: {
          registerId: register.id,
          ...entry,
          markedById: viewer.user.id,
        },
        update: {
          status: entry.status,
          note: entry.note,
          markedById: viewer.user.id,
        },
      });
    }
    await audit(tx, {
      schoolId: viewer.membership.schoolId,
      campusId: input.campusId,
      actorUserId: viewer.user.id,
      action: existing ? "attendance.updated" : "attendance.created",
      entityType: "AttendanceRegister",
      entityId: register.id,
      after: { count: entries.length, registerDate: input.registerDate.toISOString() },
    });
  });
  revalidatePath("/attendance");
  revalidatePath("/attendance/reports");
}

export async function submitAttendanceRegister(formData: FormData) {
  const viewer = await requirePermission("attendance.manage");
  const registerId = z.string().cuid().parse(formData.get("registerId"));
  const register = await db.attendanceRegister.findFirst({
    where: { id: registerId, schoolId: viewer.membership.schoolId },
    select: {
      id: true,
      campusId: true,
      termId: true,
      classArmId: true,
      status: true,
      _count: { select: { entries: true } },
    },
  });
  if (!register) throw new Error("NOT_FOUND:ATTENDANCE");
  await requireCampusAccess(register.campusId);
  await requireTeacherClass(
    viewer.membership.id,
    viewer.membership.role,
    register.termId,
    register.classArmId,
  );
  if (register.status !== "DRAFT" || register._count.entries === 0) {
    throw new Error("INVALID:ATTENDANCE_SUBMISSION");
  }
  await db.$transaction(async (tx) => {
    await tx.attendanceRegister.update({
      where: { id: register.id },
      data: {
        status: "SUBMITTED",
        submittedById: viewer.user.id,
        submittedAt: new Date(),
      },
    });
    await audit(tx, {
      schoolId: viewer.membership.schoolId,
      campusId: register.campusId,
      actorUserId: viewer.user.id,
      action: "attendance.submitted",
      entityType: "AttendanceRegister",
      entityId: register.id,
      before: { status: register.status },
      after: { status: "SUBMITTED" },
    });
  });
  revalidatePath("/attendance");
}

export async function correctAttendanceEntry(formData: FormData) {
  const viewer = await requirePermission("attendance.correct");
  const input = z
    .object({
      entryId: z.string().cuid(),
      status: attendanceStatus,
      note: z.string().trim().max(240).optional(),
      reason: z.string().trim().min(5).max(300),
    })
    .parse(Object.fromEntries(formData));
  const entry = await db.attendanceEntry.findFirst({
    where: {
      id: input.entryId,
      register: { schoolId: viewer.membership.schoolId },
    },
    select: {
      id: true,
      status: true,
      note: true,
      register: { select: { campusId: true, status: true } },
    },
  });
  if (!entry) throw new Error("NOT_FOUND:ATTENDANCE_ENTRY");
  await requireCampusAccess(entry.register.campusId);
  if (entry.register.status === "LOCKED") {
    throw new Error("INVALID:ATTENDANCE_LOCKED");
  }
  await db.$transaction(async (tx) => {
    await tx.attendanceCorrection.create({
      data: {
        entryId: entry.id,
        beforeStatus: entry.status,
        afterStatus: input.status,
        beforeNote: entry.note,
        afterNote: input.note || null,
        reason: input.reason,
        correctedById: viewer.user.id,
      },
    });
    await tx.attendanceEntry.update({
      where: { id: entry.id },
      data: {
        status: input.status,
        note: input.note || null,
        markedById: viewer.user.id,
      },
    });
    await audit(tx, {
      schoolId: viewer.membership.schoolId,
      campusId: entry.register.campusId,
      actorUserId: viewer.user.id,
      action: "attendance.corrected",
      entityType: "AttendanceEntry",
      entityId: entry.id,
      before: { status: entry.status, note: entry.note },
      after: { status: input.status, note: input.note || null, reason: input.reason },
    });
  });
  revalidatePath("/attendance");
  revalidatePath("/attendance/reports");
}

export async function lockAttendanceRegister(formData: FormData) {
  const viewer = await requirePermission("attendance.correct");
  const registerId = z.string().cuid().parse(formData.get("registerId"));
  const register = await db.attendanceRegister.findFirst({
    where: { id: registerId, schoolId: viewer.membership.schoolId },
    select: { id: true, campusId: true, status: true },
  });
  if (!register) throw new Error("NOT_FOUND:ATTENDANCE");
  await requireCampusAccess(register.campusId);
  if (register.status !== "SUBMITTED") {
    throw new Error("INVALID:ATTENDANCE_LOCK");
  }
  await db.$transaction(async (tx) => {
    await tx.attendanceRegister.update({
      where: { id: register.id },
      data: { status: "LOCKED", lockedById: viewer.user.id, lockedAt: new Date() },
    });
    await audit(tx, {
      schoolId: viewer.membership.schoolId,
      campusId: register.campusId,
      actorUserId: viewer.user.id,
      action: "attendance.locked",
      entityType: "AttendanceRegister",
      entityId: register.id,
      before: { status: register.status },
      after: { status: "LOCKED" },
    });
  });
  revalidatePath("/attendance");
}
