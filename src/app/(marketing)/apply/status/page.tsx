import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  DollarSign,
  Download,
  FileText,
  GraduationCap,
  LogOut,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { respondToAdmissionOffer } from "@/app/actions/admission-decisions";
import { logoutApplicant } from "@/app/actions/admissions";
import { startEntrancePayment } from "@/app/actions/applicant-finance";
import {
  decisionLabel,
  isOfferExpired,
  type AdmissionDecisionOutcome,
  type AdmissionOfferResponse,
} from "@/lib/admission-decision";
import { applicationStatusLabel, type ApplicationStatus } from "@/lib/admissions-rules";
import { requireApplicant } from "@/lib/applicant-auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Application status" };

type StatusRow = {
  status: ApplicationStatus;
  studentFirstName: string | null;
  studentLastName: string | null;
  campusName: string | null;
  className: string | null;
  examMode: "ONLINE" | "ONSITE" | null;
  submittedAt: Date | null;
};

type DecisionRow = {
  id: string;
  outcome: AdmissionDecisionOutcome;
  applicantMessage: string | null;
  offerExpiresAt: Date | null;
  offerResponse: AdmissionOfferResponse;
  respondedAt: Date | null;
  convertedStudentId: string | null;
  convertedAt: Date | null;
  admissionNumber: string | null;
};

const statusOrder: ApplicationStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "AWAITING_PAYMENT",
  "AWAITING_EXAMINATION",
  "UNDER_REVIEW",
  "ACCEPTED",
];

const guidance: Record<ApplicationStatus, string> = {
  DRAFT: "Complete the form, upload supporting documents and submit the application.",
  SUBMITTED: "Your application is received. Open the payment stage to view the entrance form fee for the selected campus and class.",
  AWAITING_PAYMENT: "Complete the visible entrance fee. The examination fee appears only after the form fee is fully verified.",
  AWAITING_EXAMINATION: "Both entrance fees are verified. Open the examination portal for your online window or onsite examination slip.",
  UNDER_REVIEW: "The examination and application are being reviewed by the admissions team.",
  ACCEPTED: "An admission offer has been recorded. Review the letter and respond before the stated deadline.",
  WAITLISTED: "The application remains active on the waiting list. The school will communicate any change.",
  REJECTED: "The current application was not successful. Contact the admissions office for clarification.",
};

type StatusPageProps = {
  searchParams: Promise<{
    submitted?: string;
    error?: string;
    offer?: string;
  }>;
};

