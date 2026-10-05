import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  CircleDashed,
  FileText,
  Send,
} from "lucide-react";
import { openTeacherScores } from "@/app/actions/results";
import { PageHeading } from "@/components/page-heading";
import { getViewer } from "@/lib/dal";
import { db } from "@/lib/db";
import {
  resultProgress,
  teacherStatusTone,
} from "@/lib/teacher-workspace";

export const metadata: Metadata = { title: "Teacher results" };

export default async function TeacherResultsPage() {
  const viewer = await getViewer();
  if (viewer.membership.role !== "TEACHER") redirect("/results");

  const [assignments, sheets, defaultScheme] = await Promise.all([
    db.teachingAssignment.findMany({
      where: {
        schoolId: viewer.membership.schoolId,
        campusId: viewer.membership.campusId ?? "__none__",
        teacherMembershipId: viewer.membership.id,
      },
      orderBy: [
        { term: { startsOn: "desc" } },
        { classArm: { classLevel: { sortOrder: "asc" } } },
        { subject: { name: "asc" } },
      ],
      select: {
        id: true,
        campusId: true,
        termId: true,
        classArmId: true,
        subjectId: true,
        term: {
          select: {
            name: true,
            isCurrent: true,
            academicSession: { select: { name: true } },
          },
        },
        classArm: {
          select: {
            name: true,
            classLevel: { select: { name: true } },
            enrollments: {
              where: { status: "CURRENT", student: { status: "ACTIVE" } },
              select: { id: true },
            },
          },
        },
        subject: { select: { name: true, code: true } },
      },
    }),
    db.resultSheet.findMany({
      where: {
        schoolId: viewer.membership.schoolId,
        teacherMembershipId: viewer.membership.id,
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        campusId: true,
        termId: true,
        classArmId: true,
        subjectId: true,
        status: true,
        updatedAt: true,
        term: {
          select: {
            name: true,
            isCurrent: true,
            academicSession: { select: { name: true } },
          },
        },
        classArm: {
          select: {
            name: true,
            classLevel: { select: { name: true } },
            enrollments: {
              where: { status: "CURRENT", student: { status: "ACTIVE" } },
              select: { id: true },
            },
          },
        },
        subject: { select: { name: true, code: true } },
        components: {
          select: {
            scores: { select: { id: true } },
          },
        },
      },
    }),
    db.gradingScheme.findFirst({
      where: {
        schoolId: viewer.membership.schoolId,
        isDefault: true,
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const currentAssignments = assignments.filter(
    (assignment) => assignment.term.isCurrent,
  );
  const visibleAssignments = currentAssignments.length
    ? currentAssignments
    : assignments;

  const drafts = sheets.filter((sheet) => sheet.status === "DRAFT").length;
  const submitted = sheets.filter(
    (sheet) => sheet.status === "SUBMITTED",
  ).length;
  const completed = sheets.filter((sheet) =>
    ["APPROVED", "PUBLISHED", "LOCKED"].includes(sheet.status),
  ).length;

  return (
    <div>
      <Link
        className="mb-4 inline-flex items-center gap-2 text-sm font-black text-[#6b7280] hover:text-[#b91118]"
        href="/teacher"
      >
        <ArrowLeft size={17} /> Teacher overview
      </Link>
      <PageHeading
        description="Enter First CAT over 20, Second CAT over 20 and Examination over 60 for every student, then submit completed work for approval."
        eyebrow="Teacher workspace"
        title="Results"
      />

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="card p-5">
          <BookOpenCheck className="text-[#d71920]" size={22} />
          <strong className="mt-3 block text-3xl">
            {visibleAssignments.length}
          </strong>
          <p className="text-sm text-[#68707d]">Assigned subjects</p>
        </article>
        <article className="card p-5">
          <CircleDashed className="text-[#d71920]" size={22} />
          <strong className="mt-3 block text-3xl">{drafts}</strong>
          <p className="text-sm text-[#68707d]">Draft subjects</p>
        </article>
        <article className="card p-5">
          <Send className="text-[#d71920]" size={22} />
          <strong className="mt-3 block text-3xl">{submitted}</strong>
          <p className="text-sm text-[#68707d]">Awaiting approval</p>
        </article>
        <article className="card p-5">
          <CheckCircle2 className="text-[#d71920]" size={22} />
          <strong className="mt-3 block text-3xl">{completed}</strong>
          <p className="text-sm text-[#68707d]">Approved or released</p>
        </article>
      </section>

      <section className="card mt-5 p-5">
        <h2 className="font-black">Enter student scores</h2>
        <p className="mt-2 text-sm text-[#68707d]">Choose your class, term and subject. Enter CAT 1, CAT 2 and exam scores beside each student. Existing scores open automatically.</p>
        {visibleAssignments.length > 0 && defaultScheme ? (
          <form action={openTeacherScores} className="mt-4 flex flex-col gap-3 md:flex-row">
            <label className="flex-1 text-sm font-bold">Class, term and subject
              <select name="assignmentId" required className="mt-2 block min-h-12 w-full rounded-lg border p-3" defaultValue="">
                <option value="" disabled>Select an assigned subject</option>
                {visibleAssignments.map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>
                    {assignment.classArm.classLevel.name} {assignment.classArm.name} · {assignment.subject.name} · {assignment.term.name} {assignment.term.academicSession.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="button md:self-end" type="submit">Open scores</button>
          </form>
        ) : <p className="mt-4 text-sm">{!visibleAssignments.length ? "An administrator must assign your class and subjects first." : "An administrator must configure the default grading scheme."}</p>}
      </section>

      <section className="card mt-5 overflow-hidden">
        <div className="border-b border-[#e8eaed] p-5">
          <h2 className="font-black">Student results</h2>
          <p className="text-sm text-[#68707d]">
            Draft subjects remain editable. Submitted sheets wait for an
            administrator.
          </p>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {sheets.map((sheet) => {
            const studentCount = sheet.classArm.enrollments.length;
            const scoreCount = sheet.components.reduce(
              (total, component) => total + component.scores.length,
              0,
            );
            const progress = resultProgress({
              componentCount: sheet.components.length,
              studentCount,
              scoreCount,
            });
            return (
              <article
                className="rounded-xl border border-[#e5e7eb] p-4"
                key={sheet.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-[#7b838e]">
                      {sheet.term.academicSession.name} · {sheet.term.name}
                    </p>
                    <h3 className="mt-2 text-lg font-black">
                      {sheet.classArm.classLevel.name} {sheet.classArm.name}
                    </h3>
                    <p className="mt-1 font-bold text-[#b91118]">
                      {sheet.subject.name}
                    </p>
                  </div>
                  <span
                    className="pill"
                    data-tone={teacherStatusTone(sheet.status)}
                  >
                    {sheet.status}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-xs font-bold text-[#68707d]">
                    <span>Scores recorded</span>
                    <span>
                      {progress.recorded}/{progress.expected}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eceef1]">
                    <div
                      className="h-full rounded-full bg-[#d71920]"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>

                <p className="mt-3 text-xs text-[#747c87]">
                  Updated {sheet.updatedAt.toLocaleDateString("en-NG")}
                </p>
                <Link className="button mt-4" href={`/results/${sheet.id}`}>
                  <FileText size={17} />
                  {sheet.status === "DRAFT" ? "Enter scores" : "View scores"}
                </Link>
              </article>
            );
          })}
        </div>
        {!sheets.length && (
          <div className="empty-state">
            Choose an assigned subject above to start entering scores.
          </div>
        )}
      </section>
    </div>
  );
}
