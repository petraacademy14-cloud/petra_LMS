import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  correctStudentScore,
  transitionResultSheet,
} from "@/app/actions/results";
import Link from "next/link";
import { ResultScoreGrid } from "@/components/result-score-grid";
import { resultScoreLimit } from "@/lib/result-score-entry";
import { AcademicsNav } from "@/components/academics-nav";
import { PageHeading } from "@/components/page-heading";
import {
  resultComponentLabel,
} from "@/lib/academics";
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
  const students = sheet.classArm.enrollments.filter((item) =>
    item.academicSessionId === sheet.term.academicSessionId &&
    item.campusId === sheet.campusId && item.student.schoolId === sheet.schoolId &&
    item.student.campusId === sheet.campusId,
  ).map((item) => item.student);
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
      {viewer.membership.role === "TEACHER" ? <Link className="button button-secondary mt-4" href="/teacher/results">Choose another subject</Link> : <AcademicsNav />}
      <section className="card mt-6 overflow-hidden">
        <ResultScoreGrid
          key={sheet.id}
          sheetId={sheet.id} version={sheet.updatedAt.toISOString()} editable={editable}
          bands={sheet.gradingScheme.bands.map((band) => ({
            label: band.label, minScore: Number(band.minScore), maxScore: Number(band.maxScore), remark: band.remark,
          }))}
          components={sheet.components.map((component) => ({
            id: component.id, label: resultComponentLabel(component),
            max: resultScoreLimit(component), scoreMax: Number(component.maxScore), weight: Number(component.weight),
          }))}
          students={students.map((student) => ({
            id: student.id, name: `${student.lastName}, ${student.firstName}`,
            admissionNumber: student.admissionNumber,
            comment: entryMap.get(student.id)?.teacherComment ?? "",
            scores: sheet.components.map((component) => {
              const score = scoreMap.get(`${component.id}:${student.id}`);
              return score ? Number(score.score) : null;
            }),
          }))}
        />
        {sheet.status === "SUBMITTED" && canApprove && <div className="flex gap-3 border-t p-4"><form action={transitionResultSheet}><input name="sheetId" type="hidden" value={sheet.id} /><input name="nextStatus" type="hidden" value="DRAFT" /><button className="button button-secondary" type="submit">Return to draft</button></form><form action={transitionResultSheet}><input name="sheetId" type="hidden" value={sheet.id} /><input name="nextStatus" type="hidden" value="APPROVED" /><button className="button" type="submit">Approve results</button></form></div>}
        {sheet.status === "APPROVED" && canPublish && <form action={transitionResultSheet} className="border-t p-4"><input name="sheetId" type="hidden" value={sheet.id} /><input name="nextStatus" type="hidden" value="PUBLISHED" /><button className="button" type="submit">Publish results</button></form>}
        {sheet.status === "PUBLISHED" && canPublish && <form action={transitionResultSheet} className="border-t p-4"><input name="sheetId" type="hidden" value={sheet.id} /><input name="nextStatus" type="hidden" value="LOCKED" /><button className="button" type="submit">Lock permanently</button></form>}
      </section>
      {canApprove && sheet.status !== "DRAFT" && sheet.status !== "LOCKED" && (
        <details className="card mt-5 p-5">
          <summary className="cursor-pointer font-black">Correct a submitted score</summary>
          <div className="mt-4 grid gap-3">{sheet.components.flatMap((component) => component.scores.map((score) => {
            const student = students.find((item) => item.id === score.studentId);
            return <form action={correctStudentScore} className="grid gap-2 rounded-xl border p-3 md:grid-cols-[2fr_1fr_1fr_2fr_auto]" key={score.id}><input name="scoreId" type="hidden" value={score.id} /><strong>{student?.lastName}, {student?.firstName}</strong><span>{resultComponentLabel(component)}</span><input className="h-10 rounded-lg border px-2" defaultValue={Number(score.score)} max={resultScoreLimit(component)} min="0" name="score" step="0.01" type="number" /><input className="h-10 rounded-lg border px-2" name="reason" placeholder="Required reason" required /><button className="button button-secondary" type="submit">Correct</button></form>;
          }))}</div>
        </details>
      )}
    </div>
  );
}
