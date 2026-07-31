import type { Metadata } from "next";
import { AcademicsNav } from "@/components/academics-nav";
import { PageHeading } from "@/components/page-heading";
import { attendanceSummary } from "@/lib/academics";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Attendance reports" };

function value(input: string | string[] | undefined) {
  return typeof input === "string" ? input.trim() : "";
}

export default async function AttendanceReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requirePermission("attendance.read");
  const query = await searchParams;
  const campusId = value(query.campus);
  const classArmId = value(query.class);
  const from = value(query.from);
  const to = value(query.to);
  const scope =
    viewer.membership.role === "OWNER"
      ? {}
      : { id: viewer.membership.campusId ?? "__none__" };
  const [campuses, classArms, entries] = await Promise.all([
    db.campus.findMany({
      where: { schoolId: viewer.membership.schoolId, ...scope },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.classArm.findMany({
      where: {
        campus: { schoolId: viewer.membership.schoolId, ...scope },
      },
      select: { id: true, name: true, classLevel: { select: { name: true } }, campus: { select: { name: true } } },
      orderBy: [{ classLevel: { sortOrder: "asc" } }, { name: "asc" }],
    }),
    db.attendanceEntry.findMany({
      where: {
        register: {
          schoolId: viewer.membership.schoolId,
          ...(campusId ? { campusId } : {}),
          ...(classArmId ? { classArmId } : {}),
          ...(from || to
            ? {
                registerDate: {
                  ...(from ? { gte: new Date(`${from}T00:00:00Z`) } : {}),
                  ...(to ? { lte: new Date(`${to}T00:00:00Z`) } : {}),
                },
              }
            : {}),
        },
      },
      select: {
        status: true,
        studentId: true,
        student: { select: { admissionNumber: true, firstName: true, lastName: true } },
      },
    }),
  ]);
  const overall = attendanceSummary(entries.map((entry) => entry.status));
  const byStudent = new Map<string, { student: (typeof entries)[number]["student"]; statuses: (typeof entries)[number]["status"][] }>();
  for (const entry of entries) {
    const row = byStudent.get(entry.studentId) ?? { student: entry.student, statuses: [] };
    row.statuses.push(entry.status);
    byStudent.set(entry.studentId, row);
  }

  return (
    <div>
      <PageHeading description="Filter attendance by date, campus and class, then review individual attendance rates." eyebrow="Phase 4" title="Attendance reports" />
      <AcademicsNav />
      <form className="card mt-6 grid gap-3 p-4 md:grid-cols-5">
        <select className="h-11 rounded-xl border px-3" defaultValue={campusId} name="campus"><option value="">All campuses</option>{campuses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select className="h-11 rounded-xl border px-3" defaultValue={classArmId} name="class"><option value="">All classes</option>{classArms.map((item) => <option key={item.id} value={item.id}>{item.campus.name} · {item.classLevel.name} {item.name}</option>)}</select>
        <input className="h-11 rounded-xl border px-3" defaultValue={from} name="from" type="date" />
        <input className="h-11 rounded-xl border px-3" defaultValue={to} name="to" type="date" />
        <button className="button" type="submit">Filter</button>
      </form>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Attendance rate", `${overall.attendanceRate}%`],
          ["Present", overall.present],
          ["Absent", overall.absent],
          ["Late", overall.late],
          ["Excused", overall.excused],
        ].map(([label, amount]) => <div className="card p-5" key={label}><p className="text-xs font-bold uppercase text-[#7a828d]">{label}</p><p className="mt-2 text-2xl font-black">{amount}</p></div>)}
      </div>
      <section className="card mt-5 overflow-hidden">
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Student</th><th>Days</th><th>Present</th><th>Absent</th><th>Late</th><th>Excused</th><th>Rate</th></tr></thead>
          <tbody>{[...byStudent.values()].sort((a, b) => a.student.lastName.localeCompare(b.student.lastName)).map((row) => {
            const summary = attendanceSummary(row.statuses);
            return <tr key={row.student.admissionNumber}><td><strong>{row.student.lastName}, {row.student.firstName}</strong><br /><span className="text-xs">{row.student.admissionNumber}</span></td><td>{summary.total}</td><td>{summary.present}</td><td>{summary.absent}</td><td>{summary.late}</td><td>{summary.excused}</td><td>{summary.attendanceRate}%</td></tr>;
          })}</tbody></table></div>
        {!entries.length && <div className="empty-state">No attendance entries match these filters.</div>}
      </section>
    </div>
  );
}
