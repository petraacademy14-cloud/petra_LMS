"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type {
  EnrollmentStatus,
  GuardianRelationship,
  StudentStatus,
} from "@/generated/prisma/enums";
import { formatAdmissionNumber } from "@/lib/admission-number";
import { requireCampusAccess, requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { parseStudentImportFile } from "@/lib/student-import";
import { syncStudentFeeAccount } from "@/lib/student-finance-sync";
import { supabaseStorageAdminHeaders } from "@/lib/supabase-storage";

function studentDisplayName(input: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
}) {
  return [input.firstName, input.middleName, input.lastName]
    .filter(Boolean)
    .join(" ");
}

export type StudentActionState = {
  status: "idle" | "success" | "error";
  message: string;
  imported?: number;
  errors?: Array<{ row: number; field: string; message: string }>;
};

const text = z.string().trim().min(2).max(80);
const optionalText = z
  .string()
  .trim()
  .max(500)
  .transform((value) => value || undefined);
const phone = z.string().trim().min(7).max(24);

function failure(error: unknown): StudentActionState {
  if (error instanceof z.ZodError) {
    return {
      status: "error",
      message: error.issues[0]?.message ?? "Check the submitted information.",
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
    message: "The student record could not be saved. Please try again.",
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
    after?: Prisma.InputJsonValue;
  },
) {
  await tx.auditLog.create({
    data: { ...input, ...(await requestContext()) },
  });
}

async function generateAdmissionNumber(
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

async function checkedPlacement(input: {
  schoolId: string;
  campusId: string;
  classArmId: string;
  academicSessionId: string;
}) {
  const [campus, classArm, academicSession] = await Promise.all([
    db.campus.findFirst({
      where: { id: input.campusId, schoolId: input.schoolId, isActive: true },
      select: { id: true, code: true },
    }),
    db.classArm.findFirst({
      where: {
        id: input.classArmId,
        campusId: input.campusId,
        isActive: true,
        classLevel: { schoolId: input.schoolId },
      },
      select: { id: true },
    }),
    db.academicSession.findFirst({
      where: { id: input.academicSessionId, schoolId: input.schoolId },
      select: { id: true, startsOn: true },
    }),
  ]);
  if (!campus || !classArm || !academicSession) {
    throw new Error("NOT_FOUND:PLACEMENT");
  }
  return { campus, academicSession };
}

export async function createStudent(
  _previous: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  try {
    const viewer = await requirePermission("people.manage");
    const input = z
      .object({
        campusId: z.string().cuid(),
        classArmId: z.string().cuid(),
        academicSessionId: z.string().cuid(),
        firstName: text,
        middleName: optionalText,
        lastName: text,
        gender: z.enum(["MALE", "FEMALE"]),
        dateOfBirth: z.union([z.coerce.date(), z.literal("")]).optional(),
        admissionDate: z.coerce.date(),
        address: optionalText,
        guardianFirstName: text,
        guardianLastName: text,
        guardianPhone: phone,
        guardianEmail: z.union([z.email(), z.literal("")]).optional(),
        relationship: z.enum([
          "FATHER",
          "MOTHER",
          "GUARDIAN",
          "SIBLING",
          "RELATIVE",
          "OTHER",
        ]),
      })
      .parse(Object.fromEntries(formData));

    await requireCampusAccess(input.campusId);
    const placement = await checkedPlacement({
      ...input,
      schoolId: viewer.membership.schoolId,
    });

    const student = await db.$transaction(async (tx) => {
      const admissionNumber = await generateAdmissionNumber(tx, {
        schoolId: viewer.membership.schoolId,
        campusId: input.campusId,
        campusCode: placement.campus.code,
        year: input.admissionDate.getUTCFullYear(),
      });
      const created = await tx.student.create({
        data: {
          schoolId: viewer.membership.schoolId,
          campusId: input.campusId,
          admissionNumber,
          firstName: input.firstName,
          middleName: input.middleName,
          lastName: input.lastName,
          gender: input.gender,
          dateOfBirth:
            input.dateOfBirth instanceof Date ? input.dateOfBirth : null,
          admissionDate: input.admissionDate,
          address: input.address,
        },
      });
      const guardian = await tx.guardian.create({
        data: {
          schoolId: viewer.membership.schoolId,
          firstName: input.guardianFirstName,
          lastName: input.guardianLastName,
          phone: input.guardianPhone,
          email: input.guardianEmail || null,
        },
      });
      await tx.studentGuardian.create({
        data: {
          studentId: created.id,
          guardianId: guardian.id,
          relationship: input.relationship,
          isPrimary: true,
        },
      });
      await tx.enrollment.create({
        data: {
          studentId: created.id,
          campusId: input.campusId,
          classArmId: input.classArmId,
          academicSessionId: input.academicSessionId,
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
          classArmId: input.classArmId,
          isActive: true,
        },
        tx,
      );
      await audit(tx, {
        schoolId: viewer.membership.schoolId,
        campusId: input.campusId,
        actorUserId: viewer.user.id,
        action: "student.created",
        entityType: "Student",
        entityId: created.id,
        after: { admissionNumber, status: created.status },
      });
      return created;
    });

    revalidatePath("/students");
    revalidatePath("/dashboard");
    return {
      status: "success",
      message: `Student created as ${student.admissionNumber}.`,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function addGuardian(
  studentId: string,
  _previous: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  try {
    const viewer = await requirePermission("people.manage");
    const input = z
      .object({
        firstName: text,
        lastName: text,
        phone,
        email: z.union([z.email(), z.literal("")]).optional(),
        relationship: z.enum([
          "FATHER",
          "MOTHER",
          "GUARDIAN",
          "SIBLING",
          "RELATIVE",
          "OTHER",
        ]),
        isPrimary: z.string().optional(),
        canPickup: z.string().optional(),
      })
      .parse(Object.fromEntries(formData));
    const student = await db.student.findFirst({
      where: { id: studentId, schoolId: viewer.membership.schoolId },
      select: { id: true, campusId: true },
    });
    if (!student) throw new Error("NOT_FOUND:STUDENT");
    await requireCampusAccess(student.campusId);

    await db.$transaction(async (tx) => {
      let guardian = await tx.guardian.findFirst({
        where: {
          schoolId: viewer.membership.schoolId,
          phone: input.phone,
        },
      });
      guardian ??= await tx.guardian.create({
        data: {
          schoolId: viewer.membership.schoolId,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          email: input.email || null,
        },
      });
      if (input.isPrimary) {
        await tx.studentGuardian.updateMany({
          where: { studentId },
          data: { isPrimary: false },
        });
      }
      await tx.studentGuardian.create({
        data: {
          studentId,
          guardianId: guardian.id,
          relationship: input.relationship,
          isPrimary: Boolean(input.isPrimary),
          canPickup: Boolean(input.canPickup),
        },
      });
      await audit(tx, {
        schoolId: viewer.membership.schoolId,
        campusId: student.campusId,
        actorUserId: viewer.user.id,
        action: "student.guardian_added",
        entityType: "Student",
        entityId: studentId,
        after: { guardianId: guardian.id, relationship: input.relationship },
      });
    });
    revalidatePath(`/students/${studentId}`);
    return { status: "success", message: "Guardian added." };
  } catch (error) {
    return failure(error);
  }
}

export async function changeStudentStatus(
  studentId: string,
  status: StudentStatus,
): Promise<void> {
  const viewer = await requirePermission("people.manage");
  const nextStatus = z
    .enum(["ACTIVE", "ARCHIVED", "WITHDRAWN", "GRADUATED"])
    .parse(status);
  const student = await db.student.findFirst({
    where: { id: studentId, schoolId: viewer.membership.schoolId },
    select: {
      id: true,
      schoolId: true,
      campusId: true,
      admissionNumber: true,
      firstName: true,
      middleName: true,
      lastName: true,
      status: true,
      enrollments: {
        where: { status: "CURRENT" },
        orderBy: { startsOn: "desc" },
        take: 1,
        select: { classArmId: true },
      },
    },
  });
  if (!student) throw new Error("NOT_FOUND:STUDENT");
  await requireCampusAccess(student.campusId);

  if (student.status === nextStatus) return;
  if (nextStatus === "ACTIVE" && student.status !== "ARCHIVED") {
    throw new Error("INVALID:REACTIVATION_REQUIRES_PLACEMENT");
  }

  await db.$transaction(async (tx) => {
    const changed = await tx.student.updateMany({
      where: { id: student.id, status: student.status },
      data: { status: nextStatus },
    });
    if (changed.count === 0) return;

    let enrollmentChange:
      | { id: string; before: EnrollmentStatus; after: EnrollmentStatus }
      | undefined;
    if (nextStatus === "WITHDRAWN" || nextStatus === "GRADUATED") {
      const latestEnrollment = await tx.enrollment.findFirst({
        where: {
          studentId,
          status: { in: ["CURRENT", "WITHDRAWN", "GRADUATED"] },
        },
        orderBy: { startsOn: "desc" },
        select: { id: true, status: true, endsOn: true },
      });
      if (latestEnrollment && latestEnrollment.status !== nextStatus) {
        await tx.enrollment.update({
          where: { id: latestEnrollment.id },
          data: {
            status: nextStatus as EnrollmentStatus,
            endsOn: latestEnrollment.endsOn ?? new Date(),
          },
        });
        enrollmentChange = {
          id: latestEnrollment.id,
          before: latestEnrollment.status,
          after: nextStatus as EnrollmentStatus,
        };
      }
    }

    await syncStudentFeeAccount(
      {
        studentId: student.id,
        schoolId: student.schoolId,
        campusId: student.campusId,
        admissionNumber: student.admissionNumber,
        displayName: studentDisplayName(student),
        classArmId: student.enrollments[0]?.classArmId ?? null,
        isActive: nextStatus === "ACTIVE",
      },
      tx,
    );

    await audit(tx, {
      schoolId: viewer.membership.schoolId,
      campusId: student.campusId,
      actorUserId: viewer.user.id,
      action: "student.status_changed",
      entityType: "Student",
      entityId: student.id,
      before: { status: student.status },
      after: {
        status: nextStatus,
        ...(enrollmentChange ? { enrollment: enrollmentChange } : {}),
      },
    });
  });
  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
}

export async function reactivateStudent(
  studentId: string,
  _previous: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  try {
    const viewer = await requirePermission("people.manage");
    const input = z
      .object({
        campusId: z.string().cuid(),
        classArmId: z.string().cuid(),
        academicSessionId: z.string().cuid(),
        startsOn: z.coerce.date(),
      })
      .parse(Object.fromEntries(formData));
    const student = await db.student.findFirst({
      where: { id: studentId, schoolId: viewer.membership.schoolId },
      select: {
        id: true,
        schoolId: true,
        campusId: true,
        admissionNumber: true,
        firstName: true,
        middleName: true,
        lastName: true,
        status: true,
      },
    });
    if (!student) throw new Error("NOT_FOUND:STUDENT");
    if (student.status !== "WITHDRAWN" && student.status !== "GRADUATED") {
      throw new Error("INVALID:STUDENT_NOT_INACTIVE");
    }
    await requireCampusAccess(student.campusId);
    await requireCampusAccess(input.campusId);
    await checkedPlacement({
      ...input,
      schoolId: viewer.membership.schoolId,
    });

    await db.$transaction(async (tx) => {
      const currentEnrollment = await tx.enrollment.findFirst({
        where: { studentId, status: "CURRENT" },
        select: { id: true },
      });
      if (currentEnrollment) throw new Error("INVALID:CURRENT_ENROLLMENT_EXISTS");

      const changed = await tx.student.updateMany({
        where: {
          id: student.id,
          status: { in: ["WITHDRAWN", "GRADUATED"] },
        },
        data: { status: "ACTIVE", campusId: input.campusId },
      });
      if (changed.count !== 1) throw new Error("INVALID:STUDENT_STATUS_CHANGED");

      const enrollment = await tx.enrollment.create({
        data: {
          studentId,
          campusId: input.campusId,
          classArmId: input.classArmId,
          academicSessionId: input.academicSessionId,
          startsOn: input.startsOn,
        },
      });
      await syncStudentFeeAccount(
        {
          studentId: student.id,
          schoolId: student.schoolId,
          campusId: input.campusId,
          admissionNumber: student.admissionNumber,
          displayName: studentDisplayName(student),
          classArmId: input.classArmId,
          isActive: true,
        },
        tx,
      );
      await audit(tx, {
        schoolId: viewer.membership.schoolId,
        campusId: input.campusId,
        actorUserId: viewer.user.id,
        action: "student.reactivated",
        entityType: "Student",
        entityId: student.id,
        before: { status: student.status, campusId: student.campusId },
        after: {
          status: "ACTIVE",
          campusId: input.campusId,
          enrollmentId: enrollment.id,
          classArmId: input.classArmId,
          academicSessionId: input.academicSessionId,
          startsOn: input.startsOn.toISOString(),
        },
      });
    });

    revalidatePath("/students");
    revalidatePath(`/students/${studentId}`);
    revalidatePath("/dashboard");
    return {
      status: "success",
      message: "Student reactivated with a new current enrollment.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function bulkPromoteStudents(
  _previous: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  try {
    const viewer = await requirePermission("people.manage");
    const input = z
      .object({
        campusId: z.string().cuid(),
        classArmId: z.string().cuid(),
        academicSessionId: z.string().cuid(),
        startsOn: z.coerce.date(),
      })
      .parse(Object.fromEntries(formData));
    const studentIds = z
      .array(z.string().cuid())
      .min(1, "Select at least one student.")
      .parse(formData.getAll("studentId"));
    await requireCampusAccess(input.campusId);
    await checkedPlacement({
      ...input,
      schoolId: viewer.membership.schoolId,
    });
    const students = await db.student.findMany({
      where: {
        id: { in: studentIds },
        schoolId: viewer.membership.schoolId,
        campusId: input.campusId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        schoolId: true,
        campusId: true,
        admissionNumber: true,
        firstName: true,
        middleName: true,
        lastName: true,
      },
    });
    if (students.length !== new Set(studentIds).size) {
      throw new Error("FORBIDDEN:STUDENT_SCOPE");
    }

    await db.$transaction(async (tx) => {
      for (const student of students) {
        await tx.enrollment.updateMany({
          where: { studentId: student.id, status: "CURRENT" },
          data: { status: "PROMOTED", endsOn: input.startsOn },
        });
        await tx.enrollment.create({
          data: {
            studentId: student.id,
            campusId: input.campusId,
            classArmId: input.classArmId,
            academicSessionId: input.academicSessionId,
            startsOn: input.startsOn,
          },
        });
        await syncStudentFeeAccount(
          {
            studentId: student.id,
            schoolId: student.schoolId,
            campusId: student.campusId,
            admissionNumber: student.admissionNumber,
            displayName: studentDisplayName(student),
            classArmId: input.classArmId,
            isActive: true,
          },
          tx,
        );
      }
      await audit(tx, {
        schoolId: viewer.membership.schoolId,
        campusId: input.campusId,
        actorUserId: viewer.user.id,
        action: "students.bulk_promoted",
        entityType: "Student",
        entityId: input.classArmId,
        after: {
          count: students.length,
          studentIds: students.map((student) => student.id),
          academicSessionId: input.academicSessionId,
        },
      });
    });
    revalidatePath("/students");
    return {
      status: "success",
      message: `${students.length} student${students.length === 1 ? "" : "s"} promoted.`,
    };
  } catch (error) {
    return failure(error);
  }
}

async function findImportReferences(
  schoolId: string,
  rows: Awaited<ReturnType<typeof parseStudentImportFile>>["rows"],
) {
  const [campuses, sessions, classArms] = await Promise.all([
    db.campus.findMany({
      where: { schoolId, isActive: true },
      select: { id: true, code: true },
    }),
    db.academicSession.findMany({
      where: { schoolId },
      select: { id: true, name: true },
    }),
    db.classArm.findMany({
      where: { campus: { schoolId }, isActive: true },
      select: {
        id: true,
        code: true,
        campusId: true,
        classLevel: { select: { code: true } },
      },
    }),
  ]);
  const errors: Array<{ row: number; field: string; message: string }> = [];
  const resolved = rows.map((row, index) => {
    const campus = campuses.find((item) => item.code === row.campus_code);
    const session = sessions.find(
      (item) => item.name.toLowerCase() === row.academic_session.toLowerCase(),
    );
    const classArm = classArms.find(
      (item) =>
        item.campusId === campus?.id &&
        item.classLevel.code === row.class_code &&
        item.code === row.arm_code,
    );
    if (!campus)
      errors.push({
        row: index + 2,
        field: "campus_code",
        message: "Campus code was not found.",
      });
    if (!session)
      errors.push({
        row: index + 2,
        field: "academic_session",
        message: "Academic session was not found.",
      });
    if (!classArm)
      errors.push({
        row: index + 2,
        field: "class_code",
        message: "Class and arm were not found at this campus.",
      });
    return { row, campus, session, classArm };
  });
  return { resolved, errors };
}

export async function importStudents(
  _previous: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  try {
    const viewer = await requirePermission("people.manage");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > 4_000_000) {
      return {
        status: "error",
        message: "Choose a CSV or XLSX file no larger than 4 MB.",
      };
    }
    const parsed = await parseStudentImportFile(file.name, await file.arrayBuffer());
    if (parsed.errors.length) {
      return {
        status: "error",
        message: "No records were imported. Correct the validation errors.",
        errors: parsed.errors.slice(0, 100),
      };
    }
    if (!parsed.rows.length) {
      return { status: "error", message: "The file has no student rows." };
    }
    if (parsed.rows.length > 2_000) {
      return {
        status: "error",
        message: "Import at most 2,000 students in one file.",
      };
    }

    const references = await findImportReferences(
      viewer.membership.schoolId,
      parsed.rows,
    );
    for (const [index, item] of references.resolved.entries()) {
      if (
        item.campus &&
        viewer.membership.role !== "OWNER" &&
        item.campus.id !== viewer.membership.campusId
      ) {
        references.errors.push({
          row: index + 2,
          field: "campus_code",
          message: "You do not have access to this campus.",
        });
      }
    }
    if (references.errors.length) {
      return {
        status: "error",
        message: "No records were imported. Correct the reference errors.",
        errors: references.errors.slice(0, 100),
      };
    }

    const suppliedAdmissions = parsed.rows
      .map((row) => row.admission_number.toUpperCase())
      .filter(Boolean);
    const existing = await db.student.findMany({
      where: {
        schoolId: viewer.membership.schoolId,
        admissionNumber: { in: suppliedAdmissions },
      },
      select: { admissionNumber: true },
    });
    if (existing.length) {
      return {
        status: "error",
        message: "No records were imported. Admission numbers already exist.",
        errors: existing.map((item) => ({
          row:
            parsed.rows.findIndex(
              (row) =>
                row.admission_number.toUpperCase() === item.admissionNumber,
            ) + 2,
          field: "admission_number",
          message: `${item.admissionNumber} already exists.`,
        })),
      };
    }

    await db.$transaction(async (tx) => {
      for (const item of references.resolved) {
        const { row, campus, session, classArm } = item;
        if (!campus || !session || !classArm) throw new Error("INVALID:IMPORT");
        const admissionNumber =
          row.admission_number.toUpperCase() ||
          (await generateAdmissionNumber(tx, {
            schoolId: viewer.membership.schoolId,
            campusId: campus.id,
            campusCode: campus.code,
            year: Number(row.admission_date.slice(0, 4)),
          }));
        const student = await tx.student.create({
          data: {
            schoolId: viewer.membership.schoolId,
            campusId: campus.id,
            admissionNumber,
            firstName: row.first_name,
            middleName: row.middle_name || null,
            lastName: row.last_name,
            gender: row.gender,
            dateOfBirth: row.date_of_birth
              ? new Date(`${row.date_of_birth}T00:00:00Z`)
              : null,
            admissionDate: new Date(`${row.admission_date}T00:00:00Z`),
            address: row.address || null,
          },
        });
        const guardians = [
          {
            firstName: row.guardian_1_first_name,
            lastName: row.guardian_1_last_name,
            phone: row.guardian_1_phone,
            email: row.guardian_1_email,
            relationship: row.guardian_1_relationship,
          },
          ...(row.guardian_2_phone
            ? [
                {
                  firstName: row.guardian_2_first_name,
                  lastName: row.guardian_2_last_name,
                  phone: row.guardian_2_phone,
                  email: row.guardian_2_email,
                  relationship: row.guardian_2_relationship,
                },
              ]
            : []),
        ];
        for (const [index, guardianInput] of guardians.entries()) {
          let guardian = await tx.guardian.findFirst({
            where: {
              schoolId: viewer.membership.schoolId,
              phone: guardianInput.phone,
            },
          });
          guardian ??= await tx.guardian.create({
            data: {
              schoolId: viewer.membership.schoolId,
              firstName: guardianInput.firstName,
              lastName: guardianInput.lastName,
              phone: guardianInput.phone,
              email: guardianInput.email || null,
            },
          });
          await tx.studentGuardian.create({
            data: {
              studentId: student.id,
              guardianId: guardian.id,
              relationship:
                guardianInput.relationship as GuardianRelationship,
              isPrimary: index === 0,
            },
          });
        }
        await tx.enrollment.create({
          data: {
            studentId: student.id,
            campusId: campus.id,
            classArmId: classArm.id,
            academicSessionId: session.id,
            startsOn: new Date(`${row.admission_date}T00:00:00Z`),
          },
        });
        await syncStudentFeeAccount(
          {
            studentId: student.id,
            schoolId: student.schoolId,
            campusId: student.campusId,
            admissionNumber: student.admissionNumber,
            displayName: studentDisplayName(student),
            classArmId: classArm.id,
            isActive: true,
          },
          tx,
        );
        await audit(tx, {
          schoolId: viewer.membership.schoolId,
          campusId: campus.id,
          actorUserId: viewer.user.id,
          action: "student.imported",
          entityType: "Student",
          entityId: student.id,
          after: { admissionNumber, source: file.name },
        });
      }
    });

    revalidatePath("/students");
    revalidatePath("/dashboard");
    return {
      status: "success",
      message: `${parsed.rows.length} student records imported successfully.`,
      imported: parsed.rows.length,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function uploadStudentDocument(
  studentId: string,
  _previous: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  try {
    const viewer = await requirePermission("people.manage");
    const student = await db.student.findFirst({
      where: { id: studentId, schoolId: viewer.membership.schoolId },
      select: { id: true, campusId: true },
    });
    if (!student) throw new Error("NOT_FOUND:STUDENT");
    await requireCampusAccess(student.campusId);
    const file = formData.get("file");
    const name = z.string().trim().min(2).max(80).parse(formData.get("name"));
    if (!(file instanceof File) || file.size === 0 || file.size > 4_000_000) {
      return { status: "error", message: "Choose a file up to 4 MB." };
    }
    const allowed = new Set(["application/pdf", "image/jpeg", "image/png"]);
    if (!allowed.has(file.type)) {
      return {
        status: "error",
        message: "Only PDF, JPG and PNG documents are accepted.",
      };
    }
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseSecret = process.env.SUPABASE_SECRET_KEY;
    if (!supabaseUrl || !supabaseSecret) {
      return {
        status: "error",
        message: "Document storage has not been configured yet.",
      };
    }
    const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "-");
    const storageKey = `${student.campusId}/${student.id}/${crypto.randomUUID()}-${safeName}`;
    const response = await fetch(
      `${supabaseUrl}/storage/v1/object/student-documents/${storageKey}`,
      {
        method: "POST",
        headers: supabaseStorageAdminHeaders(supabaseSecret, {
          "Content-Type": file.type,
          "x-upsert": "false",
        }),
        body: await file.arrayBuffer(),
      },
    );
    if (!response.ok) throw new Error(`STORAGE_UPLOAD_FAILED:${response.status}`);

    await db.$transaction(async (tx) => {
      const document = await tx.studentDocument.create({
        data: {
          studentId,
          campusId: student.campusId,
          name,
          storageKey,
          fileName: file.name,
          contentType: file.type,
          sizeBytes: file.size,
          uploadedById: viewer.user.id,
        },
      });
      await audit(tx, {
        schoolId: viewer.membership.schoolId,
        campusId: student.campusId,
        actorUserId: viewer.user.id,
        action: "student.document_uploaded",
        entityType: "StudentDocument",
        entityId: document.id,
        after: { studentId, name, fileName: file.name, sizeBytes: file.size },
      });
    });
    revalidatePath(`/students/${studentId}`);
    return { status: "success", message: "Document uploaded." };
  } catch (error) {
    return failure(error);
  }
}
