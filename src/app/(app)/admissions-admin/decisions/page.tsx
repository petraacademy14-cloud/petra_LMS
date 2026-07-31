import type { Metadata } from "next";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  Clock3,
  FileCheck2,
  GraduationCap,
  Hourglass,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import {
  convertAcceptedApplicant,
  recordAdmissionDecision,
} from "@/app/actions/admission-decisions";
import {
  canConvertAdmission,
  decisionLabel,
  isOfferExpired,
  type AdmissionDecisionOutcome,
  type AdmissionOfferResponse,
} from "@/lib/admission-decision";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Admission decisions" };

type DecisionApplicationRow = {
  applicationId: string;
  applicationNumber: string;
  applicationStatus: string;
  campusId: string;
  campusName: string;
  classLevelId: string;
  className: string;
  studentFirstName: string;
  studentLastName: string;
  guardianFirstName: string;
  guardianLastName: string;
  guardianPhone: string;
  candidateNumber: string | null;
  examStatus: string | null;
  percentage: unknown;
  passed: boolean | null;
  documentCount: bigint;
  decisionId: string | null;
  outcome: AdmissionDecisionOutcome | null;
  internalNote: string | null;
  applicantMessage: string | null;
  offerExpiresAt: Date | null;
  offerResponse: AdmissionOfferResponse | null;
  respondedAt: Date | null;
  convertedStudentId: string | null;
  convertedAt: Date | null;
  admissionNumber: string | null;
};

function offerTone(response: AdmissionOfferResponse | null) {
  if (response === "ACCEPTED") return "success";
  if (response === "DECLINED" || response === "EXPIRED") return undefined;
  return "brand";
}

