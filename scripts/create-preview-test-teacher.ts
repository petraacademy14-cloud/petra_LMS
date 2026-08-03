import { betterAuth } from "better-auth/minimal";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Role } from "../src/generated/prisma/enums";

if (process.env.VERCEL_ENV === "production" || process.env.APP_ENV === "production") {
  throw new Error("Preview staff creation is blocked in Production.");
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");

const configuredPassword = process.env.SEED_OWNER_PASSWORD;
if (!configuredPassword || configuredPassword.length < 10) {
  throw new Error("SEED_OWNER_PASSWORD must contain at least 10 characters.");
}
const password: string = configuredPassword;

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const auth = betterAuth({
  appName: "Petra LMS Preview Seeder",
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
      body: { name: input.name, email, password },
    });
    userId = result.user.id;
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

  // Prove the exact credentials work before Vercel marks the build Ready.
  await auth.api.signInEmail({
    body: { email, password, rememberMe: false },
  });
  await db.session.deleteMany({ where: { userId } });

  console.info(
    JSON.stringify({
      message: `Preview ${input.role.toLowerCase()} login verified`,
      email,
      role: input.role,
      campus: input.campusLabel,
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
    name: process.env.SEED_PREVIEW_OWNER_NAME ?? "Preview Test Owner",
    email:
      process.env.SEED_PREVIEW_OWNER_EMAIL ??
      "owner.preview@petraacademy.test",
    role: "OWNER",
    schoolId: school.id,
    campusId: null,
    campusLabel: "All campuses",
  });

  await ensureVerifiedPreviewStaff({
    name: process.env.SEED_PREVIEW_TEACHER_NAME ?? "Preview Test Teacher",
    email:
      process.env.SEED_PREVIEW_TEACHER_EMAIL ??
      "teacher.preview@petraacademy.test",
    role: "TEACHER",
    schoolId: school.id,
    campusId: awka.id,
    campusLabel: "Awka Campus",
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
