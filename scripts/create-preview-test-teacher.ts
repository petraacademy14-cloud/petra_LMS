import { betterAuth } from "better-auth/minimal";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

if (process.env.VERCEL_ENV === "production" || process.env.APP_ENV === "production") {
  throw new Error("Preview test teacher creation is blocked in Production.");
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");

const password = process.env.SEED_OWNER_PASSWORD;
if (!password || password.length < 10) {
  throw new Error("SEED_OWNER_PASSWORD must contain at least 10 characters.");
}

const email = (
  process.env.SEED_PREVIEW_TEACHER_EMAIL ??
  "teacher.preview@petraacademy.test"
)
  .trim()
  .toLowerCase();
const name = process.env.SEED_PREVIEW_TEACHER_NAME ?? "Preview Test Teacher";

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

  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    const result = await auth.api.signUpEmail({
      body: { name, email, password },
    });
    user = result.user;
  }

  await db.user.update({
    where: { id: user.id },
    data: { name, emailVerified: true },
  });

  const membership = await db.schoolMembership.findFirst({
    where: {
      userId: user.id,
      schoolId: school.id,
      campusId: awka.id,
    },
    select: { id: true },
  });

  if (membership) {
    await db.schoolMembership.update({
      where: { id: membership.id },
      data: { role: "TEACHER", status: "ACTIVE" },
    });
  } else {
    await db.schoolMembership.create({
      data: {
        userId: user.id,
        schoolId: school.id,
        campusId: awka.id,
        role: "TEACHER",
        status: "ACTIVE",
      },
    });
  }

  // Prove the exact test credentials work before Vercel marks the build Ready.
  await auth.api.signInEmail({
    body: { email, password, rememberMe: false },
  });
  await db.session.deleteMany({ where: { userId: user.id } });

  console.info(
    JSON.stringify({
      message: "Preview teacher login verified",
      email,
      role: "TEACHER",
      campus: "Awka Campus",
    }),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
