import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Download,
  FileText,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { decisionLabel } from "@/lib/admission-decision";
import { requireCampusAccess, requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Student admission record" };

type AdmissionRecordRow = {
  applicationId: string;
  applicationNumber: string;
  outcome: string;
  internalNote: string;
  applicantMessage: string | null;
  offerResponse: string;
  respondedAt: Date | null;
  convertedAt: Date;
  candidateNumber: string | null;
  examStatus: string | null;
  score: unknown;
  maximumScore: unknown;
  percentage: unknown;
  passed: boolean | null;
  guardianFirstName: string;
  guardianLastName: string;
  guardianPhone: string;
  guardianEmail: string;
};

type LinkedDocumentRow = {
  id: string;
  name: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: Date;
};

export default async function StudentAdmissionRecordPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const viewer = await requirePermission("people.read");
  const { studentId } = await params;
  const student = await db.student.findFirst({
    where: { id: studentId, schoolId: viewer.membership.schoolId },
    select: {
      id: true,
      campusId: true,
      admissionNumber: true,
      firstName: true,
      middleName: true,
      lastName: true,
      campus: { select: { name: true } },
    },
  });
  if (!student) notFound();
  await requireCampusAccess(student.campusId);

  const [[record], documents] = await Promise.all([
    db.$queryRaw<AdmissionRecordRow[]>`
      SELECT a."id" AS "applicationId", a."applicationNumber",
        d."outcome"::text AS "outcome", d."internalNote", d."applicantMessage",
        d."offerResponse"::text AS "offerResponse", d."respondedAt", d."convertedAt",
        r."candidateNumber", r."status"::text AS "examStatus", r."score",
        r."maximumScore", r."percentage", r."passed", g."firstName" AS "guardianFirstName",
        g."lastName" AS "guardianLastName", g."phone" AS "guardianPhone",
        g."email" AS "guardianEmail"
      FROM "admission_decisions" d
      JOIN "admission_applications" a ON a."id" = d."applicationId"
      JOIN "applicant_accounts" g ON g."id" = a."accountId"
      LEFT JOIN "applicant_exam_registrations" r ON r."applicationId" = a."id"
      WHERE d."convertedStudentId" = ${studentId} AND d."schoolId" = ${viewer.membership.schoolId}
      LIMIT 1
    `,
    db.$queryRaw<LinkedDocumentRow[]>`
      SELECT doc."id", doc."name", doc."fileName", doc."contentType", doc."sizeBytes", doc."createdAt"
      FROM "student_admission_document_links" link
      JOIN "application_documents" doc ON doc."id" = link."applicationDocumentId"
      WHERE link."studentId" = ${studentId}
      ORDER BY doc."createdAt" DESC
    `,
  ]);
  if (!record) notFound();

  const fullName = [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Student admission record</p>
          <h1 className="page-title">{fullName}</h1>
          <p className="page-subtitle">{student.admissionNumber} · {student.campus.name} · source application {record.applicationNumber}</p>
        </div>
        <Link className="button button-secondary" href={`/students/${student.id}`}><ArrowLeft size={17} /> Student profile</Link>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="card p-5"><ShieldCheck size={21} /><p className="mt-3 text-xs font-bold uppercase text-[#747c87]">Decision</p><strong className="mt-1 block text-xl">{decisionLabel(record.outcome)}</strong></article>
        <article className="card p-5"><CheckCircle2 size={21} /><p className="mt-3 text-xs font-bold uppercase text-[#747c87]">Offer response</p><strong className="mt-1 block text-xl">{decisionLabel(record.offerResponse)}</strong></article>
        <article className="card p-5"><Award size={21} /><p className="mt-3 text-xs font-bold uppercase text-[#747c87]">Entrance result</p><strong className="mt-1 block text-xl">{record.examStatus === "SCORED" ? `${Number(record.percentage).toFixed(2)}%` : decisionLabel(record.examStatus ?? "Not recorded")}</strong></article>
        <article className="card p-5"><FileText size={21} /><p className="mt-3 text-xs font-bold uppercase text-[#747c87]">Admission documents</p><strong className="mt-1 block text-xl">{documents.length}</strong></article>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-xl font-black">Decision and conversion</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div><dt className="font-bold text-[#747c87]">Internal decision note</dt><dd className="mt-1">{record.internalNote}</dd></div>
            <div><dt className="font-bold text-[#747c87]">Message sent to family</dt><dd className="mt-1">{record.applicantMessage ?? "No separate family message."}</dd></div>
            <div><dt className="font-bold text-[#747c87]">Offer response date</dt><dd className="mt-1">{record.respondedAt?.toLocaleString("en-NG") ?? "Not recorded"}</dd></div>
            <div><dt className="font-bold text-[#747c87]">Student record created</dt><dd className="mt-1">{record.convertedAt.toLocaleString("en-NG")}</dd></div>
          </dl>
        </section>

        <section className="card p-6">
          <h2 className="flex items-center gap-2 text-xl font-black"><UserRound size={21} /> Applicant guardian</h2>
          <p className="mt-5 font-black">{record.guardianFirstName} {record.guardianLastName}</p>
          <p className="mt-1 text-sm text-[#626b77]">{record.guardianPhone}</p>
          <p className="mt-1 text-sm text-[#626b77]">{record.guardianEmail}</p>
          {record.examStatus === "SCORED" && (
            <div className="mt-6 rounded-2xl bg-[#f7f7f8] p-4 text-sm">
              <strong>Entrance examination</strong>
              <p className="mt-2">Candidate {record.candidateNumber} · {Number(record.score)}/{Number(record.maximumScore)} · {record.passed ? "Passed configured mark" : "Below configured mark"}</p>
            </div>
          )}
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-[#e5e7eb] p-5"><h2 className="text-xl font-black">Linked admission documents</h2><p className="mt-1 text-sm text-[#6f7782]">The original private applicant files remain protected and are linked to this student record.</p></div>
        <div className="divide-y divide-[#eceef1]">
          {documents.map((document) => (
            <article className="flex flex-wrap items-center justify-between gap-3 p-5" key={document.id}>
              <div><strong>{document.name}</strong><p className="mt-1 text-xs text-[#747c87]">{document.fileName} · {(document.sizeBytes / 1024).toFixed(0)} KB · {document.createdAt.toLocaleDateString("en-NG")}</p></div>
              <Link className="button button-secondary" href={`/api/admission-documents/${document.id}/download`}><Download size={17} /> Download</Link>
            </article>
          ))}
          {!documents.length && <div className="empty-state">No admission documents were uploaded.</div>}
        </div>
      </section>
    </div>
  );
}
