import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, CheckCircle2, Clock3, CreditCard, FileText, Landmark } from "lucide-react";
import {
  startEntrancePayment,
  submitApplicantPayment,
} from "@/app/actions/applicant-finance";
import {
  applicantPaymentStatusLabel,
  canApplicantSeeCharge,
  chargeBalance,
  entranceFeeLabel,
  formatNaira,
  type ApplicantPaymentStatus,
  type EntranceFeeKind,
} from "@/lib/applicant-finance";
import { requireApplicant } from "@/lib/applicant-auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Entrance fees" };

type ApplicationRow = {
  status: string;
  campusName: string | null;
  className: string | null;
  examMode: string | null;
};

type ChargeRow = {
  id: string;
  kind: EntranceFeeKind;
  description: string;
  amount: unknown;
  verified: unknown;
  pending: unknown;
};

type PaymentRow = {
  id: string;
  chargeId: string;
  kind: EntranceFeeKind;
  status: ApplicantPaymentStatus;
  method: string;
  amount: unknown;
  reference: string | null;
  receiptNumber: string | null;
  paidAt: Date;
};

type PaymentPageProps = {
  searchParams: Promise<{ submitted?: string; error?: string }>;
};

export default async function ApplicantPaymentPage({ searchParams }: PaymentPageProps) {
  const viewer = await requireApplicant();
  const query = await searchParams;
  const [[application], charges, payments] = await Promise.all([
    db.$queryRaw<ApplicationRow[]>`
      SELECT a."status"::text AS "status", c."name" AS "campusName",
        l."name" AS "className", a."examMode"::text AS "examMode"
      FROM "admission_applications" a
      LEFT JOIN "campuses" c ON c."id"=a."campusId"
      LEFT JOIN "class_levels" l ON l."id"=a."classLevelId"
      WHERE a."id"=${viewer.applicationId} AND a."accountId"=${viewer.id}
      LIMIT 1
    `,
    db.$queryRaw<ChargeRow[]>`
      SELECT c."id", c."kind"::text AS "kind", c."description", c."amount",
        COALESCE(SUM(CASE WHEN p."status"='VERIFIED' THEN p."amount" ELSE 0 END),0) AS "verified",
        COALESCE(SUM(CASE WHEN p."status"='PENDING_VERIFICATION' THEN p."amount" ELSE 0 END),0) AS "pending"
      FROM "applicant_charges" c
      LEFT JOIN "applicant_payments" p ON p."chargeId"=c."id"
      WHERE c."applicationId"=${viewer.applicationId}
      GROUP BY c."id"
      ORDER BY CASE c."kind" WHEN 'FORM' THEN 1 ELSE 2 END
    `,
    db.$queryRaw<PaymentRow[]>`
      SELECT p."id", p."chargeId", c."kind"::text AS "kind", p."status"::text AS "status",
        p."method"::text AS "method", p."amount", p."reference", p."receiptNumber", p."paidAt"
      FROM "applicant_payments" p
      JOIN "applicant_charges" c ON c."id"=p."chargeId"
      WHERE p."applicationId"=${viewer.applicationId}
      ORDER BY p."createdAt" DESC
    `,
  ]);
  if (!application) throw new Error("NOT_FOUND:APPLICATION");

  const formCharge = charges.find((charge) => charge.kind === "FORM");
  const formSettled = Boolean(
    formCharge && chargeBalance(Number(formCharge.amount), Number(formCharge.verified)) === 0,
  );
  const visibleCharges = charges.filter((charge) =>
    canApplicantSeeCharge(charge.kind, formSettled),
  );
  const visiblePaymentIds = new Set(visibleCharges.map((charge) => charge.id));

  return (
    <section className="marketing-section applicant-workspace-section">
      <div className="marketing-shell applicant-status-shell">
        <div className="applicant-toolbar">
          <div>
            <span className="section-kicker">Applicant portal</span>
            <h1>Entrance fees and payments</h1>
            <p><strong>{viewer.applicationNumber}</strong> · {application.campusName ?? "Campus pending"} · {application.className ?? "Class pending"}</p>
          </div>
          <Link className="button button-secondary" href="/apply/status">Application status</Link>
        </div>

        {query.submitted && (
          <div className="success-banner">
            <CheckCircle2 size={20} /> Payment submitted. The admissions office will verify it before a receipt is issued.
          </div>
        )}

        {!formCharge && ["SUBMITTED", "AWAITING_PAYMENT"].includes(application.status) && (
          <article className="marketing-card status-main-card">
            <span className="section-kicker">Payment setup</span>
            <h2>View your entrance form fee</h2>
            <p>The amount is based on the selected campus and class. The examination fee remains hidden until the form fee is fully verified.</p>
            <form action={startEntrancePayment}>
              <button className="button" type="submit">Generate entrance fee details</button>
            </form>
          </article>
        )}

        {query.error === "fee-not-configured" && (
          <div className="marketing-card status-guidance">
            <Clock3 size={22} />
            <div><strong>Fee setup is pending</strong><p>The school has not yet configured the entrance fee for this campus and class. Please contact admissions.</p></div>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          {visibleCharges.map((charge) => {
            const amount = Number(charge.amount);
            const verified = Number(charge.verified);
            const pending = Number(charge.pending);
            const balance = chargeBalance(amount, verified);
            const available = Math.max(0, balance - pending);
            return (
              <article className="marketing-card status-main-card" key={charge.id}>
                <div className="flex items-start justify-between gap-4">
                  <div><span className="section-kicker">{charge.kind === "FORM" ? "Step 1" : "Step 2"}</span><h2>{entranceFeeLabel(charge.kind)}</h2></div>
                  <span className="application-status-badge" data-status={balance === 0 ? "ACCEPTED" : "AWAITING_PAYMENT"}>{balance === 0 ? "Paid" : "Payment due"}</span>
                </div>
                <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div><dt>Total fee</dt><dd>{formatNaira(amount)}</dd></div>
                  <div><dt>Verified</dt><dd>{formatNaira(verified)}</dd></div>
                  <div><dt>Balance</dt><dd>{formatNaira(balance)}</dd></div>
                </dl>
                {pending > 0 && <p className="mt-4 rounded-xl bg-[#fff8e7] p-3 text-sm font-bold text-[#875b00]">{formatNaira(pending)} is awaiting verification.</p>}

                {available > 0 && (
                  <form action={submitApplicantPayment.bind(null, charge.id)} className="mt-6 grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label><span>Payment method</span><select name="method" required defaultValue="TRANSFER"><option value="TRANSFER">Bank transfer</option><option value="ONLINE">Online payment reference</option></select></label>
                      <label><span>Amount</span><input name="amount" type="number" min="1" max={available} step="0.01" defaultValue={available} required /></label>
                      <label><span>Payment date</span><input name="paidAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label>
                      <label><span>Transaction reference</span><input name="reference" minLength={3} maxLength={120} required placeholder="Bank or payment reference" /></label>
                    </div>
                    <label><span>Optional note</span><textarea name="note" rows={2} placeholder="Name on transfer or useful payment details" /></label>
                    <button className="button" type="submit"><CreditCard size={18} /> Submit payment for verification</button>
                  </form>
                )}
              </article>
            );
          })}
        </div>

        {formSettled && !visibleCharges.some((charge) => charge.kind === "EXAM") && (
          <article className="marketing-card status-guidance">
            <Clock3 size={22} />
            <div><strong>Entrance examination fee is being prepared</strong><p>The form fee is verified. The examination charge will appear when the school has configured it for your class.</p></div>
          </article>
        )}

        <article className="marketing-card status-main-card">
          <h2>Other ways to pay</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="portal-option"><Landmark size={22} /><strong>Bank transfer</strong><p>Submit the transfer reference above for verification.</p></div>
            <div className="portal-option"><Banknote size={22} /><strong>Cash</strong><p>Pay at the school office. Staff will issue the receipt here.</p></div>
            <div className="portal-option"><CreditCard size={22} /><strong>POS</strong><p>Pay at the school office and retain the terminal reference.</p></div>
          </div>
        </article>

        <article className="marketing-card status-main-card">
          <h2>Payment history</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Fee</th><th>Date</th><th>Method</th><th>Amount</th><th>Status</th><th>Receipt</th></tr></thead>
              <tbody>
                {payments.filter((payment) => visiblePaymentIds.has(payment.chargeId)).map((payment) => (
                  <tr key={payment.id}>
                    <td>{entranceFeeLabel(payment.kind)}</td>
                    <td>{payment.paidAt.toLocaleDateString("en-NG")}</td>
                    <td>{payment.method}</td>
                    <td>{formatNaira(Number(payment.amount))}</td>
                    <td><span className="pill" data-tone={payment.status === "VERIFIED" ? "success" : "brand"}>{applicantPaymentStatusLabel(payment.status)}</span></td>
                    <td>{payment.receiptNumber ? <Link className="text-link" href={`/apply/payment/receipts/${payment.id}`}><FileText size={16} /> {payment.receiptNumber}</Link> : "Pending"}</td>
                  </tr>
                ))}
                {!payments.length && <tr><td colSpan={6}><div className="empty-state">No payment has been submitted.</div></td></tr>}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}
