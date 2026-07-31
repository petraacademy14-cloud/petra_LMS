import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { FinanceNav } from "@/components/finance-nav";
import { PageHeading } from "@/components/page-heading";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/finance";

export const metadata: Metadata = { title: "Fee reports" };

type Search = Promise<Record<string, string | string[] | undefined>>;

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}

export default async function FeeReportsPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const viewer = await requirePermission("finance.read");
  const params = await searchParams;
  const schoolId = viewer.membership.schoolId;
  const requestedCampus = value(params.campusId);
  const campusId =
    viewer.membership.role === "OWNER"
      ? requestedCampus || undefined
      : viewer.membership.campusId!;
  const classLevelId = value(params.classLevelId) || undefined;
  const method = value(params.method) as PaymentMethod | undefined;
  const from = value(params.from);
  const to = value(params.to);
  const toExclusive = to
    ? new Date(
        new Date(`${to}T00:00:00+01:00`).getTime() + 86_400_000,
      )
    : undefined;
  const paidAt =
    from || to
      ? {
          ...(from
            ? { gte: new Date(`${from}T00:00:00+01:00`) }
            : {}),
          ...(toExclusive ? { lt: toExclusive } : {}),
        }
      : undefined;
  const paymentWhere: Prisma.PaymentWhereInput = {
    schoolId,
    ...(campusId ? { campusId } : {}),
    ...(method ? { method } : {}),
    ...(paidAt ? { paidAt } : {}),
  };

  const [campuses, classLevels, payments, balances] = await Promise.all([
    db.campus.findMany({
      where: {
        schoolId,
        isActive: true,
        ...(viewer.membership.role === "OWNER"
          ? {}
          : { id: viewer.membership.campusId! }),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.classLevel.findMany({
      where: { schoolId, isActive: true },
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.payment.findMany({
      where: paymentWhere,
      select: {
        id: true,
        receiptNumber: true,
        method: true,
        amount: true,
        paidAt: true,
        reference: true,
        reversal: { select: { id: true } },
        campus: { select: { name: true } },
        account: {
          select: {
            displayName: true,
            admissionNumber: true,
            classArm: {
              select: { classLevel: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { paidAt: "desc" },
      take: 500,
    }),
    db.feeLedgerEntry.groupBy({
      by: ["accountId"],
      where: { schoolId, ...(campusId ? { campusId } : {}) },
      _sum: { amount: true },
    }),
  ]);

  const filteredPayments = classLevelId
    ? payments.filter(
        (item) => item.account.classArm?.classLevel.id === classLevelId,
      )
    : payments;
  const collection = filteredPayments
    .filter((item) => !item.reversal)
    .reduce((total, item) => total + Number(item.amount), 0);
  const owingBalances = balances.filter(
    (item) => Number(item._sum.amount ?? 0) > 0,
  );
  const owingAccounts = await db.studentFeeAccount.findMany({
    where: {
      id: { in: owingBalances.map((item) => item.accountId) },
      ...(classLevelId
        ? { classArm: { classLevelId } }
        : {}),
    },
    select: {
      id: true,
      displayName: true,
      admissionNumber: true,
      campus: { select: { name: true } },
      classArm: {
        select: {
          name: true,
          classLevel: { select: { name: true } },
        },
      },
    },
    orderBy: { displayName: "asc" },
  });
  const balanceMap = new Map(
    owingBalances.map((item) => [
      item.accountId,
      Number(item._sum.amount ?? 0),
    ]),
  );

  return (
    <div>
      <PageHeading
        description="Filter collections and debtors by date, class, campus and payment method."
        eyebrow="Finance intelligence"
        title="Collections & owing"
      />
      <FinanceNav />

      <form className="card mt-5 grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-6">
        <label className="block">
          <span className="mb-1.5 block text-xs font-extrabold">Campus</span>
          <select
            className="h-11 w-full rounded-xl border border-[#dfe2e6] bg-white px-3"
            defaultValue={campusId ?? ""}
            name="campusId"
          >
            {viewer.membership.role === "OWNER" && (
              <option value="">All campuses</option>
            )}
            {campuses.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-extrabold">Class</span>
          <select
            className="h-11 w-full rounded-xl border border-[#dfe2e6] bg-white px-3"
            defaultValue={classLevelId ?? ""}
            name="classLevelId"
          >
            <option value="">All classes</option>
            {classLevels.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-extrabold">Method</span>
          <select
            className="h-11 w-full rounded-xl border border-[#dfe2e6] bg-white px-3"
            defaultValue={method ?? ""}
            name="method"
          >
            <option value="">All methods</option>
            {["CASH", "TRANSFER", "POS", "ONLINE"].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-extrabold">From</span>
          <input
            className="h-11 w-full rounded-xl border border-[#dfe2e6] bg-white px-3"
            defaultValue={from}
            name="from"
            type="date"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-extrabold">To</span>
          <input
            className="h-11 w-full rounded-xl border border-[#dfe2e6] bg-white px-3"
            defaultValue={to}
            name="to"
            type="date"
          />
        </label>
        <button className="button self-end" type="submit">
          Apply filters
        </button>
      </form>

      <section className="mt-5 grid gap-4 sm:grid-cols-2">
        <article className="card p-5">
          <p className="eyebrow">Collection report</p>
          <p className="mt-2 text-3xl font-black">{formatNaira(collection)}</p>
          <p className="mt-1 text-sm text-[#717985]">
            {filteredPayments.filter((item) => !item.reversal).length} posted
            payment(s), excluding reversals
          </p>
        </article>
        <article className="card p-5">
          <p className="eyebrow">Students owing</p>
          <p className="mt-2 text-3xl font-black">{owingAccounts.length}</p>
          <p className="mt-1 text-sm text-[#717985]">
            Total {formatNaira(
              owingAccounts.reduce(
                (total, item) => total + (balanceMap.get(item.id) ?? 0),
                0,
              ),
            )}
          </p>
        </article>
      </section>

      <section className="card mt-5 overflow-hidden">
        <div className="border-b border-[#e7e9ec] p-5">
          <h2 className="text-xl font-black">Collection transactions</h2>
        </div>
        {filteredPayments.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Campus</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link
                        className="font-extrabold text-[#b91118]"
                        href={`/fees/receipts/${item.id}`}
                      >
                        {item.receiptNumber}
                      </Link>
                    </td>
                    <td>{item.account.displayName}</td>
                    <td>
                      {item.account.classArm?.classLevel.name ?? "Unassigned"}
                    </td>
                    <td>{item.campus.name}</td>
                    <td>{item.method}</td>
                    <td>{item.paidAt.toLocaleString("en-NG")}</td>
                    <td className="font-extrabold">
                      {formatNaira(item.amount)}
                    </td>
                    <td>{item.reversal ? "Reversed" : "Posted"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">No collection matches these filters.</div>
        )}
      </section>

      <section className="card mt-5 overflow-hidden">
        <div className="border-b border-[#e7e9ec] p-5">
          <h2 className="text-xl font-black">Students owing</h2>
        </div>
        {owingAccounts.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Admission no.</th>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Campus</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {owingAccounts.map((item) => (
                  <tr key={item.id}>
                    <td>{item.admissionNumber}</td>
                    <td className="font-extrabold">{item.displayName}</td>
                    <td>
                      {item.classArm
                        ? `${item.classArm.classLevel.name} ${item.classArm.name}`
                        : "Unassigned"}
                    </td>
                    <td>{item.campus.name}</td>
                    <td className="font-extrabold text-[#b91118]">
                      {formatNaira(balanceMap.get(item.id) ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">No students are owing in this scope.</div>
        )}
      </section>
    </div>
  );
}
