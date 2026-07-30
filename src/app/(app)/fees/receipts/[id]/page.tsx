import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Brand } from "@/components/brand";
import { ReceiptActions } from "@/components/receipt-actions";
import { requireCampusAccess, requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/finance";

export const metadata: Metadata = { title: "Payment receipt" };

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requirePermission("finance.read");
  const { id } = await params;
  const payment = await db.payment.findFirst({
    where: { id, schoolId: viewer.membership.schoolId },
    include: {
      school: { select: { name: true } },
      campus: { select: { name: true, city: true, state: true } },
      term: {
        select: {
          name: true,
          academicSession: { select: { name: true } },
        },
      },
      account: {
        select: {
          displayName: true,
          admissionNumber: true,
          classArm: {
            select: {
              name: true,
              classLevel: { select: { name: true } },
            },
          },
        },
      },
      recordedBy: { select: { name: true } },
      reversal: {
        select: {
          reason: true,
          createdAt: true,
          recordedBy: { select: { name: true } },
        },
      },
      allocations: {
        select: {
          amount: true,
          charge: { select: { description: true } },
        },
      },
    },
  });
  if (!payment) notFound();
  await requireCampusAccess(payment.campusId);
  const balance = await db.feeLedgerEntry.aggregate({
    where: { accountId: payment.accountId, termId: payment.termId },
    _sum: { amount: true },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Official payment record</p>
          <h1 className="page-title">Receipt</h1>
        </div>
        <ReceiptActions paymentId={payment.id} />
      </div>

      <article className="receipt-sheet overflow-hidden rounded-2xl border border-[#dfe2e6] bg-white shadow-sm">
        <div className="flex flex-col gap-5 border-b-4 border-[#d71920] p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8">
          <div>
            <Brand />
            <p className="mt-3 text-sm font-bold text-[#626b77]">
              {payment.campus.name} · {payment.campus.city},{" "}
              {payment.campus.state}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#8a929c]">
              Receipt number
            </p>
            <p className="mt-1 text-lg font-black text-[#b91118]">
              {payment.receiptNumber}
            </p>
            <span
              className="pill mt-2"
              data-tone={payment.reversal ? "brand" : "success"}
            >
              {payment.reversal ? "REVERSED" : "POSTED"}
            </span>
          </div>
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#8a929c]">
              Received from
            </p>
            <p className="mt-2 text-xl font-black">
              {payment.account.displayName}
            </p>
            <p className="mt-1 text-sm text-[#626b77]">
              Admission no. {payment.account.admissionNumber}
            </p>
            <p className="mt-1 text-sm text-[#626b77]">
              {payment.account.classArm
                ? `${payment.account.classArm.classLevel.name} ${payment.account.classArm.name}`
                : "Class unassigned"}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#8a929c]">
              Amount received
            </p>
            <p className="mt-2 text-3xl font-black text-[#14804a]">
              {formatNaira(payment.amount)}
            </p>
            <p className="mt-1 text-sm font-bold text-[#626b77]">
              {payment.method}
              {payment.reference ? ` · ${payment.reference}` : ""}
            </p>
          </div>
        </div>

        <div className="grid gap-px bg-[#e4e7ea] sm:grid-cols-3">
          {[
            ["Payment date", payment.paidAt.toLocaleString("en-NG")],
            [
              "Academic period",
              `${payment.term.academicSession.name} · ${payment.term.name}`,
            ],
            ["Balance after receipt", formatNaira(balance._sum.amount ?? 0)],
          ].map(([label, value]) => (
            <div className="bg-[#f8f9fa] p-5" key={label}>
              <p className="text-xs font-extrabold uppercase text-[#858d97]">
                {label}
              </p>
              <p className="mt-1 text-sm font-black">{value}</p>
            </div>
          ))}
        </div>

        {payment.allocations.length > 0 && (
          <div className="p-6 sm:p-8">
            <h2 className="text-lg font-black">Payment allocation</h2>
            <div className="mt-3 divide-y divide-[#e7e9ec] rounded-xl border border-[#e2e5e9]">
              {payment.allocations.map((item, index) => (
                <div
                  className="flex items-center justify-between gap-4 p-3.5 text-sm"
                  key={`${item.charge.description}-${index}`}
                >
                  <span>{item.charge.description}</span>
                  <strong>{formatNaira(item.amount)}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {payment.reversal && (
          <div className="mx-6 mb-6 rounded-xl border border-[#f0b7bb] bg-[#fff1f2] p-4 text-sm sm:mx-8 sm:mb-8">
            <p className="font-black text-[#a80f15]">Receipt reversed</p>
            <p className="mt-1 text-[#7a2930]">{payment.reversal.reason}</p>
            <p className="mt-2 text-xs text-[#9b5a60]">
              {payment.reversal.createdAt.toLocaleString("en-NG")} by{" "}
              {payment.reversal.recordedBy.name}
            </p>
          </div>
        )}

        <div className="border-t border-[#e4e7ea] p-6 text-xs text-[#737c87] sm:p-8">
          Recorded by {payment.recordedBy.name} · Generated from the immutable
          Petra LMS fee ledger. Verify using receipt number{" "}
          {payment.receiptNumber}.
        </div>
      </article>
    </div>
  );
}
