"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { generateTemporaryApplicantPassword } from "@/lib/applicant-account";
import {
  createApplicantSession,
  hashApplicantPassword,
  requireApplicant,
} from "@/lib/applicant-auth";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";

export type ApplicantAccountActionState = {
  status: "idle" | "success" | "error";
  message: string;
  credentials?: {
    guardianName: string;
    email: string;
    temporaryPassword: string;
  };
};

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

function failure(error: unknown): ApplicantAccountActionState {
  if (error instanceof z.ZodError) {
    return {
      status: "error",
      message: error.issues[0]?.message ?? "Check the submitted information.",
    };
  }
  if (
    error instanceof Error &&
    (error.message.startsWith("FORBIDDEN") || error.message.startsWith("NOT_FOUND"))
  ) {
    return {
      status: "error",
      message: "This applicant account action is not allowed.",
    };
  }
  console.error(error);
  return {
    status: "error",
    message: "The applicant password could not be reset. Please try again.",
  };
}

export async function resetApplicantPassword(
  applicationId: string,
  _previous: ApplicantAccountActionState,
  _formData: FormData,
): Promise<ApplicantAccountActionState> {
  void _previous;
  void _formData;
  try {
    const viewer = await requirePermission("admissions.manage");
    if (viewer.membership.role !== "OWNER") {
      throw new Error("FORBIDDEN:OWNER_ONLY");
    }

    const parsedApplicationId = z.string().trim().min(1).parse(applicationId);
    const [account] = await db.$queryRaw<
      Array<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        applicationNumber: string;
        campusId: string | null;
      }>
    >`
      SELECT a."id", a."email", a."firstName", a."lastName",
        p."applicationNumber", p."campusId"
      FROM "applicant_accounts" a
      JOIN "admission_applications" p ON p."accountId" = a."id"
      WHERE p."id" = ${parsedApplicationId}
        AND p."schoolId" = ${viewer.membership.schoolId}
      LIMIT 1
    `;
    if (!account) throw new Error("NOT_FOUND:APPLICANT_ACCOUNT");

    const temporaryPassword = generateTemporaryApplicantPassword();
    const passwordHash = hashApplicantPassword(temporaryPassword);
    const context = await requestContext();

    await db.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "applicant_accounts"
        SET "passwordHash" = ${passwordHash},
          "mustChangePassword" = TRUE,
          "credentialsIssuedAt" = CURRENT_TIMESTAMP,
          "credentialsIssuedById" = ${viewer.user.id},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${account.id}
      `;
      await tx.$executeRaw`
        DELETE FROM "applicant_sessions" WHERE "accountId" = ${account.id}
      `;
      await tx.auditLog.create({
        data: {
          schoolId: viewer.membership.schoolId,
          campusId: account.campusId,
          actorUserId: viewer.user.id,
          action: "applicant.password_reset",
          entityType: "ApplicantAccount",
          entityId: account.id,
          after: { applicationNumber: account.applicationNumber },
          ...context,
        },
      });
    });

    revalidatePath("/admissions-admin");
    return {
      status: "success",
      message: "Password reset. Copy the temporary credentials now.",
      credentials: {
        guardianName: `${account.firstName} ${account.lastName}`,
        email: account.email,
        temporaryPassword,
      },
    };
  } catch (error) {
    return failure(error);
  }
}

export async function changeApplicantPassword(
  _previous: ApplicantAccountActionState,
  formData: FormData,
): Promise<ApplicantAccountActionState> {
  const viewer = await requireApplicant({ allowPasswordChange: true });
  if (!viewer.mustChangePassword) redirect("/apply/status");

  const parsed = z
    .object({
      password: z.string().min(10, "Use at least 10 characters.").max(128),
      confirmPassword: z.string().min(10).max(128),
    })
    .refine((value) => value.password === value.confirmPassword, {
      message: "The two passwords do not match.",
      path: ["confirmPassword"],
    })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Choose a valid password.",
    };
  }

  const passwordHash = hashApplicantPassword(parsed.data.password);
  const context = await requestContext();
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE "applicant_accounts"
      SET "passwordHash" = ${passwordHash},
        "mustChangePassword" = FALSE,
        "passwordChangedAt" = CURRENT_TIMESTAMP,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${viewer.id}
    `;
    await tx.$executeRaw`
      DELETE FROM "applicant_sessions" WHERE "accountId" = ${viewer.id}
    `;
    await tx.auditLog.create({
      data: {
        schoolId: viewer.schoolId,
        campusId: null,
        actorUserId: null,
        action: "applicant.password_changed",
        entityType: "ApplicantAccount",
        entityId: viewer.id,
        after: { applicationNumber: viewer.applicationNumber },
        ...context,
      },
    });
  });

  await createApplicantSession(viewer.id);
  redirect("/apply/status?password-changed=1");
}
