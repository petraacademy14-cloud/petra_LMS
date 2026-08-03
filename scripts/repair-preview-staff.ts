import { hashPassword } from "better-auth/crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Role } from "../src/generated/prisma/enums";

if (process.env.VERCEL_ENV === "production" || process.env.APP_ENV === "production") {
  throw new Error("Preview staff repair is blocked in Production.");
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");

const password = process.env.SEED_OWNER_PASSWORD;
if (!password || password.length < 10) {
  throw new Error("SEED_OWNER_PASSWORD must contain at least 10 characters.");
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function repairStaff(input: {
  name: string;
  email: string;
  role: Role;
  schoolId: string;
  campusId: string | null;
}) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);

  const user = await db.user.upsert({
    where: { email: normalizedEmail },
    create: {
      name: input.name,
      email: normalizedEmail,
      emailVerified: true,
    },
    update: {
      name: input.name,
      emailVerified: true,
    },
  });

  await db.$transaction(async (tx) => {
    // Remove stale or duplicate credential records so Better Auth can never
    // select an older password for this staff member.
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.account.deleteMany({
      where: {
        providerId: "credential",
        OR: [{ userId: user.id }, { accountId: user.id }],
      },
    });
    await tx.account.create({
      data: {
        providerId: "credential",
        accountId: user.id,
        userId: user.id,
        password: passwordHash,
      },
    });

    const membership = await tx.schoolMembership.findFirst({
      where: {
        userId: user.id,
        schoolId: input.schoolId,
        campusId: input.campusId,
      },
      select: { id: true },
    });

    if (membership) {
      await tx.schoolMembership.update({
        where: { id: membership.id },
        data: { role: input.role, status: "ACTIVE" },
      });
    } else {
      await tx.schoolMembership.create({
        data: {
          userId: user.id,
          schoolId: input.schoolId,
          campusId: input.campusId,
          role: input.role,
          status: "ACTIVE",
        },
      });
    }
  });

  console.info(
    JSON.stringify({
      message: "Preview staff credential repaired",
      role: input.role,
      email: normalizedEmail,
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

  await repairStaff({
    name: process.env.SEED_OWNER_NAME ?? "Petra Academy Owner",
    email: process.env.SEED_OWNER_EMAIL ?? "owner@petraacademy.test",
    role: "OWNER",
    schoolId: school.id,
    campusId: null,
  });
  await repairStaff({
    name: process.env.SEED_ADMIN_NAME ?? "Awka Administrator",
    email: process.env.SEED_ADMIN_EMAIL ?? "admin.awka@petraacademy.test",
    role: "ADMIN",
    schoolId: school.id,
    campusId: awka.id,
  });
  await repairStaff({
    name: process.env.SEED_TEACHER_NAME ?? "Awka Teacher",
    email: process.env.SEED_TEACHER_EMAIL ?? "teacher.awka@petraacademy.test",
    role: "TEACHER",
    schoolId: school.id,
    campusId: awka.id,
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
