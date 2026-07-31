import type { Metadata } from "next";
import Link from "next/link";
import { AcademicsNav } from "@/components/academics-nav";
import { PageHeading } from "@/components/page-heading";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Report cards" };

function value(input: string | string[] | undefined) {
  return typeof input === "string" ? input.trim() : "";
}

export default async function ReportCardsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requirePermission("results.read");
  const query = await searchParams;
  const termId = value(query.term);
  const classArmId = value(query.class);
  const scope =
    viewer.membership.role === "OWNER"
      ? {}
      : { id: viewer.membership.campusId ?? "__none__" };
  const [terms, classArms, students] = await Promise.all([
    db.term.findMany({
      where: { campus: { schoolId: viewer.membership.schoolId, ...scope } },
      select: { id: true, name: true, campus: { select: { name: true } } },
      orderBy: { startsOn: "desc" },
    }),
    db.classArm.findMany({
      where: { campus: { schoolId: viewer.membership.schoolId, ...scope } },
      select: { id: true, name: true, classLevel: { select: { name: true } }, campus: { select: { name: true } } },
      orderBy: [{ classLevel: { sortOrder: "asc" } }, { name: "asc" }],
    }),
    termId && classArmId
      ? db.student.findMany({
          where: {
            schoolId: viewer.membership.schoolId,
            status: "ACTIVE",
            enrollments: { some: { classArmId, status: "CURRENT" } },
            resultEntries: {
              some: {
                sheet: {
                  termId,
                  classArmId,
                  status: { in: ["PUBLISHED", "LOCKED"] },
                },
              },
            },
          },
          select: { id: true, admissionNumber: true, firstName: true, lastName: true },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        })
      : [],
  ]);
  return (
    <div>
      <PageHeading description="Print one learner’s report or open every published report in a class for bulk printing." eyebrow="Phase 4" title="Report cards" />
      <AcademicsNav />
      <form className="card mt-6 grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto]">
        <select className="h-11 rounded-xl border px-3" defaultValue={termId} name="term" required><option value="">Choose term</option>{terms.map((item) => <option key={item.id} value={item.id}>{item.campus.name} · {item.name}</option>)}</select>
        <select className="h-11 rounded-xl border px-3" defaultValue={classArmId} name="class" required><option value="">Choose class</option>{classArms.map((item) => <option key={item.id} value={item.id}>{item.campus.name} · {item.classLevel.name} {item.name}</option>)}</select>
        <button className="button" type="submit">Load reports</button>
      </form>
      <section className="card mt-5 overflow-hidden">
        <div className="border-b p-5"><h2 className="font-black">Published learner reports</h2><p className="text-sm text-[#727b87]">{students.length} available</p></div>
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Student</th><th>Admission number</th><th>Action</th></tr></thead><tbody>{students.map((student) => <tr key={student.id}><td><strong>{student.lastName}, {student.firstName}</strong></td><td>{student.admissionNumber}</td><td><Link className="font-bold text-[#b91118] hover:underline" href={`/results/report-cards/${student.id}?termId=${termId}`}>Open report card</Link></td></tr>)}</tbody></table></div>
        {!students.length && <div className="empty-state">Choose a term and class with published results.</div>}
      </section>
    </div>
  );
}
