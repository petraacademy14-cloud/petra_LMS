import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  UsersRound,
} from "lucide-react";
import {
  saveAttendanceRegister,
  submitAttendanceRegister,
} from "@/app/actions/attendance";
import { PageHeading } from "@/components/page-heading";
import { getViewer } from "@/lib/dal";
import { db } from "@/lib/db";
import {
  lagosDateInput,
  teachingClassKey,
  teacherStatusTone,
  uniqueTeachingClasses,
} from "@/lib/teacher-workspace";

export const metadata: Metadata = { title: "Teacher attendance" };

function value(input: string | string[] | undefined) {
  return typeof input === "string" ? input.trim() : "";
}

export default async function TeacherAttendancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  if (viewer.membership.role !== "TEACHER") redirect("/attendance");
  if (!viewer.membership.campusId) notFound();

  const query = await searchParams;
  const requestedAssignment = value(query.assignment);
  const registerDate = value(query.date) || lagosDateInput();

  const assignments = await db.teachingAssignment.findMany({
    where: {
      schoolId: viewer.membership.schoolId,
      campusId: viewer.membership.campusId,
      teacherMembershipId: viewer.membership.id,
    },
    orderBy: [
      { term: { startsOn: "desc" } },
      { classArm: { classLevel: { sortOrder: "asc" } } },
      { classArm: { name: "asc" } },
    ],
    select: {
      id: true,
      campusId: true,
      termId: true,
      classArmId: true,
      term: {
        select: {
          name: true,
          isCurrent: true,
          startsOn: true,
          endsOn: true,
          academicSession: { select: { name: true } },
        },
      },
      classArm: {
        select: {
          name: true,
          classLevel: { select: { name: true } },
        },
      },
      subject: { select: { name: true } },
    },
  });

  const currentAssignments = assignments.filter(
    (assignment) => assignment.term.isCurrent,
  );
  const attendanceAssignments = uniqueTeachingClasses(
    currentAssignments.length ? currentAssignments : assignments,
  );
  const selectedAssignment =
    attendanceAssignments.find(
      (assignment) => teachingClassKey(assignment) === requestedAssignment,
    ) ??
    attendanceAssignments[0] ??
    null;

  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(registerDate)
    ? new Date(`${registerDate}T00:00:00.000Z`)
    : null;

  const [students, register, recentRegisters] =
    selectedAssignment && selectedDate
      ? await Promise.all([
          db.student.findMany({
            where: {
              schoolId: viewer.membership.schoolId,
              campusId: selectedAssignment.campusId,
              status: "ACTIVE",
              enrollments: {
                some: {
                  classArmId: selectedAssignment.classArmId,
                  status: "CURRENT",
                },
              },
            },
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
            select: {
              id: true,
              admissionNumber: true,
              firstName: true,
              lastName: true,
            },
          }),
          db.attendanceRegister.findUnique({
            where: {
              classArmId_registerDate: {
                classArmId: selectedAssignment.classArmId,
                registerDate: selectedDate,
              },
            },
            include: { entries: true },
          }),
          db.attendanceRegister.findMany({
            where: {
              schoolId: viewer.membership.schoolId,
              OR: attendanceAssignments.map((assignment) => ({
                termId: assignment.termId,
                classArmId: assignment.classArmId,
              })),
            },
            orderBy: { registerDate: "desc" },
            take: 10,
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
          }),
        ])
      : [[], null, []];

  const entries = new Map(
    register?.entries.map((entry) => [entry.studentId, entry]),
  );
  const editable = !register || register.status === "DRAFT";
  const present =
    register?.entries.filter((entry) => entry.status === "PRESENT").length ?? 0;
  const late =
    register?.entries.filter((entry) => entry.status === "LATE").length ?? 0;
  const absent =
    register?.entries.filter((entry) => entry.status === "ABSENT").length ?? 0;

  return (
    <div>
      <Link
        className="mb-4 inline-flex items-center gap-2 text-sm font-black text-[#6b7280] hover:text-[#b91118]"
        href="/teacher"
      >
        <ArrowLeft size={17} /> Teacher overview
      </Link>
      <PageHeading
        description="Choose one assigned class, mark every active learner and submit the daily register."
        eyebrow="Teacher workspace"
        title="Attendance"
      />

      <form className="card mt-6 grid gap-3 p-4 lg:grid-cols-[1fr_13rem_auto]">
        <select
          className="h-12 rounded-xl border border-[#dfe2e6] px-3"
          defaultValue={
            selectedAssignment ? teachingClassKey(selectedAssignment) : ""
          }
          name="assignment"
          required
        >
          <option value="">Choose assigned class</option>
          {attendanceAssignments.map((assignment) => (
            <option
              key={teachingClassKey(assignment)}
              value={teachingClassKey(assignment)}
            >
              {assignment.term.academicSession.name} · {assignment.term.name} ·{" "}
              {assignment.classArm.classLevel.name} {assignment.classArm.name}
            </option>
          ))}
        </select>
        <input
          className="h-12 rounded-xl border border-[#dfe2e6] px-3"
          defaultValue={registerDate}
          name="date"
          required
          type="date"
        />
        <button className="button" type="submit">
          Open register
        </button>
      </form>

      {!attendanceAssignments.length && (
        <div className="card empty-state mt-5">
          No assigned class is available for attendance. Ask a campus
          administrator to create a teaching assignment.
        </div>
      )}

      {selectedAssignment && selectedDate && (
        <>
          <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="card p-5">
              <UsersRound className="text-[#d71920]" size={22} />
              <strong className="mt-3 block text-3xl">{students.length}</strong>
              <p className="text-sm text-[#68707d]">Active learners</p>
            </article>
            <article className="card p-5">
              <CheckCircle2 className="text-[#d71920]" size={22} />
              <strong className="mt-3 block text-3xl">{present}</strong>
              <p className="text-sm text-[#68707d]">Present</p>
            </article>
            <article className="card p-5">
              <Clock3 className="text-[#d71920]" size={22} />
              <strong className="mt-3 block text-3xl">{late}</strong>
              <p className="text-sm text-[#68707d]">Late</p>
            </article>
            <article className="card p-5">
              <CalendarCheck2 className="text-[#d71920]" size={22} />
              <strong className="mt-3 block text-3xl">{absent}</strong>
              <p className="text-sm text-[#68707d]">Absent</p>
            </article>
          </section>

          <section className="card mt-5 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8eaed] p-5">
              <div>
                <h2 className="text-lg font-black">
                  {selectedAssignment.classArm.classLevel.name}{" "}
                  {selectedAssignment.classArm.name}
                </h2>
                <p className="text-sm text-[#69717d]">
                  {selectedAssignment.term.academicSession.name} ·{" "}
                  {selectedAssignment.term.name} ·{" "}
                  {selectedDate.toLocaleDateString("en-NG")}
                </p>
              </div>
              <span
                className="pill"
                data-tone={teacherStatusTone(register?.status ?? "NEW")}
              >
                {register?.status ?? "NEW"}
              </span>
            </div>

            <form action={saveAttendanceRegister}>
              <input
                name="campusId"
                type="hidden"
                value={selectedAssignment.campusId}
              />
              <input
                name="termId"
                type="hidden"
                value={selectedAssignment.termId}
              />
              <input
                name="classArmId"
                type="hidden"
                value={selectedAssignment.classArmId}
              />
              <input
                name="registerDate"
                type="hidden"
                value={registerDate}
              />

              <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                {students.map((student) => {
                  const entry = entries.get(student.id);
                  return (
                    <article
                      className="rounded-xl border border-[#e5e7eb] p-4"
                      key={student.id}
                    >
                      <strong className="block">
                        {student.lastName}, {student.firstName}
                      </strong>
                      <span className="mt-1 block font-mono text-xs text-[#747c87]">
                        {student.admissionNumber}
                      </span>
                      <div className="mt-4 grid gap-3">
                        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-[#737b87]">
                          Status
                          <select
                            className="h-11 rounded-lg border border-[#dfe2e6] px-2 text-sm font-bold normal-case tracking-normal"
                            defaultValue={entry?.status ?? "PRESENT"}
                            disabled={!editable}
                            name={`status:${student.id}`}
                          >
                            <option value="PRESENT">Present</option>
                            <option value="ABSENT">Absent</option>
                            <option value="LATE">Late</option>
                            <option value="EXCUSED">Excused</option>
                          </select>
                        </label>
                        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-[#737b87]">
                          Note
                          <input
                            className="h-11 rounded-lg border border-[#dfe2e6] px-2 text-sm font-normal normal-case tracking-normal"
                            defaultValue={entry?.note ?? ""}
                            disabled={!editable}
                            maxLength={240}
                            name={`note:${student.id}`}
                            placeholder="Optional note"
                          />
                        </label>
                      </div>
                    </article>
                  );
                })}
              </div>

              {editable && students.length > 0 && (
                <div className="sticky bottom-0 flex flex-wrap gap-3 border-t border-[#e8eaed] bg-white/95 p-4 backdrop-blur">
                  <button className="button" type="submit">
                    Save draft register
                  </button>
                  <span className="self-center text-xs text-[#68707d]">
                    Save first, review the class, then submit.
                  </span>
                </div>
              )}
            </form>

            {register?.status === "DRAFT" && (
              <form
                action={submitAttendanceRegister}
                className="border-t border-[#e8eaed] p-4"
              >
                <input name="registerId" type="hidden" value={register.id} />
                <button className="button" type="submit">
                  Submit completed register
                </button>
              </form>
            )}

            {register?.status === "SUBMITTED" && (
              <div className="border-t border-[#e8eaed] bg-[#f6f7f8] p-4 text-sm text-[#59616d]">
                This register has been submitted. Only an administrator can
                correct or lock it.
              </div>
            )}
            {register?.status === "LOCKED" && (
              <div className="border-t border-[#e8eaed] bg-[#f6f7f8] p-4 text-sm text-[#59616d]">
                This register is permanently locked.
              </div>
            )}
            {!students.length && (
              <div className="empty-state">
                No active students are enrolled in this class.
              </div>
            )}
          </section>

          <section className="card mt-5 overflow-hidden">
            <div className="border-b border-[#e8eaed] p-5">
              <h2 className="font-black">Recent registers</h2>
              <p className="text-sm text-[#68707d]">
                Open a previous class date without leaving the teacher
                workspace.
              </p>
            </div>
            <div className="divide-y divide-[#eceef1]">
              {recentRegisters.map((item) => (
                <Link
                  className="flex min-h-16 items-center justify-between gap-4 p-4 hover:bg-[#fafafa]"
                  href={`/teacher/attendance?assignment=${encodeURIComponent(
                    teachingClassKey(item),
                  )}&date=${lagosDateInput(item.registerDate)}`}
                  key={item.id}
                >
                  <div>
                    <strong>
                      {item.classArm.classLevel.name} {item.classArm.name}
                    </strong>
                    <p className="text-xs text-[#747c87]">
                      {item.registerDate.toLocaleDateString("en-NG")}
                    </p>
                  </div>
                  <span
                    className="pill"
                    data-tone={teacherStatusTone(item.status)}
                  >
                    {item.status}
                  </span>
                </Link>
              ))}
              {!recentRegisters.length && (
                <div className="empty-state">No saved registers yet.</div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
