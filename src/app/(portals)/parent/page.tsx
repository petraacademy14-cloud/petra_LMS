import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GraduationCap, ShieldCheck, UsersRound, WalletCards } from "lucide-react";
import { requirePortalRole } from "@/lib/portal-auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Parent portal" };

type BalanceRow = { studentId: string; balance: unknown };

function naira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function ParentPortalPage() {
  const viewer = await requirePortalRole("PARENT");
  if (!viewer.guardianId) notFound();

  const guardian = await db.guardian.findFirst({
    where: { id: viewer.guardianId, schoolId: viewer.schoolId },
    select: {
      firstName: true,
      lastName: true,
      phone: true,
      students: {
        orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
        select: {
          relationship: true,
          isPrimary: true,
          student: {
            select: {
              id: true,
              admissionNumber: true,
              firstName: true,
              middleName: true,
              lastName: true,
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
                      name: true,
                      classLevel: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!guardian) notFound();

  const studentIds = guardian.students.map((link) => link.student.id);
  const balances = studentIds.length
    ? await db.$queryRaw<BalanceRow[]>`
        SELECT a."studentId", COALESCE(SUM(l."amount"), 0) AS "balance"
        FROM "student_fee_accounts" a
        LEFT JOIN "fee_ledger_entries" l ON l."accountId" = a."id"
        WHERE a."schoolId" = ${viewer.schoolId} AND a."studentId" IN (${studentIds.join(",")})
        GROUP BY a."studentId"
      `
    : [];
  const balanceByStudent = new Map(
    balances.map((row) => [row.studentId, Number(row.balance)]),
  );
  const totalBalance = guardian.students.reduce(
    (sum, link) => sum + (balanceByStudent.get(link.student.id) ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Parent portal foundation</p>
        <h1 className="page-title">Welcome, {guardian.firstName}</h1>
        <p className="page-subtitle">Your account is linked only to the Petra student records connected to {guardian.firstName} {guardian.lastName}.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="card p-5"><UsersRound className="text-[#d71920]" size={22} /><strong className="mt-3 block text-2xl">{guardian.students.length}</strong><p className="text-sm text-[#6f7782]">Linked student{guardian.students.length === 1 ? "" : "s"}</p></article>
        <article className="card p-5"><WalletCards className="text-[#d71920]" size={22} /><strong className="mt-3 block text-2xl">{naira(totalBalance)}</strong><p className="text-sm text-[#6f7782]">Combined outstanding balance</p></article>
        <article className="card p-5"><ShieldCheck className="text-[#d71920]" size={22} /><strong className="mt-3 block text-lg">Private access</strong><p className="text-sm text-[#6f7782]">No other family records are visible</p></article>
      </section>

      <section className="space-y-4">
        <div><h2 className="text-xl font-black">Your children</h2><p className="mt-1 text-sm text-[#6f7782]">Detailed fees, receipts, attendance, published results and announcements will use these secure links.</p></div>
        <div className="grid gap-4 xl:grid-cols-2">
          {guardian.students.map((link) => {
            const student = link.student;
            const enrollment = student.enrollments[0];
            return (
              <article className="card p-5" key={student.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-[#fff0f1] text-[#b91118]"><GraduationCap size={22} /></span>
                    <div><h3 className="text-lg font-black">{student.firstName} {student.middleName ?? ""} {student.lastName}</h3><p className="font-mono text-xs text-[#747c87]">{student.admissionNumber}</p></div>
                  </div>
                  <span className="pill" data-tone={student.status === "ACTIVE" ? "success" : undefined}>{student.status}</span>
                </div>
                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-xl bg-[#f6f7f8] p-3"><dt className="text-xs font-black uppercase tracking-wide text-[#7b838e]">Campus and class</dt><dd className="mt-1 font-black">{student.campus.name}<br />{enrollment ? `${enrollment.classArm.classLevel.name} ${enrollment.classArm.name}` : "Placement pending"}</dd></div>
                  <div className="rounded-xl bg-[#f6f7f8] p-3"><dt className="text-xs font-black uppercase tracking-wide text-[#7b838e]">Outstanding balance</dt><dd className="mt-1 text-lg font-black">{naira(balanceByStudent.get(student.id) ?? 0)}</dd></div>
                </dl>
              </article>
            );
          })}
        </div>
        {!guardian.students.length && <div className="card empty-state">No student is linked to this guardian record. Contact Petra Academy.</div>}
      </section>
    </div>
  );
}