export default async function ApplicationStatusPage({ searchParams }: StatusPageProps) {
  const viewer = await requireApplicant();
  const { submitted, error, offer } = await searchParams;
  const [[application], [finance], [decision]] = await Promise.all([
    db.$queryRaw<StatusRow[]>`
      SELECT p."status"::text AS "status", p."studentFirstName", p."studentLastName",
        c."name" AS "campusName", l."name" AS "className",
        p."examMode"::text AS "examMode", p."submittedAt"
      FROM "admission_applications" p
      LEFT JOIN "campuses" c ON c."id" = p."campusId"
      LEFT JOIN "class_levels" l ON l."id" = p."classLevelId"
      WHERE p."id" = ${viewer.applicationId} AND p."accountId" = ${viewer.id}
      LIMIT 1
    `,
    db.$queryRaw<Array<{
      chargeCount: bigint;
      examCount: bigint;
      formAmount: unknown;
      formVerified: unknown;
    }>>`
      SELECT
        COUNT(DISTINCT c."id")::bigint AS "chargeCount",
        COUNT(DISTINCT CASE WHEN c."kind"='EXAM' THEN c."id" END)::bigint AS "examCount",
        COALESCE(MAX(CASE WHEN c."kind"='FORM' THEN c."amount" END), 0) AS "formAmount",
        COALESCE(SUM(CASE WHEN c."kind"='FORM' AND p."status"='VERIFIED' THEN p."amount" ELSE 0 END), 0) AS "formVerified"
      FROM "applicant_charges" c
      LEFT JOIN "applicant_payments" p ON p."chargeId"=c."id"
      WHERE c."applicationId"=${viewer.applicationId}
    `,
    db.$queryRaw<DecisionRow[]>`
      SELECT d."id", d."outcome"::text AS "outcome", d."applicantMessage",
        d."offerExpiresAt", d."offerResponse"::text AS "offerResponse", d."respondedAt",
        d."convertedStudentId", d."convertedAt", s."admissionNumber"
      FROM "admission_decisions" d
      LEFT JOIN "students" s ON s."id" = d."convertedStudentId"
      WHERE d."applicationId" = ${viewer.applicationId}
      LIMIT 1
    `,
  ]);
  if (!application) throw new Error("NOT_FOUND:APPLICATION");
  const currentIndex = statusOrder.indexOf(application.status);
  const hasCharges = Number(finance?.chargeCount ?? 0) > 0;
  const hasExamCharge = Number(finance?.examCount ?? 0) > 0;
  const formSettled = Number(finance?.formAmount ?? 0) > 0 &&
    Number(finance?.formAmount ?? 0) - Number(finance?.formVerified ?? 0) <= 0;
  const setupComplete = Boolean(application.campusName && application.className);
  const expiredOffer = decision
    ? isOfferExpired(decision.offerResponse, decision.offerExpiresAt)
    : false;

  return (
    <section className="marketing-section applicant-workspace-section">
      <div className="marketing-shell applicant-status-shell">
        <div className="applicant-toolbar">
          <div><span className="section-kicker">Applicant portal</span><h1>Application status</h1><p><strong>{viewer.applicationNumber}</strong></p></div>
          <form action={logoutApplicant}><button className="button button-secondary" type="submit"><LogOut size={17} /> Sign out</button></form>
        </div>
        {submitted && <div className="success-banner"><CheckCircle2 size={20} />Your application has been submitted successfully.</div>}
        {offer === "accepted" && <div className="success-banner"><CheckCircle2 size={20} />Your admission offer has been accepted. The school can now create the student record.</div>}
        {offer === "declined" && <div className="form-alert"><XCircle size={20} />You declined the admission offer. Contact admissions promptly if this was a mistake.</div>}
        {offer === "expired" && <div className="form-alert"><Clock3 size={20} />The admission offer deadline has passed. Contact the admissions office for assistance.</div>}
        {error === "fee-not-configured" && <div className="marketing-card status-guidance"><Clock3 size={22} /><div><strong>Entrance fee setup is pending</strong><p>The school has not configured the fee for this campus and class yet. Admissions can complete the setup without changing your application.</p></div></div>}

        <div className="status-summary-grid">
          <article className="marketing-card status-main-card">
            <span className="application-status-badge" data-status={application.status}>{applicationStatusLabel(application.status)}</span>
            <h2>{application.studentFirstName} {application.studentLastName}</h2>
            <p>{application.campusName ?? "Campus pending"} · {application.className ?? "Class pending"}</p>
            <div className="status-guidance"><Clock3 size={22} /><div><strong>What happens next</strong><p>{
              application.status === "DRAFT" && !setupComplete
                ? "Select the preferred campus and class to view the application-form fee."
                : application.status === "DRAFT" && !formSettled
                  ? "Complete the application-form payment and wait for verification."
                  : guidance[application.status]
            }</p></div></div>
            {application.status === "DRAFT" && !setupComplete && <Link className="button" href="/apply/setup">Set campus and class</Link>}
            {application.status === "DRAFT" && setupComplete && !formSettled && <Link className="button" href="/apply/payment"><DollarSign size={18} /> Application-form payment</Link>}
            {application.status === "DRAFT" && formSettled && <Link className="button" href="/apply/application">Continue application</Link>}
            {application.status === "SUBMITTED" && !hasExamCharge && <form action={startEntrancePayment}><button className="button" type="submit"><DollarSign size={18} /> View examination fee</button></form>}
            {(["AWAITING_PAYMENT", "AWAITING_EXAMINATION"] as ApplicationStatus[]).includes(application.status) || hasCharges ? <Link className="button" href="/apply/payment"><DollarSign size={18} /> Fees, payments and receipts</Link> : null}
            {(["AWAITING_EXAMINATION", "UNDER_REVIEW"] as ApplicationStatus[]).includes(application.status) && <Link className="button button-secondary" href="/apply/exam"><GraduationCap size={18} /> Entrance examination</Link>}
          </article>
          <aside className="marketing-card status-detail-card">
            <h2>Application details</h2>
            <dl>
              <div><dt>Application number</dt><dd>{viewer.applicationNumber}</dd></div>
              <div><dt>Exam preference</dt><dd>{application.examMode ? decisionLabel(application.examMode) : "Not selected"}</dd></div>
              <div><dt>Submitted</dt><dd>{application.submittedAt ? application.submittedAt.toLocaleString("en-NG") : "Not submitted"}</dd></div>
            </dl>
            <Link className="text-link" href="/apply/documents"><FileText size={17} /> View submitted documents</Link>
          </aside>
        </div>

        {decision && (
          <article className="marketing-card status-main-card" style={{ marginTop: 24 }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="application-status-badge" data-status={decision.outcome}>{decisionLabel(decision.outcome)}</span>
                <h2 style={{ marginTop: 16 }}>Admission decision</h2>
              </div>
              {decision.outcome === "ACCEPTED" && <ShieldCheck size={34} aria-hidden="true" />}
            </div>
            <p>{decision.applicantMessage ?? (decision.outcome === "ACCEPTED" ? "Petra Academy is pleased to offer admission, subject to acceptance before the deadline." : decision.outcome === "WAITLISTED" ? "Your application remains active on the waiting list." : "The current application was not successful.")}</p>

            {decision.outcome === "ACCEPTED" && (
              <div className="mt-5 space-y-4">
                <div className="status-guidance">
                  <Clock3 size={22} />
                  <div>
                    <strong>Offer deadline</strong>
                    <p>{decision.offerExpiresAt?.toLocaleString("en-NG") ?? "Contact admissions"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link className="button button-secondary" href={`/api/admission-letters/${viewer.applicationId}/download`}><Download size={18} /> Download admission letter</Link>
                  {decision.offerResponse === "PENDING" && !expiredOffer && (
                    <>
                      <form action={respondToAdmissionOffer.bind(null, "ACCEPTED")}><button className="button" type="submit"><CheckCircle2 size={18} /> Accept offer</button></form>
                      <form action={respondToAdmissionOffer.bind(null, "DECLINED")}><button className="button button-secondary" type="submit"><XCircle size={18} /> Decline offer</button></form>
                    </>
                  )}
                </div>
                {expiredOffer && <div className="form-alert"><Clock3 size={20} />This offer has passed its deadline. Contact admissions before taking further action.</div>}
                {decision.offerResponse === "ACCEPTED" && !decision.convertedStudentId && <div className="success-banner"><CheckCircle2 size={20} />Offer accepted. Petra Academy will complete the official enrolment record.</div>}
                {decision.offerResponse === "DECLINED" && <div className="form-alert"><XCircle size={20} />This offer was declined on {decision.respondedAt?.toLocaleString("en-NG") ?? "the recorded response date"}.</div>}
                {decision.offerResponse === "EXPIRED" && <div className="form-alert"><Clock3 size={20} />This offer has expired.</div>}
                {decision.convertedStudentId && <div className="success-banner"><GraduationCap size={20} /><div><strong>Enrolment completed</strong><br />Official admission number: {decision.admissionNumber}</div></div>}
              </div>
            )}
          </article>
        )}

        {!(["WAITLISTED", "REJECTED"] as ApplicationStatus[]).includes(application.status) && (
          <div className="application-timeline marketing-card">
            {statusOrder.map((status, index) => {
              const complete = currentIndex >= index && currentIndex !== -1;
              const active = application.status === status;
              return <div className="timeline-step" data-active={active} data-complete={complete} key={status}><span>{complete ? <CheckCircle2 size={19} /> : index + 1}</span><strong>{applicationStatusLabel(status)}</strong></div>;
            })}
          </div>
        )}
      </div>
    </section>
  );
}
