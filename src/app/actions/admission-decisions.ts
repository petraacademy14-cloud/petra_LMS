"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { formatAdmissionNumber } from "@/lib/admission-number";
import {
  admissionDecisionOutcomes,
  guardianRelationship,
  type AdmissionDecisionOutcome,
  type AdmissionOfferResponse,
} from "@/lib/admission-decision";
import { requireApplicant } from "@/lib/applicant-auth";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { syncStudentFeeAccount } from "@/lib/student-finance-sync";

const optionalText = (value: FormDataEntryValue | null) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
};

function assertCampusAccess(
  viewer: { membership: { role: string; campusId: string | null } },
  campusId: string,
) {
  if (viewer.membership.role !== "OWNER" && viewer.membership.campusId !== campusId) {
    throw new Error("FORBIDDEN:CAMPUS_SCOPE");
  }
}

function studentDisplayName(input: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
}) {
  return [input.firstName, input.middleName, input.lastName].filter(Boolean).join(" ");
}

type ReviewApplicationRow = {
  id: string;
  schoolId: string;
  campusId: string | null;
  status: string;
  examStatus: string | null;
};

type ExistingDecisionRow = {
  id: string;
  outcome: AdmissionDecisionOutcome;
  internalNote: string;
  applicantMessage: string | null;
  offerExpiresAt: Date | null;
  offerResponse: AdmissionOfferResponse;
};

export async function recordAdmissionDecision(
  applicationId: string,
  formData: FormData,
) {
  const viewer = await requirePermission("admissions.manage");
  const input = z
    .object({
      outcome: z.enum(admissionDecisionOutcomes),
      internalNote: z.string().trim().min(5).max(1500),
      applicantMessage: z.string().trim().max(1200).nullable(),
      offerExpiresAt: z.date().nullable(),
    })
    .parse({
      outcome: formData.get("outcome"),
      internalNote: formData.get("internalNote"),
      applicantMessage: optionalText(formData.get("applicantMessage")),
      offerExpiresAt: optionalText(formData.get("offerExpiresAt"))
        ? new Date(String(formData.get("offerExpiresAt")))
        : null,
    });

  if (input.outcome === "ACCEPTED") {
    if (!input.offerExpiresAt || Number.isNaN(input.offerExpiresAt.getTime())) {
      throw new Error("INVALID:OFFER_EXPIRY");
    }
    if (input.offerExpiresAt <= new Date()) {
      throw new Error("INVALID:OFFER_EXPIRY");
    }
  }

  const [application] = await db.$queryRaw<ReviewApplicationRow[]>`
    SELECT a."id", a."schoolId", a."campusId", a."status"::text AS "status",
      r."status"::text AS "examStatus"
    FROM "admission_applications" a
    LEFT JOIN "applicant_exam_registrations" r ON r."applicationId" = a."id"
    WHERE a."id" = ${applicationId} AND a."schoolId" = ${viewer.membership.schoolId}
    LIMIT 1
  `;
  if (!application?.campusId) throw new Error("NOT_FOUND:APPLICATION");
  assertCampusAccess(viewer, application.campusId);

  const [existing] = await db.$queryRaw<ExistingDecisionRow[]>`
    SELECT "id", "outcome"::text AS "outcome", "internalNote", "applicantMessage",
      "offerExpiresAt", "offerResponse"::text AS "offerResponse"
    FROM "admission_decisions"
    WHERE "applicationId" = ${applicationId}
    LIMIT 1
  `;

  if (!existing && application.status !== "UNDER_REVIEW") {
    throw new Error("INVALID:APPLICATION_NOT_UNDER_REVIEW");
  }
  if (existing && existing.outcome !== "WAITLISTED") {
    throw new Error("INVALID:DECISION_ALREADY_FINAL");
  }
  if (existing && !["ACCEPTED", "REJECTED"].includes(input.outcome)) {
    throw new Error("INVALID:WAITLIST_DECISION");
  }
  if (["ACCEPTED", "WAITLISTED"].includes(input.outcome) && application.examStatus !== "SCORED") {
    throw new Error("INVALID:EXAM_NOT_SCORED");
  }
  if (input.outcome === "REJECTED" && !["SCORED", "ABSENT"].includes(application.examStatus ?? "")) {
    throw new Error("INVALID:EXAM_NOT_COMPLETE");
  }

  const decisionId = existing?.id ?? crypto.randomUUID();
  await db.$transaction(async (tx) => {
    if (existing) {
      await tx.$executeRaw`
        UPDATE "admission_decisions"
        SET "outcome" = ${input.outcome}::"AdmissionDecisionOutcome",
          "internalNote" = ${input.internalNote},
          "applicantMessage" = ${input.applicantMessage},
          "offerExpiresAt" = ${input.outcome === "ACCEPTED" ? input.offerExpiresAt : null}
        WHERE "id" = ${existing.id}
      `;
    } else {
      await tx.$executeRaw`
        INSERT INTO "admission_decisions" (
          "id", "applicationId", "schoolId", "campusId", "outcome", "internalNote",
          "applicantMessage", "offerExpiresAt", "offerResponse", "decidedById"
        ) VALUES (
          ${decisionId}, ${applicationId}, ${viewer.membership.schoolId}, ${application.campusId},
          ${input.outcome}::"AdmissionDecisionOutcome", ${input.internalNote}, ${input.applicantMessage},
          ${input.outcome === "ACCEPTED" ? input.offerExpiresAt : null},
          ${input.outcome === "ACCEPTED" ? "PENDING" : "NOT_APPLICABLE"}::"AdmissionOfferResponse",
          ${viewer.user.id}
        )
      `;
    }

    await tx.auditLog.create({
      data: {
        schoolId: viewer.membership.schoolId,
        campusId: application.campusId,
        actorUserId: viewer.user.id,
        action: existing ? "admission.decision_changed" : "admission.decision_recorded",
        entityType: "AdmissionDecision",
        entityId: decisionId,
        before: existing
          ? {
              outcome: existing.outcome,
              offerResponse: existing.offerResponse,
              offerExpiresAt: existing.offerExpiresAt?.toISOString() ?? null,
            }
          : undefined,
        after: {
          outcome: input.outcome,
          offerExpiresAt: input.offerExpiresAt?.toISOString() ?? null,
          applicationId,
        },
      },
    });
  });

  revalidatePath("/admissions-admin");
  revalidatePath("/admissions-admin/decisions");
  revalidatePath("/apply/status");
}

