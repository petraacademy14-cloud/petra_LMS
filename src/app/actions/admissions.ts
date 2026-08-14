"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createApplicantSession,
  destroyApplicantSession,
  hashApplicantPassword,
  requireApplicant,
  verifyApplicantPassword,
} from "@/lib/applicant-auth";
import {
  applicationStatuses,
  canTransitionApplication,
  canTransitionVisit,
  type ApplicationStatus,
  type VisitStatus,
  visitStatuses,
} from "@/lib/admissions-rules";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";

const shortText = (min: number, max: number) => z.string().trim().min(min).max(max);
const optionalText = (value: FormDataEntryValue | null) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
};
const dateOrNull = (value: FormDataEntryValue | null) => {
  const text = optionalText(value);
  return text ? new Date(`${text}T00:00:00.000Z`) : null;
};

async function publicSchool() {
  const school = await db.school.findUnique({
    where: { slug: "petra-academy" },
    select: { id: true },
  });
  if (!school) throw new Error("NOT_FOUND:SCHOOL");
  return school;
}

export async function registerApplicant(formData: FormData) {
  const input = z
    .object({
      firstName: shortText(2, 80),
      lastName: shortText(2, 80),
      email: z.email().transform((value) => value.trim().toLowerCase()),
      phone: shortText(7, 30),
      relationship: shortText(2, 40),
      password: z.string().min(10).max(128),
      confirmPassword: z.string().min(10).max(128),
    })
    .refine((value) => value.password === value.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    })
    .parse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      relationship: formData.get("relationship"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

  const school = await publicSchool();
  const existing = await db.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "applicant_accounts"
    WHERE "schoolId" = ${school.id} AND "email" = ${input.email}
    LIMIT 1
  `;
  if (existing.length) redirect("/apply/login?error=account-exists");

  const accountId = crypto.randomUUID();
  const applicationId = crypto.randomUUID();
  const applicationNumber = `PET-${new Date().getFullYear()}-${crypto
    .randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;
  const passwordHash = hashApplicantPassword(input.password);

  await db.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO "applicant_accounts" (
        "id", "schoolId", "firstName", "lastName", "email", "phone", "relationship", "passwordHash"
      ) VALUES (
        ${accountId}, ${school.id}, ${input.firstName}, ${input.lastName}, ${input.email},
        ${input.phone}, ${input.relationship}, ${passwordHash}
      )
    `;
    await tx.$executeRaw`
      INSERT INTO "admission_applications" (
        "id", "schoolId", "accountId", "applicationNumber"
      ) VALUES (${applicationId}, ${school.id}, ${accountId}, ${applicationNumber})
    `;
    await tx.auditLog.create({
      data: {
        schoolId: school.id,
        actorUserId: null,
        action: "applicant.registered",
        entityType: "ApplicantAccount",
        entityId: accountId,
        after: { email: input.email, applicationNumber },
      },
    });
  });

  await createApplicantSession(accountId);
  redirect("/apply/setup?created=1");
}

export async function loginApplicant(formData: FormData) {
  const input = z
    .object({
      email: z.email().transform((value) => value.trim().toLowerCase()),
      password: z.string().min(10).max(128),
    })
    .parse({ email: formData.get("email"), password: formData.get("password") });
  const school = await publicSchool();
  const rows = await db.$queryRaw<Array<{ id: string; passwordHash: string }>>`
    SELECT "id", "passwordHash"
    FROM "applicant_accounts"
    WHERE "schoolId" = ${school.id} AND "email" = ${input.email}
    LIMIT 1
  `;
  const account = rows[0];
  if (!account || !verifyApplicantPassword(input.password, account.passwordHash)) {
    redirect("/apply/login?error=invalid");
  }

  await createApplicantSession(account.id);
  redirect("/apply/status");
}

export async function logoutApplicant() {
  await destroyApplicantSession();
  redirect("/apply/login");
}

async function editableApplication(applicationId: string, accountId: string) {
  const rows = await db.$queryRaw<Array<{ id: string; status: ApplicationStatus }>>`
    SELECT "id", "status"::text AS "status"
    FROM "admission_applications"
    WHERE "id" = ${applicationId} AND "accountId" = ${accountId}
    LIMIT 1
  `;
  const application = rows[0];
  if (!application) throw new Error("NOT_FOUND:APPLICATION");
  if (application.status !== "DRAFT") throw new Error("LOCKED:APPLICATION");
  return application;
}

export async function saveApplication(formData: FormData) {
  const viewer = await requireApplicant();
  await editableApplication(viewer.applicationId, viewer.id);

  const input = z
    .object({
      campusId: z.string().trim().min(1),
      classLevelId: z.string().trim().min(1),
      studentFirstName: shortText(2, 80),
      studentMiddleName: z.string().trim().max(80).nullable(),
      studentLastName: shortText(2, 80),
      preferredName: z.string().trim().max(80).nullable(),
      gender: z.enum(["MALE", "FEMALE"]),
      dateOfBirth: z.date(),
      address: shortText(5, 500),
      previousSchool: z.string().trim().max(180).nullable(),
      medicalNotes: z.string().trim().max(1200).nullable(),
      examMode: z.enum(["ONLINE", "ONSITE"]),
      termsAccepted: z.boolean(),
    })
    .parse({
      campusId: formData.get("campusId"),
      classLevelId: formData.get("classLevelId"),
      studentFirstName: formData.get("studentFirstName"),
      studentMiddleName: optionalText(formData.get("studentMiddleName")),
      studentLastName: formData.get("studentLastName"),
      preferredName: optionalText(formData.get("preferredName")),
      gender: formData.get("gender"),
      dateOfBirth: dateOrNull(formData.get("dateOfBirth")),
      address: formData.get("address"),
      previousSchool: optionalText(formData.get("previousSchool")),
      medicalNotes: optionalText(formData.get("medicalNotes")),
      examMode: formData.get("examMode"),
      termsAccepted: formData.get("termsAccepted") === "on",
    });

  const placement = await db.classArm.findFirst({
    where: {
      campusId: input.campusId,
      classLevelId: input.classLevelId,
      isActive: true,
      campus: { schoolId: viewer.schoolId, isActive: true },
      classLevel: { schoolId: viewer.schoolId, isActive: true },
    },
    select: { id: true },
  });
  if (!placement) throw new Error("INVALID:PLACEMENT");

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

export async function submitApplication() {
  const viewer = await requireApplicant();
  await editableApplication(viewer.applicationId, viewer.id);
  const rows = await db.$queryRaw<
    Array<{
      campusId: string | null;
      classLevelId: string | null;
      studentFirstName: string | null;
      studentLastName: string | null;
      gender: string | null;
      dateOfBirth: Date | null;
      address: string | null;
      examMode: string | null;
      termsAccepted: boolean;
    }>
  >`
    SELECT "campusId", "classLevelId", "studentFirstName", "studentLastName",
      "gender"::text AS "gender", "dateOfBirth", "address",
      "examMode"::text AS "examMode", "termsAccepted"
    FROM "admission_applications"
    WHERE "id" = ${viewer.applicationId}
    LIMIT 1
  `;
  const application = rows[0];
  if (
    !application?.campusId ||
    !application.classLevelId ||
    !application.studentFirstName ||
    !application.studentLastName ||
    !application.gender ||
    !application.dateOfBirth ||
    !application.address ||
    !application.examMode ||
    !application.termsAccepted
  ) {
    redirect("/apply/application?error=incomplete");
  }

  await db.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE "admission_applications"
      SET "status" = 'SUBMITTED', "submittedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${viewer.applicationId} AND "status" = 'DRAFT'
    `;
    await tx.auditLog.create({
      data: {
        schoolId: viewer.schoolId,
        campusId: application.campusId,
        actorUserId: null,
        action: "application.submitted",
        entityType: "AdmissionApplication",
        entityId: viewer.applicationId,
        before: { status: "DRAFT" },
        after: { status: "SUBMITTED", applicationNumber: viewer.applicationNumber },
      },
    });
  });

  revalidatePath("/apply/application");
  revalidatePath("/apply/status");
  redirect("/apply/status?submitted=1");
}

