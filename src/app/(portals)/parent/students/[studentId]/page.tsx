import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BellRing,
  CalendarCheck2,
  Download,
  FileText,
  GraduationCap,
  ReceiptText,
  UserRound,
  WalletCards,
} from "lucide-react";
import { attendanceSummary, resolveGrade, totalWeightedScore } from "@/lib/academics";
import { db } from "@/lib/db";
import { uniqueTermIds } from "@/lib/parent-portal";
import { requirePortalRole } from "@/lib/portal-auth";

export const metadata: Metadata = { title: "Child record" };

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
  if (["ABSENT", "REVERSED"].includes(status)) return "danger";
  return "brand";
}

export default async function ParentStudentPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const viewer = await requirePortalRole("PARENT");
  if (!viewer.guardianId) notFound();
  const { studentId } = await params;

  const guardianLink = await db.studentGuardian.findFirst({
    where: {
      guardianId: viewer.guardianId,
      studentId,
      student: { schoolId: viewer.schoolId },
    },
    select: {
      relationship: true,
      isPrimary: true,
      student: {
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
      },
    },
  });
  if (!guardianLink) notFound();

  const student = guardianLink.student;
  const enrollment = student.enrollments[0] ?? null;
  const currentTerm = await db.term.findFirst({
    where: { campusId: student.campusId, isCurrent: true },
    select: {
      id: true,
      name: true,
      academicSession: { select: { name: true } },
    },
  });

  const [feeAccount, attendanceEntries, resultEntries, announcements] =
    await Promise.all([
      db.studentFeeAccount.findFirst({
        where: { schoolId: viewer.schoolId, studentId: student.id },
        select: {
          id: true,
          ledger: {
            orderBy: { occurredAt: "desc" },
            take: 100,
            select: {
              id: true,
              type: true,
              amount: true,
              description: true,
              occurredAt: true,
              term: {
                select: {
                  id: true,
                  name: true,
                  academicSession: { select: { name: true } },
                },
              },
            },
          },
          payments: {
            orderBy: { paidAt: "desc" },
            take: 50,
            select: {
              id: true,
              receiptNumber: true,
              amount: true,
              method: true,
              paidAt: true,
              reference: true,
              reversal: { select: { reason: true, createdAt: true } },
              term: {
                select: {
                  name: true,
                  academicSession: { select: { name: true } },
                },
              },
            },
          },
        },
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
              register: { select: { registerDate: true, status: true } },
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

  const balance = (feeAccount?.ledger ?? []).reduce(
    (sum, entry) => sum + Number(entry.amount),
    0,
  );
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
  const reportTermIds = uniqueTermIds(
    resultRows.map((row) => row.entry.sheet.termId),
  );
  const reportTerms = reportTermIds.map((termId) => {
    const row = resultRows.find((item) => item.entry.sheet.termId === termId)!;
    return row.entry.sheet.term;
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            className="mb-4 inline-flex items-center gap-2 text-sm font-black text-[#6b7280] hover:text-[#b91118]"
            href="/parent"
          >
            <ArrowLeft size={17} /> Parent overview
          </Link>
          <p className="eyebrow">Child record</p>
          <h1 className="page-title">
            {student.firstName} {student.middleName ?? ""} {student.lastName}
          </h1>
          <p className="page-subtitle">
            {student.admissionNumber} · {student.campus.name} · {guardianLink.relationship.toLowerCase()}
          </p>
        </div>
        <span
          className="pill self-start sm:self-auto"
          data-tone={student.status === "ACTIVE" ? "success" : undefined}
        >
          {student.status}
        </span>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="card p-5">
          <WalletCards className="text-[#d71920]" size={22} />
          <strong className="mt-3 block text-2xl">{naira(balance)}</strong>
          <p className="text-sm text-[#6f7782]">Outstanding fee balance</p>
        </article>
        <article className="card p-5">
          <CalendarCheck2 className="text-[#d71920]" size={22} />
          <strong className="mt-3 block text-2xl">{attendance.attendanceRate}%</strong>
          <p className="text-sm text-[#6f7782]">Current-term attendance</p>
        </article>
        <article className="card p-5">
          <GraduationCap className="text-[#d71920]" size={22} />
          <strong className="mt-3 block text-2xl">{resultRows.length}</strong>
          <p className="text-sm text-[#6f7782]">Published subject results</p>
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
            <p className="text-sm text-[#6f7782]">Current school record visible to this guardian account.</p>
          </div>
        </div>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-[#f6f7f8] p-3"><dt className="text-xs font-black uppercase tracking-wide text-[#7b838e]">Current class</dt><dd className="mt-1 font-black">{enrollment ? `${enrollment.classArm.classLevel.name} ${enrollment.classArm.name}` : "Placement pending"}</dd></div>
          <div className="rounded-xl bg-[#f6f7f8] p-3"><dt className="text-xs font-black uppercase tracking-wide text-[#7b838e]">Academic session</dt><dd className="mt-1 font-black">{enrollment?.academicSession.name ?? "Not assigned"}</dd></div>
          <div className="rounded-xl bg-[#f6f7f8] p-3"><dt className="text-xs font-black uppercase tracking-wide text-[#7b838e]">Date of birth</dt><dd className="mt-1 font-black">{date(student.dateOfBirth)}</dd></div>
          <div className="rounded-xl bg-[#f6f7f8] p-3"><dt className="text-xs font-black uppercase tracking-wide text-[#7b838e]">Admission date</dt><dd className="mt-1 font-black">{date(student.admissionDate)}</dd></div>
        </dl>
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e7eb] p-5">
          <div><h2 className="text-xl font-black">Fees and receipts</h2><p className="mt-1 text-sm text-[#6f7782]">Immutable statement entries and official posted receipts.</p></div>
          <span className="pill" data-tone={balance <= 0 ? "success" : "brand"}>{balance <= 0 ? "Account settled" : `${naira(balance)} owing`}</span>
        </div>
        <div className="grid gap-0 xl:grid-cols-2">
          <div className="border-b border-[#e5e7eb] xl:border-b-0 xl:border-r">
            <div className="p-5"><h3 className="font-black">Fee statement</h3></div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th></tr></thead>
                <tbody>
                  {(feeAccount?.ledger ?? []).map((entry) => (
                    <tr key={entry.id}>
                      <td>{date(entry.occurredAt)}<small className="block text-[#747c87]">{entry.term.academicSession.name} · {entry.term.name}</small></td>
                      <td>{entry.description}</td>
                      <td><span className="pill" data-tone={entry.type === "PAYMENT" ? "success" : undefined}>{entry.type}</span></td>
                      <td className="font-black">{naira(Number(entry.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!feeAccount?.ledger.length && <div className="empty-state m-5">No fee statement entries yet.</div>}
          </div>
          <div>
            <div className="p-5"><h3 className="font-black">Payment receipts</h3></div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Receipt</th><th>Payment</th><th>Status</th><th>Download</th></tr></thead>
                <tbody>
                  {(feeAccount?.payments ?? []).map((payment) => (
                    <tr key={payment.id}>
                      <td><strong>{payment.receiptNumber}</strong><small className="block text-[#747c87]">{date(payment.paidAt)}</small></td>
                      <td>{naira(Number(payment.amount))}<small className="block text-[#747c87]">{payment.method} · {payment.term.name}</small></td>
                      <td><span className="pill" data-tone={statusTone(payment.reversal ? "REVERSED" : "POSTED")}>{payment.reversal ? "REVERSED" : "POSTED"}</span></td>
                      <td><Link className="button button-secondary" href={`/api/parent/receipts/${payment.id}/download`}><Download size={16} /> PDF</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!feeAccount?.payments.length && <div className="empty-state m-5">No payment receipt has been posted.</div>}
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e7eb] p-5">
          <div><h2 className="text-xl font-black">Attendance</h2><p className="mt-1 text-sm text-[#6f7782]">Submitted or locked attendance only{currentTerm ? ` for ${currentTerm.academicSession.name} · ${currentTerm.name}` : ""}.</p></div>
          <span className="pill" data-tone="success">{attendance.present} present · {attendance.late} late · {attendance.absent} absent</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Date</th><th>Status</th><th>Note</th></tr></thead>
            <tbody>
              {attendanceEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>{date(entry.register.registerDate)}</td>
                  <td><span className="pill" data-tone={statusTone(entry.status)}>{entry.status}</span></td>
                  <td>{entry.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!attendanceEntries.length && <div className="empty-state m-5">No submitted attendance is available for the current term.</div>}
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e7eb] p-5">
          <div><h2 className="text-xl font-black">Published results and report cards</h2><p className="mt-1 text-sm text-[#6f7782]">Draft, submitted and approved-but-unpublished results are never shown.</p></div>
          <div className="flex flex-wrap gap-2">
            {reportTerms.map((term) => (
              <Link className="button button-secondary" href={`/api/parent/report-cards/${student.id}/download?termId=${term.id}`} key={term.id}><FileText size={16} /> {term.name} report</Link>
            ))}
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Academic period</th><th>Subject</th><th>Total</th><th>Grade</th><th>Comment</th></tr></thead>
            <tbody>
              {resultRows.map(({ entry, total, grade }) => (
                <tr key={entry.id}>
                  <td>{entry.sheet.term.academicSession.name}<small className="block text-[#747c87]">{entry.sheet.term.name}</small></td>
                  <td><strong>{entry.sheet.subject.name}</strong></td>
                  <td className="font-black">{total.toFixed(2)}%</td>
                  <td><span className="pill" data-tone="success">{grade?.label ?? "—"}</span><small className="block text-[#747c87]">{grade?.remark ?? "No grade band"}</small></td>
                  <td>{entry.adminComment ?? entry.teacherComment ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!resultRows.length && <div className="empty-state m-5">No published result is available yet.</div>}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3"><BellRing className="text-[#d71920]" size={22} /><div><h2 className="text-xl font-black">Announcements</h2><p className="text-sm text-[#6f7782]">Published school, campus and class notices for this child.</p></div></div>
        <div className="grid gap-4 xl:grid-cols-2">
          {announcements.map((announcement) => (
            <article className="card p-5" key={announcement.id}>
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="pill" data-tone="brand">{announcement.audience}</span><time className="text-xs font-bold text-[#7b838e]">{date(announcement.publishedAt)}</time></div>
              <h3 className="mt-4 text-lg font-black">{announcement.title}</h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#5f6874]">{announcement.body}</p>
              <p className="mt-4 text-xs font-bold text-[#858d98]">{announcement.classArm ? `${announcement.classArm.classLevel.name} ${announcement.classArm.name}` : announcement.campus?.name ?? "Whole school"}</p>
            </article>
          ))}
        </div>
        {!announcements.length && <div className="card empty-state">No published announcement is available for this child.</div>}
      </section>
    </div>
  );
}
