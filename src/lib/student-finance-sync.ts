import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

type StudentFinanceDb = Pick<
  Prisma.TransactionClient,
  "campus" | "classArm" | "studentFeeAccount"
>;

export type FinanceStudentProjection = {
  studentId: string;
  schoolId: string;
  campusId: string;
  admissionNumber: string;
  displayName: string;
  classArmId: string | null;
  isActive: boolean;
};

/// Phase 2 should call this in the same unit of work after a student import,
/// enrollment change, promotion, withdrawal or archive operation.
export async function syncStudentFeeAccount(
  input: FinanceStudentProjection,
  client: StudentFinanceDb = db,
) {
  const [campus, classArm] = await Promise.all([
    client.campus.findFirst({
      where: { id: input.campusId, schoolId: input.schoolId },
      select: { id: true },
    }),
    input.classArmId
      ? client.classArm.findFirst({
          where: {
            id: input.classArmId,
            campusId: input.campusId,
            campus: { schoolId: input.schoolId },
          },
          select: { id: true },
        })
      : null,
  ]);
  if (!campus || (input.classArmId && !classArm)) {
    throw new Error("INVALID:STUDENT_FINANCE_SCOPE");
  }

  return client.studentFeeAccount.upsert({
    where: {
      schoolId_studentId: {
        schoolId: input.schoolId,
        studentId: input.studentId,
      },
    },
    create: input,
    update: {
      campusId: input.campusId,
      admissionNumber: input.admissionNumber,
      displayName: input.displayName,
      classArmId: input.classArmId,
      isActive: input.isActive,
    },
  });
}
