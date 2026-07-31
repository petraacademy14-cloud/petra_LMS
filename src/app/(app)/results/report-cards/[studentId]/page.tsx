import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AcademicsNav } from "@/components/academics-nav";
import { ReportCardActions } from "@/components/report-card-actions";
import { attendanceSummary, resolveGrade, totalWeightedScore } from "@/lib/academics";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Student report card" };

export default async function StudentReportCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ termId?: string }>;
}) {
  const viewer = await requirePermission("results.read");
  const [{ studentId }, query] = await Promise.all([params, searchParams]);
  if (!query.termId) notFound();
  const student = await db.student.findFirst({
    where: {
      id: studentId,
      schoolId: viewer.membership.schoolId,
      ...(viewer.membership.role === "OWNER" ? {} : { campusId: viewer.membership.campusId ?? "__none__" }),
    },
    include: {
      school: true,
      campus: true,
      enrollments: {
        orderBy: { startsOn: "desc" },
        include: { academicSession: true, classArm: { include: { classLevel: true } } },
      },
      resultEntries: {
        where: { sheet: { termId: query.termId, status: { in: ["PUBLISHED", "LOCKED"] } } },
        include: {
          sheet: {
            include: {
              term: { include: { academicSession: true } },
              subject: true,
              gradingScheme: { include: { bands: { orderBy: { sortOrder: "asc" } } } },
              components: { include: { scores: { where: { studentId } } }, orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
      attendanceEntries: {
        where: { register: { termId: query.termId } },
        select: { status: true },
      },
    },
  });
  if (!student || !student.resultEntries.length) notFound();
  const term = student.resultEntries[0]!.sheet.term;
  const currentEnrollment = student.enrollments.find((item) => item.status === "CURRENT") ?? student.enrollments[0];
  const attendance = attendanceSummary(student.attendanceEntries.map((item) => item.status));
  const rows = student.resultEntries.map((entry) => {
    const sheet = entry.sheet;
    const complete = sheet.components.every((component) => component.scores[0]);
    const total = complete
      ? totalWeightedScore(sheet.components.map((component) => ({ score: component.scores[0]!.score, maxScore: component.maxScore, weight: component.weight })))
      : 0;
    const grade = resolveGrade(total, sheet.gradingScheme.bands);
    return { subject: sheet.subject.name, total, grade, comment: entry.teacherComment };
  }).sort((a, b) => a.subject.localeCompare(b.subject));
  const average = rows.length ? Math.round((rows.reduce((sum, row) => sum + row.total, 0) / rows.length) * 100) / 100 : 0;

  return (
    <div>
      <div className="print:hidden"><AcademicsNav /></div>
      <article className="card mt-6 p-6 print:mt-0 print:border-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#d71920] pb-5">
          <div><p className="text-xs font-black uppercase tracking-[0.14em] text-[#d71920]">{student.school.name}</p><h1 className="mt-1 text-2xl font-black">Student Report Card</h1><p className="text-sm text-[#68717d]">{student.campus.name} · {term.academicSession.name} · {term.name}</p></div>
          <ReportCardActions studentId={student.id} termId={query.termId} />
        </header>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div><span className="text-xs font-bold uppercase text-[#777f8a]">Student</span><p className="font-black">{student.lastName}, {student.firstName}</p></div><div><span className="text-xs font-bold uppercase text-[#777f8a]">Admission no.</span><p className="font-black">{student.admissionNumber}</p></div><div><span className="text-xs font-bold uppercase text-[#777f8a]">Class</span><p className="font-black">{currentEnrollment ? `${currentEnrollment.classArm.classLevel.name} ${currentEnrollment.classArm.name}` : "—"}</p></div><div><span className="text-xs font-bold uppercase text-[#777f8a]">Average</span><p className="font-black">{average}%</p></div></div>
        <div className="mt-6 table-wrap"><table className="data-table"><thead><tr><th>Subject</th><th>Total</th><th>Grade</th><th>Remark</th><th>Teacher comment</th></tr></thead><tbody>{rows.map((row) => <tr key={row.subject}><td className="font-bold">{row.subject}</td><td>{row.total}</td><td className="font-black">{row.grade?.label ?? "—"}</td><td>{row.grade?.remark ?? "—"}</td><td>{row.comment ?? "—"}</td></tr>)}</tbody></table></div>
        <section className="mt-6 grid gap-4 sm:grid-cols-5">{[["Days", attendance.total], ["Present", attendance.present], ["Absent", attendance.absent], ["Late", attendance.late], ["Attendance", `${attendance.attendanceRate}%`]].map(([label, amount]) => <div className="rounded-xl bg-[#f6f7f8] p-4" key={label}><p className="text-xs font-bold uppercase text-[#767e89]">{label}</p><p className="mt-1 text-xl font-black">{amount}</p></div>)}</section>
        <section className="mt-7 border-t pt-5"><h2 className="font-black">Promotion and enrolment history</h2><div className="mt-3 flex flex-wrap gap-2">{student.enrollments.map((item) => <span className="pill" key={item.id}>{item.academicSession.name}: {item.classArm.classLevel.name} {item.classArm.name} · {item.status}</span>)}</div></section>
      </article>
    </div>
  );
}
