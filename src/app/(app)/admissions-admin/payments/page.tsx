import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, CheckCircle2, CircleDollarSign, RotateCcw, Settings2 } from "lucide-react";
import {
  recordApplicantPayment,
  reverseApplicantPayment,
  upsertEntranceFeeSchedule,
  verifyApplicantPayment,
} from "@/app/actions/applicant-finance";
import {
  applicantPaymentStatusLabel,
  chargeBalance,
  entranceFeeLabel,
  formatNaira,
  type ApplicantPaymentStatus,
  type EntranceFeeKind,
} from "@/lib/applicant-finance";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Entrance fees and payments" };

type ScheduleRow = {
  id: string;
  campusName: string;
  className: string;
  kind: EntranceFeeKind;
  amount: unknown;
  isActive: boolean;
};

type ChargeRow = {
  id: string;
  applicationId: string;
  applicationNumber: string;
  studentName: string;
  campusName: string;
  className: string;
  kind: EntranceFeeKind;
  amount: unknown;
  verified: unknown;
  pending: unknown;
};

type PaymentRow = {
  id: string;
  applicationNumber: string;
  studentName: string;
  campusName: string;
  kind: EntranceFeeKind;
  status: ApplicantPaymentStatus;
  method: string;
  amount: unknown;
  reference: string | null;
  receiptNumber: string | null;
  paidAt: Date;
};

