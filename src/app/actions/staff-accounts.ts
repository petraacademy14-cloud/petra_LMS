"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { generateTemporaryPortalPassword } from "@/lib/portal-account";

export type StaffAccountActionState = {
  status: "idle" | "success" | "error";
  message: string;
  credentials?: {
    name: string;
    email: string;
    role: "ADMIN" | "TEACHER";
    campusName: string;
    temporaryPassword: string;
  };
};

const staffSchema = z.object({
  name: z.string().trim().min(2, "Enter the staff member's full name.").max(120),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .transform((value) => value.toLowerCase()),
  role: z.enum(["ADMIN", "TEACHER"]),
  campusId: z.string().cuid("Select a campus."),
});

function failure(error: unknown): StaffAccountActionState {
  if (error instanceof z.ZodError) {
    return {
      status: "error",
      message: error.issues[0]?.message ?? "Check the submitted information.",
    };
  }
  if (error instanceof Error && error.message === "EMAIL_IN_USE") {
    return {
      status: "error",
      message: "That email address already belongs to an existing account.",
    };
  }
  if (error instanceof Error && error.message.startsWith("FORBIDDEN")) {
    return {
      status: "error",
      message: "Only the school Owner can create staff accounts.",
    };
  }
  console.error(error);
  return {
    status: "error",
    message: "The staff account could not be created. Please try again.",
  };
}

export async function createStaffAccount(
  _previous: StaffAccountActionState,
  formData: FormData,
): Promise<StaffAccountActionState> {
  try {
    const viewer = await requirePermission("people.manage");
    if (viewer.membership.role !== "OWNER") {
      throw new Error("FORBIDDEN:OWNER_ONLY");
    }

    const input = staffSchema.parse(Object.fromEntries(formData));
    const campus = await db.campus.findFirst({
      where: {
        id: input.campusId,
        schoolId: viewer.membership.schoolId,
        isActive: true,
      },
      select: { id: true, name: true },
    });
    if (!campus) {
      return { status: "error", message: "Select an active Petra Academy campus." };
    }

    const existing = await db.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing) throw new Error("EMAIL_IN_USE");

    const temporaryPassword = generateTemporaryPortalPassword();
    const password = await hashPassword(temporaryPassword);
    const requestHeaders = await headers();

    await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          emailVerified: true,
        },
        select: { id: true },
      });

      await tx.account.create({
        data: {
          providerId: "credential",
          accountId: user.id,
          userId: user.id,
          password,
        },
      });

      const membership = await tx.schoolMembership.create({
        data: {
          userId: user.id,
          schoolId: viewer.membership.schoolId,
          campusId: campus.id,
          role: input.role,
          status: "ACTIVE",
        },
        select: { id: true },
      });

      await tx.auditLog.create({
        data: {
          schoolId: viewer.membership.schoolId,
          campusId: campus.id,
          actorUserId: viewer.user.id,
          action: "staff.account_created",
          entityType: "SchoolMembership",
          entityId: membership.id,
          after: {
            name: input.name,
            email: input.email,
            role: input.role,
            campusId: campus.id,
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
    });

    revalidatePath("/people");
    return {
      status: "success",
      message: `${input.role === "TEACHER" ? "Teacher" : "Admin"} account created. Copy the temporary password now; it will not be displayed again.`,
      credentials: {
        name: input.name,
        email: input.email,
        role: input.role,
        campusName: campus.name,
        temporaryPassword,
      },
    };
  } catch (error) {
    return failure(error);
  }
}
