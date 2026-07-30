"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type {
  DocumentCategory,
  Gender,
  GuardianRelationship,
} from "@/generated/prisma/enums";
import { requireCampusAccess, requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatAdmissionNumber } from "@/lib/students/admission-number";
import { parseStudentFile } from "@/lib/students/import-parser";
import {
  normalizePhone,
  validateImportRow,
  type ValidStudentImportRow,
} from "@/lib/students/import-validation";

export type StudentActionState = {
  status: "idle" | "success" | "error";
  message: string;
  id?: string;
};

const initialState: StudentActionState = { status: "idle", message: "" };
const id = z.string().cuid();
const studentSchema = z.object({
  campusId: id,
  classArmId: id,
  academicSessionId: id,
  admissionNumber: z.string().trim().max(40).optional(),
  firstName: z.string().trim().min(1).max(80),
  middleName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().min(1).max(80),
  dateOfBirth: z.string().date().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  admissionDate: z.string().date(),
  address: z.string().trim().max(500).optional(),
  guardianFirstName: z.string().trim().min(1).max(80),
  guardianLastName: z.string().trim().min(1).max(80),
  guardianRelationship: z.enum([
    "FATHER",
    "MOTHER",
    "GUARDIAN",
    "SIBLING",
    "RELATIVE",
    "OTHER",
  ]),
  guardianPhone: z.string().trim().min(10).max(24),
  guardianEmail: z.union([z.string().email(), z.literal("")]).optional(),
  guardianOccupation: z.string().trim().max(120).optional(),
});

