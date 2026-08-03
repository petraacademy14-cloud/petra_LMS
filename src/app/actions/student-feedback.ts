"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import {
  isFeedbackChoice,
  type FeedbackChoiceField,
} from "@/lib/student-feedback";
import { requirePortalRole } from "@/lib/portal-auth";

export type TeacherFeedbackActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type ParentFeedbackActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const choiceField = (field: FeedbackChoiceField) =>
  z.string().refine((value) => isFeedbackChoice(field, value), {
    message: `Select a valid ${field.replace(/Status$/, "").replace(/([A-Z])/g, " $1").toLowerCase()} option.`,
  });

const teacherFeedbackSchema = z.object({
  termId: z.string().cuid(),
  classArmId: z.string().cuid(),
  studentId: z.string().cuid(),
  feedbackDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  homeworkStatus: choiceField("homeworkStatus"),
  feedingStatus: choiceField("feedingStatus"),
  toiletStatus: choiceField("toiletStatus"),
  peerRelationshipStatus: choiceField("peerRelationshipStatus"),
  conductStatus: choiceField("conductStatus"),
  breakTimeStatus: choiceField("breakTimeStatus"),
  classParticipationStatus: choiceField("classParticipationStatus"),
  healthStatus: choiceField("healthStatus"),
  arrivalStatus: choiceField("arrivalStatus"),
  observationNote: z.string().trim().max(1200).optional(),
  teacherComment: z.string().trim().max(2000).optional(),
});

function lagosDate(raw: string) {
  const value = new Date(`${raw}T00:00:00+01:00`);
  if (Number.isNaN(value.getTime())) throw new Error("INVALID:FEEDBACK_DATE");
  return value;
}

function actionError(error: unknown): TeacherFeedbackActionState {
  if (error instanceof z.ZodError) {
    return {
      status: "error",
      message: error.issues[0]?.message ?? "Check the feedback form.",
    };
  }
  if ((error as { code?: string })?.code === "P2002") {
    return {
      status: "error",
      message: "You have already sent feedback for this student on this date.",
    };
  }
  if (error instanceof Error && error.message.startsWith("FORBIDDEN")) {
    return {
      status: "error",
      message: "This student is not within one of your current teaching assignments.",
    };
  }
  console.error(error);
  return {
    status: "error",
    message: "The feedback could not be sent. Please try again.",
  };
}

