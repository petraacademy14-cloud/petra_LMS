import type { Metadata } from "next";
import {
  ApplyStructuresForm,
  FeeCategoryForm,
  FeeStructureForm,
} from "@/components/finance-forms";
import { FinanceNav } from "@/components/finance-nav";
import { PageHeading } from "@/components/page-heading";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/finance";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = { title: "Fee structures" };

export default async function FeeStructuresPage() {
  const viewer = await requirePermission("finance.read");
  const schoolId = viewer.membership.schoolId;
  const campusId =
    viewer.membership.role === "OWNER" ? undefined : viewer.membership.campusId!;
  const campusWhere = campusId ? { id: campusId } : {};

  const [categories, campuses, terms, classLevels, structures] =
    await Promise.all([
      db.feeCategory.findMany({
        where: { schoolId, isActive: true },
        orderBy: { name: "asc" },
      }),
      db.campus.findMany({
        where: { schoolId, isActive: true, ...campusWhere },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      db.term.findMany({
        where: { campus: { schoolId, ...campusWhere } },
        select: {
          id: true,
          name: true,
          campus: { select: { name: true } },
          academicSession: { select: { name: true } },
        },
        orderBy: [{ startsOn: "desc" }, { name: "asc" }],
      }),
      db.classLevel.findMany({
        where: { schoolId, isActive: true },
        select: { id: true, name: true },
        orderBy: { sortOrder: "asc" },
      }),
      db.feeStructure.findMany({
        where: { schoolId, isActive: true, ...(campusId ? { campusId } : {}) },
        include: {
          campus: { select: { name: true } },
          term: { select: { name: true } },
          classLevel: { select: { name: true } },
          category: { select: { name: true } },
        },
        orderBy: [
          { campus: { name: "asc" } },
          { classLevel: { sortOrder: "asc" } },
          { category: { name: "asc" } },
        ],
      }),
    ]);
  const canManage = hasPermission(viewer.membership.role, "finance.manage");
  const canManageSchool = hasPermission(
    viewer.membership.role,
    "school.manage",
  );

  return (
    <div>
      <PageHeading
        description="Set the standard amount due for each class, term and campus."
        eyebrow="Fee setup"
        title="Categories & structures"
      />
      <FinanceNav />

      {canManage && (
        <section className="mt-5 grid gap-5 xl:grid-cols-2">
          {canManageSchool && (
            <article className="card p-5">
              <h2 className="text-lg font-black">New fee category</h2>
              <p className="mb-5 mt-1 text-sm text-[#707985]">
                Categories are school-wide and owner-managed.
              </p>
              <FeeCategoryForm />
            </article>
          )}
          <article className="card p-5">
            <h2 className="text-lg font-black">New fee structure</h2>
            <p className="mb-5 mt-1 text-sm text-[#707985]">
              One category amount per class, campus and term.
            </p>
            <FeeStructureForm
              campuses={campuses.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
              categories={categories.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
              classLevels={classLevels.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
              terms={terms.map((item) => ({
                value: item.id,
                label: `${item.campus.name} · ${item.academicSession.name} · ${item.name}`,
              }))}
            />
          </article>
        </section>
      )}

      {canManage && (
        <section className="card mt-5 p-5">
          <h2 className="text-lg font-black">Apply structures to students</h2>
          <p className="mb-5 mt-1 text-sm text-[#707985]">
            Generate the class charges after student accounts and structures
            are ready.
          </p>
          <ApplyStructuresForm
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
      )}

      <section className="card mt-5 overflow-hidden">
        <div className="border-b border-[#e7e9ec] p-5">
          <p className="eyebrow">Active setup</p>
          <h2 className="mt-1 text-xl font-black">
            {structures.length} fee structure{structures.length === 1 ? "" : "s"}
          </h2>
        </div>
        {structures.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Campus</th>
                  <th>Term</th>
                  <th>Class</th>
                  <th>Category</th>
                  <th>Due</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {structures.map((item) => (
                  <tr key={item.id}>
                    <td>{item.campus.name}</td>
                    <td>{item.term.name}</td>
                    <td>{item.classLevel.name}</td>
                    <td>{item.category.name}</td>
                    <td>
                      {item.dueOn?.toLocaleDateString("en-NG") ?? "Not set"}
                    </td>
                    <td className="font-extrabold">
                      {formatNaira(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            Create fee categories and the first campus/class/term structure.
          </div>
        )}
      </section>
    </div>
  );
}
