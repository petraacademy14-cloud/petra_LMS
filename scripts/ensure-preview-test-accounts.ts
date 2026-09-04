import { betterAuth } from "better-auth/minimal";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { hashPassword } from "better-auth/crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Role } from "../src/generated/prisma/enums";
import {
  hashPortalPassword,
  verifyPortalPassword,
} from "../src/lib/portal-password";
import { previewAccountConfig } from "./preview-account-config";

if (process.env.VERCEL_ENV === "production" || process.env.APP_ENV === "production") {
  throw new Error("Preview test-account maintenance is blocked in Production.");
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");

const config = previewAccountConfig(process.env);
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const auth = betterAuth({
  appName: "Petra LMS Preview Account Verifier",
  baseURL: "http://localhost:3000",
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "preview-seeder-only-secret-replace-before-production",
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    minPasswordLength: 10,
    maxPasswordLength: 128,
  },
});

type PreviewStaffInput = {
  name: string;
  email: string;
  role: Role;
  schoolId: string;
  campusId: string | null;
  campusLabel: string;
};

async function ensureVerifiedPreviewStaff(input: PreviewStaffInput) {
  const email = input.email.trim().toLowerCase();
  const existingUser = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  let userId = existingUser?.id;
  if (!userId) {
    const result = await auth.api.signUpEmail({
      body: { name: input.name, email, password: config.password },
    });
    userId = result.user.id;
  } else {
    const passwordHash = await hashPassword(config.password);
    await db.account.upsert({
      where: {
        providerId_accountId: {
          providerId: "credential",
          accountId: userId,
        },
      },
      create: {
        userId,
        providerId: "credential",
        accountId: userId,
        password: passwordHash,
      },
      update: { password: passwordHash },
    });
  }

  await db.user.update({
    where: { id: userId },
    data: { name: input.name, emailVerified: true },
  });

  const membership = await db.schoolMembership.findFirst({
    where: {
      userId,
      schoolId: input.schoolId,
      campusId: input.campusId,
    },
    select: { id: true },
  });

  if (membership) {
    await db.schoolMembership.update({
      where: { id: membership.id },
      data: { role: input.role, status: "ACTIVE" },
    });
  } else {
    await db.schoolMembership.create({
      data: {
        userId,
        schoolId: input.schoolId,
        campusId: input.campusId,
        role: input.role,
        status: "ACTIVE",
      },
    });
  }

  await auth.api.signInEmail({
    body: { email, password: config.password, rememberMe: false },
  });
  await db.session.deleteMany({ where: { userId } });

  console.info(
    JSON.stringify({
      message: `Preview ${input.role.toLowerCase()} login verified`,
      login: email,
      role: input.role,
      campus: input.campusLabel,
    }),
  );
}

async function ensurePreviewFamily(schoolId: string, campusId: string) {
  const student = await db.student.upsert({
    where: {
      schoolId_admissionNumber: {
        schoolId,
        admissionNumber: config.student.admissionNumber,
      },
    },
    create: {
      schoolId,
      campusId,
      admissionNumber: config.student.admissionNumber,
      firstName: "Preview",
      lastName: "Student",
      preferredName: "Preview Student",
      gender: "FEMALE",
      admissionDate: new Date("2026-09-01T00:00:00.000Z"),
      status: "ACTIVE",
    },
    update: {
      campusId,
      firstName: "Preview",
      lastName: "Student",
      preferredName: "Preview Student",
      status: "ACTIVE",
    },
  });

  let guardian = await db.guardian.findFirst({
    where: {
      schoolId,
      OR: [{ email: config.parent.email }, { phone: config.parent.phone }],
    },
  });
  guardian ??= await db.guardian.create({
    data: {
      schoolId,
      firstName: "Preview",
      lastName: "Parent",
      phone: config.parent.phone,
      email: config.parent.email,
    },
  });

  await db.studentGuardian.upsert({
    where: {
      studentId_guardianId: {
        studentId: student.id,
        guardianId: guardian.id,
      },
    },
    create: {
      studentId: student.id,
      guardianId: guardian.id,
      relationship: "GUARDIAN",
      isPrimary: true,
      livesWith: true,
      canPickup: true,
    },
    update: {
      relationship: "GUARDIAN",
      isPrimary: true,
      livesWith: true,
      canPickup: true,
    },
  });

  return { student, guardian };
}

async function ensureVerifiedPortalAccount(input: {
  schoolId: string;
  role: "STUDENT" | "PARENT";
  username: string;
  displayName: string;
  studentId?: string;
  guardianId?: string;
}) {
  const passwordHash = hashPortalPassword(config.password);
  const existing = input.studentId
    ? await db.portalAccount.findUnique({ where: { studentId: input.studentId } })
    : await db.portalAccount.findUnique({
        where: { guardianId: input.guardianId! },
      });

  if (existing && existing.role !== input.role) {
    throw new Error(`Preview ${input.role.toLowerCase()} target has the wrong portal role.`);
  }

  const usernameOwner = await db.portalAccount.findUnique({
    where: { username: input.username },
    select: { id: true },
  });
  if (usernameOwner && usernameOwner.id !== existing?.id) {
    throw new Error(`Preview username ${input.username} is already assigned to another account.`);
  }

  const account = existing
    ? await db.portalAccount.update({
        where: { id: existing.id },
        data: {
          username: input.username,
          displayName: input.displayName,
          passwordHash,
          mustChangePassword: false,
          status: "ACTIVE",
          failedLoginCount: 0,
          lockedUntil: null,
          credentialsIssuedAt: new Date(),
        },
      })
    : await db.portalAccount.create({
        data: {
          id: crypto.randomUUID(),
          schoolId: input.schoolId,
          role: input.role,
          username: input.username,
          displayName: input.displayName,
          studentId: input.studentId,
          guardianId: input.guardianId,
          passwordHash,
          mustChangePassword: false,
          status: "ACTIVE",
          failedLoginCount: 0,
          lockedUntil: null,
          credentialsIssuedAt: new Date(),
        },
      });

  if (!verifyPortalPassword(config.password, account.passwordHash)) {
    throw new Error(`Preview ${input.role.toLowerCase()} password verification failed.`);
  }

  console.info(
    JSON.stringify({
      message: `Preview ${input.role.toLowerCase()} login verified`,
      login: account.username,
      role: input.role,
    }),
  );
}

async function main() {
  const school = await db.school.findUniqueOrThrow({
    where: { slug: "petra-academy" },
    select: { id: true },
  });
  const awka = await db.campus.findUniqueOrThrow({
    where: {
      schoolId_code: {
        schoolId: school.id,
        code: "AWK",
      },
    },
    select: { id: true },
  });

  await ensureVerifiedPreviewStaff({
    name: config.owner.name,
    email: config.owner.email,
    role: "OWNER",
    schoolId: school.id,
    campusId: null,
    campusLabel: "All campuses",
  });
  await ensureVerifiedPreviewStaff({
    name: config.teacher.name,
    email: config.teacher.email,
    role: "TEACHER",
    schoolId: school.id,
    campusId: awka.id,
    campusLabel: "Awka Campus",
  });

  const { student, guardian } = await ensurePreviewFamily(school.id, awka.id);
  await ensureVerifiedPortalAccount({
    schoolId: school.id,
    role: "STUDENT",
    username: config.student.username,
    displayName: "Preview Student",
    studentId: student.id,
  });
  await ensureVerifiedPortalAccount({
    schoolId: school.id,
    role: "PARENT",
    username: config.parent.username,
    displayName: "Preview Parent",
    guardianId: guardian.id,
  });

  console.info("All four Preview portal logins verified successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
