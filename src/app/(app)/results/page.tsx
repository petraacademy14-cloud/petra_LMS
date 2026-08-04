import type { Metadata } from "next";
import Link from "next/link";
import { createClassTeacherResultSheet } from "@/app/actions/class-results";
import { AcademicsNav } from "@/components/academics-nav";
import { PageHeading } from "@/components/page-heading";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = { title: "Results" };

export default async function ResultsPage() {
  const viewer = await requirePermission("results.read");
  const campusScope =
    viewer.membership.role === "OWNER"
      ? {}
      : { id: viewer.membership.campusId ?? "__none__" };
  const [
    sheets,
    assignments,
    campuses,
    terms,
    classArms,
    subjects,
    schemes,
  ] = await Promise.all([
    db.resultSheet.findMany({
      where: {
        schoolId: viewer.membership.schoolId,
        ...(viewer.membership.role === "OWNER"
          ? {}
          : { campusId: viewer.membership.campusId ?? "__none__" }),
        ...(viewer.membership.role === "TEACHER"
          ? { teacherMembershipId: viewer.membership.id }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        status: true,
        updatedAt: true,
        term: { select: { name: true } },
        campus: { select: { name: true } },
        classArm: {
          select: {
            name: true,
            classLevel: { select: { name: true } },
          },
        },
        subject: { select: { name: true } },
        teacherMembership: {
          select: { user: { select: { name: true } } },
        },
      },
    }),
    db.teachingAssignment.findMany({
      where: {
        schoolId: viewer.membership.schoolId,
        ...(viewer.membership.role === "OWNER"
          ? {}
          : { campusId: viewer.membership.campusId ?? "__none__" }),
        ...(viewer.membership.role === "TEACHER"
          ? { teacherMembershipId: viewer.membership.id }
          : {}),
      },
      select: {
        campusId: true,
        termId: true,
        classArmId: true,
        subjectId: true,
      },
    }),
    db.campus.findMany({
      where: { schoolId: viewer.membership.schoolId, ...campusScope },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.term.findMany({
      where: {
        campus: { schoolId: viewer.membership.schoolId, ...campusScope },
      },
      select: { id: true, campusId: true, name: true },
      orderBy: { startsOn: "desc" },
    }),
    db.classArm.findMany({
      where: {
        campus: { schoolId: viewer.membership.schoolId, ...campusScope },
      },
      select: {
        id: true,
        campusId: true,
        name: true,
        classLevel: { select: { name: true } },
      },
      orderBy: [{ classLevel: { sortOrder: "asc" } }, { name: "asc" }],
    }),
    db.subject.findMany({
      where: { schoolId: viewer.membership.schoolId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.gradingScheme.findMany({
      where: { schoolId: viewer.membership.schoolId },
      select: { id: true, name: true, isDefault: true },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
  ]);
  const canManageResults = hasPermission(
    viewer.membership.role,
    "results.manage",
  );

  return (
    <div>
      <PageHeading
        description="Class teachers enter First CAT, Second CAT and examination scores, then submit them for approval and publication."
        eyebrow="Phase 4"
        title="Results"
      />
      <AcademicsNav />

      <section className="card mt-6 overflow-hidden">
        <div className="border-b border-[#e8eaed] p-5">
          <h2 className="font-black">Result sheets</h2>
          <p className="text-sm text-[#707985]">
            {sheets.length} sheets in your scope
          </p>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Subject</th>
                <th>Term</th>
                <th>Class teacher</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {sheets.map((sheet) => (
                <tr key={sheet.id}>
                  <td>
                    <Link
                      className="font-extrabold text-[#b91118] hover:underline"
                      href={`/results/${sheet.id}`}
                    >
                      {sheet.classArm.classLevel.name} {sheet.classArm.name}
                    </Link>
                    <br />
                    <span className="text-xs">{sheet.campus.name}</span>
                  </td>
                  <td>{sheet.subject.name}</td>
                  <td>{sheet.term.name}</td>
                  <td>{sheet.teacherMembership.user.name}</td>
                  <td>
                    <span
                      className="pill"
                      data-tone={
                        sheet.status === "PUBLISHED" || sheet.status === "LOCKED"
                          ? "success"
                          : undefined
                      }
                    >
                      {sheet.status}
                    </span>
                  </td>
                  <td>{sheet.updatedAt.toLocaleDateString("en-NG")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!sheets.length && (
          <div className="empty-state">No result sheets have been created yet.</div>
        )}
      </section>

      {canManageResults && (
        <details className="card mt-5 p-5">
          <summary className="cursor-pointer font-black">
            Create a result sheet
          </summary>
          <form
            action={createClassTeacherResultSheet}
            className="mt-4 grid gap-3 md:grid-cols-3"
          >
            <select
              className="h-11 rounded-xl border px-3"
              name="campusId"
              required
            >
              <option value="">Campus</option>
              {campuses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              className="h-11 rounded-xl border px-3"
              name="termId"
              required
            >
              <option value="">Term</option>
              {terms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              className="h-11 rounded-xl border px-3"
              name="classArmId"
              required
            >
              <option value="">Class arm</option>
              {classArms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.classLevel.name} {item.name}
                </option>
              ))}
            </select>
            <select
              className="h-11 rounded-xl border px-3"
              name="subjectId"
              required
            >
              <option value="">Subject</option>
              {subjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              className="h-11 rounded-xl border px-3"
              name="gradingSchemeId"
              required
            >
              <option value="">Grading scheme</option>
              {schemes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.isDefault ? " (default)" : ""}
                </option>
              ))}
            </select>
            <button className="button" type="submit">
              Create sheet
            </button>
          </form>
          <p className="mt-3 text-xs text-[#747d88]">
            The class teacher is selected automatically from Academics. If the
            class has no teacher assignment, the sheet cannot be created. {assignments.length}{" "}
            class-subject access records are available.
          </p>
        </details>
      )}
    </div>
  );
}
