import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BellRing,
  BookOpenCheck,
  CalendarCheck,
  ClipboardCheck,
  FileText,
  Megaphone,
} from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { getViewer } from "@/lib/dal";
import { db } from "@/lib/db";
import {
  lagosDateInput,
  teachingClassKey,
  teacherStatusTone,
  uniqueTeachingClasses,
} from "@/lib/teacher-workspace";

export const metadata: Metadata = { title: "Teacher workspace" };

export default async function TeacherWorkspacePage() {
  const viewer = await getViewer();
  if (viewer.membership.role !== "TEACHER") redirect("/dashboard");

  const assignments = await db.teachingAssignment.findMany({
    where: {
      teacherMembershipId: viewer.membership.id,
      schoolId: viewer.membership.schoolId,
      campusId: viewer.membership.campusId ?? "__none__",
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
          startsOn: true,
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
  });

  const currentAssignments = assignments.filter(
    (assignment) => assignment.term.isCurrent,
  );
  const visibleAssignments = currentAssignments.length
    ? currentAssignments
    : assignments;
  const teachingClasses = uniqueTeachingClasses(visibleAssignments);
  const attendanceScope = teachingClasses.map((assignment) => ({
    termId: assignment.termId,
    classArmId: assignment.classArmId,
  }));

  const [recentRegisters, resultSheets, announcements] = await Promise.all([
    attendanceScope.length
      ? db.attendanceRegister.findMany({
          where: {
            schoolId: viewer.membership.schoolId,
            OR: attendanceScope,
          },
          orderBy: { registerDate: "desc" },
          take: 8,
          select: {
            id: true,
            termId: true,
            classArmId: true,
            registerDate: true,
            status: true,
            classArm: {
              select: {
                name: true,
                classLevel: { select: { name: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    db.resultSheet.findMany({
      where: {
        schoolId: viewer.membership.schoolId,
        teacherMembershipId: viewer.membership.id,
      },
      orderBy: { updatedAt: "desc" },
      take: 12,
      select: {
        id: true,
        status: true,
        updatedAt: true,
        termId: true,
        classArmId: true,
        subjectId: true,
        term: { select: { name: true, isCurrent: true } },
        classArm: {
          select: {
            name: true,
            classLevel: { select: { name: true } },
          },
        },
        subject: { select: { name: true } },
      },
    }),
    db.announcement.findMany({
      where: {
        schoolId: viewer.membership.schoolId,
        authorId: viewer.user.id,
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
        classArm: {
          select: {
            name: true,
            classLevel: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const today = lagosDateInput();
  const submittedResults = resultSheets.filter(
    (sheet) => sheet.status !== "DRAFT",
  ).length;
  const draftAnnouncements = announcements.filter(
    (announcement) => announcement.status === "DRAFT",
  ).length;

  return (
    <div>
      <PageHeading
        description="Work only with the classes, subjects and communication drafts assigned to your staff account."
        eyebrow="Teacher workspace"
        title={`Welcome, ${viewer.user.name}`}
      />

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="card p-5">
          <BookOpenCheck className="text-[#d71920]" size={22} />
          <strong className="mt-3 block text-3xl">
            {visibleAssignments.length}
          </strong>
          <p className="text-sm text-[#68707d]">Teaching assignments</p>
        </article>
        <article className="card p-5">
          <ClipboardCheck className="text-[#d71920]" size={22} />
          <strong className="mt-3 block text-3xl">
            {recentRegisters.length}
          </strong>
          <p className="text-sm text-[#68707d]">Recent class registers</p>
        </article>
        <article className="card p-5">
          <FileText className="text-[#d71920]" size={22} />
          <strong className="mt-3 block text-3xl">{submittedResults}</strong>
          <p className="text-sm text-[#68707d]">Result sheets submitted onward</p>
        </article>
        <article className="card p-5">
          <BellRing className="text-[#d71920]" size={22} />
          <strong className="mt-3 block text-3xl">{draftAnnouncements}</strong>
          <p className="text-sm text-[#68707d]">Communication drafts</p>
        </article>
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-3">
        <Link
          className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-md"
          href="/teacher/attendance"
        >
          <CalendarCheck className="text-[#d71920]" size={23} />
          <h2 className="mt-4 font-black">Take attendance</h2>
          <p className="mt-1 text-sm leading-6 text-[#68707d]">
            Open today&apos;s register for one of your assigned classes.
          </p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#b91118]">
            Open attendance <ArrowRight size={16} />
          </span>
        </Link>
        <Link
          className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-md"
          href="/teacher/results"
        >
          <FileText className="text-[#d71920]" size={23} />
          <h2 className="mt-4 font-black">Enter results</h2>
          <p className="mt-1 text-sm leading-6 text-[#68707d]">
            Continue draft sheets or create one from an assigned subject.
          </p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#b91118]">
            Open result sheets <ArrowRight size={16} />
          </span>
        </Link>
        <Link
          className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-md"
          href="/teacher/communications"
        >
          <Megaphone className="text-[#d71920]" size={23} />
          <h2 className="mt-4 font-black">Draft a class notice</h2>
          <p className="mt-1 text-sm leading-6 text-[#68707d]">
            Prepare a message for an assigned class and submit it for review.
          </p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#b91118]">
            Open communications <ArrowRight size={16} />
          </span>
        </Link>
      </section>

      <section className="card mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8eaed] p-5">
          <div>
            <h2 className="font-black">Assigned teaching load</h2>
            <p className="text-xs text-[#747c87]">
              {visibleAssignments.length} assignment
              {visibleAssignments.length === 1 ? "" : "s"} in the active view
            </p>
          </div>
          <span className="pill" data-tone="brand">
            {currentAssignments.length ? "Current term" : "Latest assignments"}
          </span>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleAssignments.map((assignment) => (
            <article
              className="rounded-xl border border-[#e5e7eb] p-4"
              key={assignment.id}
            >
              <p className="text-xs font-black uppercase tracking-wide text-[#7b838e]">
                {assignment.term.academicSession.name} · {assignment.term.name}
              </p>
              <h3 className="mt-2 text-lg font-black">
                {assignment.classArm.classLevel.name} {assignment.classArm.name}
              </h3>
              <p className="mt-1 font-bold text-[#b91118]">
                {assignment.subject.name}
              </p>
              <p className="mt-3 text-xs text-[#68707d]">
                {assignment.classArm.enrollments.length} active learner
                {assignment.classArm.enrollments.length === 1 ? "" : "s"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  className="button button-secondary"
                  href={`/teacher/attendance?assignment=${encodeURIComponent(
                    teachingClassKey(assignment),
                  )}&date=${today}`}
                >
                  Attendance
                </Link>
                <Link className="button button-secondary" href="/teacher/results">
                  Results
                </Link>
              </div>
            </article>
          ))}
        </div>
        {!visibleAssignments.length && (
          <div className="empty-state">
            No teaching assignment is linked to this account. Ask a campus
            administrator to assign a term, class and subject.
          </div>
        )}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <article className="card overflow-hidden">
          <div className="border-b border-[#e8eaed] p-5">
            <h2 className="font-black">Recent attendance registers</h2>
          </div>
          <div className="divide-y divide-[#eceef1]">
            {recentRegisters.map((register) => (
              <Link
                className="flex items-center justify-between gap-4 p-4 hover:bg-[#fafafa]"
                href={`/teacher/attendance?assignment=${encodeURIComponent(
                  teachingClassKey(register),
                )}&date=${lagosDateInput(register.registerDate)}`}
                key={register.id}
              >
                <div>
                  <strong>
                    {register.classArm.classLevel.name} {register.classArm.name}
                  </strong>
                  <p className="text-xs text-[#747c87]">
                    {register.registerDate.toLocaleDateString("en-NG")}
                  </p>
                </div>
                <span
                  className="pill"
                  data-tone={teacherStatusTone(register.status)}
                >
                  {register.status}
                </span>
              </Link>
            ))}
            {!recentRegisters.length && (
              <p className="empty-state">No attendance registers yet.</p>
            )}
          </div>
        </article>

        <article className="card overflow-hidden">
          <div className="border-b border-[#e8eaed] p-5">
            <h2 className="font-black">Result workflow</h2>
          </div>
          <div className="divide-y divide-[#eceef1]">
            {resultSheets.slice(0, 8).map((sheet) => (
              <Link
                className="flex items-center justify-between gap-4 p-4 hover:bg-[#fafafa]"
                href={`/results/${sheet.id}`}
                key={sheet.id}
              >
                <div>
                  <strong>
                    {sheet.classArm.classLevel.name} {sheet.classArm.name} ·{" "}
                    {sheet.subject.name}
                  </strong>
                  <p className="text-xs text-[#747c87]">
                    {sheet.term.name} · Updated{" "}
                    {sheet.updatedAt.toLocaleDateString("en-NG")}
                  </p>
                </div>
                <span
                  className="pill"
                  data-tone={teacherStatusTone(sheet.status)}
                >
                  {sheet.status}
                </span>
              </Link>
            ))}
            {!resultSheets.length && (
              <p className="empty-state">No result sheets yet.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