export async function respondToAdmissionOffer(
  response: "ACCEPTED" | "DECLINED",
  _formData: FormData,
) {
  const viewer = await requireApplicant();
  const [decision] = await db.$queryRaw<
    Array<{
      id: string;
      campusId: string;
      outcome: AdmissionDecisionOutcome;
      offerResponse: AdmissionOfferResponse;
      offerExpiresAt: Date | null;
    }>
  >`
    SELECT d."id", d."campusId", d."outcome"::text AS "outcome",
      d."offerResponse"::text AS "offerResponse", d."offerExpiresAt"
    FROM "admission_decisions" d
    WHERE d."applicationId" = ${viewer.applicationId}
    LIMIT 1
  `;
  if (!decision || decision.outcome !== "ACCEPTED") {
    throw new Error("NOT_FOUND:ADMISSION_OFFER");
  }
  if (decision.offerResponse !== "PENDING") {
    redirect("/apply/status?offer=already-responded");
  }

  if (!decision.offerExpiresAt || decision.offerExpiresAt <= new Date()) {
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "admission_decisions"
        SET "offerResponse" = 'EXPIRED'
        WHERE "id" = ${decision.id} AND "offerResponse" = 'PENDING'
      `;
      await tx.auditLog.create({
        data: {
          schoolId: viewer.schoolId,
          campusId: decision.campusId,
          actorUserId: null,
          action: "admission.offer_expired",
          entityType: "AdmissionDecision",
          entityId: decision.id,
          before: { offerResponse: "PENDING" },
          after: { offerResponse: "EXPIRED", applicationNumber: viewer.applicationNumber },
        },
      });
    });
    revalidatePath("/apply/status");
    redirect("/apply/status?offer=expired");
  }

  await db.$transaction(async (tx) => {
    const changed = await tx.$executeRaw`
      UPDATE "admission_decisions"
      SET "offerResponse" = ${response}::"AdmissionOfferResponse", "respondedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${decision.id} AND "offerResponse" = 'PENDING'
    `;
    if (changed !== 1) throw new Error("INVALID:OFFER_RESPONSE_CHANGED");
    await tx.auditLog.create({
      data: {
        schoolId: viewer.schoolId,
        campusId: decision.campusId,
        actorUserId: null,
        action: response === "ACCEPTED" ? "admission.offer_accepted" : "admission.offer_declined",
        entityType: "AdmissionDecision",
        entityId: decision.id,
        before: { offerResponse: "PENDING" },
        after: { offerResponse: response, applicationNumber: viewer.applicationNumber },
      },
    });
  });

  revalidatePath("/apply/status");
  revalidatePath("/admissions-admin/decisions");
  redirect(`/apply/status?offer=${response.toLowerCase()}`);
}

type ConversionRow = {
  decisionId: string;
  outcome: AdmissionDecisionOutcome;
  offerResponse: AdmissionOfferResponse;
  convertedStudentId: string | null;
  applicationId: string;
  applicationNumber: string;
  schoolId: string;
  campusId: string;
  classLevelId: string;
  studentFirstName: string;
  studentMiddleName: string | null;
  studentLastName: string;
  preferredName: string | null;
  gender: "MALE" | "FEMALE";
  dateOfBirth: Date | null;
  address: string | null;
  previousSchool: string | null;
  medicalNotes: string | null;
  guardianFirstName: string;
  guardianLastName: string;
  guardianEmail: string;
  guardianPhone: string;
  guardianRelationship: string;
};

async function nextAdmissionNumber(
  tx: Prisma.TransactionClient,
  input: { schoolId: string; campusId: string; campusCode: string; year: number },
) {
  const sequence = await tx.admissionSequence.upsert({
    where: { campusId_year: { campusId: input.campusId, year: input.year } },
    create: {
      schoolId: input.schoolId,
      campusId: input.campusId,
      year: input.year,
      nextNumber: 2,
    },
    update: { nextNumber: { increment: 1 } },
    select: { nextNumber: true },
  });
  return formatAdmissionNumber({
    campusCode: input.campusCode,
    year: input.year,
    sequence: sequence.nextNumber - 1,
  });
}

export async function convertAcceptedApplicant(
  applicationId: string,
  formData: FormData,
) {
  const viewer = await requirePermission("people.manage");
  const input = z
    .object({
      classArmId: z.string().trim().min(1),
      academicSessionId: z.string().trim().min(1),
      admissionDate: z.coerce.date(),
    })
    .parse({
      classArmId: formData.get("classArmId"),
      academicSessionId: formData.get("academicSessionId"),
      admissionDate: formData.get("admissionDate"),
    });

  const student = await db.$transaction(async (tx) => {
    const [record] = await tx.$queryRaw<ConversionRow[]>`
      SELECT d."id" AS "decisionId", d."outcome"::text AS "outcome",
        d."offerResponse"::text AS "offerResponse", d."convertedStudentId",
        a."id" AS "applicationId", a."applicationNumber", a."schoolId", a."campusId",
        a."classLevelId", a."studentFirstName", a."studentMiddleName", a."studentLastName",
        a."preferredName", a."gender"::text AS "gender", a."dateOfBirth", a."address",
        a."previousSchool", a."medicalNotes", g."firstName" AS "guardianFirstName",
        g."lastName" AS "guardianLastName", g."email" AS "guardianEmail",
        g."phone" AS "guardianPhone", g."relationship" AS "guardianRelationship"
      FROM "admission_decisions" d
      JOIN "admission_applications" a ON a."id" = d."applicationId"
      JOIN "applicant_accounts" g ON g."id" = a."accountId"
      WHERE a."id" = ${applicationId} AND a."schoolId" = ${viewer.membership.schoolId}
      FOR UPDATE OF d, a
    `;
    if (!record) throw new Error("NOT_FOUND:ACCEPTED_APPLICATION");
    assertCampusAccess(viewer, record.campusId);
    if (
      record.outcome !== "ACCEPTED" ||
      record.offerResponse !== "ACCEPTED" ||
      record.convertedStudentId
    ) {
      throw new Error("INVALID:APPLICATION_NOT_READY_FOR_CONVERSION");
    }

    const [classArm, academicSession] = await Promise.all([
      tx.classArm.findFirst({
        where: {
          id: input.classArmId,
          campusId: record.campusId,
          classLevelId: record.classLevelId,
          isActive: true,
          campus: { schoolId: record.schoolId, isActive: true },
        },
        select: { id: true, campus: { select: { code: true } } },
      }),
      tx.academicSession.findFirst({
        where: { id: input.academicSessionId, schoolId: record.schoolId },
        select: { id: true },
      }),
    ]);
    if (!classArm || !academicSession) throw new Error("INVALID:ENROLLMENT_PLACEMENT");

    const admissionNumber = await nextAdmissionNumber(tx, {
      schoolId: record.schoolId,
      campusId: record.campusId,
      campusCode: classArm.campus.code,
      year: input.admissionDate.getUTCFullYear(),
    });
    const created = await tx.student.create({
      data: {
        schoolId: record.schoolId,
        campusId: record.campusId,
        admissionNumber,
        firstName: record.studentFirstName,
        middleName: record.studentMiddleName,
        lastName: record.studentLastName,
        preferredName: record.preferredName,
        gender: record.gender,
        dateOfBirth: record.dateOfBirth,
        admissionDate: input.admissionDate,
        address: record.address,
        notes: [
          `Converted from admission application ${record.applicationNumber}.`,
          record.previousSchool ? `Previous school: ${record.previousSchool}.` : null,
          record.medicalNotes ? `Admission medical note: ${record.medicalNotes}` : null,
        ]
          .filter(Boolean)
          .join(" "),
      },
    });

    let guardian = await tx.guardian.findFirst({
      where: { schoolId: record.schoolId, phone: record.guardianPhone },
    });
    guardian ??= await tx.guardian.create({
      data: {
        schoolId: record.schoolId,
        firstName: record.guardianFirstName,
        lastName: record.guardianLastName,
        phone: record.guardianPhone,
        email: record.guardianEmail,
        address: record.address,
      },
    });
    await tx.studentGuardian.create({
      data: {
        studentId: created.id,
        guardianId: guardian.id,
        relationship: guardianRelationship(record.guardianRelationship),
        isPrimary: true,
        livesWith: true,
        canPickup: true,
      },
    });
    await tx.enrollment.create({
      data: {
        studentId: created.id,
        campusId: record.campusId,
        classArmId: classArm.id,
        academicSessionId: academicSession.id,
        startsOn: input.admissionDate,
      },
    });
    await syncStudentFeeAccount(
      {
        studentId: created.id,
        schoolId: created.schoolId,
        campusId: created.campusId,
        admissionNumber: created.admissionNumber,
        displayName: studentDisplayName(created),
        classArmId: classArm.id,
        isActive: true,
      },
      tx,
    );

    const converted = await tx.$executeRaw`
      UPDATE "admission_decisions"
      SET "convertedStudentId" = ${created.id}, "convertedById" = ${viewer.user.id},
        "convertedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${record.decisionId} AND "convertedStudentId" IS NULL
    `;
    if (converted !== 1) throw new Error("INVALID:APPLICATION_ALREADY_CONVERTED");

    const documents = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "application_documents" WHERE "applicationId" = ${applicationId}
    `;
    for (const document of documents) {
      await tx.$executeRaw`
        INSERT INTO "student_admission_document_links" (
          "id", "studentId", "applicationDocumentId", "createdById"
        ) VALUES (${crypto.randomUUID()}, ${created.id}, ${document.id}, ${viewer.user.id})
      `;
    }

    await tx.auditLog.create({
      data: {
        schoolId: record.schoolId,
        campusId: record.campusId,
        actorUserId: viewer.user.id,
        action: "admission.converted_to_student",
        entityType: "AdmissionApplication",
        entityId: applicationId,
        before: { convertedStudentId: null, offerResponse: "ACCEPTED" },
        after: {
          studentId: created.id,
          admissionNumber,
          classArmId: classArm.id,
          academicSessionId: academicSession.id,
          linkedDocumentCount: documents.length,
        },
      },
    });
    await tx.auditLog.create({
      data: {
        schoolId: record.schoolId,
        campusId: record.campusId,
        actorUserId: viewer.user.id,
        action: "student.created_from_admission",
        entityType: "Student",
        entityId: created.id,
        after: { admissionNumber, applicationId, status: created.status },
      },
    });
    return created;
  });

  revalidatePath("/students");
  revalidatePath(`/students/${student.id}`);
  revalidatePath("/admissions-admin/decisions");
  revalidatePath("/apply/status");
}
