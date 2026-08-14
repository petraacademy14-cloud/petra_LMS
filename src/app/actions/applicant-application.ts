"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireApplicant } from "@/lib/applicant-auth";
import { db } from "@/lib/db";

const nullable = (value: FormDataEntryValue | null) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
};

const optionalDate = (value: FormDataEntryValue | null) => {
  const text = nullable(value);
  return text ? new Date(`${text}T00:00:00.000Z`) : null;
};

export async function saveApplicationDraft(formData: FormData) {
  const viewer = await requireApplicant();
  const [current] = await db.$queryRaw<Array<{ status: string }>>`
    SELECT "status"::text AS "status"
    FROM "admission_applications"
    WHERE "id" = ${viewer.applicationId} AND "accountId" = ${viewer.id}
    LIMIT 1
  `;
  if (!current) throw new Error("NOT_FOUND:APPLICATION");
  if (current.status !== "DRAFT") throw new Error("LOCKED:APPLICATION");
  const [formPayment] = await db.$queryRaw<Array<{ amount: unknown; verified: unknown }>>`
    SELECT c."amount",
      COALESCE(SUM(CASE WHEN p."status"='VERIFIED' THEN p."amount" ELSE 0 END), 0) AS "verified"
    FROM "applicant_charges" c
    LEFT JOIN "applicant_payments" p ON p."chargeId"=c."id"
    WHERE c."applicationId"=${viewer.applicationId} AND c."kind"='FORM'
    GROUP BY c."id"
    LIMIT 1
  `;
  if (!formPayment || Number(formPayment.amount) - Number(formPayment.verified) > 0) {
    throw new Error("LOCKED:FORM_PAYMENT_REQUIRED");
  }

  const input = z.object({
    campusId: z.string().nullable(),
    classLevelId: z.string().nullable(),
    studentFirstName: z.string().max(80).nullable(),
    studentMiddleName: z.string().max(80).nullable(),
    studentLastName: z.string().max(80).nullable(),
    preferredName: z.string().max(80).nullable(),
    gender: z.enum(["MALE", "FEMALE"]).nullable(),
    dateOfBirth: z.date().nullable(),
    address: z.string().max(500).nullable(),
    previousSchool: z.string().max(180).nullable(),
    medicalNotes: z.string().max(1200).nullable(),
    examMode: z.enum(["ONLINE", "ONSITE"]).nullable(),
    termsAccepted: z.boolean(),
  }).parse({
    campusId: nullable(formData.get("campusId")),
    classLevelId: nullable(formData.get("classLevelId")),
    studentFirstName: nullable(formData.get("studentFirstName")),
    studentMiddleName: nullable(formData.get("studentMiddleName")),
    studentLastName: nullable(formData.get("studentLastName")),
    preferredName: nullable(formData.get("preferredName")),
    gender: nullable(formData.get("gender")),
    dateOfBirth: optionalDate(formData.get("dateOfBirth")),
    address: nullable(formData.get("address")),
    previousSchool: nullable(formData.get("previousSchool")),
    medicalNotes: nullable(formData.get("medicalNotes")),
    examMode: nullable(formData.get("examMode")),
    termsAccepted: formData.get("termsAccepted") === "on",
  });

  if (input.classLevelId && !input.campusId) {
    throw new Error("INVALID:CLASS_WITHOUT_CAMPUS");
  }
  if (input.campusId) {
    const campus = await db.campus.findFirst({
      where: { id: input.campusId, schoolId: viewer.schoolId, isActive: true },
      select: { id: true },
    });
    if (!campus) throw new Error("INVALID:CAMPUS");
  }
  if (input.classLevelId) {
    const placement = await db.classArm.findFirst({
      where: {
        campusId: input.campusId ?? "__none__",
        classLevelId: input.classLevelId,
        isActive: true,
        campus: { schoolId: viewer.schoolId, isActive: true },
        classLevel: { schoolId: viewer.schoolId, isActive: true },
      },
      select: { id: true },
    });
    if (!placement) throw new Error("INVALID:PLACEMENT");
  }

  await db.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE "admission_applications"
      SET
        "campusId" = ${input.campusId},
        "classLevelId" = ${input.classLevelId},
        "studentFirstName" = ${input.studentFirstName},
        "studentMiddleName" = ${input.studentMiddleName},
        "studentLastName" = ${input.studentLastName},
        "preferredName" = ${input.preferredName},
        "gender" = ${input.gender}::"Gender",
        "dateOfBirth" = ${input.dateOfBirth},
        "address" = ${input.address},
        "previousSchool" = ${input.previousSchool},
        "medicalNotes" = ${input.medicalNotes},
        "examMode" = ${input.examMode}::"EntranceExamMode",
        "termsAccepted" = ${input.termsAccepted},
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${viewer.applicationId} AND "accountId" = ${viewer.id}
    `;
    await tx.auditLog.create({
      data: {
        schoolId: viewer.schoolId,
        campusId: input.campusId,
        actorUserId: null,
        action: "application.draft_saved",
        entityType: "AdmissionApplication",
        entityId: viewer.applicationId,
        after: {
          applicationNumber: viewer.applicationNumber,
          classLevelId: input.classLevelId,
          examMode: input.examMode,
        },
      },
    });
  });

  revalidatePath("/apply/application");
  redirect("/apply/application?saved=1");
}
