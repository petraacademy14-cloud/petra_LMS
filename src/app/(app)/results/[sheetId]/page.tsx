import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  correctStudentScore,
  saveResultSheetScores,
  transitionResultSheet,
} from "@/app/actions/results";
import { AcademicsNav } from "@/components/academics-nav";
import { PageHeading } from "@/components/page-heading";
import { resolveGrade, totalWeightedScore } from "@/lib/academics";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = { title: "Result sheet" };

export default async function ResultSheetPage({
  params,
}: {
  params: Promise<{ sheetId: string }>;
}) {
  const viewer = await requirePermission("results.read");
  const { sheetId } = await params;
  const sheet = await db.resultSheet.findFirst({
    where: {
      id: sheetId,
      schoolId: viewer.membership.schoolId,
      ...(viewer.membership.role === "OWNER"
        ? {}
        : { campusId: viewer.membership.campusId ?? "__none__" }),
      ...(viewer.membership.role === "TEACHER"
        ? { teacherMembershipId: viewer.membership.id }
        : {}),
    },
    include: {
      campus: true,
      term: true,
      subject: true,
      gradingScheme: { include: { bands: { orderBy: { sortOrder: "asc" } } } },
      classArm: {
        include: {
          classLevel: true,
          enrollments: {
            where: { status: "CURRENT", student: { status: "ACTIVE" } },
            include: { student: true },
            orderBy: { student: { lastName: "asc" } },
          },
        },
      },
      components: {
        orderBy: { sortOrder: "asc" },
        include: { scores: { include: { corrections: { orderBy: { createdAt: "desc" }, take: 1 } } } },
      },
      entries: true,
    },
  });
  if (!sheet) notFound();
  const students = sheet.classArm.enrollments.map((item) => item.student);
  const scoreMap = new Map(sheet.components.flatMap((component) => component.scores.map((score) => [`${component.id}:${score.studentId}`, score] as const)));
  const entryMap = new Map(sheet.entries.map((entry) => [entry.studentId, entry]));
  const canManage = hasPermission(viewer.membership.role, "results.manage");
  const canApprove = hasPermission(viewer.membership.role, "results.approve");
  const canPublish = hasPermission(viewer.membership.role, "results.publish");
  const editable = sheet.status === "DRAFT" && canManage;

  return (
    <div>
      <PageHeading
        description={`${sheet.campus.name} · ${sheet.term.name} · ${sheet.subject.name}`}
        eyebrow={sheet.status}
        title={`${sheet.classArm.classLevel.name} ${sheet.classArm.name}`}
      />
      <AcademicsNav />
      <section className="card mt-6 overflow-hidden">
        <form action={saveResultSheetScores}>
          <input name="sheetId" type="hidden" value={sheet.id} />
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Student</th>{sheet.components.map((component) => <th key={component.id}>{component.name}<br /><span className="text-xs font-normal">Max {Number(component.maxScore)} · Weight {Number(component.weight)}%</span></th>)}<th>Total</th><th>Grade</th><th>Teacher comment</th></tr></thead>
            <tbody>{students.map((student) => {
              const scored = sheet.components.map((component) => ({ component, score: scoreMap.get(`${component.id}:${student.id}`) }));
              const completed = scored.every((item) => item.score);
              const total = completed ? totalWeightedScore(scored.map((item) => ({ score: item.score!.score, maxScore: item.component.maxScore, weight: item.component.weight }))) : null;
              const grade = total === null ? null : resolveGrade(total, sheet.gradingScheme.bands);
              return <tr key={student.id}><td><strong>{student.lastName}, {student.firstName}</strong><br /><span className="text-xs">{student.admissionNumber}</span></td>{scored.map(({ component, score }) => <td key={component.id}><input className="h-10 w-24 rounded-lg border px-2" defaultValue={score ? Number(score.score) : ""} disabled={!editable} max={Number(component.maxScore)} min="0" name={`score:${component.id}:${student.id}`} step="0.01" type="number" />{score?.corrections[0] && <p className="mt-1 text-[0.68rem] text-[#a25d00]">Corrected</p>}</td>)}<td className="font-black">{total ?? "—"}</td><td>{grade?.label ?? "—"}</td><td><textarea className="min-h-20 min-w-56 rounded-lg border p-2" defaultValue={entryMap.get(student.id)?.teacherComment ?? ""} disabled={!editable} maxLength={500} name={`comment:${student.id}`} /></td></tr>;
            })}</tbody></table></div>
          {editable && <div className="border-t p-4"><button className="button" type="submit">Save scores</button></div>}
        </form>
        {sheet.status === "DRAFT" && canManage && <form action={transitionResultSheet} className="border-t p-4"><input name="sheetId" type="hidden" value={sheet.id} /><input name="nextStatus" type="hidden" value="SUBMITTED" /><button className="button" type="submit">Submit for approval</button></form>}
        {sheet.status === "SUBMITTED" && canApprove && <div className="flex gap-3 border-t p-4"><form action={transitionResultSheet}><input name="sheetId" type="hidden" value={sheet.id} /><input name="nextStatus" type="hidden" value="DRAFT" /><button className="button button-secondary" type="submit">Return to draft</button></form><form action={transitionResultSheet}><input name="sheetId" type="hidden" value={sheet.id} /><input name="nextStatus" type="hidden" value="APPROVED" /><button className="button" type="submit">Approve results</button></form></div>}
        {sheet.status === "APPROVED" && canPublish && <form action={transitionResultSheet} className="border-t p-4"><input name="sheetId" type="hidden" value={sheet.id} /><input name="nextStatus" type="hidden" value="PUBLISHED" /><button className="button" type="submit">Publish results</button></form>}
        {sheet.status === "PUBLISHED" && canPublish && <form action={transitionResultSheet} className="border-t p-4"><input name="sheetId" type="hidden" value={sheet.id} /><input name="nextStatus" type="hidden" value="LOCKED" /><button className="button" type="submit">Lock permanently</button></form>}
      </section>
      {canApprove && sheet.status !== "DRAFT" && sheet.status !== "LOCKED" && (
        <details className="card mt-5 p-5">
          <summary className="cursor-pointer font-black">Correct a submitted score</summary>
          <div className="mt-4 grid gap-3">{sheet.components.flatMap((component) => component.scores.map((score) => {
            const student = students.find((item) => item.id === score.studentId);
            return <form action={correctStudentScore} className="grid gap-2 rounded-xl border p-3 md:grid-cols-[2fr_1fr_1fr_2fr_auto]" key={score.id}><input name="scoreId" type="hidden" value={score.id} /><strong>{student?.lastName}, {student?.firstName}</strong><span>{component.name}</span><input className="h-10 rounded-lg border px-2" defaultValue={Number(score.score)} max={Number(component.maxScore)} min="0" name="score" step="0.01" type="number" /><input className="h-10 rounded-lg border px-2" name="reason" placeholder="Required reason" required /><button className="button button-secondary" type="submit">Correct</button></form>;
          }))}</div>
        </details>
      )}
    </div>
  );
}
