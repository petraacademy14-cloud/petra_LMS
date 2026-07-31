"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import {
  generateTemporaryPortalPassword,
  isValidPortalUsername,
  normalizePortalUsername,
  portalAccountRoles,
  portalRoleLabel,
  suggestedPortalUsername,
  type PortalAccountRole,
} from "@/lib/portal-account";
import { hashPortalPassword } from "@/lib/portal-auth";

export type PortalAccountActionState = {
  status: "idle" | "success" | "error";
  message: string;
  credentials?: {
    role: PortalAccountRole;
    displayName: string;
    username: string;
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

function failure(error: unknown): PortalAccountActionState {
  if (error instanceof z.ZodError) {
    return {
      status: "error",
      message: error.issues[0]?.message ?? "Check the submitted information.",
    };
  }
  if (error instanceof Error && error.message === "USERNAME_TAKEN") {
    return { status: "error", message: "That username is already in use." };
  }
  if (
    error instanceof Error &&
    (error.message.startsWith("FORBIDDEN") ||
      error.message.startsWith("NOT_FOUND") ||
      error.message.startsWith("INVALID"))
  ) {
    return { status: "error", message: "This portal account action is not allowed." };
  }
  console.error(error);
  return {
    status: "error",
    message: "The portal account could not be saved. Please try again.",
  };
}

async function audit(
  tx: Prisma.TransactionClient,
  input: {
    schoolId: string;
    campusId: string | null;
    actorUserId: string;
    action: string;
    entityId: string;
    before?: Prisma.InputJsonValue;
    after?: Prisma.InputJsonValue;
  },
) {
  await tx.auditLog.create({
    data: {
      ...input,
      entityType: "PortalAccount",
      ...(await requestContext()),
    },
  });
}

async function uniqueGeneratedUsername(base: string) {
  const normalized = normalizePortalUsername(base);
  for (let suffix = 0; suffix < 100; suffix += 1) {
    const candidate = suffix === 0 ? normalized : `${normalized}-${suffix + 1}`;
    const existing = await db.portalAccount.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  throw new Error("INVALID:USERNAME_SEQUENCE_EXHAUSTED");
}

async function resolveTarget(input: {
  role: PortalAccountRole;
  targetId: string;
  schoolId: string;
  viewerRole: string;
  viewerCampusId: string | null;
}) {
  if (input.role === "STUDENT") {
    const student = await db.student.findFirst({
      where: {
        id: input.targetId,
        schoolId: input.schoolId,
        ...(input.viewerRole === "OWNER"
          ? {}
          : { campusId: input.viewerCampusId ?? "__none__" }),
      },
      select: {
        id: true,
        campusId: true,
        admissionNumber: true,
        firstName: true,
        middleName: true,
        lastName: true,
      },
    });
    if (!student) throw new Error("NOT_FOUND:STUDENT");
    return {
      guardianId: null,
      studentId: student.id,
      campusId: student.campusId,
      displayName: [student.firstName, student.middleName, student.lastName]
        .filter(Boolean)
        .join(" "),
      suggestedUsername: suggestedPortalUsername({
        role: input.role,
        admissionNumber: student.admissionNumber,
        fallbackId: student.id,
      }),
    };
  }

  const guardian = await db.guardian.findFirst({
    where: {
      id: input.targetId,
      schoolId: input.schoolId,
      ...(input.viewerRole === "OWNER"
        ? {}
        : {
            students: {
              some: {
                student: { campusId: input.viewerCampusId ?? "__none__" },
              },
            },
          }),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
    },
  });
  if (!guardian) throw new Error("NOT_FOUND:GUARDIAN");
  return {
    guardianId: guardian.id,
    studentId: null,
    campusId: input.viewerRole === "OWNER" ? null : input.viewerCampusId,
    displayName: `${guardian.firstName} ${guardian.lastName}`,
    suggestedUsername: suggestedPortalUsername({
      role: input.role,
      phone: guardian.phone,
      fallbackId: guardian.id,
    }),
  };
}

async function requireScopedPortalAccount(accountId: string) {
  const viewer = await requirePermission("people.manage");
  const account = await db.portalAccount.findFirst({
    where: { id: accountId, schoolId: viewer.membership.schoolId },
  });
  if (!account) throw new Error("NOT_FOUND:PORTAL_ACCOUNT");

  if (viewer.membership.role !== "OWNER") {
    const campusId = viewer.membership.campusId ?? "__none__";
    const inScope = account.studentId
      ? await db.student.findFirst({
          where: { id: account.studentId, campusId },
          select: { id: true },
        })
      : await db.guardian.findFirst({
          where: {
            id: account.guardianId ?? "__none__",
            students: { some: { student: { campusId } } },
          },
          select: { id: true },
        });
    if (!inScope) throw new Error("FORBIDDEN:PORTAL_ACCOUNT_SCOPE");
  }

  return { viewer, account };
}

export async function provisionPortalAccount(
  _previous: PortalAccountActionState,
  formData: FormData,
): Promise<PortalAccountActionState> {
  try {
    const viewer = await requirePermission("people.manage");
    const input = z
      .object({
        role: z.enum(portalAccountRoles),
        targetId: z.string().cuid(),
        username: z.string().trim().max(80).optional(),
      })
      .parse(Object.fromEntries(formData));
    const target = await resolveTarget({
      ...input,
      schoolId: viewer.membership.schoolId,
      viewerRole: viewer.membership.role,
      viewerCampusId: viewer.membership.campusId,
    });

    const suppliedUsername = input.username
      ? normalizePortalUsername(input.username)
      : null;
    if (suppliedUsername && !isValidPortalUsername(suppliedUsername)) {
      return {
        status: "error",
        message: "Use at least four lowercase letters, numbers, dots, dashes or underscores for the username.",
      };
    }
    const username = suppliedUsername
      ? suppliedUsername
      : await uniqueGeneratedUsername(target.suggestedUsername);
    if (
      suppliedUsername &&
      (await db.portalAccount.findUnique({ where: { username }, select: { id: true } }))
    ) {
      throw new Error("USERNAME_TAKEN");
    }

    const temporaryPassword = generateTemporaryPortalPassword();
    const passwordHash = hashPortalPassword(temporaryPassword);
    const accountId = crypto.randomUUID();

    await db.$transaction(async (tx) => {
      await tx.portalAccount.create({
        data: {
          id: accountId,
          schoolId: viewer.membership.schoolId,
          role: input.role,
          username,
          displayName: target.displayName,
          guardianId: target.guardianId,
          studentId: target.studentId,
          passwordHash,
          mustChangePassword: true,
          status: "ACTIVE",
          credentialsIssuedAt: new Date(),
          credentialsIssuedById: viewer.user.id,
        },
      });
      await audit(tx, {
        schoolId: viewer.membership.schoolId,
        campusId: target.campusId,
        actorUserId: viewer.user.id,
        action: "portal.account_issued",
        entityId: accountId,
        after: {
          role: input.role,
          username,
          guardianId: target.guardianId,
          studentId: target.studentId,
        },
      });
    });

    revalidatePath("/people/portal-accounts");
    return {
      status: "success",
      message: `${portalRoleLabel(input.role)} account created. Copy the temporary credentials now; the password is not stored in readable form.`,
      credentials: {
        role: input.role,
        displayName: target.displayName,
        username,
        temporaryPassword,
      },
    };
  } catch (error) {
    return failure(error);
  }
}

export async function resetPortalPassword(
  accountId: string,
  _previous: PortalAccountActionState,
  _formData: FormData,
): Promise<PortalAccountActionState> {
  try {
    const { viewer, account } = await requireScopedPortalAccount(accountId);
    const temporaryPassword = generateTemporaryPortalPassword();
    const passwordHash = hashPortalPassword(temporaryPassword);

    await db.$transaction(async (tx) => {
      await tx.portalAccount.update({
        where: { id: account.id },
        data: {
          passwordHash,
          mustChangePassword: true,
          credentialsIssuedAt: new Date(),
          credentialsIssuedById: viewer.user.id,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
      await tx.portalSession.deleteMany({ where: { accountId: account.id } });
      await audit(tx, {
        schoolId: viewer.membership.schoolId,
        campusId: viewer.membership.role === "OWNER" ? null : viewer.membership.campusId,
        actorUserId: viewer.user.id,
        action: "portal.password_reset",
        entityId: account.id,
        after: { role: account.role, username: account.username },
      });
    });

    revalidatePath("/people/portal-accounts");
    return {
      status: "success",
      message: "Password reset. Copy the temporary credentials now.",
      credentials: {
        role: account.role,
        displayName: account.displayName,
        username: account.username,
        temporaryPassword,
      },
    };
  } catch (error) {
    return failure(error);
  }
}

export async function changePortalAccountStatus(
  accountId: string,
  nextStatus: "ACTIVE" | "SUSPENDED",
) {
  const status = z.enum(["ACTIVE", "SUSPENDED"]).parse(nextStatus);
  const { viewer, account } = await requireScopedPortalAccount(accountId);
  if (account.status === status) return;

  await db.$transaction(async (tx) => {
    await tx.portalAccount.update({
      where: { id: account.id },
      data: {
        status,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    if (status === "SUSPENDED") {
      await tx.portalSession.deleteMany({ where: { accountId: account.id } });
    }
    await audit(tx, {
      schoolId: viewer.membership.schoolId,
      campusId: viewer.membership.role === "OWNER" ? null : viewer.membership.campusId,
      actorUserId: viewer.user.id,
      action: "portal.account_status_changed",
      entityId: account.id,
      before: { status: account.status },
      after: { status },
    });
  });

  revalidatePath("/people/portal-accounts");
}
