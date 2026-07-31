import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookOpenCheck, CalendarCheck, GraduationCap, ShieldCheck } from "lucide-react";
import { requirePortalRole } from "@/lib/portal-auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Student portal" };

type BalanceRow = { balance: unknown };

export default async function StudentPortalPage() {
  const viewer = await requirePortalRole("STUDENT");
  if (!viewer.studentId) notFound();

  const student = await db.student.findFirst({
    where: { id: viewer.studentId, schoolId: viewer.schoolId },
    select: {
      id: true,
      admissionNumber: true,
      firstName: true,
      middleName: true,
      lastName: true,
      preferredName: true,
      status: true,
      campus: { select: { name: true } },
      enrollments: {
        where: { status: "CURRENT" },
        orderBy: { startsOn: "desc" },
        take: 1,
        select: {
          academicSession: { select: { name: true } },
          classArm: {
            select: {
              id: true,
              name: true,
              classLevel: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!student) notFound();

  const [attendance, publishedResults, [balance]] = await Promise.all([
    db.attendanceEntry.groupBy({
      by: ["status"],
      where: {
        studentId: student.id,
        register: { status: { in: ["SUBMITTED", "LOCKED"] } },
      },
      _count: { _all: true },
    }),
    db.resultEntry.count({
      where: {
        studentId: student.id,
        sheet: { status: { in: ["PUBLISHED", "LOCKED"] } },
      },
    }),
    db.$queryRaw<BalanceRow[]>`
      SELECT COALESCE(SUM(l."amount"), 0) AS "balance"
      FROM "student_fee_accounts" a
      LEFT JOIN "fee_ledger_entries" l ON l."accountId" = a."id"
      WHERE a."schoolId" = ${viewer.schoolId} AND a."studentId" = ${student.id}
    `,
  ]);

  const attendanceTotal = attendance.reduce((sum, row) => sum + row._count._all, 0);
  const presentCount = attendance
    .filter((row) => row.status === "PRESENT" || row.status === "LATE")
    .reduce((sum, row) => sum + row._count._all, 0);
  const attendanceRate = attendanceTotal
    ? Math.round((presentCount / attendanceTotal) * 100)
    : null;
  const enrollment = student.enrollments[0];

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Student portal foundation</p>
        <h1 className="page-title">Welcome, {student.preferredName ?? student.firstName}</h1>
        <p className="page-subtitle">This account can see only the school record for {student.firstName} {student.middleName ?? ""} {student.lastName}.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="card p-5"><GraduationCap className="text-[#d71920]" size={22} /><strong className="mt-3 block text-xl">{enrollment ? `${enrollment.classArm.classLevel.name} ${enrollment.classArm.name}` : "Placement pending"}</strong><p className="text-sm text-[#6f7782]">{student.campus.name}</p></article>
        <article className="card p-5"><CalendarCheck className="text-[#d71920]" size={22} /><strong className="mt-3 block text-2xl">{attendanceRate === null ? "—" : `${attendanceRate}%`}</strong><p className="text-sm text-[#6f7782]">Recorded attendance rate</p></article>
        <article className="card p-5"><BookOpenCheck className="text-[#d71920]" size={22} /><strong className="mt-3 block text-2xl">{publishedResults}</strong><p className="text-sm text-[#6f7782]">Published subject result{publishedResults === 1 ? "" : "s"}</p></article>
        <article className="card p-5"><ShieldCheck className="text-[#d71920]" size={22} /><strong className="mt-3 block text-lg">Private access</strong><p className="text-sm text-[#6f7782]">No other student record is visible</p></article>
      </section>

      <section className="card p-6">
        <h2 className="text-xl font-black">Student profile</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-[#f6f7f8] p-4"><dt className="text-xs font-black uppercase tracking-wide text-[#7b838e]">Admission number</dt><dd className="mt-1 font-mono font-black">{student.admissionNumber}</dd></div>
          <div className="rounded-xl bg-[#f6f7f8] p-4"><dt className="text-xs font-black uppercase tracking-wide text-[#7b838e]">Academic session</dt><dd className="mt-1 font-black">{enrollment?.academicSession.name ?? "Not assigned"}</dd></div>
          <div className="rounded-xl bg-[#f6f7f8] p-4"><dt className="text-xs font-black uppercase tracking-wide text-[#7b838e]">Record status</dt><dd className="mt-1"><span className="pill" data-tone={student.status === "ACTIVE" ? "success" : undefined}>{student.status}</span></dd></div>
          <div className="rounded-xl bg-[#f6f7f8] p-4"><dt className="text-xs font-black uppercase tracking-wide text-[#7b838e]">School fee balance</dt><dd className="mt-1 font-black">{new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(balance?.balance ?? 0))}</dd></div>
        </dl>
        <p className="mt-5 text-sm leading-6 text-[#66707b]">The next portal slice will add the detailed attendance register, published report cards and school announcements while preserving this account-to-student restriction.</p>
      </section>
    </div>
  );
}
