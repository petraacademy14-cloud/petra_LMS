import { hashPassword } from "better-auth/crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Role } from "../src/generated/prisma/enums";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to seed.");

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function seedPassword() {
  const configured = process.env.SEED_OWNER_PASSWORD;
  if (configured && configured.length >= 10) return configured;
  if (process.env.APP_ENV === "production") {
    throw new Error(
      "SEED_OWNER_PASSWORD (minimum 10 characters) is required in production.",
    );
  }
  return "PetraLocal!2026";
}

async function upsertStaff(input: {
  name: string;
  email: string;
  password: string;
  schoolId: string;
  campusId: string | null;
  role: Role;
}) {
  const password = await hashPassword(input.password);
  const user = await db.user.upsert({
    where: { email: input.email.toLowerCase() },
    create: {
      name: input.name,
      email: input.email.toLowerCase(),
      emailVerified: true,
    },
    update: {
      name: input.name,
    },
  });

  await db.account.upsert({
    where: {
      providerId_accountId: {
        providerId: "credential",
        accountId: user.id,
      },
    },
    create: {
      providerId: "credential",
      accountId: user.id,
      userId: user.id,
      password,
    },
    update: { password },
  });

  const existingMembership = await db.schoolMembership.findFirst({
    where: {
      userId: user.id,
      schoolId: input.schoolId,
      campusId: input.campusId,
    },
  });

  if (existingMembership) {
    await db.schoolMembership.update({
      where: { id: existingMembership.id },
      data: { role: input.role, status: "ACTIVE" },
    });
  } else {
    await db.schoolMembership.create({
      data: {
        userId: user.id,
        schoolId: input.schoolId,
        campusId: input.campusId,
        role: input.role,
        status: "ACTIVE",
      },
    });
  }

  return user;
}

