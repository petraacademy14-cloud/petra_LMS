import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { StudentCreateForm } from "@/components/student-forms";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Add student" };

export default async function NewStudentPage() {
  const viewer = await requirePermission("students.manage");
  const options = await studentOptions(viewer);
  return (
    <div>
      <PageHeading
        eyebrow="New admission"
        title="Create student profile"
        description="Add the student, primary guardian and first enrollment together. Leave admission number blank for Petra’s automatic campus/year sequence."
      />
      <StudentCreateForm {...options} />
    </div>
  );
}

async function studentOptions(viewer: Awaited<ReturnType<typeof requirePermission>>) {
  const campusFilter =
    viewer.membership.role === "OWNER"
      ? {}
      : { id: viewer.membership.campusId ?? "__none__" };
  const [campuses, classArms, sessions] = await Promise.all([
    db.campus.findMany({
      where: { schoolId: viewer.membership.schoolId, isActive: true, ...campusFilter },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.classArm.findMany({
      where: { isActive: true, campus: { schoolId: viewer.membership.schoolId, ...campusFilter } },
      orderBy: [{ classLevel: { sortOrder: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, campusId: true, classLevel: { select: { name: true } }, campus: { select: { name: true } } },
    }),
    db.academicSession.findMany({
      where: { schoolId: viewer.membership.schoolId },
      orderBy: { startsOn: "desc" },
      select: { id: true, name: true },
    }),
  ]);
  return {
    campuses,
    classArms: classArms.map((arm) => ({ id: arm.id, campusId: arm.campusId, name: `${arm.classLevel.name} ${arm.name} · ${arm.campus.name}` })),
    sessions,
  };
}

