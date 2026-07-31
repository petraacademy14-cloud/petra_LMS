import type { Metadata } from "next";
import { updateDefaultGradingScheme } from "@/app/actions/results";
import { AcademicsNav } from "@/components/academics-nav";
import { PageHeading } from "@/components/page-heading";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = { title: "Grading setup" };

export default async function ResultsSettingsPage() {
  const viewer = await requirePermission("results.read");
  const schemes = await db.gradingScheme.findMany({
    where: { schoolId: viewer.membership.schoolId },
    include: { bands: { orderBy: { sortOrder: "asc" } } },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
  const canManage = hasPermission(viewer.membership.role, "academic.manage");
  return (
    <div>
      <PageHeading description="Configure CA/exam weighting and inclusive grade thresholds before creating result sheets." eyebrow="Phase 4" title="Grading setup" />
      <AcademicsNav />
      <div className="mt-6 grid gap-5">
        {schemes.map((scheme) => (
          <section className="card p-5" key={scheme.id}>
            <div className="flex items-center justify-between"><div><h2 className="font-black">{scheme.name}</h2><p className="text-sm text-[#727b87]">CA {Number(scheme.caWeight)}% · Exam {Number(scheme.examWeight)}%</p></div>{scheme.isDefault && <span className="pill" data-tone="success">Default</span>}</div>
            <div className="mt-4 table-wrap"><table className="data-table"><thead><tr><th>Grade</th><th>Minimum</th><th>Maximum</th><th>Remark</th></tr></thead><tbody>{scheme.bands.map((band) => <tr key={band.id}><td className="font-black">{band.label}</td><td>{Number(band.minScore)}</td><td>{Number(band.maxScore)}</td><td>{band.remark}</td></tr>)}</tbody></table></div>
            {canManage && scheme.bands.some((band) => band.label === "A") && (
              <details className="mt-4 rounded-xl border p-4">
                <summary className="cursor-pointer font-black">Edit weights and A–F thresholds</summary>
                <form action={updateDefaultGradingScheme} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <input name="schemeId" type="hidden" value={scheme.id} />
                  <label className="text-sm font-bold">CA weight<input className="mt-1 h-10 w-full rounded-lg border px-2" defaultValue={Number(scheme.caWeight)} name="caWeight" type="number" /></label>
                  <label className="text-sm font-bold">Exam weight<input className="mt-1 h-10 w-full rounded-lg border px-2" defaultValue={Number(scheme.examWeight)} name="examWeight" type="number" /></label>
                  {["A", "B", "C", "D", "E"].map((label) => <label className="text-sm font-bold" key={label}>{label} minimum<input className="mt-1 h-10 w-full rounded-lg border px-2" defaultValue={Number(scheme.bands.find((band) => band.label === label)?.minScore ?? 0)} name={`${label.toLowerCase()}Min`} step="0.01" type="number" /></label>)}
                  <button className="button self-end" type="submit">Save grading setup</button>
                </form>
              </details>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
