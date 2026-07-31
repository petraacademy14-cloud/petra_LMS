import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpenCheck, CalendarCheck, FileText, Megaphone } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { getViewer } from "@/lib/dal";
import { db } from "@/lib/db";

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
          _count: { select: { enrollments: true } },
        },
      },
      subject: { select: { name: true, code: true } },
    },
  });
  const currentAssignments = assignments.filter((assignment) => assignment.term.isCurrent);
  const visibleAssignments = currentAssignments.length ? currentAssignments : assignments;

  return (
    <div>
      <PageHeading
        description="Your teacher workspace is restricted to the campus, classes and subjects assigned to your staff membership."
        eyebrow="Teacher portal"
        title={`Welcome, ${viewer.user.name}`}
      />

      <section className="mt-7 grid gap-4 md:grid-cols-3">
        <Link className="card p-5 transition hover:-translate-y-0.5 hover:shadow-md" href="/attendance">
          <CalendarCheck className="text-[#d71920]" size={23} />
          <h2 className="mt-4 font-black">Attendance registers</h2>
          <p className="mt-1 text-sm leading-6 text-[#68707d]">Create and submit attendance for assigned classes.</p>
        </Link>
        <Link className="card p-5 transition hover:-translate-y-0.5 hover:shadow-md" href="/results">
          <FileText className="text-[#d71920]" size={23} />
          <h2 className="mt-4 font-black">Result sheets</h2>
          <p className="mt-1 text-sm leading-6 text-[#68707d]">Enter scores only for assigned subjects and classes.</p>
        </Link>
        <Link className="card p-5 transition hover:-translate-y-0.5 hover:shadow-md" href="/communications">
          <Megaphone className="text-[#d71920]" size={23} />
          <h2 className="mt-4 font-black">Communications</h2>
          <p className="mt-1 text-sm leading-6 text-[#68707d]">Draft class communication for review and publication.</p>
        </Link>
      </section>

      <section className="card mt-5 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[#e8eaed] p-5">
          <BookOpenCheck className="text-[#d71920]" size={21} />
          <div>
            <h2 className="font-black">Assigned teaching load</h2>
            <p className="text-xs text-[#747c87]">{visibleAssignments.length} assignment{visibleAssignments.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Session and term</th><th>Class</th><th>Subject</th><th>Learners</th></tr></thead>
            <tbody>
              {visibleAssignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td><strong>{assignment.term.academicSession.name}</strong><small className="block text-[#747c87]">{assignment.term.name}{assignment.term.isCurrent ? " · Current" : ""}</small></td>
                  <td>{assignment.classArm.classLevel.name} {assignment.classArm.name}</td>
                  <td><strong>{assignment.subject.name}</strong><small className="block font-mono text-[#747c87]">{assignment.subject.code}</small></td>
                  <td>{assignment.classArm._count.enrollments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visibleAssignments.length && <div className="empty-state">No teaching assignment is linked to this account yet. Contact the school administrator.</div>}
      </section>
    </div>
  );
}