export async function uploadApplicationDocument(formData: FormData) {
  const viewer = await requireApplicant();
  await editableApplication(viewer.applicationId, viewer.id);
  const file = formData.get("file");
  const name = shortText(2, 100).parse(formData.get("name"));
  if (
    !(file instanceof File) ||
    file.size < 1 ||
    file.size > 5 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "application/pdf"].includes(file.type)
  ) {
    throw new Error("INVALID:APPLICATION_DOCUMENT");
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secret) throw new Error("CONFIG:ADMISSION_DOCUMENT_STORAGE");

  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "-").slice(-100);
  const storageKey = `${viewer.schoolId}/${viewer.applicationId}/${crypto.randomUUID()}-${safeName}`;
  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/admission-documents/${storageKey}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        apikey: secret,
        "Content-Type": file.type,
        "x-upsert": "false",
      },
      body: file,
    },
  );
  if (!response.ok) throw new Error("STORAGE:APPLICATION_DOCUMENT_UPLOAD_FAILED");

  const documentId = crypto.randomUUID();
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO "application_documents" (
        "id", "applicationId", "name", "storageKey", "fileName", "contentType", "sizeBytes"
      ) VALUES (
        ${documentId}, ${viewer.applicationId}, ${name}, ${storageKey}, ${safeName}, ${file.type}, ${file.size}
      )
    `;
    await tx.auditLog.create({
      data: {
        schoolId: viewer.schoolId,
        actorUserId: null,
        action: "application.document_uploaded",
        entityType: "ApplicationDocument",
        entityId: documentId,
        after: { applicationNumber: viewer.applicationNumber, name, contentType: file.type },
      },
    });
  });

  revalidatePath("/apply/documents");
  redirect("/apply/documents?uploaded=1");
}

export async function createVisitBooking(formData: FormData) {
  const input = z
    .object({
      campusId: z.string().trim().nullable(),
      guardianName: shortText(3, 160),
      studentName: shortText(2, 160),
      phone: shortText(7, 30),
      email: z.email().nullable(),
      classInterest: shortText(2, 100),
      preferredDate: z.date(),
      preferredTime: shortText(4, 20),
      notes: z.string().trim().max(1000).nullable(),
    })
    .parse({
      campusId: optionalText(formData.get("campusId")),
      guardianName: formData.get("guardianName"),
      studentName: formData.get("studentName"),
      phone: formData.get("phone"),
      email: optionalText(formData.get("email")),
      classInterest: formData.get("classInterest"),
      preferredDate: dateOrNull(formData.get("preferredDate")),
      preferredTime: formData.get("preferredTime"),
      notes: optionalText(formData.get("notes")),
    });
  if (input.preferredDate < new Date(new Date().toISOString().slice(0, 10))) {
    throw new Error("INVALID:VISIT_DATE");
  }

  const school = await publicSchool();
  if (input.campusId) {
    const campus = await db.campus.findFirst({
      where: { id: input.campusId, schoolId: school.id, isActive: true },
      select: { id: true },
    });
    if (!campus) throw new Error("INVALID:VISIT_CAMPUS");
  }

  const bookingId = crypto.randomUUID();
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO "visit_bookings" (
        "id", "schoolId", "campusId", "guardianName", "studentName", "phone", "email",
        "classInterest", "preferredDate", "preferredTime", "notes"
      ) VALUES (
        ${bookingId}, ${school.id}, ${input.campusId}, ${input.guardianName}, ${input.studentName},
        ${input.phone}, ${input.email}, ${input.classInterest}, ${input.preferredDate},
        ${input.preferredTime}, ${input.notes}
      )
    `;
    await tx.auditLog.create({
      data: {
        schoolId: school.id,
        campusId: input.campusId,
        actorUserId: null,
        action: "visit.requested",
        entityType: "VisitBooking",
        entityId: bookingId,
        after: {
          preferredDate: input.preferredDate.toISOString().slice(0, 10),
          classInterest: input.classInterest,
        },
      },
    });
  });

  revalidatePath("/admissions-admin");
  redirect("/book-visit?submitted=1");
}

