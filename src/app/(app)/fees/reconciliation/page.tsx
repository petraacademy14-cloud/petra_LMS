import type { Metadata } from "next";
import { ReconciliationForm } from "@/components/finance-forms";
import { FinanceNav } from "@/components/finance-nav";
import { PageHeading } from "@/components/page-heading";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/finance";

export const metadata: Metadata = { title: "Payment reconciliation" };

export default async function ReconciliationPage() {
  const viewer = await requirePermission("finance.reconcile");
  const schoolId = viewer.membership.schoolId;
  const campusId =
    viewer.membership.role === "OWNER" ? undefined : viewer.membership.campusId!;
  const [campuses, batches] = await Promise.all([
    db.campus.findMany({
      where: {
        schoolId,
        isActive: true,
        ...(campusId ? { id: campusId } : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.reconciliationBatch.findMany({
      where: { schoolId, ...(campusId ? { campusId } : {}) },
      include: {
        campus: { select: { name: true } },
        reconciledBy: { select: { name: true } },
      },
      orderBy: [{ businessDate: "desc" }, { method: "asc" }],
      take: 90,
    }),
  ]);

  return (
    <div>
      <PageHeading
        description="Compare the amount in the system with the cash, transfer or POS total actually declared."
        eyebrow="Daily control"
        title="Payment reconciliation"
      />
      <FinanceNav />
      <section className="card mt-5 p-5">
        <h2 className="text-xl font-black">Reconcile a business day</h2>
        <p className="mb-5 mt-1 text-sm text-[#717985]">
          Zero variance closes the batch. Any difference remains open for
          investigation.
        </p>
        <ReconciliationForm
          campuses={campuses.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
        />
      </section>

      <section className="card mt-5 overflow-hidden">
        <div className="border-b border-[#e7e9ec] p-5">
          <h2 className="text-xl font-black">Reconciliation history</h2>
        </div>
        {batches.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Campus</th>
                  <th>Method</th>
                  <th>Expected</th>
                  <th>Declared</th>
                  <th>Variance</th>
                  <th>Status</th>
                  <th>Checked by</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((item) => (
                  <tr key={item.id}>
                    <td>{item.businessDate.toLocaleDateString("en-NG")}</td>
                    <td>{item.campus.name}</td>
                    <td>{item.method}</td>
                    <td>{formatNaira(item.expectedAmount)}</td>
                    <td>{formatNaira(item.declaredAmount)}</td>
                    <td
                      className={
                        Number(item.variance) === 0
                          ? "font-extrabold text-[#14804a]"
                          : "font-extrabold text-[#b91118]"
                      }
                    >
                      {formatNaira(item.variance)}
                    </td>
                    <td>
                      <span
                        className="pill"
                        data-tone={
                          item.status === "RECONCILED" ? "success" : "brand"
                        }
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>{item.reconciledBy.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            No reconciliation batches have been recorded.
          </div>
        )}
      </section>
    </div>
  );
}
