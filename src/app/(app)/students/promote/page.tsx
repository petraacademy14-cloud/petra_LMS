import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { PromotionTable } from "@/components/student-forms";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Promote students" };

export default async function PromoteStudentsPage() {
  const viewer = await requirePermission("students.manage");
  const campusFilter =
    viewer.membership.role === "OWNER"
      ? {}
      : { campusId: viewer.membership.campusId ?? "__none__" };
  const [students, classes, sessions] = await Promise.all([
    db.student.findMany({
      where: { schoolId: viewer.membership.schoolId, status: "ACTIVE", ...campusFilter, enrollments: { some: { status: "CURRENT" } } },
      orderBy: [{ campus: { name: "asc" } }, { lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNumber: true,
        campus: { select: { name: true } },
        enrollments: {
          where: { status: "CURRENT" },
          take: 1,
          select: { classArm: { select: { name: true, classLevel: { select: { name: true } } } } },
        },
      },
    }),
    db.classArm.findMany({
      where: {
        isActive: true,
        campus: {
          schoolId: viewer.membership.schoolId,
          ...(viewer.membership.role === "OWNER" ? {} : { id: viewer.membership.campusId ?? "__none__" }),
        },
      },
      orderBy: [{ campus: { name: "asc" } }, { classLevel: { sortOrder: "asc" } }],
      select: { id: true, name: true, campus: { select: { name: true } }, classLevel: { select: { name: true } } },
    }),
    db.academicSession.findMany({
      where: { schoolId: viewer.membership.schoolId },
      orderBy: { startsOn: "desc" },
      select: { id: true, name: true },
    }),
  ]);
  return (
    <div>
      <PageHeading
        eyebrow="Enrollment workflow"
        title="Bulk class promotion"
        description="Select active students from one campus, close their current enrollment, and create the next enrollment without losing class history."
      />
      <PromotionTable
        sessions={sessions}
        students={students.map((student) => ({
          id: student.id,
          name: `${student.lastName}, ${student.firstName}`,
          admissionNumber: student.admissionNumber,
          campusName: student.campus.name,
          className: student.enrollments[0]
            ? `${student.enrollments[0].classArm.classLevel.name} ${student.enrollments[0].classArm.name}`
            : "—",
        }))}
        targetClasses={classes.map((item) => ({ id: item.id, name: `${item.classLevel.name} ${item.name} · ${item.campus.name}` }))}
      />
    </div>
  );
}