export async function updateApplicationStatus(applicationId: string, formData: FormData) {
  const viewer = await requirePermission("admissions.manage");
  const next = z.enum(applicationStatuses).parse(formData.get("status"));
  const rows = await db.$queryRaw<
    Array<{ id: string; campusId: string | null; status: ApplicationStatus }>
  >`
    SELECT "id", "campusId", "status"::text AS "status"
    FROM "admission_applications"
    WHERE "id" = ${applicationId} AND "schoolId" = ${viewer.membership.schoolId}
    LIMIT 1
  `;
  const application = rows[0];
  if (!application) throw new Error("NOT_FOUND:APPLICATION");
  if (
    viewer.membership.role !== "OWNER" &&
    application.campusId !== viewer.membership.campusId
  ) {
    throw new Error("FORBIDDEN:CAMPUS_SCOPE");
  }
  if (!canTransitionApplication(application.status, next)) {
    throw new Error("INVALID:APPLICATION_TRANSITION");
  }

  await db.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE "admission_applications"
      SET "status" = ${next}::"ApplicationStatus", "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${applicationId}
    `;
    await tx.auditLog.create({
      data: {
        schoolId: viewer.membership.schoolId,
        campusId: application.campusId,
        actorUserId: viewer.user.id,
        action: "application.status_changed",
        entityType: "AdmissionApplication",
        entityId: applicationId,
        before: { status: application.status },
        after: { status: next },
      },
    });
  });
  revalidatePath("/admissions-admin");
}

export async function updateVisitStatus(bookingId: string, formData: FormData) {
  const viewer = await requirePermission("admissions.manage");
  const next = z.enum(visitStatuses).parse(formData.get("status"));
  const rows = await db.$queryRaw<
    Array<{ id: string; campusId: string | null; status: VisitStatus }>
  >`
    SELECT "id", "campusId", "status"::text AS "status"
    FROM "visit_bookings"
    WHERE "id" = ${bookingId} AND "schoolId" = ${viewer.membership.schoolId}
    LIMIT 1
  `;
  const booking = rows[0];
  if (!booking) throw new Error("NOT_FOUND:VISIT_BOOKING");
  if (
    viewer.membership.role !== "OWNER" &&
    booking.campusId !== viewer.membership.campusId
  ) {
    throw new Error("FORBIDDEN:CAMPUS_SCOPE");
  }
  if (!canTransitionVisit(booking.status, next)) {
    throw new Error("INVALID:VISIT_TRANSITION");
  }

  await db.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE "visit_bookings"
      SET "status" = ${next}::"VisitBookingStatus", "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${bookingId}
    `;
    await tx.auditLog.create({
      data: {
        schoolId: viewer.membership.schoolId,
        campusId: booking.campusId,
        actorUserId: viewer.user.id,
        action: "visit.status_changed",
        entityType: "VisitBooking",
        entityId: bookingId,
        before: { status: booking.status },
        after: { status: next },
      },
    });
  });
  revalidatePath("/admissions-admin");
}
