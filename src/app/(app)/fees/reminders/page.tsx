import type { Metadata } from "next";
import { ReminderForm } from "@/components/finance-forms";
import { FinanceNav } from "@/components/finance-nav";
import { PageHeading } from "@/components/page-heading";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/finance";

export const metadata: Metadata = { title: "Fee reminders" };

export default async function FeeRemindersPage() {
  const viewer = await requirePermission("finance.manage");
  const schoolId = viewer.membership.schoolId;
  const campusId =
    viewer.membership.role === "OWNER" ? undefined : viewer.membership.campusId!;
  const [campuses, terms, reminders] = await Promise.all([
    db.campus.findMany({
      where: {
        schoolId,
        isActive: true,
        ...(campusId ? { id: campusId } : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.term.findMany({
      where: {
        campus: {
          schoolId,
          ...(campusId ? { id: campusId } : {}),
        },
      },
      select: {
        id: true,
        name: true,
        campus: { select: { name: true } },
        academicSession: { select: { name: true } },
      },
      orderBy: { startsOn: "desc" },
    }),
    db.feeReminder.findMany({
      where: { schoolId, ...(campusId ? { campusId } : {}) },
      include: {
        account: {
          select: { displayName: true, admissionNumber: true },
        },
        campus: { select: { name: true } },
        term: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div>
      <PageHeading
        description="Generate reviewed drafts for students with a positive balance. Nothing is sent automatically."
        eyebrow="Parent follow-up"
        title="Fee reminders"
      />
      <FinanceNav />
      <section className="card mt-5 p-5">
        <h2 className="text-xl font-black">Generate draft reminders</h2>
        <p className="mb-5 mt-1 text-sm text-[#717985]">
          The current balance and message are snapshotted for accountability.
        </p>
        <ReminderForm
          campuses={campuses.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
          terms={terms.map((item) => ({
            value: item.id,
            label: `${item.campus.name} · ${item.academicSession.name} · ${item.name}`,
          }))}
        />
      </section>

      <section className="mt-5 grid gap-4">
        {reminders.map((item) => (
          <article className="card p-5" key={item.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-black">{item.account.displayName}</p>
                <p className="mt-1 text-xs text-[#747d88]">
                  {item.account.admissionNumber} · {item.campus.name} ·{" "}
                  {item.term.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="pill">{item.channel} draft</span>
                <strong className="text-[#b91118]">
                  {formatNaira(item.balance)}
                </strong>
              </div>
            </div>
            <p className="mt-4 rounded-xl bg-[#f6f7f8] p-4 text-sm leading-6 text-[#565f6b]">
              {item.message}
            </p>
            <p className="mt-3 text-xs text-[#858c96]">
              Generated {item.createdAt.toLocaleString("en-NG")}
            </p>
          </article>
        ))}
        {!reminders.length && (
          <div className="card empty-state">
            No reminders generated yet.
          </div>
        )}
      </section>
    </div>
  );
}