export default async function AdmissionsPaymentsPage() {
  const viewer = await requirePermission("admissions.read");
  const isOwner = viewer.membership.role === "OWNER";
  const campusId = viewer.membership.campusId;
  const canManage = viewer.permissions.includes("admissions.manage");

  const [campuses, classLevels, schedules, charges, payments] = await Promise.all([
    db.campus.findMany({
      where: {
        schoolId: viewer.membership.schoolId,
        isActive: true,
        ...(isOwner ? {} : { id: campusId ?? "__none__" }),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.classLevel.findMany({
      where: { schoolId: viewer.membership.schoolId, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    db.$queryRaw<ScheduleRow[]>`
      SELECT s."id", c."name" AS "campusName", l."name" AS "className",
        s."kind"::text AS "kind", s."amount", s."isActive"
      FROM "entrance_fee_schedules" s
      JOIN "campuses" c ON c."id"=s."campusId"
      JOIN "class_levels" l ON l."id"=s."classLevelId"
      WHERE s."schoolId"=${viewer.membership.schoolId}
        AND (${isOwner} OR s."campusId"=${campusId})
      ORDER BY c."name", l."sortOrder", CASE s."kind" WHEN 'FORM' THEN 1 ELSE 2 END
    `,
    db.$queryRaw<ChargeRow[]>`
      SELECT ch."id", ch."applicationId", a."applicationNumber",
        CONCAT(COALESCE(a."studentFirstName",'Draft'), ' ', COALESCE(a."studentLastName",'application')) AS "studentName",
        c."name" AS "campusName", l."name" AS "className", ch."kind"::text AS "kind", ch."amount",
        COALESCE(SUM(CASE WHEN p."status"='VERIFIED' THEN p."amount" ELSE 0 END),0) AS "verified",
        COALESCE(SUM(CASE WHEN p."status"='PENDING_VERIFICATION' THEN p."amount" ELSE 0 END),0) AS "pending"
      FROM "applicant_charges" ch
      JOIN "admission_applications" a ON a."id"=ch."applicationId"
      JOIN "campuses" c ON c."id"=ch."campusId"
      JOIN "class_levels" l ON l."id"=a."classLevelId"
      LEFT JOIN "applicant_payments" p ON p."chargeId"=ch."id"
      WHERE ch."schoolId"=${viewer.membership.schoolId}
        AND (${isOwner} OR ch."campusId"=${campusId})
      GROUP BY ch."id", a."id", c."name", l."name"
      ORDER BY ch."createdAt" DESC
      LIMIT 200
    `,
    db.$queryRaw<PaymentRow[]>`
      SELECT p."id", a."applicationNumber",
        CONCAT(COALESCE(a."studentFirstName",'Draft'), ' ', COALESCE(a."studentLastName",'application')) AS "studentName",
        c."name" AS "campusName", ch."kind"::text AS "kind", p."status"::text AS "status",
        p."method"::text AS "method", p."amount", p."reference", p."receiptNumber", p."paidAt"
      FROM "applicant_payments" p
      JOIN "applicant_charges" ch ON ch."id"=p."chargeId"
      JOIN "admission_applications" a ON a."id"=p."applicationId"
      JOIN "campuses" c ON c."id"=p."campusId"
      WHERE p."schoolId"=${viewer.membership.schoolId}
        AND (${isOwner} OR p."campusId"=${campusId})
      ORDER BY CASE p."status" WHEN 'PENDING_VERIFICATION' THEN 1 WHEN 'VERIFIED' THEN 2 ELSE 3 END,
        p."createdAt" DESC
      LIMIT 200
    `,
  ]);

  const pendingPayments = payments.filter((payment) => payment.status === "PENDING_VERIFICATION");
  const verifiedTotal = payments
    .filter((payment) => payment.status === "VERIFIED")
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
  const outstandingTotal = charges.reduce(
    (sum, charge) => sum + chargeBalance(Number(charge.amount), Number(charge.verified)),
    0,
  );

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="eyebrow">Phase 6A entrance payments</p><h1 className="page-title">Entrance fees and payments</h1><p className="page-subtitle">Configure entrance charges, verify applicant transfers, record office payments and correct mistakes through reversals.</p></div>
        <Link className="button button-secondary" href="/admissions-admin">Applications and visits</Link>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="card p-5"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#fff0f1] text-[#b91118]"><CircleDollarSign size={22} /></span><div><strong className="text-2xl">{formatNaira(verifiedTotal)}</strong><p className="text-sm text-[#6f7782]">Verified collections shown</p></div></div></article>
        <article className="card p-5"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#fff8e7] text-[#875b00]"><Banknote size={22} /></span><div><strong className="text-2xl">{pendingPayments.length}</strong><p className="text-sm text-[#6f7782]">Awaiting verification</p></div></div></article>
        <article className="card p-5"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#eef8f3] text-[#14804a]"><CheckCircle2 size={22} /></span><div><strong className="text-2xl">{formatNaira(outstandingTotal)}</strong><p className="text-sm text-[#6f7782]">Applicant balance</p></div></div></article>
      </section>

      <section className="card p-5">
        <div className="flex items-center gap-3"><Settings2 size={22} className="text-[#b91118]" /><div><h2 className="text-xl font-black">Fee configuration</h2><p className="text-sm text-[#6f7782]">Set the form and examination fees for each campus and class.</p></div></div>
        {canManage && (
          <form action={upsertEntranceFeeSchedule} className="mt-5 grid gap-4 md:grid-cols-5">
            <label><span>Campus</span><select name="campusId" required><option value="">Select campus</option>{campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</select></label>
            <label><span>Class</span><select name="classLevelId" required><option value="">Select class</option>{classLevels.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}</select></label>
            <label><span>Fee type</span><select name="kind" required defaultValue="FORM"><option value="FORM">Entrance form</option><option value="EXAM">Entrance examination</option></select></label>
            <label><span>Amount</span><input name="amount" type="number" min="1" step="0.01" required /></label>
            <div className="flex items-end gap-3"><label className="flex min-h-11 items-center gap-2"><input defaultChecked name="isActive" type="checkbox" /> Active</label><button className="button" type="submit">Save</button></div>
          </form>
        )}
        <div className="table-wrap mt-5">
          <table className="data-table"><thead><tr><th>Campus</th><th>Class</th><th>Fee</th><th>Amount</th><th>Status</th></tr></thead><tbody>
            {schedules.map((schedule) => <tr key={schedule.id}><td>{schedule.campusName}</td><td>{schedule.className}</td><td>{entranceFeeLabel(schedule.kind)}</td><td>{formatNaira(Number(schedule.amount))}</td><td><span className="pill" data-tone={schedule.isActive ? "success" : undefined}>{schedule.isActive ? "Active" : "Inactive"}</span></td></tr>)}
            {!schedules.length && <tr><td colSpan={5}><div className="empty-state">No entrance fee has been configured.</div></td></tr>}
          </tbody></table>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-[#e5e7eb] p-5"><h2 className="text-xl font-black">Payments awaiting verification</h2><p className="mt-1 text-sm text-[#6f7782]">Check the bank or provider record before issuing a receipt.</p></div>
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Applicant</th><th>Fee</th><th>Payment</th><th>Reference</th><th>Action</th></tr></thead><tbody>
          {pendingPayments.map((payment) => <tr key={payment.id}><td><strong>{payment.studentName}</strong><small className="block text-[#747c87]">{payment.applicationNumber} · {payment.campusName}</small></td><td>{entranceFeeLabel(payment.kind)}</td><td>{formatNaira(Number(payment.amount))}<small className="block text-[#747c87]">{payment.method} · {payment.paidAt.toLocaleDateString("en-NG")}</small></td><td>{payment.reference ?? "—"}</td><td>{canManage ? <form action={verifyApplicantPayment.bind(null, payment.id)}><button className="button" type="submit">Verify and receipt</button></form> : "View only"}</td></tr>)}
          {!pendingPayments.length && <tr><td colSpan={5}><div className="empty-state">No payment is awaiting verification.</div></td></tr>}
        </tbody></table></div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-[#e5e7eb] p-5"><h2 className="text-xl font-black">Applicant charges and office payments</h2><p className="mt-1 text-sm text-[#6f7782]">Cash and POS payments are recorded here. Part payments are supported up to the outstanding balance.</p></div>
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Applicant</th><th>Fee</th><th>Balance</th><th>Pending</th><th>Record payment</th></tr></thead><tbody>
          {charges.map((charge) => {
            const balance = chargeBalance(Number(charge.amount), Number(charge.verified));
            const available = Math.max(0, balance - Number(charge.pending));
            return <tr key={charge.id}><td><strong>{charge.studentName}</strong><small className="block text-[#747c87]">{charge.applicationNumber} · {charge.campusName} · {charge.className}</small></td><td>{entranceFeeLabel(charge.kind)}<small className="block text-[#747c87]">Total {formatNaira(Number(charge.amount))}</small></td><td>{formatNaira(balance)}</td><td>{formatNaira(Number(charge.pending))}</td><td>{canManage && available > 0 ? <form action={recordApplicantPayment.bind(null, charge.id)} className="grid min-w-[30rem] grid-cols-5 gap-2"><select name="method" required defaultValue="CASH"><option value="CASH">Cash</option><option value="POS">POS</option><option value="TRANSFER">Transfer</option><option value="ONLINE">Online</option></select><input name="amount" type="number" min="1" max={available} step="0.01" defaultValue={available} required /><input name="paidAt" type="date" defaultValue={new Date().toISOString().slice(0,10)} required /><input name="reference" placeholder="Reference" /><button className="button" type="submit">Record</button></form> : <span className="text-sm text-[#747c87]">{balance === 0 ? "Settled" : "Pending payment uses balance"}</span>}</td></tr>;
          })}
          {!charges.length && <tr><td colSpan={5}><div className="empty-state">Applicant charges appear after a submitted applicant opens the payment stage.</div></td></tr>}
        </tbody></table></div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-[#e5e7eb] p-5"><h2 className="text-xl font-black">Transaction history and corrections</h2><p className="mt-1 text-sm text-[#6f7782]">Verified payments are never deleted. A correction creates an equal-and-opposite reversal entry.</p></div>
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Receipt</th><th>Applicant</th><th>Fee</th><th>Amount</th><th>Status</th><th>Correction</th></tr></thead><tbody>
          {payments.filter((payment) => payment.status !== "PENDING_VERIFICATION").map((payment) => <tr key={payment.id}><td>{payment.receiptNumber ?? "—"}<small className="block text-[#747c87]">{payment.paidAt.toLocaleDateString("en-NG")} · {payment.method}</small></td><td>{payment.studentName}<small className="block text-[#747c87]">{payment.applicationNumber} · {payment.campusName}</small></td><td>{entranceFeeLabel(payment.kind)}</td><td>{formatNaira(Number(payment.amount))}</td><td><span className="pill" data-tone={payment.status === "VERIFIED" ? "success" : "brand"}>{applicantPaymentStatusLabel(payment.status)}</span></td><td>{canManage && payment.status === "VERIFIED" ? <form action={reverseApplicantPayment.bind(null, payment.id)} className="flex min-w-72 gap-2"><input name="reason" minLength={5} maxLength={500} required placeholder="Correction reason" /><button className="button button-secondary" type="submit"><RotateCcw size={16} /> Reverse</button></form> : "—"}</td></tr>)}
          {!payments.length && <tr><td colSpan={6}><div className="empty-state">No entrance payment has been recorded.</div></td></tr>}
        </tbody></table></div>
      </section>
    </div>
  );
}