export async function createStudentAction(
  previous: StudentActionState = initialState,
  formData: FormData,
): Promise<StudentActionState> {
  void previous;
  try {
    const viewer = await requirePermission("students.manage");
    const input = studentSchema.parse(formValues(formData));
    await requireCampusAccess(input.campusId);
    const context = await enrollmentContext(
      viewer.membership.schoolId,
      input.campusId,
      input.classArmId,
      input.academicSessionId,
    );

    const student = await db.$transaction(async (tx) => {
      const admissionNumber =
        normalizeAdmission(input.admissionNumber) ??
        (await nextAdmissionNumber(tx, {
          schoolId: viewer.membership.schoolId,
          campusId: input.campusId,
          campusCode: context.campusCode,
          year: Number(input.admissionDate.slice(0, 4)),
        }));
      const guardian = await findOrCreateGuardian(tx, {
        schoolId: viewer.membership.schoolId,
        firstName: input.guardianFirstName,
        lastName: input.guardianLastName,
        phone: normalizePhone(input.guardianPhone),
        email: input.guardianEmail || undefined,
        occupation: input.guardianOccupation || undefined,
      });
      const created = await tx.student.create({
        data: {
          schoolId: viewer.membership.schoolId,
          campusId: input.campusId,
          admissionNumber,
          firstName: input.firstName,
          middleName: input.middleName || null,
          lastName: input.lastName,
          dateOfBirth: input.dateOfBirth ? asDate(input.dateOfBirth) : null,
          gender: input.gender as Gender | undefined,
          admissionDate: asDate(input.admissionDate),
          address: input.address || null,
          guardians: {
            create: {
              guardianId: guardian.id,
              relationship: input.guardianRelationship,
              isPrimaryContact: true,
            },
          },
          enrollments: {
            create: {
              campusId: input.campusId,
              classArmId: input.classArmId,
              academicSessionId: input.academicSessionId,
              startsOn: asDate(input.admissionDate),
            },
          },
        },
      });
      await audit(tx, viewer, input.campusId, "STUDENT_CREATED", "Student", created.id, {
        admissionNumber,
        classArmId: input.classArmId,
      });
      return created;
    });
    revalidateStudents(student.id);
    return {
      status: "success",
      message: `Student created as ${student.admissionNumber}.`,
      id: student.id,
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function addGuardianAction(
  studentId: string,
  _previous: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  try {
    const viewer = await requirePermission("students.manage");
    const input = z
      .object({
        firstName: z.string().trim().min(1).max(80),
        lastName: z.string().trim().min(1).max(80),
        phone: z.string().trim().min(10).max(24),
        email: z.union([z.string().email(), z.literal("")]).optional(),
        occupation: z.string().trim().max(120).optional(),
        relationship: z.enum([
          "FATHER",
          "MOTHER",
          "GUARDIAN",
          "SIBLING",
          "RELATIVE",
          "OTHER",
        ]),
        isPrimaryContact: z.boolean().default(false),
      })
      .parse({
        ...formValues(formData),
        isPrimaryContact: formData.get("isPrimaryContact") === "on",
      });
    const student = await scopedStudent(studentId, viewer);
    await db.$transaction(async (tx) => {
      const guardian = await findOrCreateGuardian(tx, {
        schoolId: viewer.membership.schoolId,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: normalizePhone(input.phone),
        email: input.email || undefined,
        occupation: input.occupation || undefined,
      });
      if (input.isPrimaryContact) {
        await tx.studentGuardian.updateMany({
          where: { studentId },
          data: { isPrimaryContact: false },
        });
      }
      await tx.studentGuardian.create({
        data: {
          studentId,
          guardianId: guardian.id,
          relationship: input.relationship,
          isPrimaryContact: input.isPrimaryContact,
        },
      });
      await audit(tx, viewer, student.campusId, "GUARDIAN_ATTACHED", "Student", studentId, {
        guardianId: guardian.id,
        relationship: input.relationship,
      });
    });
    revalidateStudents(studentId);
    return { status: "success", message: "Guardian added." };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateStudentStatusAction(
  studentId: string,
  _previous: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  try {
    const viewer = await requirePermission("students.manage");
    const input = z
      .object({
        status: z.enum(["ACTIVE", "WITHDRAWN", "GRADUATED", "ARCHIVED"]),
        reason: z.string().trim().min(3).max(300),
        effectiveDate: z.string().date(),
      })
      .parse(formValues(formData));
    const student = await scopedStudent(studentId, viewer);
    await db.$transaction(async (tx) => {
      await tx.student.update({
        where: { id: studentId },
        data: {
          status: input.status,
          statusReason: input.reason,
          statusChangedAt: asDate(input.effectiveDate),
        },
      });
      if (input.status !== "ACTIVE") {
        await tx.studentEnrollment.updateMany({
          where: { studentId, status: "CURRENT" },
          data: {
            status:
              input.status === "WITHDRAWN"
                ? "WITHDRAWN"
                : input.status === "GRADUATED"
                  ? "COMPLETED"
                  : "TRANSFERRED",
            endsOn: asDate(input.effectiveDate),
          },
        });
      }
      await audit(
        tx,
        viewer,
        student.campusId,
        "STUDENT_STATUS_CHANGED",
        "Student",
        studentId,
        { before: student.status, after: input.status, reason: input.reason },
      );
    });
    revalidateStudents(studentId);
    return { status: "success", message: `Student marked ${input.status.toLowerCase()}.` };
  } catch (error) {
    return actionError(error);
  }
}

export async function promoteStudentsAction(
  _previous: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  try {
    const viewer = await requirePermission("students.manage");
    const input = z
      .object({
        studentIds: z.array(id).min(1, "Select at least one student").max(500),
        targetClassArmId: id,
        targetSessionId: id,
        effectiveDate: z.string().date(),
      })
      .parse({
        studentIds: formData.getAll("studentId"),
        targetClassArmId: formData.get("targetClassArmId"),
        targetSessionId: formData.get("targetSessionId"),
        effectiveDate: formData.get("effectiveDate"),
      });
    const students = await db.student.findMany({
      where: {
        id: { in: input.studentIds },
        schoolId: viewer.membership.schoolId,
        status: "ACTIVE",
        ...(viewer.membership.role === "OWNER"
          ? {}
          : { campusId: viewer.membership.campusId ?? "__none__" }),
      },
      select: { id: true, campusId: true },
    });
    if (students.length !== input.studentIds.length) {
      throw new Error("One or more selected students are outside your scope.");
    }
    const campusIds = new Set(students.map((student) => student.campusId));
    if (campusIds.size !== 1) throw new Error("Promote one campus at a time.");
    const campusId = students[0].campusId;
    await requireCampusAccess(campusId);
    await enrollmentContext(
      viewer.membership.schoolId,
      campusId,
      input.targetClassArmId,
      input.targetSessionId,
    );
    await db.$transaction(async (tx) => {
      for (const student of students) {
        const current = await tx.studentEnrollment.findFirst({
          where: { studentId: student.id, status: "CURRENT" },
          select: { id: true, classArmId: true, academicSessionId: true },
        });
        if (!current) throw new Error("Every selected student must have a current enrollment.");
        await tx.studentEnrollment.update({
          where: { id: current.id },
          data: { status: "PROMOTED", endsOn: asDate(input.effectiveDate) },
        });
        await tx.studentEnrollment.create({
          data: {
            studentId: student.id,
            campusId,
            classArmId: input.targetClassArmId,
            academicSessionId: input.targetSessionId,
            startsOn: asDate(input.effectiveDate),
            status: "CURRENT",
          },
        });
        await audit(tx, viewer, campusId, "STUDENT_PROMOTED", "Student", student.id, {
          fromClassArmId: current.classArmId,
          toClassArmId: input.targetClassArmId,
          toSessionId: input.targetSessionId,
        });
      }
    });
    revalidateStudents();
    return { status: "success", message: `${students.length} students promoted.` };
  } catch (error) {
    return actionError(error);
  }
}

export async function stageStudentImportAction(
  _previous: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  try {
    const viewer = await requirePermission("students.import");
    const setup = z
      .object({ campusId: id, classArmId: id, academicSessionId: id })
      .parse(formValues(formData));
    await requireCampusAccess(setup.campusId);
    await enrollmentContext(
      viewer.membership.schoolId,
      setup.campusId,
      setup.classArmId,
      setup.academicSessionId,
    );
    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("Choose a CSV or Excel file.");
    const parsedRows = await parseStudentFile(file);
    const seenAdmissions = new Set<string>();
    const validatedRows = parsedRows.map((row) => {
      const result = validateImportRow(row.data);
      const admission = normalizeAdmission(result.data.admission_number);
      if (admission && seenAdmissions.has(admission)) {
        result.errors.admission_number = ["Admission number is duplicated in this file"];
        result.isValid = false;
      }
      if (admission) seenAdmissions.add(admission);
      return { ...row, ...result };
    });
    const existing = seenAdmissions.size
      ? await db.student.findMany({
          where: {
            schoolId: viewer.membership.schoolId,
            admissionNumber: { in: [...seenAdmissions] },
          },
          select: { admissionNumber: true },
        })
      : [];
    const existingSet = new Set(existing.map((item) => item.admissionNumber));
    for (const row of validatedRows) {
      const admission = normalizeAdmission(row.data.admission_number);
      if (admission && existingSet.has(admission)) {
        row.errors.admission_number = ["Admission number already exists"];
        row.isValid = false;
      }
    }
    const validRows = validatedRows.filter((row) => row.isValid).length;
    const invalidRows = validatedRows.length - validRows;
    const job = await db.studentImportJob.create({
      data: {
        schoolId: viewer.membership.schoolId,
        campusId: setup.campusId,
        classArmId: setup.classArmId,
        academicSessionId: setup.academicSessionId,
        createdById: viewer.user.id,
        sourceName: file.name.slice(0, 255),
        status: invalidRows ? "FAILED" : "READY",
        totalRows: validatedRows.length,
        validRows,
        invalidRows,
        rows: {
          create: validatedRows.map((row) => ({
            rowNumber: row.rowNumber,
            data: row.data,
            errors: row.errors,
            isValid: row.isValid,
          })),
        },
      },
    });
    revalidatePath("/students/import");
    return {
      status: invalidRows ? "error" : "success",
      message: invalidRows
        ? `${invalidRows} rows need correction. No records were imported.`
        : `${validRows} rows passed validation and are ready to import.`,
      id: job.id,
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function confirmStudentImportAction(
  jobId: string,
  previous: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  void previous;
  void formData;
  try {
    const viewer = await requirePermission("students.import");
    const job = await db.studentImportJob.findFirst({
      where: {
        id: jobId,
        schoolId: viewer.membership.schoolId,
        status: "READY",
        invalidRows: 0,
        ...(viewer.membership.role === "OWNER"
          ? {}
          : { campusId: viewer.membership.campusId ?? "__none__" }),
      },
      include: {
        campus: { select: { code: true } },
        rows: { where: { isValid: true }, orderBy: { rowNumber: "asc" } },
      },
    });
    if (!job) throw new Error("This import is not ready or is outside your scope.");
    await db.studentImportJob.update({
      where: { id: job.id },
      data: { status: "IMPORTING" },
    });
    try {
      await db.$transaction(
        async (tx) => {
          for (const row of job.rows) {
            const result = validateImportRow(row.data as Record<string, unknown>);
            if (!result.isValid || !result.value) {
              throw new Error(`Row ${row.rowNumber} no longer passes validation.`);
            }
            const student = await createImportedStudent(tx, viewer, job, result.value);
            await tx.studentImportRow.update({
              where: { id: row.id },
              data: { studentId: student.id },
            });
          }
          await tx.studentImportJob.update({
            where: { id: job.id },
            data: {
              status: "COMPLETED",
              importedRows: job.rows.length,
              completedAt: new Date(),
            },
          });
          await audit(tx, viewer, job.campusId, "STUDENT_IMPORT_COMPLETED", "StudentImportJob", job.id, {
            importedRows: job.rows.length,
            sourceName: job.sourceName,
          });
        },
        { timeout: 120_000 },
      );
    } catch (error) {
      await db.studentImportJob.update({
        where: { id: job.id },
        data: { status: "FAILED" },
      });
      throw error;
    }
    revalidateStudents();
    revalidatePath("/students/import");
    return { status: "success", message: `${job.rows.length} students imported.` };
  } catch (error) {
    return actionError(error);
  }
}

export async function uploadStudentDocumentAction(
  studentId: string,
  _previous: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  try {
    const viewer = await requirePermission("students.manage");
    const student = await scopedStudent(studentId, viewer);
    const category = z
      .enum(["BIRTH_CERTIFICATE", "PREVIOUS_REPORT", "MEDICAL", "ADMISSION_FORM", "OTHER"])
      .parse(formData.get("category"));
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("Choose a document.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Documents must not exceed 5 MB.");
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) throw new Error("Upload a PDF, JPG or PNG file.");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (!supabaseUrl || !secret) throw new Error("Supabase document storage is not configured.");
    const bucket = process.env.SUPABASE_STUDENT_DOCUMENT_BUCKET ?? "student-documents";
    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const storagePath = `${viewer.membership.schoolId}/${student.campusId}/${student.id}/${randomUUID()}.${extension}`;
    const response = await fetch(
      `${supabaseUrl}/storage/v1/object/${bucket}/${storagePath}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          apikey: secret,
          "Content-Type": file.type,
          "x-upsert": "false",
        },
        body: await file.arrayBuffer(),
      },
    );
    if (!response.ok) throw new Error("Document upload failed. Confirm the private Supabase bucket exists.");
    await db.$transaction(async (tx) => {
      const document = await tx.studentDocument.create({
        data: {
          studentId,
          uploadedById: viewer.user.id,
          category: category as DocumentCategory,
          originalName: file.name.slice(0, 255),
          storagePath,
          mimeType: file.type,
          sizeBytes: file.size,
        },
      });
      await audit(tx, viewer, student.campusId, "STUDENT_DOCUMENT_UPLOADED", "StudentDocument", document.id, {
        studentId,
        category,
      });
    });
    revalidateStudents(studentId);
    return { status: "success", message: "Document uploaded." };
  } catch (error) {
    return actionError(error);
  }
}

async function scopedStudent(studentId: string, viewer: Awaited<ReturnType<typeof requirePermission>>) {
  const student = await db.student.findFirst({
    where: {
      id: studentId,
      schoolId: viewer.membership.schoolId,
      ...(viewer.membership.role === "OWNER"
        ? {}
        : { campusId: viewer.membership.campusId ?? "__none__" }),
    },
    select: { id: true, campusId: true, status: true },
  });
  if (!student) throw new Error("Student not found in your access scope.");
  return student;
}

async function enrollmentContext(
  schoolId: string,
  campusId: string,
  classArmId: string,
  academicSessionId: string,
) {
  const [classArm, session] = await Promise.all([
    db.classArm.findFirst({
      where: { id: classArmId, campusId, isActive: true, campus: { schoolId } },
      select: { campus: { select: { code: true } } },
    }),
    db.academicSession.findFirst({
      where: { id: academicSessionId, schoolId },
      select: { id: true },
    }),
  ]);
  if (!classArm || !session) throw new Error("Class or academic session is invalid.");
  return { campusCode: classArm.campus.code };
}

type Transaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

async function nextAdmissionNumber(
  tx: Transaction,
  input: { schoolId: string; campusId: string; campusCode: string; year: number },
) {
  const rows = await tx.$queryRaw<Array<{ lastValue: number }>>`
    INSERT INTO "admission_counters"
      ("id", "schoolId", "campusId", "year", "lastValue", "createdAt", "updatedAt")
    VALUES
      (${randomUUID()}, ${input.schoolId}, ${input.campusId}, ${input.year}, 1, NOW(), NOW())
    ON CONFLICT ("schoolId", "campusId", "year")
    DO UPDATE SET "lastValue" = "admission_counters"."lastValue" + 1, "updatedAt" = NOW()
    RETURNING "lastValue"
  `;
  return formatAdmissionNumber({
    campusCode: input.campusCode,
    year: input.year,
    sequence: rows[0].lastValue,
  });
}

async function findOrCreateGuardian(
  tx: Transaction,
  input: {
    schoolId: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    occupation?: string;
  },
) {
  const existing = await tx.guardian.findFirst({
    where: {
      schoolId: input.schoolId,
      phone: input.phone,
      firstName: { equals: input.firstName, mode: "insensitive" },
      lastName: { equals: input.lastName, mode: "insensitive" },
    },
  });
  return (
    existing ??
    tx.guardian.create({
      data: {
        ...input,
        email: input.email?.toLowerCase(),
      },
    })
  );
}

async function createImportedStudent(
  tx: Transaction,
  viewer: Awaited<ReturnType<typeof requirePermission>>,
  job: {
    id: string;
    campusId: string;
    classArmId: string;
    academicSessionId: string;
    campus: { code: string };
  },
  row: ValidStudentImportRow,
) {
  const admissionNumber =
    normalizeAdmission(row.admission_number) ??
    (await nextAdmissionNumber(tx, {
      schoolId: viewer.membership.schoolId,
      campusId: job.campusId,
      campusCode: job.campus.code,
      year: Number(row.admission_date.slice(0, 4)),
    }));
  const guardian = await findOrCreateGuardian(tx, {
    schoolId: viewer.membership.schoolId,
    firstName: row.guardian_first_name,
    lastName: row.guardian_last_name,
    phone: row.guardian_phone,
    email: row.guardian_email,
    occupation: row.guardian_occupation,
  });
  const student = await tx.student.create({
    data: {
      schoolId: viewer.membership.schoolId,
      campusId: job.campusId,
      admissionNumber,
      firstName: row.first_name,
      middleName: row.middle_name,
      lastName: row.last_name,
      dateOfBirth: row.date_of_birth ? asDate(row.date_of_birth) : null,
      gender: row.gender as Gender | undefined,
      admissionDate: asDate(row.admission_date),
      address: row.address,
      guardians: {
        create: {
          guardianId: guardian.id,
          relationship: row.guardian_relationship as GuardianRelationship,
          isPrimaryContact: true,
        },
      },
      enrollments: {
        create: {
          campusId: job.campusId,
          classArmId: job.classArmId,
          academicSessionId: job.academicSessionId,
          startsOn: asDate(row.admission_date),
        },
      },
    },
  });
  await audit(tx, viewer, job.campusId, "STUDENT_IMPORTED", "Student", student.id, {
    admissionNumber,
    importJobId: job.id,
  });
  return student;
}

async function audit(
  tx: Transaction,
  viewer: Awaited<ReturnType<typeof requirePermission>>,
  campusId: string,
  action: string,
  entityType: string,
  entityId: string,
  after: Prisma.InputJsonValue,
) {
  await tx.auditLog.create({
    data: {
      schoolId: viewer.membership.schoolId,
      campusId,
      actorUserId: viewer.user.id,
      action,
      entityType,
      entityId,
      after,
    },
  });
}

function formValues(formData: FormData) {
  return Object.fromEntries(
    [...formData.entries()].filter(([key]) => !key.startsWith("$ACTION_")),
  );
}

function asDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function normalizeAdmission(value?: string) {
  const normalized = value?.trim().toUpperCase().replace(/\s+/g, "");
  return normalized || undefined;
}

function revalidateStudents(studentId?: string) {
  revalidatePath("/students");
  revalidatePath("/dashboard");
  if (studentId) revalidatePath(`/students/${studentId}`);
}

function actionError(error: unknown): StudentActionState {
  if (error instanceof z.ZodError) {
    return {
      status: "error",
      message: error.issues.map((issue) => issue.message).join(". "),
    };
  }
  const message = error instanceof Error ? error.message : "Something went wrong.";
  if (message.includes("Unique constraint")) {
    return { status: "error", message: "That admission number already exists." };
  }
  return { status: "error", message };
}
