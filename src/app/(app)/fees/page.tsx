import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  CircleAlert,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import { FinanceNav } from "@/components/finance-nav";
import { PageHeading } from "@/components/page-heading";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/finance";

export const metadata: Metadata = { title: "Fees & payments" };

export default async function FeesDashboardPage() {
  const viewer = await requirePermission("finance.read");
  const schoolId = viewer.membership.schoolId;
  const campusId =
    viewer.membership.role === "OWNER" ? undefined : viewer.membership.campusId!;
  const campusFilter = campusId ? { campusId } : {};
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  const [balances, monthCollections, recentPayments, reminders] =
    await Promise.all([
      db.feeLedgerEntry.groupBy({
        by: ["accountId"],
        where: { schoolId, ...campusFilter },
        _sum: { amount: true },
      }),
      db.payment.aggregate({
        where: {
          schoolId,
          ...campusFilter,
          paidAt: { gte: monthStart },
          reversal: null,
        },
        _sum: { amount: true },
      }),
      db.payment.findMany({
        where: { schoolId, ...campusFilter },
        select: {
          id: true,
          receiptNumber: true,
          amount: true,
          method: true,
          paidAt: true,
          reversal: { select: { id: true } },
          account: {
            select: { displayName: true, admissionNumber: true },
          },
          campus: { select: { name: true } },
        },
        orderBy: { paidAt: "desc" },
        take: 8,
      }),
      db.feeReminder.count({
        where: { schoolId, ...campusFilter },
      }),
    ]);

  const owing = balances.filter(
    (item) => Number(item._sum.amount ?? 0) > 0,
  );
  const outstanding = owing.reduce(
    (total, item) => total + Number(item._sum.amount ?? 0),
    0,
  );
  const fullyPaid = balances.filter(
    (item) => Number(item._sum.amount ?? 0) <= 0,
  ).length;
  const metrics = [
    {
      label: "Outstanding",
      value: formatNaira(outstanding),
      note: `${owing.length} student account${owing.length === 1 ? "" : "s"} owing`,
      icon: CircleAlert,
      tone: "bg-[#fff1f2] text-[#b91118]",
    },
    {
      label: "Collected this month",
      value: formatNaira(monthCollections._sum.amount ?? 0),
      note: "Posted payments, excluding reversals",
      icon: TrendingUp,
      tone: "bg-[#eaf8f0] text-[#14804a]",
    },
    {
      label: "Cleared accounts",
      value: fullyPaid.toLocaleString("en-NG"),
      note: "No current ledger balance",
      icon: Banknote,
      tone: "bg-[#eef4ff] text-[#2f65b0]",
    },
    {
      label: "Reminder drafts",
      value: reminders.toLocaleString("en-NG"),
      note: "Generated, not automatically sent",
      icon: ReceiptText,
      tone: "bg-[#fff5e6] text-[#9b5a08]",
    },
  ];

  return (
    <div>
      <PageHeading
        action={
          <Link className="button" href="/fees/record">
            Record transaction <ArrowRight size={17} />
          </Link>
        }
        description="Monitor balances, collections, receipts and corrections across the school."
        eyebrow="Commercial overview"
        title="Fees & payments"
      />
      <FinanceNav />

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article className="card p-5" key={metric.label}>
              <span
                className={`grid size-10 place-items-center rounded-xl ${metric.tone}`}
              >
                <Icon size={20} />
              </span>
              <p className="mt-5 text-2xl font-black tracking-[-0.04em]">
                {metric.value}
              </p>
              <p className="mt-1 text-sm font-extrabold">{metric.label}</p>
              <p className="mt-1 text-xs text-[#7a828e]">{metric.note}</p>
            </article>
          );
        })}
      </section>

      <section className="card mt-5 overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-[#e7e9ec] p-5">
          <div>
            <p className="eyebrow">Transaction history</p>
            <h2 className="mt-1 text-xl font-black">Recent payments</h2>
          </div>
          <Link
            className="text-sm font-extrabold text-[#b91118]"
            href="/fees/reports"
          >
            Open reports
          </Link>
        </div>
        {recentPayments.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Student</th>
                  <th>Campus</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <Link
                        className="font-extrabold text-[#b91118]"
                        href={`/fees/receipts/${payment.id}`}
                      >
                        {payment.receiptNumber}
                      </Link>
                    </td>
                    <td>
                      <strong>{payment.account.displayName}</strong>
                      <small className="block text-[#7a828e]">
                        {payment.account.admissionNumber}
                      </small>
                    </td>
                    <td>{payment.campus.name}</td>
                    <td>{payment.method}</td>
                    <td>{payment.paidAt.toLocaleString("en-NG")}</td>
                    <td className="font-extrabold">
                      {formatNaira(payment.amount)}
                    </td>
                    <td>
                      <span
                        className="pill"
                        data-tone={payment.reversal ? "brand" : "success"}
                      >
                        {payment.reversal ? "Reversed" : "Posted"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            No payments recorded yet. Post charges first, then record a manual
            payment.
          </div>
        )}
      </section>
    </div>
  );
}
