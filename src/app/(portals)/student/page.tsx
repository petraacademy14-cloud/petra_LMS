import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BellRing,
  CalendarCheck2,
  Download,
  FileText,
  GraduationCap,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";
import {
  attendanceSummary,
  resolveGrade,
  totalWeightedScore,
} from "@/lib/academics";
import { db } from "@/lib/db";
import { requirePortalRole } from "@/lib/portal-auth";
import { uniqueStudentReportTerms } from "@/lib/student-portal";

export const metadata: Metadata = { title: "Student portal" };

function naira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function date(value: Date | null | undefined) {
  return value
    ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(value)
    : "Not provided";
}

function statusTone(status: string) {
  if (["PRESENT", "PUBLISHED", "LOCKED"].includes(status)) return "success";
  if (status === "ABSENT") return "danger";
  return "brand";
}

export default async function StudentPortalPage() {
  const viewer = await requirePortalRole("STUDENT");
  if (!viewer.studentId) notFound();

  const student = await db.student.findFirst({
    where: { id: viewer.studentId, schoolId: viewer.schoolId },
    select: {
      id: true,
      schoolId: true,
      campusId: true,
      admissionNumber: true,
      firstName: true,
      middleName: true,
      lastName: true,
      preferredName: true,
      gender: true,
      dateOfBirth: true,
      admissionDate: true,
      status: true,
      address: true,
      campus: { select: { name: true } },
      enrollments: {
        where: { status: "CURRENT" },
        orderBy: { startsOn: "desc" },
        take: 1,
        select: {
          classArmId: true,
          startsOn: true,
          academicSession: { select: { name: true } },
          classArm: {
            select: {
              name: true,
              classLevel: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!student) notFound();

  const enrollment = student.enrollments[0] ?? null;
  const currentTerm = await db.term.findFirst({
    where: { campusId: student.campusId, isCurrent: true },
    select: {
      id: true,
      name: true,
      academicSession: { select: { name: true } },
    },
  });

  const [feeBalance, attendanceEntries, resultEntries, announcements] =
    await Promise.all([
      db.feeLedgerEntry.aggregate({
        where: {
          schoolId: viewer.schoolId,
          account: { studentId: student.id },
        },
        _sum: { amount: true },
      }),
      currentTerm
        ? db.attendanceEntry.findMany({
            where: {
              studentId: student.id,
              register: {
                termId: currentTerm.id,
                status: { in: ["SUBMITTED", "LOCKED"] },
              },
            },
            orderBy: { register: { registerDate: "desc" } },
            take: 120,
            select: {
              id: true,
              status: true,
              note: true,
              register: {
                select: { registerDate: true, status: true },
              },
            },
          })
        : Promise.resolve([]),
      db.resultEntry.findMany({
        where: {
          studentId: student.id,
          sheet: { status: { in: ["PUBLISHED", "LOCKED"] } },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          teacherComment: true,
          adminComment: true,
          sheet: {
            select: {
              termId: true,
              status: true,
              publishedAt: true,
              subject: { select: { name: true } },
              term: {
                select: {
                  id: true,
                  name: true,
                  academicSession: { select: { name: true } },
                },
              },
              gradingScheme: {
                select: {
                  bands: {
                    orderBy: { sortOrder: "asc" },
                    select: {
                      label: true,
                      minScore: true,
                      maxScore: true,
                      remark: true,
                    },
                  },
                },
              },
              components: {
                orderBy: { sortOrder: "asc" },
                select: {
                  name: true,
                  maxScore: true,
                  weight: true,
                  scores: {
                    where: { studentId: student.id },
                    take: 1,
                    select: { score: true },
                  },
                },
              },
            },
          },
        },
      }),
      db.announcement.findMany({
        where: {
          schoolId: viewer.schoolId,
          status: "PUBLISHED",
          parentFacing: true,
          OR: [
            { scheduledFor: null },
            { scheduledFor: { lte: new Date() } },
          ],
          AND: [
            {
              OR: [
                { audience: "SCHOOL" },
                { audience: "CAMPUS", campusId: student.campusId },
                ...(enrollment?.classArmId
                  ? [
                      {
                        audience: "CLASS" as const,
                        classArmId: enrollment.classArmId,
                      },
                    ]
                  : []),
              ],
            },
          ],
        },
        orderBy: { publishedAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          body: true,
          audience: true,
          publishedAt: true,
          campus: { select: { name: true } },
          classArm: {
            select: {
              name: true,
              classLevel: { select: { name: true } },
            },
          },
        },
      }),
    ]);

  const balance = Number(feeBalance._sum.amount ?? 0);
  const attendance = attendanceSummary(
    attendanceEntries.map((entry) => entry.status),
  );
  const resultRows = resultEntries.flatMap((entry) => {
    const complete = entry.sheet.components.every(
      (component) => component.scores.length > 0,
    );
    if (!complete) return [];
    const total = totalWeightedScore(
      entry.sheet.components.map((component) => ({
        score: component.scores[0]!.score,
        maxScore: component.maxScore,
        weight: component.weight,
      })),
    );
    const grade = resolveGrade(total, entry.sheet.gradingScheme.bands);
    return [{ entry, total, grade }];
  });
  const reportTermIds = uniqueStudentReportTerms(
    resultRows.map((row) => row.entry.sheet.termId),
  );
  const reportTerms = reportTermIds.map((termId) => {
    const row = resultRows.find((item) => item.entry.sheet.termId === termId)!;
    const termRows = resultRows.filter(
      (item) => item.entry.sheet.termId === termId,
    );
    const average =
      termRows.reduce((sum, item) => sum + item.total, 0) / termRows.length;
    return { ...row.entry.sheet.term, average };
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Student portal</p>
          <h1 className="page-title">
            Welcome, {student.preferredName ?? student.firstName}
          </h1>
          <p className="page-subtitle">
            {student.admissionNumber} · {student.campus.name} · Your private
            school record
          </p>
        </div>
        <span
          className="pill self-start sm:self-auto"
          data-tone={student.status === "ACTIVE" ? "success" : undefined}
        >
          <ShieldCheck size={14} /> {student.status}
        </span>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="card p-5">
          <GraduationCap className="text-[#d71920]" size={22} />
          <strong className="mt-3 block text-xl">
            {enrollment
              ? `${enrollment.classArm.classLevel.name} ${enrollment.classArm.name}`
              : "Placement pending"}
          </strong>
          <p className="text-sm text-[#6f7782]">Current class</p>
        </article>
        <article className="card p-5">
          <CalendarCheck2 className="text-[#d71920]" size={22} />
          <strong className="mt-3 block text-2xl">
            {attendance.total ? `${attendance.attendanceRate}%` : "—"}
          </strong>
          <p className="text-sm text-[#6f7782]">Current-term attendance</p>
        </article>
        <article className="card p-5">
          <FileText className="text-[#d71920]" size={22} />
          <strong className="mt-3 block text-2xl">{resultRows.length}</strong>
          <p className="text-sm text-[#6f7782]">
            Published subject result{resultRows.length === 1 ? "" : "s"}
          </p>
        </article>
        <article className="card p-5">
          <BellRing className="text-[#d71920]" size={22} />
          <strong className="mt-3 block text-2xl">{announcements.length}</strong>
          <p className="text-sm text-[#6f7782]">Visible announcements</p>
        </article>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <UserRound className="text-[#d71920]" size={22} />
          <div>
            <h2 className="text-xl font-black">Profile and placement</h2>
            <p className="text-sm text-[#6f7782]">
              Your official Petra Academy record and current placement.
            </p>
          </div>
        </div>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-[#f6f7f8] p-3">
            <dt className="text-xs font-black uppercase tracking-wide text-[#7b838e]">
              Admission number
            </dt>
            <dd className="mt-1 font-mono font-black">
              {student.admissionNumber}
            </dd>
          </div>
          <div className="rounded-xl bg-[#f6f7f8] p-3">
            <dt className="text-xs font-black uppercase tracking-wide text-[#7b838e]">
              Academic session
            </dt>
            <dd className="mt-1 font-black">
              {enrollment?.academicSession.name ?? "Not assigned"}
            </dd>
          </div>
          <div className="rounded-xl bg-[#f6f7f8] p-3">
            <dt className="text-xs font-black uppercase tracking-wide text-[#7b838e]">
              Date of birth
            </dt>
            <dd className="mt-1 font-black">{date(student.dateOfBirth)}</dd>
          </div>
          <div className="rounded-xl bg-[#f6f7f8] p-3">
            <dt className="text-xs font-black uppercase tracking-wide text-[#7b838e]">
              Admission date
            </dt>
            <dd className="mt-1 font-black">{date(student.admissionDate)}</dd>
          </div>
        </dl>
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e7eb] p-5">
          <div>
            <h2 className="text-xl font-black">Attendance</h2>
            <p className="mt-1 text-sm text-[#6f7782]">
              {currentTerm
                ? `${currentTerm.academicSession.name} · ${currentTerm.name}`
                : "No current term is configured."}
            </p>
          </div>
          <span
            className="pill"
            data-tone={attendance.attendanceRate >= 80 ? "success" : "brand"}
          >
            {attendance.total
              ? `${attendance.attendanceRate}% attendance`
              : "No released records"}
          </span>
        </div>
        <div className="grid gap-3 border-b border-[#e5e7eb] p-5 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Present", attendance.present],
            ["Late", attendance.late],
            ["Excused", attendance.excused],
            ["Absent", attendance.absent],
            ["Total days", attendance.total],
          ].map(([label, value]) => (
            <div className="rounded-xl bg-[#f6f7f8] p-3" key={label}>
              <strong className="block text-2xl">{value}</strong>
              <span className="text-xs font-black uppercase tracking-wide text-[#7b838e]">
                {label}
              </span>
            </div>
          ))}
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Note</th>
                <th>Register</th>
              </tr>
            </thead>
            <tbody>
              {attendanceEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>{date(entry.register.registerDate)}</td>
                  <td>
                    <span className="pill" data-tone={statusTone(entry.status)}>
                      {entry.status}
                    </span>
                  </td>
                  <td>{entry.note ?? "—"}</td>
                  <td className="text-sm text-[#6f7782]">
                    {entry.register.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!attendanceEntries.length && (
          <div className="empty-state m-5">
            No submitted or locked attendance records are available for the
            current term.
          </div>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-[#e5e7eb] p-5">
          <h2 className="text-xl font-black">Published results</h2>
          <p className="mt-1 text-sm text-[#6f7782]">
            Draft, submitted and approved-only result sheets remain hidden.
          </p>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Term and subject</th>
                <th>Assessment details</th>
                <th>Total</th>
                <th>Grade</th>
                <th>Remark</th>
              </tr>
            </thead>
            <tbody>
              {resultRows.map(({ entry, total, grade }) => (
                <tr key={entry.id}>
                  <td>
                    <strong>{entry.sheet.subject.name}</strong>
                    <small className="block text-[#747c87]">
                      {entry.sheet.term.academicSession.name} ·{" "}
                      {entry.sheet.term.name}
                    </small>
                  </td>
                  <td>
                    {entry.sheet.components.map((component) => (
                      <small className="block" key={component.name}>
                        {component.name}: {Number(component.scores[0]!.score)} /{" "}
                        {Number(component.maxScore)}
                      </small>
                    ))}
                  </td>
                  <td className="font-black">{total.toFixed(2)}%</td>
                  <td>
                    <span className="pill" data-tone="success">
                      {grade?.label ?? "—"}
                    </span>
                  </td>
                  <td>
                    {grade?.remark ?? "—"}
                    {(entry.teacherComment || entry.adminComment) && (
                      <small className="mt-1 block text-[#747c87]">
                        {entry.adminComment ?? entry.teacherComment}
                      </small>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!resultRows.length && (
          <div className="empty-state m-5">
            No published results are available yet.
          </div>
        )}
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <Download className="text-[#d71920]" size={22} />
          <div>
            <h2 className="text-xl font-black">Report cards</h2>
            <p className="text-sm text-[#6f7782]">
              Downloads contain only published or locked subject results.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {reportTerms.map((term) => (
            <article className="rounded-xl border border-[#e4e7eb] p-4" key={term.id}>
              <FileText className="text-[#d71920]" size={20} />
              <h3 className="mt-3 font-black">
                {term.academicSession.name} · {term.name}
              </h3>
              <p className="mt-1 text-sm text-[#6f7782]">
                Published average: {term.average.toFixed(2)}%
              </p>
              <Link
                className="button button-secondary mt-4 w-full justify-center"
                href={`/api/student/report-cards/${student.id}/download?termId=${term.id}`}
              >
                <Download size={17} /> Download PDF
              </Link>
            </article>
          ))}
        </div>
        {!reportTerms.length && (
          <div className="empty-state mt-5">No report card is available yet.</div>
        )}
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <WalletCards className="text-[#d71920]" size={22} />
          <div>
            <h2 className="text-xl font-black">School fee summary</h2>
            <p className="text-sm text-[#6f7782]">
              Official receipts and detailed payment history remain available
              to the linked parent account and school finance staff.
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-xl bg-[#f6f7f8] p-5">
          <span className="text-xs font-black uppercase tracking-wide text-[#7b838e]">
            Current outstanding balance
          </span>
          <strong className="mt-2 block text-3xl">{naira(balance)}</strong>
          <p className="mt-2 text-sm text-[#6f7782]">
            Contact the school office if this balance does not reflect a recent
            payment.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-black">Announcements</h2>
          <p className="mt-1 text-sm text-[#6f7782]">
            Published school, campus and current-class notices.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {announcements.map((announcement) => (
            <article className="card p-5" key={announcement.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="pill" data-tone="brand">
                  {announcement.audience}
                </span>
                <small className="text-[#747c87]">
                  {date(announcement.publishedAt)}
                </small>
              </div>
              <h3 className="mt-4 text-lg font-black">{announcement.title}</h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#5f6874]">
                {announcement.body}
              </p>
              {(announcement.campus || announcement.classArm) && (
                <p className="mt-4 text-xs font-black uppercase tracking-wide text-[#7b838e]">
                  {announcement.classArm
                    ? `${announcement.classArm.classLevel.name} ${announcement.classArm.name}`
                    : announcement.campus?.name}
                </p>
              )}
            </article>
          ))}
        </div>
        {!announcements.length && (
          <div className="card empty-state">
            There are no published announcements for your school, campus or
            class.
          </div>
        )}
      </section>
    </div>
  );
}
