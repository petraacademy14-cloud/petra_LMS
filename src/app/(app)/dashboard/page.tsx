import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpenCheck,
  Building2,
  CalendarRange,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { getViewer } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/finance";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Overview",
};

export default async function DashboardPage() {
  const viewer = await getViewer();
  const schoolId = viewer.membership.schoolId;
  const campusScope =
    viewer.membership.role === "OWNER"
      ? {}
      : { id: viewer.membership.campusId ?? "__none__" };
  const canViewFinance = hasPermission(
    viewer.membership.role,
    "finance.read",
  );

  const [campusCount, staffCount, classArmCount, subjectCount, currentSession] =
    await Promise.all([
      db.campus.count({
        where: { schoolId, isActive: true, ...campusScope },
      }),
      db.schoolMembership.count({
        where: {
          schoolId,
          status: "ACTIVE",
          ...(viewer.membership.role === "OWNER"
            ? {}
            : { campusId: viewer.membership.campusId }),
        },
      }),
      db.classArm.count({
        where: {
          isActive: true,
          campus: { schoolId, ...campusScope },
        },
      }),
      db.campusSubject.count({
        where: {
          isActive: true,
          campus: { schoolId, ...campusScope },
        },
      }),
      db.academicSession.findFirst({
        where: { schoolId, isCurrent: true },
        select: {
          name: true,
          terms: {
            where:
              viewer.membership.role === "OWNER"
                ? { isCurrent: true }
                : {
                    isCurrent: true,
                    campusId: viewer.membership.campusId ?? "__none__",
                  },
            select: {
              name: true,
              startsOn: true,
              endsOn: true,
              campus: { select: { name: true } },
            },
          },
        },
      }),
    ]);
  const financeCampus =
    viewer.membership.role === "OWNER"
      ? {}
      : { campusId: viewer.membership.campusId ?? "__none__" };
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [feeBalances, monthCollections] = canViewFinance
    ? await Promise.all([
        db.feeLedgerEntry.groupBy({
          by: ["accountId"],
          where: { schoolId, ...financeCampus },
          _sum: { amount: true },
        }),
        db.payment.aggregate({
          where: {
            schoolId,
            ...financeCampus,
            paidAt: { gte: monthStart },
            reversal: null,
          },
          _sum: { amount: true },
        }),
      ])
    : [[], null];
  const outstanding = feeBalances.reduce(
    (total, item) =>
      total + Math.max(0, Number(item._sum.amount ?? 0)),
    0,
  );

  const metrics = [
    {
      label: "Active campuses",
      value: campusCount,
      note: viewer.membership.role === "OWNER" ? "School-wide" : "Your scope",
      icon: Building2,
      tone: "bg-[#fff0f1] text-[#bd1218]",
    },
    {
      label: "Active staff",
      value: staffCount,
      note: "Owner, admins & teachers",
      icon: Users,
      tone: "bg-[#eef4ff] text-[#2f65b0]",
    },
    {
      label: "Class arms",
      value: classArmCount,
      note: "Across active campuses",
      icon: BookOpenCheck,
      tone: "bg-[#eaf8f0] text-[#14804a]",
    },
    {
      label: "Subject offerings",
      value: subjectCount,
      note: "Campus-enabled subjects",
      icon: CalendarRange,
      tone: "bg-[#fff5e6] text-[#9b5a08]",
    },
  ];

  return (
    <div>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Foundation overview</p>
          <h1 className="page-title">
            Good day, {viewer.user.name.split(" ")[0]}
          </h1>
          <p className="page-subtitle">
            Your operational structure and current financial position are
            visible here. Attendance and result metrics will join in later
            phases.
          </p>
        </div>
        <span className="pill self-start sm:self-auto" data-tone="success">
          <ShieldCheck size={14} />
          Access protected
        </span>
      </div>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article className="card p-5" key={metric.label}>
              <div className="flex items-start justify-between">
                <span
                  className={`grid size-10 place-items-center rounded-xl ${metric.tone}`}
                >
                  <Icon size={20} />
                </span>
                <ArrowUpRight size={17} className="text-[#a0a6ae]" />
              </div>
              <p className="mt-5 text-3xl font-black tracking-[-0.04em]">
                {metric.value}
              </p>
              <p className="mt-1 text-sm font-extrabold">{metric.label}</p>
              <p className="mt-1 text-xs text-[#7a828e]">{metric.note}</p>
            </article>
          );
        })}
      </section>

      {canViewFinance && (
        <section className="mt-5 grid gap-4 sm:grid-cols-2">
          <Link
            className="card group p-5 transition hover:border-[#d71920]"
            href="/fees/reports"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-10 place-items-center rounded-xl bg-[#fff0f1] text-[#bd1218]">
                <WalletCards size={20} />
              </span>
              <ArrowUpRight
                className="text-[#a0a6ae] group-hover:text-[#d71920]"
                size={17}
              />
            </div>
            <p className="mt-5 text-3xl font-black tracking-[-0.04em]">
              {formatNaira(outstanding)}
            </p>
            <p className="mt-1 text-sm font-extrabold">
              Outstanding fee balance
            </p>
            <p className="mt-1 text-xs text-[#7a828e]">
              {feeBalances.filter((item) => Number(item._sum.amount ?? 0) > 0)
                .length}{" "}
              student account(s) owing
            </p>
          </Link>
          <Link
            className="card group p-5 transition hover:border-[#14804a]"
            href="/fees"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-10 place-items-center rounded-xl bg-[#eaf8f0] text-[#14804a]">
                <CalendarRange size={20} />
              </span>
              <ArrowUpRight
                className="text-[#a0a6ae] group-hover:text-[#14804a]"
                size={17}
              />
            </div>
            <p className="mt-5 text-3xl font-black tracking-[-0.04em]">
              {formatNaira(monthCollections?._sum.amount ?? 0)}
            </p>
            <p className="mt-1 text-sm font-extrabold">
              Collected this month
            </p>
            <p className="mt-1 text-xs text-[#7a828e]">
              Posted payments excluding reversals
            </p>
          </Link>
        </section>
      )}

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <article className="card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Academic calendar</p>
              <h2 className="mt-1 text-xl font-black">
                {currentSession?.name ?? "No current session"}
              </h2>
            </div>
            <CalendarRange className="text-[#d71920]" size={24} />
          </div>

          {currentSession?.terms.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {currentSession.terms.map((term) => (
                <div
                  className="rounded-xl border border-[#e5e7eb] p-4"
                  key={`${term.campus.name}-${term.name}`}
                >
                  <span className="pill" data-tone="brand">
                    {term.campus.name}
                  </span>
                  <p className="mt-3 font-extrabold">{term.name}</p>
                  <p className="mt-1 text-xs text-[#757d88]">
                    {term.startsOn.toLocaleDateString("en-NG")} —{" "}
                    {term.endsOn.toLocaleDateString("en-NG")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              Set the current academic session and campus terms to activate the
              calendar.
            </div>
          )}
        </article>

        <article className="card overflow-hidden">
          <div className="bg-[#292d34] p-6 text-white">
            <p className="text-xs font-extrabold uppercase tracking-[0.13em] text-[#ff7e83]">
              Multi-campus ready
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">
              Awka and Nnewi are separate operating scopes.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#c7cbd1]">
              Staff, terms, class arms, subject offerings, logs and future
              student records stay attached to a campus from day one.
            </p>
          </div>
          <div className="grid gap-3 p-5 text-sm">
            {[
              "Owners can view the entire school",
              "Admins are restricted to their campus",
              "Teachers receive only teaching-level access",
            ].map((item) => (
              <div className="flex gap-3" key={item}>
                <ShieldCheck
                  className="mt-0.5 shrink-0 text-[#d71920]"
                  size={17}
                />
                <span className="font-bold text-[#59616d]">{item}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
