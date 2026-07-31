import type { Metadata } from "next";
import {
  correctAttendanceEntry,
  lockAttendanceRegister,
  saveAttendanceRegister,
  submitAttendanceRegister,
} from "@/app/actions/attendance";
import { AcademicsNav } from "@/components/academics-nav";
import { PageHeading } from "@/components/page-heading";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = { title: "Attendance" };

function value(input: string | string[] | undefined) {
  return typeof input === "string" ? input.trim() : "";
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requirePermission("attendance.read");
  const query = await searchParams;
  const termId = value(query.term);
  const classArmId = value(query.class);
  const registerDate = value(query.date) || new Date().toISOString().slice(0, 10);
  const teacherWhere =
    viewer.membership.role === "TEACHER"
      ? { teachingAssignments: { some: { teacherMembershipId: viewer.membership.id } } }
      : {};
  const campusScope =
    viewer.membership.role === "OWNER"
      ? {}
      : { campusId: viewer.membership.campusId ?? "__none__" };

  const [terms, classArms] = await Promise.all([
    db.term.findMany({
      where: {
        campus: { schoolId: viewer.membership.schoolId },
        ...campusScope,
      },
      orderBy: [{ startsOn: "desc" }, { campus: { name: "asc" } }],
      select: { id: true, name: true, startsOn: true, campusId: true, campus: { select: { name: true } } },
    }),
    db.classArm.findMany({
      where: {
        campus: {
          schoolId: viewer.membership.schoolId,
          ...(viewer.membership.role === "OWNER"
            ? {}
            : { id: viewer.membership.campusId ?? "__none__" }),
        },
        ...teacherWhere,
      },
      orderBy: [{ classLevel: { sortOrder: "asc" } }, { name: "asc" }],
      select: {
        id: true,
        campusId: true,
        name: true,
        classLevel: { select: { name: true } },
        campus: { select: { name: true } },
      },
    }),
  ]);

  const selectedTerm = terms.find((term) => term.id === termId);
  const selectedClass = classArms.find((arm) => arm.id === classArmId);
  const validSelection =
    selectedTerm && selectedClass && selectedTerm.campusId === selectedClass.campusId;
  const [students, register] = validSelection
    ? await Promise.all([
        db.student.findMany({
          where: {
            schoolId: viewer.membership.schoolId,
            campusId: selectedClass.campusId,
            status: "ACTIVE",
            enrollments: { some: { classArmId, status: "CURRENT" } },
          },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          select: { id: true, admissionNumber: true, firstName: true, lastName: true },
        }),
        db.attendanceRegister.findUnique({
          where: {
            classArmId_registerDate: {
              classArmId,
              registerDate: new Date(`${registerDate}T00:00:00Z`),
            },
          },
          include: {
            entries: { include: { corrections: { orderBy: { createdAt: "desc" }, take: 1 } } },
          },
        }),
      ])
    : [[], null];
  const entries = new Map(register?.entries.map((entry) => [entry.studentId, entry]));
  const canCorrect = hasPermission(viewer.membership.role, "attendance.correct");
  const editable = !register || register.status === "DRAFT";

  return (
    <div>
      <PageHeading
        description="Take one daily class register, submit it, and preserve every later correction."
        eyebrow="Phase 4"
        title="Attendance"
      />
      <AcademicsNav />

      <form className="card mt-6 grid gap-3 p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
        <select className="h-11 rounded-xl border border-[#dfe2e6] px-3" defaultValue={termId} name="term" required>
          <option value="">Choose term</option>
          {terms.map((term) => (
            <option key={term.id} value={term.id}>{term.campus.name} · {term.name}</option>
          ))}
        </select>
        <select className="h-11 rounded-xl border border-[#dfe2e6] px-3" defaultValue={classArmId} name="class" required>
          <option value="">Choose class</option>
          {classArms.map((arm) => (
            <option key={arm.id} value={arm.id}>{arm.campus.name} · {arm.classLevel.name} {arm.name}</option>
          ))}
        </select>
        <input className="h-11 rounded-xl border border-[#dfe2e6] px-3" defaultValue={registerDate} name="date" required type="date" />
        <button className="button" type="submit">Open register</button>
      </form>

      {validSelection && (
        <section className="card mt-5 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8eaed] p-5">
            <div>
              <h2 className="font-black">{selectedClass.classLevel.name} {selectedClass.name}</h2>
              <p className="text-sm text-[#69717d]">{registerDate} · {students.length} active students</p>
            </div>
            <span className="pill" data-tone={register?.status === "LOCKED" ? undefined : "success"}>
              {register?.status ?? "NEW"}
            </span>
          </div>
          <form action={saveAttendanceRegister}>
            <input name="campusId" type="hidden" value={selectedClass.campusId} />
            <input name="termId" type="hidden" value={selectedTerm.id} />
            <input name="classArmId" type="hidden" value={selectedClass.id} />
            <input name="registerDate" type="hidden" value={registerDate} />
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Student</th><th>Status</th><th>Note</th><th>Correction history</th></tr></thead>
                <tbody>
                  {students.map((student) => {
                    const entry = entries.get(student.id);
                    return (
                      <tr key={student.id}>
                        <td><strong>{student.lastName}, {student.firstName}</strong><br /><span className="text-xs text-[#737b87]">{student.admissionNumber}</span></td>
                        <td>
                          <select
                            className="h-10 rounded-lg border border-[#dfe2e6] px-2"
                            defaultValue={entry?.status ?? "PRESENT"}
                            disabled={!editable}
                            name={`status:${student.id}`}
                          >
                            <option value="PRESENT">Present</option>
                            <option value="ABSENT">Absent</option>
                            <option value="LATE">Late</option>
                            <option value="EXCUSED">Excused</option>
                          </select>
                        </td>
                        <td><input className="h-10 min-w-48 rounded-lg border border-[#dfe2e6] px-2" defaultValue={entry?.note ?? ""} disabled={!editable} name={`note:${student.id}`} placeholder="Optional note" /></td>
                        <td className="text-xs text-[#68717d]">{entry?.corrections[0] ? `Corrected: ${entry.corrections[0].reason}` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {editable && <div className="border-t border-[#e8eaed] p-4"><button className="button" type="submit">Save draft register</button></div>}
          </form>

          {register?.status === "DRAFT" && (
            <form action={submitAttendanceRegister} className="border-t border-[#e8eaed] p-4">
              <input name="registerId" type="hidden" value={register.id} />
              <button className="button" type="submit">Submit register</button>
            </form>
          )}
          {register?.status === "SUBMITTED" && canCorrect && (
            <div className="border-t border-[#e8eaed] p-5">
              <h3 className="font-black">Admin correction</h3>
              <p className="mb-3 text-sm text-[#69717d]">Corrections require a reason and remain in history.</p>
              <div className="grid gap-3">
                {register.entries.map((entry) => {
                  const student = students.find((item) => item.id === entry.studentId);
                  return (
                    <form action={correctAttendanceEntry} className="grid gap-2 rounded-xl border border-[#e5e7ea] p-3 md:grid-cols-[1fr_9rem_1fr_2fr_auto]" key={entry.id}>
                      <input name="entryId" type="hidden" value={entry.id} />
                      <strong>{student?.lastName}, {student?.firstName}</strong>
                      <select className="h-10 rounded-lg border px-2" defaultValue={entry.status} name="status">
                        <option value="PRESENT">Present</option><option value="ABSENT">Absent</option><option value="LATE">Late</option><option value="EXCUSED">Excused</option>
                      </select>
                      <input className="h-10 rounded-lg border px-2" defaultValue={entry.note ?? ""} name="note" placeholder="Note" />
                      <input className="h-10 rounded-lg border px-2" name="reason" placeholder="Required correction reason" required />
                      <button className="button button-secondary" type="submit">Correct</button>
                    </form>
                  );
                })}
              </div>
              <form action={lockAttendanceRegister} className="mt-4">
                <input name="registerId" type="hidden" value={register.id} />
                <button className="button" type="submit">Lock register</button>
              </form>
            </div>
          )}
          {!students.length && <div className="empty-state">No active students are enrolled in this class.</div>}
        </section>
      )}
    </div>
  );
}