async function main() {
  const school = await db.school.upsert({
    where: { slug: "petra-academy" },
    create: {
      name: "Petra Academy",
      slug: "petra-academy",
    },
    update: {
      name: "Petra Academy",
    },
  });

  const awka = await db.campus.upsert({
    where: {
      schoolId_code: {
        schoolId: school.id,
        code: "AWK",
      },
    },
    create: {
      schoolId: school.id,
      name: "Awka Campus",
      code: "AWK",
      city: "Awka",
    },
    update: { name: "Awka Campus", city: "Awka", isActive: true },
  });

  const nnewi = await db.campus.upsert({
    where: {
      schoolId_code: {
        schoolId: school.id,
        code: "NNE",
      },
    },
    create: {
      schoolId: school.id,
      name: "Nnewi Campus",
      code: "NNE",
      city: "Nnewi",
    },
    update: { name: "Nnewi Campus", city: "Nnewi", isActive: true },
  });

  const ownerPassword = seedPassword();
  await upsertStaff({
    name: process.env.SEED_OWNER_NAME ?? "Petra Academy Owner",
    email: process.env.SEED_OWNER_EMAIL ?? "owner@petraacademy.test",
    password: ownerPassword,
    schoolId: school.id,
    campusId: null,
    role: "OWNER",
  });

  if (process.env.APP_ENV !== "production") {
    await upsertStaff({
      name: "Awka Administrator",
      email: "admin.awka@petraacademy.test",
      password: ownerPassword,
      schoolId: school.id,
      campusId: awka.id,
      role: "ADMIN",
    });
    await upsertStaff({
      name: "Awka Teacher",
      email: "teacher.awka@petraacademy.test",
      password: ownerPassword,
      schoolId: school.id,
      campusId: awka.id,
      role: "TEACHER",
    });
  }

  const classLevelDefinitions = [
    ["CRECHE", "Creche"],
    ["NUR-1", "Nursery 1"],
    ["NUR-2", "Nursery 2"],
    ["PRI-1", "Primary 1"],
    ["PRI-2", "Primary 2"],
    ["PRI-3", "Primary 3"],
    ["PRI-4", "Primary 4"],
    ["PRI-5", "Primary 5"],
    ["JSS-1", "JSS 1"],
    ["JSS-2", "JSS 2"],
    ["JSS-3", "JSS 3"],
    ["SSS-1", "SSS 1"],
    ["SSS-2", "SSS 2"],
  ] as const;

  const classLevels = [];
  for (const [index, [code, name]] of classLevelDefinitions.entries()) {
    classLevels.push(
      await db.classLevel.upsert({
        where: { schoolId_code: { schoolId: school.id, code } },
        create: {
          schoolId: school.id,
          code,
          name,
          sortOrder: index + 1,
        },
        update: { name, sortOrder: index + 1, isActive: true },
      }),
    );
  }

  for (const campus of [awka, nnewi]) {
    for (const level of classLevels) {
      await db.classArm.upsert({
        where: {
          campusId_classLevelId_code: {
            campusId: campus.id,
            classLevelId: level.id,
            code: "A",
          },
        },
        create: {
          campusId: campus.id,
          classLevelId: level.id,
          name: "A",
          code: "A",
        },
        update: { isActive: true },
      });
    }
  }

  const subjectDefinitions = [
    ["ENG", "English Language"],
    ["MATH", "Mathematics"],
    ["BST", "Basic Science & Technology"],
    ["COMP", "Computer Studies"],
    ["ROB", "Robotics"],
    ["CIV", "Civic Education"],
    ["CRS", "Christian Religious Studies"],
    ["CCA", "Cultural & Creative Arts"],
  ] as const;

  for (const [code, name] of subjectDefinitions) {
    const subject = await db.subject.upsert({
      where: { schoolId_code: { schoolId: school.id, code } },
      create: { schoolId: school.id, code, name },
      update: { name, isActive: true },
    });
    for (const campus of [awka, nnewi]) {
      await db.campusSubject.upsert({
        where: {
          campusId_subjectId: {
            campusId: campus.id,
            subjectId: subject.id,
          },
        },
        create: { campusId: campus.id, subjectId: subject.id },
        update: { isActive: true },
      });
    }
  }

  const academicSession = await db.academicSession.upsert({
    where: {
      schoolId_name: {
        schoolId: school.id,
        name: "2026/2027",
      },
    },
    create: {
      schoolId: school.id,
      name: "2026/2027",
      startsOn: new Date("2026-09-07T00:00:00.000Z"),
      endsOn: new Date("2027-07-23T00:00:00.000Z"),
      isCurrent: true,
    },
    update: { isCurrent: true },
  });

  for (const campus of [awka, nnewi]) {
    await db.term.upsert({
      where: {
        academicSessionId_campusId_kind: {
          academicSessionId: academicSession.id,
          campusId: campus.id,
          kind: "FIRST",
        },
      },
      create: {
        academicSessionId: academicSession.id,
        campusId: campus.id,
        name: "First Term",
        kind: "FIRST",
        startsOn: new Date("2026-09-07T00:00:00.000Z"),
        endsOn: new Date("2026-12-11T00:00:00.000Z"),
        isCurrent: true,
      },
      update: { isCurrent: true },
    });
  }

  for (const [code, name] of [
    ["TUITION", "Tuition"],
    ["BOOKS", "Books and learning materials"],
    ["UNIFORM", "Uniform"],
    ["ACTIVITY", "Activities"],
    ["TRANSPORT", "Transport"],
  ] as const) {
    await db.feeCategory.upsert({
      where: { schoolId_code: { schoolId: school.id, code } },
      create: { schoolId: school.id, code, name },
      update: { name, isActive: true },
    });
  }

  if (process.env.APP_ENV !== "production") {
    const primaryOne = classLevels.find((item) => item.code === "PRI-1");
    const awkaPrimaryOne = primaryOne
      ? await db.classArm.findFirst({
          where: {
            campusId: awka.id,
            classLevelId: primaryOne.id,
            code: "A",
          },
        })
      : null;
    if (primaryOne && awkaPrimaryOne) {
      const tuition = await db.feeCategory.findUniqueOrThrow({
        where: {
          schoolId_code: { schoolId: school.id, code: "TUITION" },
        },
      });
      const firstTerm = await db.term.findUniqueOrThrow({
        where: {
          academicSessionId_campusId_kind: {
            academicSessionId: academicSession.id,
            campusId: awka.id,
            kind: "FIRST",
          },
        },
      });
      await db.feeStructure.upsert({
        where: {
          campusId_termId_classLevelId_categoryId: {
            campusId: awka.id,
            termId: firstTerm.id,
            classLevelId: primaryOne.id,
            categoryId: tuition.id,
          },
        },
        create: {
          schoolId: school.id,
          campusId: awka.id,
          termId: firstTerm.id,
          classLevelId: primaryOne.id,
          categoryId: tuition.id,
          amount: "75000.00",
          dueOn: new Date("2026-09-30T00:00:00.000Z"),
        },
        update: {
          amount: "75000.00",
          dueOn: new Date("2026-09-30T00:00:00.000Z"),
          isActive: true,
        },
      });

      for (const student of [
        {
          studentId: "demo-ada-okafor",
          admissionNumber: "PET/AWK/2026/001",
          displayName: "Ada Okafor",
        },
        {
          studentId: "demo-chidi-eze",
          admissionNumber: "PET/AWK/2026/002",
          displayName: "Chidi Eze",
        },
      ]) {
        await db.studentFeeAccount.upsert({
          where: {
            schoolId_studentId: {
              schoolId: school.id,
              studentId: student.studentId,
            },
          },
          create: {
            ...student,
            schoolId: school.id,
            campusId: awka.id,
            classArmId: awkaPrimaryOne.id,
          },
          update: {
            admissionNumber: student.admissionNumber,
            displayName: student.displayName,
            campusId: awka.id,
            classArmId: awkaPrimaryOne.id,
            isActive: true,
          },
        });
      }
    }
  }

  console.info(
    JSON.stringify({
      message: "Petra LMS seed complete",
      school: school.name,
      campuses: [awka.name, nnewi.name],
      ownerEmail: process.env.SEED_OWNER_EMAIL ?? "owner@petraacademy.test",
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