export default async function AdmissionDecisionsPage() {
  const viewer = await requirePermission("admissions.read");
  const canManage = viewer.membership.role === "OWNER" || viewer.membership.role === "ADMIN";
  const isOwner = viewer.membership.role === "OWNER";
  const campusId = viewer.membership.campusId;

  const [applications, classArms, sessions] = await Promise.all([
    db.$queryRaw<DecisionApplicationRow[]>`
      SELECT a."id" AS "applicationId", a."applicationNumber",
        a."status"::text AS "applicationStatus", a."campusId", c."name" AS "campusName",
        a."classLevelId", l."name" AS "className", a."studentFirstName", a."studentLastName",
        g."firstName" AS "guardianFirstName", g."lastName" AS "guardianLastName",
        g."phone" AS "guardianPhone", r."candidateNumber", r."status"::text AS "examStatus",
        r."percentage", r."passed", COUNT(DISTINCT doc."id")::bigint AS "documentCount",
        d."id" AS "decisionId", d."outcome"::text AS "outcome", d."internalNote",
        d."applicantMessage", d."offerExpiresAt", d."offerResponse"::text AS "offerResponse",
        d."respondedAt", d."convertedStudentId", d."convertedAt", s."admissionNumber"
      FROM "admission_applications" a
      JOIN "applicant_accounts" g ON g."id" = a."accountId"
      JOIN "campuses" c ON c."id" = a."campusId"
      JOIN "class_levels" l ON l."id" = a."classLevelId"
      LEFT JOIN "applicant_exam_registrations" r ON r."applicationId" = a."id"
      LEFT JOIN "application_documents" doc ON doc."applicationId" = a."id"
      LEFT JOIN "admission_decisions" d ON d."applicationId" = a."id"
      LEFT JOIN "students" s ON s."id" = d."convertedStudentId"
      WHERE a."schoolId" = ${viewer.membership.schoolId}
        AND (${isOwner} OR a."campusId" = ${campusId})
        AND (a."status" IN ('UNDER_REVIEW', 'ACCEPTED', 'WAITLISTED', 'REJECTED') OR d."id" IS NOT NULL)
      GROUP BY a."id", c."name", l."name", g."id", r."id", d."id", s."id"
      ORDER BY
        CASE a."status"
          WHEN 'UNDER_REVIEW' THEN 0
          WHEN 'WAITLISTED' THEN 1
          WHEN 'ACCEPTED' THEN 2
          ELSE 3
        END,
        a."updatedAt" DESC
      LIMIT 250
    `,
    db.classArm.findMany({
      where: {
        isActive: true,
        campus: {
          schoolId: viewer.membership.schoolId,
          isActive: true,
          ...(isOwner ? {} : { id: campusId ?? "__none__" }),
        },
      },
      orderBy: [
        { classLevel: { sortOrder: "asc" } },
        { campus: { name: "asc" } },
        { name: "asc" },
      ],
      select: {
        id: true,
        campusId: true,
        classLevelId: true,
        name: true,
        campus: { select: { name: true } },
        classLevel: { select: { name: true } },
      },
    }),
    db.academicSession.findMany({
      where: { schoolId: viewer.membership.schoolId },
      orderBy: [{ isCurrent: "desc" }, { startsOn: "desc" }],
      select: { id: true, name: true, isCurrent: true },
    }),
  ]);

  const awaitingDecision = applications.filter((item) => item.applicationStatus === "UNDER_REVIEW").length;
  const offersPending = applications.filter(
    (item) => item.outcome === "ACCEPTED" && item.offerResponse === "PENDING",
  ).length;
  const acceptedOffers = applications.filter((item) => item.offerResponse === "ACCEPTED").length;
  const converted = applications.filter((item) => item.convertedStudentId).length;

  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow">Phase 6A admission decisions</p>
        <h1 className="page-title">Review, offer and enrol successful applicants</h1>
        <p className="page-subtitle">
          Record a controlled decision after the entrance examination, receive the family&apos;s response and convert accepted offers into official student records.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="card p-5"><FileCheck2 size={21} /><strong className="mt-3 block text-2xl">{awaitingDecision}</strong><p className="text-sm text-[#6f7782]">Awaiting decisions</p></article>
        <article className="card p-5"><Hourglass size={21} /><strong className="mt-3 block text-2xl">{offersPending}</strong><p className="text-sm text-[#6f7782]">Offers awaiting response</p></article>
        <article className="card p-5"><UserRoundCheck size={21} /><strong className="mt-3 block text-2xl">{acceptedOffers}</strong><p className="text-sm text-[#6f7782]">Offers accepted</p></article>
        <article className="card p-5"><GraduationCap size={21} /><strong className="mt-3 block text-2xl">{converted}</strong><p className="text-sm text-[#6f7782]">Converted to students</p></article>
      </section>

      <section className="space-y-5">
        {applications.map((application) => {
          const matchingArms = classArms.filter(
            (arm) =>
              arm.campusId === application.campusId &&
              arm.classLevelId === application.classLevelId,
          );
          const response = application.offerResponse;
          const expired = response
            ? isOfferExpired(response, application.offerExpiresAt)
            : false;
          const readyToConvert =
            application.outcome && response
              ? canConvertAdmission({
                  outcome: application.outcome,
                  offerResponse: response,
                  convertedStudentId: application.convertedStudentId,
                })
              : false;
          const availableOutcomes: AdmissionDecisionOutcome[] = application.decisionId
            ? ["ACCEPTED", "REJECTED"]
            : ["ACCEPTED", "WAITLISTED", "REJECTED"];

          return (
            <article className="card overflow-hidden" key={application.applicationId}>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e5e7eb] p-6">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="pill" data-tone="brand">{application.applicationStatus.replaceAll("_", " ")}</span>
                    {application.outcome && <span className="pill" data-tone={application.outcome === "ACCEPTED" ? "success" : undefined}>{decisionLabel(application.outcome)}</span>}
                    {response && response !== "NOT_APPLICABLE" && <span className="pill" data-tone={offerTone(expired ? "EXPIRED" : response)}>Offer: {decisionLabel(expired ? "EXPIRED" : response)}</span>}
                  </div>
                  <h2 className="mt-3 text-xl font-black">{application.studentFirstName} {application.studentLastName}</h2>
                  <p className="mt-1 text-sm text-[#6f7782]">{application.applicationNumber} · {application.campusName} · {application.className}</p>
                  <p className="mt-1 text-sm text-[#6f7782]">Guardian: {application.guardianFirstName} {application.guardianLastName} · {application.guardianPhone}</p>
                </div>
                <div className="min-w-48 text-right">
                  <strong className="text-2xl">{application.examStatus === "SCORED" ? `${Number(application.percentage).toFixed(2)}%` : decisionLabel(application.examStatus ?? "Not registered")}</strong>
                  <p className="text-xs text-[#6f7782]">{application.candidateNumber ?? "No candidate number"} · {Number(application.documentCount)} document(s)</p>
                  {application.examStatus === "SCORED" && <p className="mt-1 text-xs font-bold">{application.passed ? "Passed configured mark" : "Below configured mark"}</p>}
                </div>
              </div>

              <div className="grid gap-6 p-6 lg:grid-cols-[1fr_24rem]">
                <div className="space-y-4">
                  {application.decisionId ? (
                    <>
                      <div className="rounded-2xl bg-[#f7f7f8] p-5">
                        <h3 className="font-black">Recorded decision</h3>
                        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                          <div><dt className="text-[#747c87]">Internal note</dt><dd className="mt-1 font-bold">{application.internalNote}</dd></div>
                          <div><dt className="text-[#747c87]">Family message</dt><dd className="mt-1 font-bold">{application.applicantMessage ?? "No separate message"}</dd></div>
                          {application.offerExpiresAt && <div><dt className="text-[#747c87]">Offer deadline</dt><dd className="mt-1 font-bold">{application.offerExpiresAt.toLocaleString("en-NG")}</dd></div>}
                          {application.respondedAt && <div><dt className="text-[#747c87]">Family responded</dt><dd className="mt-1 font-bold">{application.respondedAt.toLocaleString("en-NG")}</dd></div>}
                        </dl>
                      </div>
                      {application.convertedStudentId && (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#b8dec9] bg-[#eff9f3] p-5">
                          <div><strong className="flex items-center gap-2 text-[#126a3f]"><CheckCircle2 size={20} /> Student record created</strong><p className="mt-1 text-sm text-[#4d6659]">Admission number: {application.admissionNumber}</p></div>
                          <Link className="button" href={`/students/${application.convertedStudentId}`}>Open student profile</Link>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="rounded-2xl bg-[#fff6e8] p-5 text-sm text-[#75551f]">
                      <strong className="flex items-center gap-2"><Clock3 size={19} /> Decision required</strong>
                      <p className="mt-2">Review the exam result, application and documents before recording an outcome.</p>
                    </div>
                  )}
                </div>

                <aside className="space-y-4">
                  {canManage && (application.applicationStatus === "UNDER_REVIEW" || application.outcome === "WAITLISTED") && (
                    <form action={recordAdmissionDecision.bind(null, application.applicationId)} className="space-y-3 rounded-2xl border border-[#e3e5e8] p-4">
                      <h3 className="font-black">{application.outcome === "WAITLISTED" ? "Update waitlist decision" : "Record decision"}</h3>
                      <label>Outcome<select name="outcome" required defaultValue=""><option value="" disabled>Select outcome</option>{availableOutcomes.map((outcome) => <option key={outcome} value={outcome}>{decisionLabel(outcome)}</option>)}</select></label>
                      <label>Offer deadline<input name="offerExpiresAt" type="datetime-local" /><small className="mt-1 block text-[#747c87]">Required when the outcome is Accepted.</small></label>
                      <label>Internal decision note<textarea name="internalNote" rows={3} required placeholder="Record the evidence and reason for staff." /></label>
                      <label>Message to family<textarea name="applicantMessage" rows={3} placeholder="A clear message shown in the applicant portal." /></label>
                      <button className="button w-full" type="submit">Save decision</button>
                    </form>
                  )}

                  {canManage && readyToConvert && (
                    <form action={convertAcceptedApplicant.bind(null, application.applicationId)} className="space-y-3 rounded-2xl border border-[#b8dec9] bg-[#f5fbf7] p-4">
                      <h3 className="flex items-center gap-2 font-black text-[#126a3f]"><Award size={19} /> Create student record</h3>
                      <p className="text-sm text-[#587064]">The family accepted the offer. Choose the arm and academic session before enrolment.</p>
                      <label>Class arm<select name="classArmId" required><option value="">Select arm</option>{matchingArms.map((arm) => <option key={arm.id} value={arm.id}>{arm.classLevel.name} {arm.name}</option>)}</select></label>
                      <label>Academic session<select name="academicSessionId" required><option value="">Select session</option>{sessions.map((session) => <option key={session.id} value={session.id}>{session.name}{session.isCurrent ? " (current)" : ""}</option>)}</select></label>
                      <label>Admission date<input name="admissionDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label>
                      {!matchingArms.length && <p className="text-sm font-bold text-[#a50e12]">Create an active arm for this campus and class before conversion.</p>}
                      <button className="button w-full" disabled={!matchingArms.length} type="submit">Convert to student</button>
                    </form>
                  )}

                  {application.outcome === "REJECTED" && <div className="rounded-2xl bg-[#f4f5f6] p-4 text-sm"><strong className="flex items-center gap-2"><XCircle size={18} /> Application closed</strong><p className="mt-2 text-[#68707a]">The decision remains in the audit history and the applicant cannot be converted.</p></div>}
                  {application.outcome === "ACCEPTED" && response === "PENDING" && !expired && <div className="rounded-2xl bg-[#fff6e8] p-4 text-sm"><strong>Awaiting family response</strong><p className="mt-2 text-[#75551f]">The applicant can download the admission letter and accept or decline before the deadline.</p></div>}
                  {application.outcome === "ACCEPTED" && expired && <div className="rounded-2xl bg-[#f4f5f6] p-4 text-sm"><strong>Offer deadline passed</strong><p className="mt-2 text-[#68707a]">The applicant portal will record the offer as expired when the family next responds.</p></div>}
                </aside>
              </div>
            </article>
          );
        })}
        {!applications.length && <div className="card empty-state">No applications are ready for an admission decision.</div>}
      </section>
    </div>
  );
}
