import type { Metadata } from "next";
import {
  ChargeForm,
  ChargeReversalForm,
  PaymentForm,
  PaymentReversalForm,
} from "@/components/finance-forms";
import { FinanceNav } from "@/components/finance-nav";
import { PageHeading } from "@/components/page-heading";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/finance";

export const metadata: Metadata = { title: "Record fee transaction" };

export default async function RecordFeesPage() {
  const viewer = await requirePermission("finance.manage");
  const schoolId = viewer.membership.schoolId;
  const campusId =
    viewer.membership.role === "OWNER" ? undefined : viewer.membership.campusId!;
  const campusWhere = campusId ? { id: campusId } : {};
  const [accounts, terms, categories, payments, charges] = await Promise.all([
    db.studentFeeAccount.findMany({
      where: { schoolId, isActive: true, ...(campusId ? { campusId } : {}) },
      select: {
        id: true,
        displayName: true,
        admissionNumber: true,
        campus: { select: { name: true } },
      },
      orderBy: { displayName: "asc" },
    }),
    db.term.findMany({
      where: { campus: { schoolId, ...campusWhere } },
      select: {
        id: true,
        name: true,
        campus: { select: { name: true } },
        academicSession: { select: { name: true } },
      },
      orderBy: { startsOn: "desc" },
    }),
    db.feeCategory.findMany({
      where: { schoolId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.payment.findMany({
      where: {
        schoolId,
        ...(campusId ? { campusId } : {}),
        reversal: null,
      },
      select: {
        id: true,
        receiptNumber: true,
        amount: true,
        account: { select: { displayName: true } },
      },
      orderBy: { paidAt: "desc" },
      take: 30,
    }),
    db.studentCharge.findMany({
      where: {
        schoolId,
        ...(campusId ? { campusId } : {}),
        reversal: null,
      },
      select: {
        id: true,
        type: true,
        description: true,
        amount: true,
        account: { select: { displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);
  const accountOptions = accounts.map((item) => ({
    value: item.id,
    label: `${item.displayName} · ${item.admissionNumber} · ${item.campus.name}`,
  }));
  const termOptions = terms.map((item) => ({
    value: item.id,
    label: `${item.campus.name} · ${item.academicSession.name} · ${item.name}`,
  }));

  return (
    <div>
      <PageHeading
        description="Post charges, discounts and manual payments. Corrections are always recorded as reversals."
        eyebrow="Cashier workspace"
        title="Record a transaction"
      />
      <FinanceNav />

      {!accounts.length && (
        <div className="mt-5 rounded-xl border border-[#efc36a] bg-[#fff8e8] p-4 text-sm font-bold text-[#80500a]">
          No student fee accounts are available yet. Phase 2 must sync active
          students into the finance account projection before transactions can
          be posted.
        </div>
      )}

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <article className="card p-5">
          <h2 className="text-xl font-black">Charge or discount</h2>
          <p className="mb-5 mt-1 text-sm text-[#707985]">
            Student-specific entries appear immediately in the balance.
          </p>
          <ChargeForm
            accounts={accountOptions}
            categories={categories.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
            terms={termOptions}
          />
        </article>
        <article className="card p-5">
          <h2 className="text-xl font-black">Manual payment</h2>
          <p className="mb-5 mt-1 text-sm text-[#707985]">
            Part payments are allowed; overpayments are blocked.
          </p>
          <PaymentForm accounts={accountOptions} terms={termOptions} />
        </article>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <details className="card p-5">
          <summary className="cursor-pointer font-black">
            Reverse a payment
            <small className="mt-1 block font-medium text-[#747d88]">
              Receipt remains visible and is marked reversed.
            </small>
          </summary>
          <div className="mt-5 border-t border-[#e7e9ec] pt-5">
            <PaymentReversalForm
              payments={payments.map((item) => ({
                value: item.id,
                label: `${item.receiptNumber} · ${item.account.displayName} · ${formatNaira(item.amount)}`,
              }))}
            />
          </div>
        </details>
        <details className="card p-5">
          <summary className="cursor-pointer font-black">
            Reverse a charge or discount
            <small className="mt-1 block font-medium text-[#747d88]">
              Adds an equal-and-opposite ledger entry.
            </small>
          </summary>
          <div className="mt-5 border-t border-[#e7e9ec] pt-5">
            <ChargeReversalForm
              charges={charges.map((item) => ({
                value: item.id,
                label: `${item.type} · ${item.account.displayName} · ${item.description} · ${formatNaira(item.amount)}`,
              }))}
            />
          </div>
        </details>
      </section>
    </div>
  );
}