async function auditFeedback(
  tx: Prisma.TransactionClient,
  input: {
    schoolId: string;
    campusId: string;
    actorUserId: string;
    reportId: string;
    studentId: string;
    feedbackDate: string;
  },
) {
  const requestHeaders = await headers();
  await tx.auditLog.create({
    data: {
      schoolId: input.schoolId,
      campusId: input.campusId,
      actorUserId: input.actorUserId,
      action: "teacher.student_feedback_sent",
      entityType: "StudentFeedbackReport",
      entityId: input.reportId,
      after: {
        studentId: input.studentId,
        feedbackDate: input.feedbackDate,
        status: "SENT",
      },
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

export async function sendStudentFeedback(
  _previous: TeacherFeedbackActionState,
  formData: FormData,
): Promise<TeacherFeedbackActionState> {
  try {
    const viewer = await requirePermission("communications.read");
    if (viewer.membership.role !== "TEACHER" || !viewer.membership.campusId) {
      throw new Error("FORBIDDEN:TEACHER_ONLY");
    }

    const raw = Object.fromEntries(formData);
    const input = teacherFeedbackSchema.parse({
      ...raw,
      observationNote: String(raw.observationNote ?? "").trim() || undefined,
      teacherComment: String(raw.teacherComment ?? "").trim() || undefined,
    });

    const assignment = await db.teachingAssignment.findFirst({
      where: {
        schoolId: viewer.membership.schoolId,
        campusId: viewer.membership.campusId,
        teacherMembershipId: viewer.membership.id,
        termId: input.termId,
        classArmId: input.classArmId,
        term: { isCurrent: true },
      },
      select: {
        term: { select: { id: true, academicSessionId: true } },
        classArm: {
          select: {
            id: true,
            name: true,
            classLevel: { select: { name: true } },
          },
        },
      },
    });
    if (!assignment) throw new Error("FORBIDDEN:TEACHER_CLASS");

    const student = await db.student.findFirst({
      where: {
        id: input.studentId,
        schoolId: viewer.membership.schoolId,
        campusId: viewer.membership.campusId,
        status: "ACTIVE",
        enrollments: {
          some: {
            classArmId: assignment.classArm.id,
            academicSessionId: assignment.term.academicSessionId,
            status: "CURRENT",
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
      },
    });
    if (!student) throw new Error("FORBIDDEN:TEACHER_STUDENT");

    const feedbackDate = lagosDate(input.feedbackDate);
    const studentName = [student.firstName, student.middleName, student.lastName]
      .filter(Boolean)
      .join(" ");
    const className = `${assignment.classArm.classLevel.name} ${assignment.classArm.name}`;

    await db.$transaction(async (tx) => {
      const report = await tx.studentFeedbackReport.create({
        data: {
          schoolId: viewer.membership.schoolId,
          campusId: viewer.membership.campusId!,
          termId: assignment.term.id,
          classArmId: assignment.classArm.id,
          studentId: student.id,
          teacherMembershipId: viewer.membership.id,
          teacherUserId: viewer.user.id,
          feedbackDate,
          status: "SENT",
          studentNameSnapshot: studentName,
          classNameSnapshot: className,
          teacherNameSnapshot: viewer.user.name,
          homeworkStatus: input.homeworkStatus,
          feedingStatus: input.feedingStatus,
          toiletStatus: input.toiletStatus,
          peerRelationshipStatus: input.peerRelationshipStatus,
          conductStatus: input.conductStatus,
          breakTimeStatus: input.breakTimeStatus,
          classParticipationStatus: input.classParticipationStatus,
          healthStatus: input.healthStatus,
          arrivalStatus: input.arrivalStatus,
          observationNote: input.observationNote,
          teacherComment: input.teacherComment,
        },
        select: { id: true },
      });

      await auditFeedback(tx, {
        schoolId: viewer.membership.schoolId,
        campusId: viewer.membership.campusId!,
        actorUserId: viewer.user.id,
        reportId: report.id,
        studentId: student.id,
        feedbackDate: input.feedbackDate,
      });
    });

    revalidatePath("/teacher");
    revalidatePath("/teacher/feedback");
    revalidatePath(`/parent/students/${student.id}`);
    return {
      status: "success",
      message: `Feedback for ${studentName} was sent to the parent portal.`,
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function acknowledgeStudentFeedback(
  _previous: ParentFeedbackActionState,
  formData: FormData,
): Promise<ParentFeedbackActionState> {
  try {
    const viewer = await requirePortalRole("PARENT");
    if (!viewer.guardianId) {
      return { status: "error", message: "No guardian profile is linked to this account." };
    }

    const input = z
      .object({
        feedbackId: z.string().cuid(),
        parentComment: z.string().trim().max(1500).optional(),
      })
      .parse({
        feedbackId: formData.get("feedbackId"),
        parentComment:
          String(formData.get("parentComment") ?? "").trim() || undefined,
      });

    const report = await db.studentFeedbackReport.findFirst({
      where: {
        id: input.feedbackId,
        schoolId: viewer.schoolId,
        status: { in: ["SENT", "ACKNOWLEDGED"] },
      },
      select: { id: true, studentId: true },
    });
    if (!report) {
      return { status: "error", message: "This feedback report is not available." };
    }

    const guardianLink = await db.studentGuardian.findFirst({
      where: {
        guardianId: viewer.guardianId,
        studentId: report.studentId,
        student: { schoolId: viewer.schoolId },
      },
      select: { id: true },
    });
    if (!guardianLink) {
      return { status: "error", message: "You cannot respond to this student's feedback." };
    }

    await db.studentFeedbackReport.update({
      where: { id: report.id },
      data: {
        status: "ACKNOWLEDGED",
        parentGuardianId: viewer.guardianId,
        parentPortalAccountId: viewer.id,
        parentComment: input.parentComment,
        acknowledgedAt: new Date(),
      },
    });

    revalidatePath(`/parent/students/${report.studentId}`);
    revalidatePath("/teacher/feedback");
    return {
      status: "success",
      message: "Your acknowledgement has been sent to the teacher.",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: "error",
        message: error.issues[0]?.message ?? "Check your response.",
      };
    }
    console.error(error);
    return {
      status: "error",
      message: "Your response could not be sent. Please try again.",
    };
  }
}
